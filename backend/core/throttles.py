# core/throttles.py
from rest_framework.throttling import SimpleRateThrottle


class OTPThrottle(SimpleRateThrottle):
    scope = "otp"

    def get_cache_key(self, request, view):
        email = request.data.get("email")
        if not email:
            return None
        return self.cache_format % {"scope": self.scope, "ident": email}


class PasswordResetThrottle(SimpleRateThrottle):
    scope = "reset"

    def get_cache_key(self, request, view):
        email = request.data.get("email")
        if not email:
            return None
        return self.cache_format % {"scope": self.scope, "ident": email}
