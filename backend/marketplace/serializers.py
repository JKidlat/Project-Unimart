from rest_framework import serializers
from .models import Product, Category, WishlistItem
from universities.models import University


class CategorySerializer(serializers.ModelSerializer):
    product_count = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = ['id', 'name', 'slug', 'icon', 'image', 'color', 'product_count']

    def get_product_count(self, obj):
        return obj.products.filter(is_available=True).count()


class ProductSerializer(serializers.ModelSerializer):
    # Aliases for frontend compatibility
    name = serializers.CharField(source='title', required=False)
    oldPrice = serializers.DecimalField(source='old_price', max_digits=10, decimal_places=2, required=False, allow_null=True)
    condition = serializers.CharField(required=False, default='Like New')
    category_name = serializers.CharField(source='category.name', read_only=True, default='')

    category_id = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(), 
        source='category', 
        required=False, 
        allow_null=True
    )
    university_name = serializers.CharField(source='university.name', read_only=True, default='')
    university_id = serializers.PrimaryKeyRelatedField(
        queryset=University.objects.all(), 
        source='university', 
        required=False
    )
    average_rating = serializers.SerializerMethodField(read_only=True)
    seller_details = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Product
        fields = [
            'id', 'title', 'name', 'description', 'price', 'old_price', 'oldPrice',
            'condition', 'image', 'product_type', 'is_available', 'category_id',
            'category_name', 'university_id', 'university_name', 'seller_details',
            'average_rating', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_average_rating(self, obj):
        return obj.average_rating

    def get_seller_details(self, obj):
        seller = obj.seller
        return {
            'id': seller.id,
            'name': seller.full_name or seller.email.split('@')[0],
            'email': seller.email,
            'rating': obj.average_rating,
            'verified': getattr(seller, 'is_verified_student', True)
        }

    def validate_price(self, value):
        if value <= 0:
            raise serializers.ValidationError("Price must be greater than zero.")
        return value

    def validate_condition(self, value):
        """
        Normalize condition strings from frontend into backend choice format.
        """
        if not value:
            return "Like New"
        val_clean = str(value).strip().lower().replace('-', '_').replace(' ', '_')
        condition_map = {
            'new': 'New',
            'brand_new': 'New',
            'like_new': 'Like New',
            'used_excellent': 'Like New',
            'used_good': 'Good',
            'good': 'Good',
            'used_fair': 'Fair',
            'fair': 'Fair',
        }
        if val_clean in condition_map:
            return condition_map[val_clean]
        for key, label in Product.CONDITION_CHOICES:
            if value.lower() in (key.lower(), label.lower()):
                return key
        return "Like New"

    def validate(self, attrs):
        """
        Support resolving category by slug string, alias, or ID.
        """
        category_input = self.initial_data.get('category')
        if category_input and not attrs.get('category'):
            alias_map = {
                'books': 'books-stationery',
                'textbooks': 'books-stationery',
                'fashion': 'clothing',
                'home': 'dorm-essentials',
                'hostel': 'dorm-essentials',
            }
            slug = str(category_input).strip().lower()
            slug = alias_map.get(slug, slug)
            cat = Category.objects.filter(slug=slug).first()
            if not cat and str(category_input).isdigit():
                cat = Category.objects.filter(id=int(category_input)).first()
            if cat:
                attrs['category'] = cat

        return attrs


class WishlistItemSerializer(serializers.ModelSerializer):
    product = ProductSerializer(read_only=True)
    product_id = serializers.PrimaryKeyRelatedField(
        queryset=Product.objects.filter(is_available=True),
        source='product',
        write_only=True
    )

    class Meta:
        model = WishlistItem
        fields = ['id', 'product', 'product_id', 'created_at']
        read_only_fields = ['id', 'created_at']

