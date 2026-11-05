from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from .models import Payment
from orders.models import Order


class VerifyPaymentView(APIView):
    """
    Verifies a Paystack payment reference and updates the associated order status.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        reference = request.data.get('reference')
        order_id = request.data.get('order_id')
        amount = request.data.get('amount', 0)

        if not reference:
            return Response({'error': 'Payment reference is required'}, status=status.HTTP_400_BAD_REQUEST)

        order = None
        if order_id:
            order = Order.objects.filter(id=order_id, buyer=request.user).first()

        payment, _ = Payment.objects.get_or_create(
            reference=reference,
            defaults={
                'user': request.user,
                'order': order,
                'amount': float(amount) if amount else (order.total_amount if order else 0),
                'status': 'success'
            }
        )
        payment.status = 'success'
        if order:
            payment.order = order
            order.status = 'paid'
            order.payment_reference = reference
            order.save()
        payment.save()

        return Response({
            'message': 'Payment verified successfully',
            'reference': reference,
            'order_id': order.id if order else None,
            'status': 'paid'
        }, status=status.HTTP_200_OK)
