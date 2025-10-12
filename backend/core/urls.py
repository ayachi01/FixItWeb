# ==================================================
# urls.py
# ==================================================
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
    AuditLogViewSet,
    RoleViewSet,
    ForgotPasswordView,
    ResetPasswordView,
    InviteViewSet,
)

from .views import proxy_avatar


# -------------------- Router --------------------
router = DefaultRouter()
router.register(r'users', UserViewSet, basename='user')
router.register(r'tickets', TicketViewSet, basename='ticket')
router.register(r'locations', LocationViewSet, basename='location')
router.register(r'audit-logs', AuditLogViewSet, basename='audit-logs')
router.register(r'roles', RoleViewSet, basename='roles')
router.register(r'invites', InviteViewSet, basename='invites')

# -------------------- Custom actions --------------------
forgot_password_otp = UserViewSet.as_view({'post': 'reset_password_request'})
reset_password_otp = UserViewSet.as_view({'post': 'reset_password_confirm'})
register_self_service = UserViewSet.as_view({'post': 'register_self_service'})

# Ticket custom endpoints (extend TicketViewSet)
assign_ticket = TicketViewSet.as_view({'post': 'assign'})
eligible_fixers = TicketViewSet.as_view({'get': 'eligible_fixers'})
my_reports = TicketViewSet.as_view({'get': 'my_reports'})
assigned_tickets = TicketViewSet.as_view({'get': 'assigned'})
unassigned_tickets = TicketViewSet.as_view({'get': 'unassigned'})
report_issue = TicketViewSet.as_view({'post': 'report_issue'})
resolve_ticket = TicketViewSet.as_view({'post': 'resolve'})
close_ticket = TicketViewSet.as_view({'post': 'close'})
reopen_ticket = TicketViewSet.as_view({'post': 'reopen'})
analytics_tickets = TicketViewSet.as_view({'get': 'analytics'})  # ✅ Added analytics endpoint

# -------------------- URL Patterns --------------------
urlpatterns = [
    path('', include(router.urls)),

    # ---------------- Authentication ----------------
    path("auth/login/", EmailLoginView.as_view(), name="login"),
    path("auth/refresh/", CookieTokenRefreshView.as_view(), name="cookie_token_refresh"),
    path("token/refresh/", TokenRefreshView.as_view(), name="jwt_token_refresh"),
    path("auth/logout/", LogoutView.as_view(), name="logout"),
    path("auth/register/", register_self_service, name="register"),

    # ---------------- Password Reset (OTP-based) ----------------
    path("auth/forgot-password-otp/", forgot_password_otp, name="forgot_password_otp"),
    path("auth/reset-password-otp/", reset_password_otp, name="reset_password_otp"),

    # ---------------- Password Reset (Email-based) ----------------
    path("auth/forgot-password/", ForgotPasswordView.as_view(), name="forgot_password_email"),
    path("auth/reset-password/<uidb64>/<token>/", ResetPasswordView.as_view(), name="reset_password_email"),

    # ---------------- Email Verification ----------------
    path("auth/verify-email/<uidb64>/<token>/", VerifyEmailView.as_view(), name="verify_email"),

    # ---------------- User Profile ----------------
    path("auth/profile/", UserProfileView.as_view(), name="user_profile"),

    # ---------------- Ticket Endpoints ----------------
    path("tickets/<int:pk>/assign/", assign_ticket, name="ticket_assign"),
    path("tickets/<int:pk>/eligible_fixers/", eligible_fixers, name="eligible_fixers"),
    path("tickets/my_reports/", my_reports, name="my_reports"),
    path("tickets/assigned/", assigned_tickets, name="assigned_tickets"),
    path("tickets/unassigned/", unassigned_tickets, name="unassigned_tickets"),
    path("tickets/report_issue/", report_issue, name="report_issue"),
    path("tickets/<int:pk>/resolve/", resolve_ticket, name="resolve_ticket"),
    path("tickets/<int:pk>/close/", close_ticket, name="close_ticket"),
    path("tickets/<int:pk>/reopen/", reopen_ticket, name="reopen_ticket"),
    path("tickets/analytics/", analytics_tickets, name="tickets_analytics"),  # ✅ Added line

    path("proxy-avatar/", proxy_avatar, name="proxy-avatar"),

]
