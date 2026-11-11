from rest_framework import serializers
from core.media import normalize_public_image_url
from universities.models import University
from .models import CartItem, Category, Product, WishlistItem


def format_stock_label(stock_value):
    """Apply exact customer inventory visibility tiers."""
    stock = max(0, int(stock_value or 0))
    if stock >= 10:
        return None
    if 6 <= stock <= 9:
        return "Few units left"
    if 1 <= stock <= 5:
        return f"{stock} left"
    return "Out of stock"


class CategorySerializer(serializers.ModelSerializer):
    product_count = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = ['id', 'name', 'slug', 'icon', 'image', 'color', 'product_count']

    def get_product_count(self, obj):
        return obj.products.filter(status='live', is_available=True).count()


class ProductSerializer(serializers.ModelSerializer):
    # Aliases for frontend compatibility
    name = serializers.CharField(source='title', required=False)
    description = serializers.CharField(required=False, allow_blank=True, default='')
    oldPrice = serializers.DecimalField(source='old_price', max_digits=10, decimal_places=2, required=False, allow_null=True)
    condition = serializers.CharField(required=False, default='Like New')
    category_name = serializers.CharField(source='category.name', read_only=True, default='')

    category = serializers.CharField(source='category.slug', read_only=True, default='others')
    category_id = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(),
        source='category',
        required=False,
        allow_null=True
    )
    university_name = serializers.CharField(source='university.name', read_only=True, default='')
    university_short_name = serializers.CharField(source='university.short_name', read_only=True, default='')
    university_id = serializers.PrimaryKeyRelatedField(
        queryset=University.objects.all(),
        source='university',
        required=False
    )
    average_rating = serializers.SerializerMethodField(read_only=True)
    seller_details = serializers.SerializerMethodField(read_only=True)
    stock = serializers.IntegerField(min_value=0, required=False)
    stock_label = serializers.SerializerMethodField(read_only=True)
    images = serializers.ListField(
        child=serializers.CharField(max_length=1000),
        required=False,
    )

    class Meta:
        model = Product
        fields = [
            'id', 'title', 'name', 'description', 'price', 'old_price', 'oldPrice',
            'stock', 'stock_label',
            'condition', 'image', 'images', 'product_type', 'is_available', 'status',
            'is_resubmitted', 'rejection_reason', 'flag_reason',
            'category', 'category_id', 'category_name',
            'university_id', 'university_name', 'university_short_name', 'seller_details',
            'average_rating', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'created_at', 'updated_at', 'status', 'is_available',
            'is_resubmitted', 'rejection_reason', 'flag_reason'
        ]

    def get_average_rating(self, obj):
        return obj.average_rating

    def get_stock_label(self, obj):
        return format_stock_label(obj.stock)

    def get_seller_details(self, obj):
        seller = obj.seller
        profile = getattr(seller, 'profile', None)
        uni_name = profile.university.short_name if (profile and profile.university) else ''
        display_name = (profile.business_name if profile and profile.business_name else None) or seller.full_name or "Verified Student"
        return {
            'id': seller.id,
            'name': display_name,
            'business_name': getattr(profile, 'business_name', '') if profile else '',
            'university': uni_name,
            'rating': obj.average_rating,
            'verified': getattr(seller, 'is_verified_student', True),
        }

    def validate_price(self, value):
        if value <= 0:
            raise serializers.ValidationError("Price must be greater than zero.")
        return value

    def validate_stock(self, value):
        is_create = self.instance is None
        if is_create and value < 1:
            raise serializers.ValidationError("Available stock quantity must be at least 1 unit when creating an ad.")
        if value < 0:
            raise serializers.ValidationError("Stock quantity cannot be negative.")
        return value

    def validate_image(self, value):
        if value and str(value).strip().lower().startswith('blob:'):
            raise serializers.ValidationError("Temporary browser blob image URLs cannot be saved. Please re-upload your image.")
        return value

    def validate_images(self, value):
        cleaned = []
        for url in value or []:
            u = str(url or '').strip()
            if not u:
                continue
            if u.lower().startswith('blob:'):
                raise serializers.ValidationError("Temporary browser blob image URLs cannot be saved. Please re-upload your images.")
            cleaned.append(u)
        return cleaned

    def validate_condition(self, value):
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
        is_create = self.instance is None
        if is_create and 'stock' not in attrs:
            raise serializers.ValidationError({"stock": "Available stock quantity is required."})

        category_input = self.initial_data.get('category')
        if category_input and not attrs.get('category'):
            canonical_names = {
                'groceries': 'Groceries',
                'stationery': 'Stationery',
                'electronics': 'Electronics',
                'fashion': 'Fashion',
                'beauty-cosmetics': 'Beauty and Cosmetics',
                'appliances': 'Appliances',
                'others': 'Others',
            }
            alias_map = {
                'books': 'stationery',
                'textbooks': 'stationery',
                'books-stationery': 'stationery',
                'clothing': 'fashion',
                'dorm-essentials': 'appliances',
                'home': 'appliances',
                'hostel': 'appliances',
                'beauty': 'beauty-cosmetics',
                'beauty-and-cosmetics': 'beauty-cosmetics',
                'other': 'others',
            }
            slug = str(category_input).strip().lower()
            slug = alias_map.get(slug, slug)
            cat = Category.objects.filter(slug=slug).first()
            if not cat and str(category_input).isdigit():
                cat = Category.objects.filter(id=int(category_input)).first()
            if not cat and slug in canonical_names:
                cat, _ = Category.objects.get_or_create(
                    slug=slug,
                    defaults={'name': canonical_names[slug]},
                )
            if cat:
                attrs['category'] = cat

        # Keep cover image synchronized with images list when provided
        imgs = attrs.get('images')
        if imgs is not None and len(imgs) > 0 and not attrs.get('image'):
            attrs['image'] = imgs[0]
        elif attrs.get('image') and imgs is None and is_create:
            attrs['images'] = [attrs['image']]

        return attrs

    def to_representation(self, instance):
        data = super().to_representation(instance)
        request = self.context.get('request')
        primary = normalize_public_image_url(data.get('image'), request=request)
        raw_images = data.get('images') or []
        norm_images = [normalize_public_image_url(img, request=request) for img in raw_images if img]
        if not norm_images and primary:
            norm_images = [primary]
        data['image'] = primary or (norm_images[0] if norm_images else '')
        data['images'] = norm_images
        return data


class WishlistItemSerializer(serializers.ModelSerializer):
    product = ProductSerializer(read_only=True)
    product_id = serializers.PrimaryKeyRelatedField(
        queryset=Product.objects.filter(status='live', is_available=True),
        source='product',
        write_only=True
    )

    class Meta:
        model = WishlistItem
        fields = ['id', 'product', 'product_id', 'created_at']
        read_only_fields = ['id', 'created_at']


class CartItemSerializer(serializers.ModelSerializer):
    product = ProductSerializer(read_only=True)
    product_id = serializers.IntegerField(write_only=True, required=True)
    quantity = serializers.IntegerField(min_value=1, default=1)

    class Meta:
        model = CartItem
        fields = ['id', 'product', 'product_id', 'quantity', 'created_at', 'updated_at']
        read_only_fields = ['id', 'product', 'created_at', 'updated_at']
