# core/migrations/0002_populate_roles_permissions.py
from django.db import migrations

def populate_roles_permissions(apps, schema_editor):
    Role = apps.get_model("core", "Role")
    Permission = apps.get_model("core", "Permission")
    DomainRoleMapping = apps.get_model("core", "DomainRoleMapping")

    # ---- Roles + descriptions ----
    roles_info = {
        "Student": "A student enrolled in the university.",
        "Faculty": "University teaching staff or professors.",
        "Admin Staff": "Administrative staff handling non-academic tasks.",
        "Visitor": "Temporary or guest users with limited access.",
        "Janitorial Staff": "Staff responsible for cleaning duties.",
        "Utility Worker": "Staff handling plumbing, electrical, HVAC, or structural work.",
        "IT Support": "Staff responsible for technology and equipment issues.",
        "Security Guard": "Staff responsible for campus security and disturbances.",
        "Maintenance Officer": "Staff managing maintenance tasks and assignments.",
        "Registrar": "University registrar with administrative and user management rights.",
        "HR": "Human Resources staff with user management permissions.",
        "University Admin": "High-level university admin with full access.",
    }

    roles = {}
    for name, desc in roles_info.items():
        role_obj, _ = Role.objects.update_or_create(name=name, defaults={"description": desc})
        roles[name] = role_obj

    # ---- Permissions ----
    permissions_info = {
        "Student": {"can_report": True,  "can_fix": False, "can_assign": False, "can_manage_users": False, "is_admin_level": False, "allowed_categories": []},
        "Faculty": {"can_report": True,  "can_fix": False, "can_assign": False, "can_manage_users": False, "is_admin_level": False, "allowed_categories": []},
        "Admin Staff": {"can_report": True,  "can_fix": False, "can_assign": False, "can_manage_users": False, "is_admin_level": False, "allowed_categories": []},
        "Visitor": {"can_report": True,  "can_fix": False, "can_assign": False, "can_manage_users": False, "is_admin_level": False, "allowed_categories": []},
        "Janitorial Staff": {"can_report": True,  "can_fix": True,  "can_assign": False, "can_manage_users": False, "is_admin_level": False, "allowed_categories": ["Cleaning"]},
        "Utility Worker": {"can_report": True,  "can_fix": True,  "can_assign": False, "can_manage_users": False, "is_admin_level": False, "allowed_categories": ["Plumbing", "Electrical", "Structural", "HVAC"]},
        "IT Support": {"can_report": True,  "can_fix": True,  "can_assign": False, "can_manage_users": False, "is_admin_level": False, "allowed_categories": ["Technology", "Equipment"]},
        "Security Guard": {"can_report": True,  "can_fix": True,  "can_assign": False, "can_manage_users": False, "is_admin_level": False, "allowed_categories": ["Disturbance", "Security", "Parking"]},
        "Maintenance Officer": {"can_report": True, "can_fix": False, "can_assign": True, "can_manage_users": False, "is_admin_level": False, "allowed_categories": []},
        "Registrar": {"can_report": True,  "can_fix": False, "can_assign": False, "can_manage_users": True,  "is_admin_level": True, "allowed_categories": []},
        "HR": {"can_report": True,  "can_fix": False, "can_assign": False, "can_manage_users": True,  "is_admin_level": True, "allowed_categories": []},
        "University Admin": {"can_report": True,  "can_fix": False, "can_assign": True,  "can_manage_users": True,  "is_admin_level": True, "allowed_categories": []},
    }

    for role_name, perms in permissions_info.items():
        Permission.objects.update_or_create(role=roles[role_name], defaults=perms)

    # ---- Domain → Role Mapping ----
    domain_map = {
        "student.pirmaed.com": roles["Student"],
        "faculty.pirmaed.com": roles["Faculty"],
        "admin.pirmaed.com": roles["Admin Staff"],
    }

    for domain, role in domain_map.items():
        DomainRoleMapping.objects.update_or_create(domain=domain, defaults={"role": role})

class Migration(migrations.Migration):

    dependencies = [
        ('core', '0001_initial'),  # your previous migration
    ]

    operations = [
        migrations.RunPython(populate_roles_permissions),
    ]
