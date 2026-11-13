from django.urls import path
from .views import (
    OrderListCreateView,
    OrderDetailView,
    SellerDeliverySettingsView,
    BuyerDeliveryPreferencesView,
    SellerOrderListView,
    SellerOrderDetailView,
    SellerOrderAcceptView,
    SellerOrderRejectView,
    SellerOrderProposeDeliveryView,
    SellerOrderUpdateStatusView,
    SellerOrderCancelView,
    SellerOrderReportIssueView,
    DeliveryAgreementAcceptView,
    DeliveryAgreementRejectView,
)

urlpatterns = [
    # Seller delivery defaults & Buyer preferences
    path("seller-delivery-settings/", SellerDeliverySettingsView.as_view(), name="seller-delivery-settings"),
    path("buyer-delivery-preferences/", BuyerDeliveryPreferencesView.as_view(), name="buyer-delivery-preferences"),

    # Individual Seller Orders (Suborders)
    path("seller-orders/", SellerOrderListView.as_view(), name="seller-order-list"),
    path("seller-orders/<int:pk>/", SellerOrderDetailView.as_view(), name="seller-order-detail"),
    path("seller-orders/<int:pk>/accept/", SellerOrderAcceptView.as_view(), name="seller-order-accept"),
    path("seller-orders/<int:pk>/reject/", SellerOrderRejectView.as_view(), name="seller-order-reject"),
    path("seller-orders/<int:pk>/propose-delivery/", SellerOrderProposeDeliveryView.as_view(), name="seller-order-propose-delivery"),
    path("seller-orders/<int:pk>/update-status/", SellerOrderUpdateStatusView.as_view(), name="seller-order-update-status"),
    path("seller-orders/<int:pk>/cancel/", SellerOrderCancelView.as_view(), name="seller-order-cancel"),
    path("seller-orders/<int:pk>/report-issue/", SellerOrderReportIssueView.as_view(), name="seller-order-report-issue"),

    # Delivery Agreements (Proposals)
    path("delivery-agreements/<int:pk>/accept/", DeliveryAgreementAcceptView.as_view(), name="delivery-agreement-accept"),
    path("delivery-agreements/<int:pk>/reject/", DeliveryAgreementRejectView.as_view(), name="delivery-agreement-reject"),

    # Master Orders (Buyer checkout & master order detail)
    path("", OrderListCreateView.as_view(), name="order-list-create"),
    path("<int:pk>/", OrderDetailView.as_view(), name="order-detail"),
]
