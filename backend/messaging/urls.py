"""URL routing for buyer-seller messaging under `/api/messages/`."""

from django.urls import path
from .views import (
    ConversationDetailView,
    ConversationListCreateView,
    ConversationMessageCreateView,
    UnreadMessageCountView,
)

urlpatterns = [
    path("conversations/", ConversationListCreateView.as_view(), name="messaging-conversations"),
    path("conversations/<int:pk>/", ConversationDetailView.as_view(), name="messaging-conversation-detail"),
    path("conversations/<int:pk>/messages/", ConversationMessageCreateView.as_view(), name="messaging-send"),
    path("unread-count/", UnreadMessageCountView.as_view(), name="messaging-unread-count"),
]

