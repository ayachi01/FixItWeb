from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    LocationViewSet,
    UserViewSet,
    TicketViewSet,
    UserProfileView,
    EmailLoginView,
    CookieTokenRefreshView,
    LogoutView,
    VerifyEmailView,
)

router = DefaultRouter()
router.register(r'users', UserViewSet, basename='user')
router.register(r'tickets', TicketViewSet, basename='ticket')
router.register(r'locations', LocationViewSet, basename='location')

# ✅ Custom actions on UserViewSet
forgot_password_otp = UserViewSet.as_view({'post': 'reset_password_request'})
reset_password_otp = UserViewSet.as_view({'post': 'reset_password_confirm'})
register_self_service = UserViewSet.as_view({'post': 'register_self_service'})

urlpatterns = [
    path('', include(router.urls)),

    # Authentication
    path("auth/login/", EmailLoginView.as_view(), name="login"),
    path("auth/refresh/", CookieTokenRefreshView.as_view(), name="cookie_token_refresh"),
    path("token/refresh/", TokenRefreshView.as_view(), name="jwt_token_refresh"),
    path("auth/logout/", LogoutView.as_view(), name="logout"),
    path("auth/register/", register_self_service, name="register"),

    # ✅ OTP-based reset password
    path("auth/forgot-password-otp/", forgot_password_otp, name="forgot_password_otp"),
    path("auth/reset-password-otp/", reset_password_otp, name="reset_password_otp"),

    # Email verification
    path("auth/verify-email/<uidb64>/<token>/", VerifyEmailView.as_view(), name="verify_email"),

    # Profile
    path("auth/profile/", UserProfileView.as_view(), name="user_profile"),
]
