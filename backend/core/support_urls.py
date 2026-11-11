"""URL routes for customer support requests under `/api/support/`."""

from django.urls import path
from .support_views import SupportTicketDetailView, SupportTicketListCreateView

urlpatterns = [
    path("tickets/", SupportTicketListCreateView.as_view(), name="support-tickets"),
    path("tickets/<int:pk>/", SupportTicketDetailView.as_view(), name="support-ticket-detail"),
]

