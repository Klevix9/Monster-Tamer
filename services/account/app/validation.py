import re

from app.errors import ApiError

USERNAME_RE = re.compile(r"[A-Za-z0-9_]{3,20}")


def clean_username(raw: str) -> str:
    # Check before lowercasing: lower() turns some non-ASCII characters into ASCII ones.
    if not USERNAME_RE.fullmatch(raw):
        raise ApiError(400, "invalid_username",
                       "Username must be 3-20 characters: letters, digits or _.")
    return raw.lower()


def check_password(password: str) -> None:
    ok = (
        8 <= len(password) <= 128
        and any(c.isdigit() for c in password)
        and any(not c.isalnum() and not c.isspace() for c in password)
    )
    if not ok:
        raise ApiError(400, "invalid_password",
                       "Password must be at least 8 characters and contain a digit and a special character.")