from django.db import migrations


def grant_haircut_work_permissions(apps, schema_editor):
    alias = schema_editor.connection.alias
    Group = apps.get_model('auth', 'Group')
    Permission = apps.get_model('auth', 'Permission')
    ContentType = apps.get_model('contenttypes', 'ContentType')
    group, _ = Group.objects.using(alias).get_or_create(name='Sub-admin')
    content_type, _ = ContentType.objects.using(alias).get_or_create(
        app_label='api',
        model='haircutwork',
    )
    for codename in ('view_haircutwork', 'add_haircutwork', 'change_haircutwork', 'delete_haircutwork'):
        permission, _ = Permission.objects.using(alias).get_or_create(
            content_type=content_type,
            codename=codename,
            defaults={'name': codename.replace('_', ' ').capitalize()},
        )
        group.permissions.add(permission)


class Migration(migrations.Migration):
    dependencies = [
        ('api', '0007_haircutwork'),
        ('auth', '0012_alter_user_first_name_max_length'),
        ('contenttypes', '0002_remove_content_type_name'),
    ]

    operations = [
        migrations.RunPython(grant_haircut_work_permissions, migrations.RunPython.noop),
    ]
