# core/migrations/0002_populate_roles_permissions.py
from django.db import migrations

def populate_roles_permissions(apps, schema_editor):
    Role = apps.get_model("core", "Role")
    Permission = apps.get_model("core", "Permission")
    DomainRoleMapping = apps.get_model("core", "DomainRoleMapping")
    Location = apps.get_model("core", "Location")

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
        "phinmaed.com": roles["Student"],
    }

    for domain, role in domain_map.items():
        DomainRoleMapping.objects.update_or_create(domain=domain, defaults={"role": role})

    # ---- Initial Locations (32 entries) ----
    initial_locations = [
        {"building_name": "PTC", "floor_number": "1", "room_identifier": "Main"},
        {"building_name": "MBA Hall", "floor_number": "1", "room_identifier": "101"},
        {"building_name": "MBA Hall", "floor_number": "2", "room_identifier": "201"},
        {"building_name": "MBA - Engineering", "floor_number": "1", "room_identifier": "101"},
        {"building_name": "MBA - Engineering", "floor_number": "2", "room_identifier": "201"},
        {"building_name": "Riverside Building", "floor_number": "1", "room_identifier": "101"},
        {"building_name": "Riverside Building", "floor_number": "2", "room_identifier": "201"},
        {"building_name": "Gymnasium", "floor_number": "1", "room_identifier": "Hall"},
        {"building_name": "Student Plaza (SP)", "floor_number": "1", "room_identifier": "Main"},
        {"building_name": "Phinma Garden", "floor_number": "1", "room_identifier": "Garden"},
        {"building_name": "North Hall", "floor_number": "1", "room_identifier": "101"},
        {"building_name": "North Hall", "floor_number": "2", "room_identifier": "201"},
        {"building_name": "CMA", "floor_number": "1", "room_identifier": "101"},
        {"building_name": "CHS", "floor_number": "1", "room_identifier": "101"},
        {"building_name": "BASIC ED", "floor_number": "1", "room_identifier": "101"},
        {"building_name": "CSDL", "floor_number": "1", "room_identifier": "101"},
        {"building_name": "ITS", "floor_number": "1", "room_identifier": "101"},
        {"building_name": "FVR", "floor_number": "1", "room_identifier": "101"},
        {"building_name": "OP", "floor_number": "1", "room_identifier": "101"},
        {"building_name": "ATRIUM", "floor_number": "1", "room_identifier": "Lobby"},
        {"building_name": "Phinma Ave", "floor_number": "1", "room_identifier": "Entrance"},
        {"building_name": "Main Entrance Gate", "floor_number": "Ground", "room_identifier": "Gate"},
        {"building_name": "Vehicle Entrance", "floor_number": "Ground", "room_identifier": "Gate"},
        {"building_name": "Old Stage", "floor_number": "1", "room_identifier": "Stage"},
        {"building_name": "Library", "floor_number": "1", "room_identifier": "101"},
        {"building_name": "Library", "floor_number": "2", "room_identifier": "201"},
        {"building_name": "Admin Building", "floor_number": "1", "room_identifier": "101"},
        {"building_name": "Admin Building", "floor_number": "2", "room_identifier": "201"},
        {"building_name": "Engineering Block", "floor_number": "1", "room_identifier": "101"},
        {"building_name": "Engineering Block", "floor_number": "2", "room_identifier": "201"},
        {"building_name": "Cafeteria", "floor_number": "1", "room_identifier": "Main"},
        {"building_name": "Auditorium", "floor_number": "1", "room_identifier": "Main Hall"},
    ]

    for loc in initial_locations:
        Location.objects.update_or_create(
            building_name=loc["building_name"],
            floor_number=loc["floor_number"],
            room_identifier=loc["room_identifier"],
        )

class Migration(migrations.Migration):

    dependencies = [
        ('core', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(populate_roles_permissions),
    ]
