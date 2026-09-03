"""
Password hashing + session helpers. bcrypt for hashing (never plaintext),
itsdangerous-signed session cookies via Starlette SessionMiddleware.
"""
import bcrypt


def hash_password(password: str) -> str:
    """Hash a plaintext password with bcrypt (salt embedded in the hash)."""
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    """Constant-time bcrypt comparison. Never logs the plaintext."""
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
    except ValueError:
        # malformed hash stored somehow — fail closed
        return False
