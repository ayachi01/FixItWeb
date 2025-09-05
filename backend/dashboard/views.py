from django.views import View
from django.contrib.auth.mixins import LoginRequiredMixin, UserPassesTestMixin
from django.shortcuts import render
from core.models import Ticket, User, Building
from django.db.models import Count
from datetime import datetime, timedelta

class DashboardView(LoginRequiredMixin, UserPassesTestMixin, View):
    template_name = 'dashboard/dashboard.html'
    login_url = '/accounts/login/'

    def test_func(self):
        return self.request.user.is_superuser or self.request.user.role in ['admin', 'staff']

    def get(self, request):
        total_tickets = Ticket.objects.count()
        open_tickets = Ticket.objects.filter(status='open').count()
        recent_tickets = Ticket.objects.filter(
            created_at__gte=datetime.now() - timedelta(days=7)
        ).count()
        category_stats = Ticket.objects.values('category').annotate(count=Count('id'))
        urgency_stats = Ticket.objects.values('urgency').annotate(count=Count('id'))
        context = {
            'total_tickets': total_tickets,
            'open_tickets': open_tickets,
            'recent_tickets': recent_tickets,
            'category_stats': category_stats,
            'urgency_stats': urgency_stats,
            'buildings': Building.objects.all(),
            'users': User.objects.count(),
        }
        return render(request, self.template_name, context)