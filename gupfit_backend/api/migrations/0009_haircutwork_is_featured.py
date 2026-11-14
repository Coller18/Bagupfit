from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('api', '0008_haircutwork_admin_permissions'),
    ]

    operations = [
        migrations.AddField(
            model_name='haircutwork',
            name='is_featured',
            field=models.BooleanField(default=False),
        ),
    ]
