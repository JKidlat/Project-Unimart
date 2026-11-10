from rest_framework import serializers
from .models import University


class UniversitySerializer(serializers.ModelSerializer):
    class Meta:
        model = University
        fields = ['id', 'name', 'short_name', 'category', 'is_active', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class AdminUniversitySerializer(serializers.ModelSerializer):
    user_count = serializers.IntegerField(read_only=True, default=0)
    product_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = University
        fields = [
            'id',
            'name',
            'short_name',
            'category',
            'is_active',
            'user_count',
            'product_count',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'user_count', 'product_count', 'created_at', 'updated_at']

    def validate_name(self, value):
        clean = " ".join(value.strip().split())
        if not clean:
            raise serializers.ValidationError("Institution name is required.")
        qs = University.objects.filter(name__iexact=clean)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("An institution with this name already exists.")
        return clean

    def validate_short_name(self, value):
        clean = value.strip()
        if not clean:
            raise serializers.ValidationError("Short name / acronym is required.")
        qs = University.objects.filter(short_name__iexact=clean)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("An institution with this short name already exists.")
        return clean
