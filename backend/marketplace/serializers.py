from rest_framework import serializers
from .models import Product, Category
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