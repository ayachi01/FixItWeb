from django.shortcuts import render, redirect
from django.views.generic import ListView, DetailView, CreateView, UpdateView, View
from django.contrib.auth.mixins import LoginRequiredMixin, UserPassesTestMixin
from django.urls import reverse_lazy
from django.contrib.auth import login
from django.contrib.auth.forms import UserCreationForm
from django import forms
from rest_framework import generics
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.response import Response
from rest_framework import status
from .models import User, Ticket, Building, Notification, ChatLog
from .serializers import UserSerializer, TicketSerializer, NotificationSerializer, BuildingSerializer, ChatLogSerializer
from django.shortcuts import get_object_or_404

class CustomUserCreationForm(UserCreationForm):
    class Meta:
        model = User
        fields = ['username', 'email', 'password1', 'password2', 'role', 'university_id', 'phone_number', 'accessibility_needs']
        widgets = {
            'role': forms.Select(choices=[
                ('', 'Select Role'),
                ('student', 'Student'),
                ('faculty', 'Faculty/Instructor'),
                ('administrative_staff', 'Administrative Staff'),
                ('visitor', 'Visitor/Guest'),
                ('janitorial_staff', 'Janitorial Staff'),
                ('utility_worker', 'Utility Worker/Technician'),
                ('it_support', 'IT Support'),
                ('security_guard', 'Security Guard'),
                ('maintenance_officer', 'Maintenance Officer'),
                ('admin_registrar_hr', 'Admin/Registrar/HR'),
                ('university_admin', 'University Admin'),
            ]),
        }

    def save(self, commit=True):
        user = super().save(commit=False)
        if user.role in ['university_admin', 'admin_registrar_hr']:
            user.is_staff = True
        if user.role == 'university_admin':
            user.is_superuser = True
        if commit:
            user.save()
        return user

def register(request):
    if request.method == 'POST':
        form = CustomUserCreationForm(request.POST)
        if form.is_valid():
            user = form.save()
            login(request, user)
            return redirect('core:ticket_list')
    else:
        form = CustomUserCreationForm()
    return render(request, 'registration/register.html', {'form': form})

class PublicTicketCreateView(CreateView):
    model = Ticket
    template_name = 'core/public_ticket_form.html'
    fields = ['description', 'building', 'room', 'category', 'urgency', 'photo']
    success_url = reverse_lazy('core:home')

    def form_valid(self, form):
        form.instance.reporter = self.request.user
        form.instance.ai_suggested_category = form.cleaned_data['category']
        form.instance.ai_suggested_urgency = form.cleaned_data['urgency']
        form.instance.ai_sentiment_score = 0.5
        response = super().form_valid(form)
        category = form.cleaned_data['category']
        maintenance_roles = {
            'plumbing': ['utility_worker'],
            'electrical': ['utility_worker'],
            'structural': ['utility_worker'],
            'equipment': ['utility_worker'],
            'cleaning': ['janitorial_staff'],
            'hvac': ['utility_worker'],
            'parking': ['security_guard'],
            'disturbance': ['security_guard'],
            'security': ['security_guard'],
            'tech': ['it_support'],
            'other': ['maintenance_officer', 'janitorial_staff', 'utility_worker', 'it_support', 'security_guard'],
        }
        roles = maintenance_roles.get(category, ['maintenance_officer'])
        maintenance_users = User.objects.filter(role__in=roles)
        for user in maintenance_users:
            Notification.objects.create(
                user=user,
                ticket=form.instance,
                notification_type='status_update',
                message=f"New ticket #{form.instance.id}: {form.instance.description} ({form.instance.building.name}, {category})"
            )
        return response

class PublicTicketListView(ListView):
    model = Ticket
    template_name = 'core/public_ticket_list.html'
    context_object_name = 'tickets'

    def get_queryset(self):
        queryset = Ticket.objects.filter(status='open')
        building_id = self.request.GET.get('building')
        category = self.request.GET.get('category')
        if building_id:
            queryset = queryset.filter(building_id=building_id)
        if category:
            queryset = queryset.filter(category=category)
        return queryset

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['buildings'] = Building.objects.all()
        context['categories'] = Ticket.CATEGORY_CHOICES
        context['unread_notifications_count'] = self.request.user.notifications.filter(is_read=False).count() if self.request.user.is_authenticated else 0
        return context

class FacultyDashboardView(LoginRequiredMixin, UserPassesTestMixin, View):
    def test_func(self):
        return self.request.user.role in ['faculty', 'admin_registrar_hr']

    def get(self, request):
        user = request.user
        tickets = Ticket.objects.filter(reporter=user)
        buildings = Building.objects.all()
        ticket_stats = {
            'open': Ticket.objects.filter(reporter=user, status='open').count(),
            'accepted': Ticket.objects.filter(reporter=user, status='accepted').count(),
            'resolved': Ticket.objects.filter(reporter=user, status='resolved').count(),
            'closed': Ticket.objects.filter(reporter=user, status='closed').count(),
        }
        return render(request, 'core/faculty_dashboard.html', {
            'tickets': tickets,
            'buildings': buildings,
            'ticket_stats': ticket_stats,
        })

class NotificationListView(LoginRequiredMixin, ListView):
    model = Notification
    template_name = 'core/notification_list.html'
    context_object_name = 'notifications'

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user).order_by('-created_at')

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['unread_notifications_count'] = self.request.user.notifications.filter(is_read=False).count()
        return context

    def post(self, request):
        notification_ids = request.POST.getlist('notification_ids')
        Notification.objects.filter(id__in=notification_ids, user=request.user).update(is_read=True)
        return redirect('core:notification_list')

class TicketListView(LoginRequiredMixin, ListView):
    model = Ticket
    template_name = 'core/ticket_list.html'
    context_object_name = 'tickets'

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser or user.role in ['university_admin', 'maintenance_officer', 'admin_registrar_hr']:
            return Ticket.objects.all()
        elif user.role in ['janitorial_staff', 'utility_worker', 'it_support', 'security_guard']:
            categories = {
                'janitorial_staff': ['cleaning'],
                'utility_worker': ['plumbing', 'electrical', 'structural', 'equipment', 'hvac'],
                'it_support': ['tech'],
                'security_guard': ['parking', 'disturbance', 'security'],
            }
            allowed_categories = categories.get(user.role, ['other'])
            return Ticket.objects.filter(
                status__in=['open', 'accepted'],
                category__in=allowed_categories
            ).order_by('-urgency')
        return Ticket.objects.filter(reporter=user)

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['unread_notifications_count'] = self.request.user.notifications.filter(is_read=False).count()
        return context

class TicketCreateView(LoginRequiredMixin, CreateView):
    model = Ticket
    template_name = 'core/ticket_form.html'
    fields = ['description', 'building', 'room', 'category', 'urgency', 'photo']
    success_url = reverse_lazy('core:ticket_list')

    def form_valid(self, form):
        form.instance.reporter = self.request.user
        form.instance.ai_suggested_category = form.cleaned_data['category']
        form.instance.ai_suggested_urgency = form.cleaned_data['urgency']
        form.instance.ai_sentiment_score = 0.5
        response = super().form_valid(form)
        category = form.cleaned_data['category']
        maintenance_roles = {
            'plumbing': ['utility_worker'],
            'electrical': ['utility_worker'],
            'structural': ['utility_worker'],
            'equipment': ['utility_worker'],
            'cleaning': ['janitorial_staff'],
            'hvac': ['utility_worker'],
            'parking': ['security_guard'],
            'disturbance': ['security_guard'],
            'security': ['security_guard'],
            'tech': ['it_support'],
            'other': ['maintenance_officer', 'janitorial_staff', 'utility_worker', 'it_support', 'security_guard'],
        }
        roles = maintenance_roles.get(category, ['maintenance_officer'])
        maintenance_users = User.objects.filter(role__in=roles)
        for user in maintenance_users:
            Notification.objects.create(
                user=user,
                ticket=form.instance,
                notification_type='status_update',
                message=f"New ticket #{form.instance.id}: {form.instance.description} ({form.instance.building.name}, {category})"
            )
        return response

class TicketUpdateView(LoginRequiredMixin, UserPassesTestMixin, UpdateView):
    model = Ticket
    template_name = 'core/ticket_form.html'
    fields = ['description', 'building', 'room', 'category', 'urgency', 'photo', 'status', 'assigned_to', 'resolution_photo']
    success_url = reverse_lazy('core:ticket_list')

    def test_func(self):
        return self.request.user.is_superuser or self.request.user.role in ['university_admin', 'administrative_staff', 'janitorial_staff', 'utility_worker', 'it_support', 'security_guard', 'maintenance_officer']

    def form_valid(self, form):
        response = super().form_valid(form)
        if form.instance.assigned_to:
            Notification.objects.create(
                user=form.instance.assigned_to,
                ticket=form.instance,
                notification_type='assignment',
                message=f"Ticket #{form.instance.id} assigned to you: {form.instance.description}"
            )
        return response

class TicketAcceptView(LoginRequiredMixin, UserPassesTestMixin, View):
    def test_func(self):
        return self.request.user.role in ['janitorial_staff', 'utility_worker', 'it_support', 'security_guard']

    def post(self, request, pk):
        ticket = Ticket.objects.get(pk=pk)
        if ticket.status == 'open':
            ticket.status = 'accepted'
            ticket.assigned_to = request.user
            ticket.save()
            Notification.objects.create(
                user=request.user,
                ticket=ticket,
                notification_type='assignment',
                message=f"You accepted ticket #{ticket.id}: {ticket.description}"
            )
        return redirect('core:ticket_list')

class TicketResolveView(LoginRequiredMixin, UserPassesTestMixin, UpdateView):
    model = Ticket
    template_name = 'core/ticket_resolve.html'
    fields = ['resolution_photo']
    success_url = reverse_lazy('core:ticket_list')

    def test_func(self):
        return self.request.user.role in ['janitorial_staff', 'utility_worker', 'it_support', 'security_guard']

    def form_valid(self, form):
        form.instance.status = 'resolved'
        form.instance.assigned_to = self.request.user
        response = super().form_valid(form)
        Notification.objects.create(
            user=form.instance.reporter,
            ticket=form.instance,
            notification_type='status_update',
            message=f"Your ticket #{form.instance.id} has been resolved"
        )
        return response

class TicketDetailView(LoginRequiredMixin, DetailView):
    model = Ticket
    template_name = 'core/ticket_detail.html'
    context_object_name = 'ticket'

class TicketFeedbackView(LoginRequiredMixin, UserPassesTestMixin, CreateView):
    model = ChatLog
    fields = ['user_message']
    template_name = 'core/ticket_feedback.html'
    success_url = reverse_lazy('core:ticket_list')

    def test_func(self):
        ticket = get_object_or_404(Ticket, id=self.kwargs['pk'])
        return self.request.user == ticket.reporter

    def form_valid(self, form):
        ticket = get_object_or_404(Ticket, id=self.kwargs['pk'])
        form.instance.user = self.request.user
        form.instance.ticket = ticket
        form.instance.bot_response = "Thank you for your feedback!"
        response = super().form_valid(form)
        Notification.objects.create(
            user=ticket.assigned_to,
            ticket=ticket,
            notification_type='comment',
            message=f"Feedback received on ticket #{ticket.id}: {form.instance.user_message}"
        )
        return response

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['ticket'] = get_object_or_404(Ticket, id=self.kwargs['pk'])
        return context

class BuildingListView(LoginRequiredMixin, UserPassesTestMixin, ListView):
    model = Building
    template_name = 'core/building_list.html'
    context_object_name = 'buildings'

    def test_func(self):
        return self.request.user.is_superuser or self.request.user.role in ['university_admin', 'administrative_staff', 'maintenance_officer', 'admin_registrar_hr', 'faculty']

class BuildingCreateView(LoginRequiredMixin, UserPassesTestMixin, CreateView):
    model = Building
    template_name = 'core/building_form.html'
    fields = ['name', 'campus', 'latitude', 'longitude']
    success_url = reverse_lazy('core:building_list')

    def test_func(self):
        return self.request.user.is_superuser or self.request.user.role in ['university_admin', 'maintenance_officer']

class AdminDashboardView(LoginRequiredMixin, UserPassesTestMixin, ListView):
    model = Ticket
    template_name = 'core/admin_dashboard.html'
    context_object_name = 'tickets'

    def test_func(self):
        return self.request.user.is_superuser or self.request.user.is_staff or self.request.user.role == 'university_admin'

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['users'] = User.objects.all()
        context['buildings'] = Building.objects.all()
        context['notifications'] = Notification.objects.filter(user=self.request.user, is_read=False)
        context['unread_notifications_count'] = self.request.user.notifications.filter(is_read=False).count()
        return context

# API Views
class APITicketListCreateView(generics.ListCreateAPIView):
    queryset = Ticket.objects.all()
    serializer_class = TicketSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser or user.role in ['university_admin', 'maintenance_officer', 'admin_registrar_hr']:
            return Ticket.objects.all()
        elif user.role in ['janitorial_staff', 'utility_worker', 'it_support', 'security_guard']:
            categories = {
                'janitorial_staff': ['cleaning'],
                'utility_worker': ['plumbing', 'electrical', 'structural', 'equipment', 'hvac'],
                'it_support': ['tech'],
                'security_guard': ['parking', 'disturbance', 'security'],
            }
            allowed_categories = categories.get(user.role, ['other'])
            return Ticket.objects.filter(status__in=['open', 'accepted'], category__in=allowed_categories).order_by('-urgency')
        return Ticket.objects.filter(reporter=user)

    def perform_create(self, serializer):
        description = self.request.data.get('description', '')
        category = self.request.data.get('category', 'other')
        serializer.save(
            reporter=self.request.user,
            ai_suggested_category=category,
            ai_suggested_urgency=serializer.validated_data.get('urgency', 'low'),
            ai_sentiment_score=0.5
        )
        maintenance_roles = {
            'plumbing': ['utility_worker'],
            'electrical': ['utility_worker'],
            'structural': ['utility_worker'],
            'equipment': ['utility_worker'],
            'cleaning': ['janitorial_staff'],
            'hvac': ['utility_worker'],
            'parking': ['security_guard'],
            'disturbance': ['security_guard'],
            'security': ['security_guard'],
            'tech': ['it_support'],
            'other': ['maintenance_officer', 'janitorial_staff', 'utility_worker', 'it_support', 'security_guard'],
        }
        roles = maintenance_roles.get(category, ['maintenance_officer'])
        maintenance_users = User.objects.filter(role__in=roles)
        for user in maintenance_users:
            Notification.objects.create(
                user=user,
                ticket=serializer.instance,
                notification_type='status_update',
                message=f"New API ticket #{serializer.instance.id}: {description} ({category})"
            )

class APITicketDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Ticket.objects.all()
    serializer_class = TicketSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser or user.role in ['university_admin', 'administrative_staff', 'janitorial_staff', 'utility_worker', 'it_support', 'security_guard', 'maintenance_officer']:
            return Ticket.objects.all()
        return Ticket.objects.filter(reporter=user)

    def perform_update(self, serializer):
        serializer.save()
        if serializer.instance.assigned_to:
            Notification.objects.create(
                user=serializer.instance.assigned_to,
                ticket=serializer.instance,
                notification_type='assignment',
                message=f"Ticket #{serializer.instance.id} assigned to you: {serializer.instance.description}"
            )

class APINotificationListView(generics.ListAPIView):
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user)

class APIUserListView(generics.ListAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAdminUser]

class APIRegisterView(generics.CreateAPIView):
    serializer_class = UserSerializer
    permission_classes = [IsAdminUser]

    def perform_create(self, serializer):
        user = serializer.save()
        user.set_password(self.request.data.get('password'))
        user.save()

class APIBuildingListCreateView(generics.ListCreateAPIView):
    queryset = Building.objects.all()
    serializer_class = BuildingSerializer
    permission_classes = [IsAdminUser]

class APIChatLogListView(generics.ListAPIView):
    queryset = ChatLog.objects.all()
    serializer_class = ChatLogSerializer
    permission_classes = [IsAdminUser]