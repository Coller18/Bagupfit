from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('api', '0009_haircutwork_is_featured'),
    ]

    operations = [
        migrations.CreateModel(
            name='CustomerTelegramConnection',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('customer_id', models.UUIDField(unique=True)),
                ('telegram_chat_id', models.CharField(blank=True, max_length=64, null=True, unique=True)),
                ('link_token_hash', models.CharField(blank=True, max_length=64, null=True, unique=True)),
                ('link_token_expires_at', models.DateTimeField(blank=True, null=True)),
                ('connected_at', models.DateTimeField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
            ],
            options={
                'verbose_name': 'customer Telegram connection',
                'verbose_name_plural': 'customer Telegram connections',
            },
        ),
    ]
