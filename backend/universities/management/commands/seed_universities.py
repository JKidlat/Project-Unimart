"""
Idempotent Django management command to sync the 67 canonical Ghanaian
universities and university colleges without duplicating records or
disconnecting existing users/products.

Usage:
    py manage.py seed_universities
"""

from django.core.management.base import BaseCommand
from universities.catalog import sync_ghana_universities


class Command(BaseCommand):
    help = "Reconcile and seed the canonical 67 Ghanaian institutions idempotently."

    def handle(self, *args, **options):
        stats = sync_ghana_universities()
        self.stdout.write(
            self.style.SUCCESS(
                "University directory synced: "
                f"created={stats['created']}, updated={stats['updated']}, "
                f"merged={stats['merged']}, deactivated={stats['deactivated']}, "
                f"removed_unused={stats['removed_unused']}"
            )
        )

