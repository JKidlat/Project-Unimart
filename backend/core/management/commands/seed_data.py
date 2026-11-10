"""
Django management command to populate the local database with initial seed data:
- Ghanaian Universities
- Product Categories
- Student Seller Accounts
- Sample Marketplace Products

Usage:
    py manage.py seed_data
"""

from django.core.management.base import BaseCommand
from django.db import transaction
from django.contrib.auth import get_user_model
from accounts.models import Profile
from universities.models import University
from universities.catalog import sync_ghana_universities
from marketplace.models import Category, Product

User = get_user_model()


class Command(BaseCommand):
    help = "Seeds initial universities, categories, sellers, and products into the database."

    @transaction.atomic
    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE("Starting database seeding..."))

        # 1. Seed & Reconcile Canonical 67 Ghanaian Universities
        uni_stats = sync_ghana_universities()
        self.stdout.write(f"  [Universities] Synced 67 canonical institutions: {uni_stats}")
        uni_map = {uni.short_name: uni for uni in University.objects.all()}

        # 2. Seed Categories (7 Official Categories)
        categories_data = [
            {
                "name": "Groceries",
                "slug": "groceries",
                "icon": "ShoppingCart",
                "image": "https://images.unsplash.com/photo-1542838132-92c53300491e",
                "color": "bg-emerald-100",
            },
            {
                "name": "Stationery",
                "slug": "stationery",
                "icon": "BookOpen",
                "image": "https://images.unsplash.com/photo-1654785419449-7f0a9383a4fe",
                "color": "bg-yellow-100",
            },
            {
                "name": "Electronics",
                "slug": "electronics",
                "icon": "Smartphone",
                "image": "https://images.unsplash.com/photo-1650094983020-89c3dfa9ce0d",
                "color": "bg-blue-100",
            },
            {
                "name": "Fashion",
                "slug": "fashion",
                "icon": "Shirt",
                "image": "https://images.unsplash.com/photo-1663044022557-7d5d4c1d5318",
                "color": "bg-pink-100",
            },
            {
                "name": "Beauty and Cosmetics",
                "slug": "beauty-cosmetics",
                "icon": "Sparkles",
                "image": "https://images.unsplash.com/photo-1596462502278-27bfdc403348",
                "color": "bg-rose-100",
            },
            {
                "name": "Appliances",
                "slug": "appliances",
                "icon": "Tv",
                "image": "https://images.unsplash.com/photo-1583847268964-b28dc8f51f92",
                "color": "bg-orange-100",
            },
            {
                "name": "Others",
                "slug": "others",
                "icon": "ShoppingBag",
                "image": "https://images.unsplash.com/photo-1513542789411-b6a5d4f31634",
                "color": "bg-purple-100",
            },
        ]

        cat_map = {}
        for c_data in categories_data:
            cat, created = Category.objects.get_or_create(
                slug=c_data["slug"],
                defaults={
                    "name": c_data["name"],
                    "icon": c_data["icon"],
                    "image": c_data["image"],
                    "color": c_data["color"],
                }
            )
            cat_map[c_data["slug"]] = cat
            status = "Created" if created else "Exists"
            self.stdout.write(f"  [Category] {status}: {cat.name} ({cat.slug})")

        # 3. Seed Sample Sellers
        sellers_data = [
            {"email": "kofi.mensah@unimart.local", "name": "Kofi Mensah", "uni": "UG", "phone": "+233241234567"},
            {"email": "ama.serwaa@unimart.local", "name": "Ama Serwaa", "uni": "KNUST", "phone": "+233242345678"},
            {"email": "style.haven@unimart.local", "name": "Style Haven", "uni": "UCC", "phone": "+233243456789"},
            {"email": "kwame.tech@unimart.local", "name": "Kwame Tech", "uni": "UPSA", "phone": "+233244567890"},
            {"email": "john.doe@unimart.local", "name": "John Doe", "uni": "UG", "phone": "+233245678901"},
            {"email": "serwaa.appiah@unimart.local", "name": "Serwaa Appiah", "uni": "KNUST", "phone": "+233246789012"},
        ]

        seller_map = {}
        for s_data in sellers_data:
            seller = User.objects.filter(email=s_data["email"]).first()
            if not seller:
                seller = User.objects.create_user(
                    email=s_data["email"],
                    password="Password123!"
                )
                seller.full_name = s_data["name"]
                seller.phone_number = s_data["phone"]
                seller.is_verified_student = True
                seller.save()
                Profile.objects.create(
                    user=seller,
                    university=uni_map.get(s_data["uni"]),
                    is_vendor=True,
                )
                self.stdout.write(f"  [Seller] Created: {seller.email} ({seller.full_name})")
            else:
                self.stdout.write(f"  [Seller] Exists: {seller.email}")
            seller_map[s_data["email"]] = seller

        # 4. Seed Products
        products_data = [
            {
                "title": "MacBook Air M2 (Used)",
                "price": 8500.00,
                "old_price": 9200.00,
                "category": "electronics",
                "image": "https://images.unsplash.com/photo-1650094983020-89c3dfa9ce0d",
                "university": "UG",
                "condition": "Like New",
                "seller_email": "kofi.mensah@unimart.local",
                "description": "Selling my MacBook Air M2. Used for only one semester. Comes with all accessories and box. Perfect for computer science students.",
            },
            {
                "title": "Rechargeable Study Lamp",
                "price": 150.00,
                "old_price": 180.00,
                "category": "dorm-essentials",
                "image": "https://images.unsplash.com/photo-1534073828943-f801091bb270",
                "university": "KNUST",
                "condition": "New",
                "seller_email": "ama.serwaa@unimart.local",
                "description": "Very bright study lamp with 3 brightness levels. Built-in battery that lasts 6 hours on full charge.",
            },
            {
                "title": "Oversized Uni Hoodie",
                "price": 250.00,
                "old_price": None,
                "category": "clothing",
                "image": "https://images.unsplash.com/photo-1663044022557-7d5d4c1d5318",
                "university": "UCC",
                "condition": "New",
                "seller_email": "style.haven@unimart.local",
                "description": "Premium quality oversized hoodie. Available in all sizes. Perfect for cold mornings on campus.",
            },
            {
                "title": "Scientific Calculator fx-991EX",
                "price": 320.00,
                "old_price": 350.00,
                "category": "books-stationery",
                "image": "https://images.unsplash.com/photo-1654785419449-7f0a9383a4fe",
                "university": "UPSA",
                "condition": "Good",
                "seller_email": "kwame.tech@unimart.local",
                "description": "Standard engineering calculator. Used for two years but works perfectly fine.",
            },
            {
                "title": "Sony WH-1000XM4 Headphones",
                "price": 2200.00,
                "old_price": 2500.00,
                "category": "electronics",
                "image": "https://images.unsplash.com/photo-1505740420928-5e560c06d30e",
                "university": "UG",
                "condition": "Like New",
                "seller_email": "john.doe@unimart.local",
                "description": "Industry-leading noise canceling headphones. Great for studying in noisy dorms.",
            },
            {
                "title": "Electric Kettle (1.8L)",
                "price": 120.00,
                "old_price": None,
                "category": "dorm-essentials",
                "image": "https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5",
                "university": "KNUST",
                "condition": "Good",
                "seller_email": "serwaa.appiah@unimart.local",
                "description": "Fast boiling electric kettle. Essential for your morning coffee or noodles.",
            },
        ]

        for p_data in products_data:
            seller = seller_map[p_data["seller_email"]]
            category = cat_map[p_data["category"]]
            university = uni_map[p_data["university"]]

            prod, created = Product.objects.get_or_create(
                title=p_data["title"],
                seller=seller,
                defaults={
                    "price": p_data["price"],
                    "old_price": p_data["old_price"],
                    "category": category,
                    "university": university,
                    "image": p_data["image"],
                    "condition": p_data["condition"],
                    "description": p_data["description"],
                    "product_type": "physical",
                    "is_available": True,
                }
            )
            status = "Created" if created else "Exists"
            self.stdout.write(f"  [Product] {status}: {prod.title} (GH₵{prod.price})")

        self.stdout.write(self.style.SUCCESS("Database successfully seeded!"))

