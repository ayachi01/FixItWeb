# core/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    LocationViewSet,
    UserViewSet,
    TicketViewSet,
    UserProfileView,
    EmailLoginView,
    CookieTokenRefreshView,
    LogoutView,
    RegisterView,
    ForgotPasswordView,
    ResetPasswordView,
    VerifyEmailView,
)

# 🔹 Register ViewSets with DRF router
router = DefaultRouter()
router.register(r'users', UserViewSet, basename='user')
router.register(r'tickets', TicketViewSet, basename='ticket')
router.register(r'locations', LocationViewSet, basename='location')

# ✅ Hook OTP reset actions from UserViewSet
forgot_password_otp = UserViewSet.as_view({'post': 'reset_password_request'})
reset_password_otp = UserViewSet.as_view({'post': 'reset_password_confirm'})

# 🔹 URL patterns
urlpatterns = [
    # ViewSets (users, tickets, locations, etc.)
    path('', include(router.urls)),

    # ✅ Authentication
    path("auth/login/", EmailLoginView.as_view(), name="login"),
    path("auth/refresh/", CookieTokenRefreshView.as_view(), name="token_refresh"),
    path("auth/logout/", LogoutView.as_view(), name="logout"),
    path("auth/register/", RegisterView.as_view(), name="register"),

    # ✅ Reset password via email link
    path("auth/forgot-password/", ForgotPasswordView.as_view(), name="forgot_password"),
    path("auth/reset-password/<uidb64>/<token>/", ResetPasswordView.as_view(), name="reset_password"),

    # ✅ Reset password via OTP
    path("auth/forgot-password-otp/", forgot_password_otp, name="forgot_password_otp"),
    path("auth/reset-password-otp/", reset_password_otp, name="reset_password_otp"),

    # ✅ Email verification
    path("auth/verify-email/<uidb64>/<token>/", VerifyEmailView.as_view(), name="verify_email"),

    # ✅ User profile
    path("auth/profile/", UserProfileView.as_view(), name="user_profile"),
]
