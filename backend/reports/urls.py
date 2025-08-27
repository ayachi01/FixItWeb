from django.urls import path
from . import views

app_name = 'reports'

urlpatterns = [
    path('', views.TicketListView.as_view(), name='ticket_list'),
    path('new/', views.TicketCreateView.as_view(), name='ticket_new'),
    path('<int:pk>/', views.TicketDetailView.as_view(), name='ticket_detail'),
    path('<int:pk>/update/', views.TicketUpdateView.as_view(), name='ticket_update'),
    path('register/', views.register, name='register'),
    path('dashboard/', views.AdminDashboardView.as_view(), name='admin_dashboard'),
    path('api/tickets/', views.APITicketListCreateView.as_view(), name='api_ticket_list_create'),
    path('api/tickets/<int:pk>/', views.APITicketDetailView.as_view(), name='api_ticket_detail'),
    path('api/notifications/', views.APINotificationListView.as_view(), name='api_notification_list'),
    path('api/users/', views.APIUserListView.as_view(), name='api_user_list'),
    path('api/register/', views.APIRegisterView.as_view(), name='api_register'),
]