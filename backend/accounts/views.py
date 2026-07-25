"""
Authentication views for user registration and logout.

Handles user registration and token logout functionality.
"""

from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.exceptions import TokenError
from .serializers import RegisterSerializer, UserProfileSerializer
from django.contrib.auth import get_user_model

User = get_user_model()


class RegisterView(generics.CreateAPIView):
    """
    Register a new user account.
    
    Creates a new user with email-based authentication and an associated profile.
    The university_id is required to link the user to a university.
    
    Permission: AllowAny (public registration)
    """
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]

    def create(self, request, *args, **kwargs):
        """
        Create a new user and return success response.
        
        The serializer handles user and profile creation.
        We return a success message without exposing sensitive data.
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        return Response(
            {
                'message': 'User registered successfully.',
                'email': user.email
            },
            status=status.HTTP_201_CREATED
        )


class LogoutView(generics.GenericAPIView):
    """
    Logout view to invalidate refresh tokens.
    
    Accepts a refresh token in the request body and attempts to blacklist it.
    For a production system, consider using rest_framework_simplejwt.token_blacklist
    for proper token blacklisting.
    
    Permission: IsAuthenticated
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        """
        Invalidate the provided refresh token.
        
        The refresh token should be sent in the request body as 'refresh'.
        This prevents the token from being used to obtain new access tokens.
        
        Note: Without token_blacklist app, this validates the token but doesn't
        actually blacklist it. For production, install and configure
        rest_framework_simplejwt.token_blacklist.
        """
        try:
            refresh_token = request.data.get('refresh')
            
            if not refresh_token:
                return Response(
                    {'error': 'Refresh token is required.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Validate the token
            token = RefreshToken(refresh_token)
            
            # Attempt to blacklist the token if blacklist is available
            # This will work if rest_framework_simplejwt.token_blacklist is installed
            try:
                token.blacklist()
            except AttributeError:
                # Blacklist not available - token is still validated
                # In production, install token_blacklist app for proper blacklisting
                pass
            
            return Response(
                {'message': 'Successfully logged out.'},
                status=status.HTTP_200_OK
            )
        except TokenError:
            return Response(
                {'error': 'Invalid refresh token.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {'error': 'An error occurred during logout.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class UserProfileView(generics.RetrieveAPIView):
    """
    Get the logged-in user's profile.
    
    Returns the user data and associated profile data.
    """
    serializer_class = UserProfileSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user
