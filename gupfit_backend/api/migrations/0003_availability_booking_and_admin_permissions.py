import django.db.models.deletion
from django.db import migrations, models
from django.db.models import Q


def add_sub_admin_permissions(apps, schema_editor):
    alias = schema_editor.connection.alias
    Group = apps.get_model('auth', 'Group')
    Permission = apps.get_model('auth', 'Permission')
    ContentType = apps.get_model('contenttypes', 'ContentType')
    group, _ = Group.objects.using(alias).get_or_create(name='Sub-admin')

    permissions = {
        'barber': ('view_barber', 'add_barber', 'change_barber'),
        'availability': ('view_availability', 'add_availability'),
        'booking': ('view_booking',),
    }
    for model_name, codenames in permissions.items():
        content_type, _ = ContentType.objects.using(alias).get_or_create(
            app_label='api',
            model=model_name,
        )
        for codename in codenames:
            permission, _ = Permission.objects.using(alias).get_or_create(
                content_type=content_type,
                codename=codename,
                defaults={'name': codename.replace('_', ' ').capitalize()},
            )
            group.permissions.add(permission)


class Migration(migrations.Migration):
    dependencies = [
        ('api', '0002_create_sub_admin_group'),
        ('auth', '0012_alter_user_first_name_max_length'),
        ('contenttypes', '0002_remove_content_type_name'),
    ]

    operations = [
        migrations.CreateModel(
            name='Availability',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('date', models.DateField()),
                ('start_time', models.TimeField()),
                ('end_time', models.TimeField()),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('barber', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='availability', to='api.barber')),
            ],
            options={'ordering': ['date', 'start_time', 'barber__name']},
        ),
        migrations.CreateModel(
            name='Booking',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('customer_name', models.CharField(max_length=150)),
                ('customer_email', models.EmailField(max_length=254)),
                ('customer_phone', models.CharField(blank=True, max_length=30)),
                ('status', models.CharField(choices=[('confirmed', 'Confirmed'), ('cancelled', 'Cancelled')], default='confirmed', max_length=12)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('availability', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='bookings', to='api.availability')),
            ],
            options={'ordering': ['-created_at']},
        ),
        migrations.AddConstraint(
            model_name='availability',
            constraint=models.UniqueConstraint(fields=('barber', 'date', 'start_time'), name='unique_barber_availability_start'),
        ),
        migrations.AddConstraint(
            model_name='availability',
            constraint=models.CheckConstraint(condition=Q(('end_time__gt', models.F('start_time'))), name='availability_end_after_start'),
        ),
        migrations.AddConstraint(
            model_name='booking',
            constraint=models.UniqueConstraint(condition=Q(('status', 'confirmed')), fields=('availability',), name='one_confirmed_booking_per_slot'),
        ),
        migrations.RunPython(add_sub_admin_permissions, migrations.RunPython.noop),
    ]
