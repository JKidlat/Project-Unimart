from django.db import migrations


def sync_universities_forward(apps, schema_editor):
    University = apps.get_model("universities", "University")
    Profile = apps.get_model("accounts", "Profile")
    Product = apps.get_model("marketplace", "Product")
    from universities.catalog import sync_ghana_universities

    sync_ghana_universities(
        UniversityModel=University,
        ProfileModel=Profile,
        ProductModel=Product,
    )


class Migration(migrations.Migration):

    dependencies = [
        ("universities", "0002_alter_university_options_university_category_and_more"),
        ("accounts", "0008_profile_business_name_user_firebase_uid"),
        ("marketplace", "0006_product_rejection_reason_product_status_and_more"),
    ]

    operations = [
        migrations.RunPython(sync_universities_forward, migrations.RunPython.noop),
    ]

