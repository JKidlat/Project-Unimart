from django.db import models
from .catalog import CATEGORY_PUBLIC, UNIVERSITY_CATEGORY_CHOICES


class University(models.Model):
    name = models.CharField(max_length=255, unique=True)
    short_name = models.CharField(max_length=50, unique=True)
    category = models.CharField(
        max_length=80,
        choices=UNIVERSITY_CATEGORY_CHOICES,
        default=CATEGORY_PUBLIC,
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "Universities"
        ordering = ['name']

    def __str__(self):
        return self.name
