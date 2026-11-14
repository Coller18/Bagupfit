from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import Request, urlopen
from uuid import uuid4

from django.conf import settings
from rest_framework.exceptions import ValidationError


def upload_public_image(uploaded_file, folder):
    bucket = settings.SUPABASE_STORAGE_BUCKET
    api_key = settings.SUPABASE_SECRET_KEY
    if not api_key:
        raise ValidationError({'image': 'Image storage is not configured on the server.'})

    extension = Path(uploaded_file.name).suffix.lower()
    object_path = f'{folder.strip("/")}/{uuid4().hex}{extension}'
    encoded_bucket = quote(bucket, safe='')
    encoded_path = quote(object_path, safe='/')
    endpoint = f'{settings.SUPABASE_URL.rstrip("/")}/storage/v1/object/{encoded_bucket}/{encoded_path}'
    content_type = getattr(uploaded_file, 'content_type', None) or 'application/octet-stream'
    headers = {
        'apikey': api_key,
        'Content-Type': content_type,
        'x-upsert': 'false',
    }
    # Legacy service-role keys are JWTs. New sb_secret keys are API keys, not JWTs.
    if not api_key.startswith('sb_secret_'):
        headers['Authorization'] = f'Bearer {api_key}'
    request = Request(
        endpoint,
        data=uploaded_file.read(),
        headers=headers,
        method='POST',
    )

    try:
        with urlopen(request, timeout=20) as response:
            if response.status not in (200, 201):
                raise ValidationError({'image': 'Supabase Storage did not accept the image upload.'})
    except HTTPError as error:
        raise ValidationError({'image': f'Supabase Storage rejected the upload (HTTP {error.code}).'}) from error
    except (URLError, TimeoutError) as error:
        raise ValidationError({'image': 'Could not reach Supabase Storage. Please retry the upload.'}) from error

    return (
        f'{settings.SUPABASE_URL.rstrip("/")}/storage/v1/object/public/'
        f'{encoded_bucket}/{encoded_path}'
    )
