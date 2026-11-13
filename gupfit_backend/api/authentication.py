import json
import urllib.error
import urllib.request
from urllib.parse import urljoin

from django.conf import settings
from rest_framework.authentication import BaseAuthentication, get_authorization_header
from rest_framework.exceptions import APIException, AuthenticationFailed


class SupabaseUser:
    is_authenticated = True
    is_anonymous = False
    is_active = True
    is_staff = False
    is_superuser = False

    def __init__(self, payload):
        self.id = payload['id']
        self.pk = self.id
        self.email = payload.get('email', '')
        self.user_metadata = payload.get('user_metadata') or {}


class SupabaseAuthAuthentication(BaseAuthentication):
    """Validate a Supabase access token with Supabase Auth's user endpoint."""

    def authenticate(self, request):
        auth = get_authorization_header(request).split()
        if not auth:
            return None
        if len(auth) != 2 or auth[0].lower() != b'bearer':
            raise AuthenticationFailed('Use a Supabase Bearer access token.')

        project_url = getattr(settings, 'SUPABASE_URL', '')
        publishable_key = getattr(settings, 'SUPABASE_PUBLISHABLE_KEY', '')
        if not project_url or not publishable_key:
            raise APIException('Supabase authentication is not configured on the backend.')

        endpoint = urljoin(f'{project_url.rstrip("/")}/', 'auth/v1/user')
        req = urllib.request.Request(
            endpoint,
            headers={
                'apikey': publishable_key,
                'Authorization': f'Bearer {auth[1].decode("ascii", errors="ignore")}',
            },
        )
        try:
            with urllib.request.urlopen(req, timeout=5) as response:
                user_data = json.loads(response.read().decode('utf-8'))
        except urllib.error.HTTPError as error:
            if error.code in (400, 401, 403):
                raise AuthenticationFailed('Your customer session is invalid or expired.') from error
            raise APIException('Could not verify your Supabase session.') from error
        except (urllib.error.URLError, TimeoutError, ValueError) as error:
            raise APIException('Could not reach Supabase Auth to verify your session.') from error

        if not user_data.get('id') or not (user_data.get('email_confirmed_at') or user_data.get('confirmed_at')):
            raise AuthenticationFailed('Verify your email before continuing.')
        return SupabaseUser(user_data), auth[1].decode('ascii', errors='ignore')

    def authenticate_header(self, request):
        return 'Bearer'
