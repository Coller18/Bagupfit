from django.db import migrations


def create_sub_admin_group(apps, schema_editor):
    Group = apps.get_model('auth', 'Group')
    Permission = apps.get_model('auth', 'Permission')
    ContentType = apps.get_model('contenttypes', 'ContentType')

    group, _ = Group.objects.using(schema_editor.connection.alias).get_or_create(
        name='Sub-admin'
    )
    content_type, _ = ContentType.objects.using(schema_editor.connection.alias).get_or_create(
        app_label='api',
        model='barber',
    )

    for codename in ('view_barber', 'add_barber', 'change_barber'):
        permission, _ = Permission.objects.using(schema_editor.connection.alias).get_or_create(
            content_type=content_type,
            codename=codename,
            defaults={'name': codename.replace('_', ' ').capitalize()},
        )
        group.permissions.add(permission)


def remove_sub_admin_group(apps, schema_editor):
    Group = apps.get_model('auth', 'Group')
    Group.objects.using(schema_editor.connection.alias).filter(name='Sub-admin').delete()


class Migration(migrations.Migration):
    dependencies = [
        ('api', '0001_initial'),
        ('auth', '0012_alter_user_first_name_max_length'),
        ('contenttypes', '0002_remove_content_type_name'),
    ]

    operations = [
        migrations.RunPython(create_sub_admin_group, remove_sub_admin_group),
    ]
