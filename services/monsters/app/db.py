"""Connection to the monsters service's own Postgres database.

Lab 05: every persistent store belongs to exactly one service. Only this service
has the password (a Docker secret) and only this service shares a network with
monsters-db.

Lab 08: the connection uses TLS, and we check the database's certificate
(signed by our CA, issued for the name "monsters-db"). Never switch this off.
"""

import logging
import os
import ssl
import time
from pathlib import Path

import pg8000.dbapi

log = logging.getLogger("monsters.db")


def _setting(name: str, default: str) -> str:
    return os.environ.get(name, default)


def _read_secret(path: str) -> str:
    """Docker secrets are files (/run/secrets/...), not environment variables."""
    return Path(path).read_text(encoding="utf-8").strip()


def connect() -> pg8000.dbapi.Connection:
    """Open one TLS connection to monsters-db, verifying its certificate."""
    # create_default_context checks the three things from Lab 08:
    # trusted signer (our CA), right name (monsters-db), still valid.
    tls = ssl.create_default_context(cafile=_setting("CA_FILE", "/certs/ca.crt"))
    return pg8000.dbapi.connect(
        host=_setting("DB_HOST", "monsters-db"),
        port=int(_setting("DB_PORT", "5432")),
        database=_setting("DB_NAME", "monsters"),
        user=_setting("DB_USER", "monsters"),
        password=_read_secret(_setting("DB_PASSWORD_FILE", "/run/secrets/db_password")),
        ssl_context=tls,
        timeout=5,
    )


def connect_with_retry(attempts: int = 10, delay: float = 2.0) -> pg8000.dbapi.Connection:
    """Used at startup only. Compose waits for the DB healthcheck, but retry anyway."""
    for attempt in range(1, attempts + 1):
        try:
            return connect()
        except (OSError, pg8000.dbapi.InterfaceError, pg8000.dbapi.DatabaseError) as exc:
            if attempt == attempts:
                raise
            log.warning("Database not reachable (attempt %d/%d): %s", attempt, attempts, exc)
            time.sleep(delay)
    raise RuntimeError("unreachable")
