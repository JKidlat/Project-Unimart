import os
import json
import urllib.request
import urllib.error
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from .models import Payment
from orders.models import Order


class VerifyPaymentView(APIView):
    """
    Verifies a Paystack payment reference and updates the associated order status.
    Performs server-to-server validation against Paystack API with amount and currency checks.
    Protected by 'payments' rate limiting.
    """
    permission_classes = [permissions.IsAuthenticated]
    throttle_scope = 'payments'

    def post(self, request):
        reference = request.data.get('reference')
        order_id = request.data.get('order_id')
        amount = request.data.get('amount', 0)

        if not reference:
            return Response({'error': 'Payment reference is required'}, status=status.HTTP_400_BAD_REQUEST)

        order = None
        if order_id:
            order = Order.objects.filter(id=order_id).first()
            if not order:
                return Response({'error': 'Order not found'}, status=status.HTTP_404_NOT_FOUND)
            # Verify the order belongs to the requesting user or user is staff
            if order.buyer != request.user and not (request.user.is_staff or request.user.is_superuser):
                return Response({'error': 'Permission denied for this order'}, status=status.HTTP_403_FORBIDDEN)

        paystack_secret = os.environ.get('PAYSTACK_SECRET_KEY')
        payment_verified = False
        channel = 'paystack'

        if paystack_secret and not paystack_secret.startswith('sk_test_placeholder'):
            # Real server-to-server Paystack verification
            try:
                verify_url = f"https://api.paystack.co/transaction/verify/{reference}"
                req = urllib.request.Request(
                    verify_url,
                    headers={
                        "Authorization": f"Bearer {paystack_secret}",
                        "Content-Type": "application/json"
                    }
                )
                with urllib.request.urlopen(req, timeout=10) as response:
                    res_body = json.loads(response.read().decode('utf-8'))
                    if res_body.get('status') and res_body.get('data', {}).get('status') == 'success':
                        t_data = res_body['data']
                        currency = t_data.get('currency', '').upper()
                        paid_pesewas = t_data.get('amount', 0)

                        if currency != 'GHS':
                            return Response({
                                'error': f'Invalid transaction currency: expected GHS, received {currency}'
                            }, status=status.HTTP_400_BAD_REQUEST)

                        if order:
                            expected_pesewas = int(round(float(order.total_amount) * 100))
                            if paid_pesewas < expected_pesewas:
                                return Response({
                                    'error': 'Paid amount does not match required order total amount.'
                                }, status=status.HTTP_400_BAD_REQUEST)

                        payment_verified = True
                        channel = t_data.get('channel', 'paystack')
                    else:
                        return Response({
                            'error': 'Payment verification failed at Paystack',
                            'details': res_body.get('message', 'Unsuccessful transaction')
                        }, status=status.HTTP_400_BAD_REQUEST)
            except urllib.error.HTTPError as e:
                error_content = e.read().decode('utf-8')
                return Response({
                    'error': f'Paystack verification error: {e.code}',
                    'details': error_content
                }, status=status.HTTP_400_BAD_REQUEST)
            except Exception as e:
                return Response({
                    'error': f'Unable to verify payment with gateway: {str(e)}'
                }, status=status.HTTP_502_BAD_GATEWAY)
        else:
            # Development/Sandbox fallback: accept references in DEBUG mode
            if settings.DEBUG:
                payment_verified = True
            else:
                return Response({
                    'error': 'Paystack secret key is not configured on the server.'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        payment, _ = Payment.objects.get_or_create(
            reference=reference,
            defaults={
                'user': request.user,
                'order': order,
                'amount': float(amount) if amount else (order.total_amount if order else 0),
                'channel': channel,
                'status': 'success' if payment_verified else 'pending'
            }
        )
        if payment_verified:
            payment.status = 'success'
            payment.channel = channel
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
            'status': 'paid' if payment_verified else payment.status
        }, status=status.HTTP_200_OK)

