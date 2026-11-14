from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import quote, urlsplit
from urllib.request import Request, urlopen
from uuid import uuid4

from django.conf import settings
from rest_framework.exceptions import ValidationError


def upload_barber_photo(uploaded_file):
    bucket = settings.SUPABASE_STORAGE_BUCKET
    api_key = settings.SUPABASE_SECRET_KEY
    if not api_key:
        raise ValidationError({'photo': 'Barber photo storage is not configured on the server.'})

    extension = Path(uploaded_file.name).suffix.lower()
    object_path = f'barbers/{uuid4().hex}{extension}'
    encoded_bucket = quote(bucket, safe='')
    encoded_path = quote(object_path, safe='/')
    endpoint = f'{settings.SUPABASE_URL.rstrip("/")}/storage/v1/object/{encoded_bucket}/{encoded_path}'
    content_type = getattr(uploaded_file, 'content_type', None) or 'application/octet-stream'
    request = Request(
        endpoint,
        data=uploaded_file.read(),
        headers={
            'apikey': api_key,
            'Authorization': f'Bearer {api_key}',
            'Content-Type': content_type,
            'x-upsert': 'false',
        },
        method='POST',
    )

    try:
        with urlopen(request, timeout=20) as response:
            if response.status not in (200, 201):
                raise ValidationError({'photo': 'Supabase Storage did not accept the photo upload.'})
    except HTTPError as error:
        raise ValidationError({'photo': f'Supabase Storage rejected the upload (HTTP {error.code}).'}) from error
    except (URLError, TimeoutError) as error:
        raise ValidationError({'photo': 'Could not reach Supabase Storage. Please retry the upload.'}) from error

    return (
        f'{settings.SUPABASE_URL.rstrip("/")}/storage/v1/object/public/'
        f'{encoded_bucket}/{encoded_path}'
    )


def delete_local_barber_photo(barber):
    if barber.photo:
        barber.photo.delete(save=False)
        barber.photo = ''
