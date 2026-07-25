from django.db import models

# Create your models here.
class University(models.Model):
    name = models.CharField(max_length=255, unique=True)
    short_name = models.CharField(max_length=50, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name
