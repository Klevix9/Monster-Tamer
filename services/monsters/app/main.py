"""Monsters service: the catalogue of every monster in the game (US-10, US-11).

The API is docs/monsters.yaml. The data lives in this service's own Postgres
database (monsters-db), loaded at startup from seed/monsters.json + seed/images/.

Players reach /monsters... through the gateway. /internal/... is only for other
services (the gateway answers 404 to the outside).

TODO (#39): require a valid player token on /monsters and a service token on /internal.
"""

import logging
import os
import re
from collections.abc import Iterator
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Annotated

from fastapi import Depends, FastAPI, Path as PathParam, Query, Request, Response
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from starlette.exceptions import HTTPException as StarletteHTTPException

from . import db
from .repository import Monster, MonsterRepository, PostgresMonsterRepository, init_and_seed
from .seed import MONSTER_ID_PATTERN, Element, Rarity, load_seed

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("monsters")

MAX_INTERNAL_IDS = 20


# ---------------------------------------------------------------------------
# Startup: create the table and load the seed into the database.
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(_app: FastAPI):
    seed = load_seed(Path(os.environ.get("SEED_DIR", "/app/seed")))
    conn = db.connect_with_retry()
    try:
        init_and_seed(conn, seed)
    finally:
        conn.close()
    log.info("Seed loaded: %d monsters", len(seed))
    yield


app = FastAPI(title="Monster Tamers - monsters", version="0.2.0", lifespan=lifespan)


def get_repo() -> Iterator[MonsterRepository]:
    """One database connection per request, always closed afterwards."""
    conn = db.connect()
    try:
        yield PostgresMonsterRepository(conn)
    finally:
        conn.close()


Repo = Annotated[MonsterRepository, Depends(get_repo)]
MonsterId = Annotated[str, PathParam(pattern=MONSTER_ID_PATTERN)]


# ---------------------------------------------------------------------------
# Errors: always {"error": ..., "message": ...} as in the OpenAPI Error schema.
# ---------------------------------------------------------------------------
class ApiError(Exception):
    def __init__(self, status: int, error: str, message: str) -> None:
        self.status, self.error, self.message = status, error, message


def _error(status: int, error: str, message: str) -> JSONResponse:
    return JSONResponse(status_code=status, content={"error": error, "message": message})


@app.exception_handler(ApiError)
async def _api_error(_request: Request, exc: ApiError) -> JSONResponse:
    return _error(exc.status, exc.error, exc.message)


@app.exception_handler(RequestValidationError)
async def _validation_error(_request: Request, exc: RequestValidationError) -> JSONResponse:
    # Do not echo the raw input back: just say which parameter is wrong.
    first = exc.errors()[0] if exc.errors() else {}
    where = ".".join(str(p) for p in first.get("loc", []) if p not in ("path", "query"))
    return _error(400, "invalid_request", f"Invalid value for '{where or 'request'}'.")


@app.exception_handler(StarletteHTTPException)
async def _http_error(_request: Request, exc: StarletteHTTPException) -> JSONResponse:
    if exc.status_code == 404:
        return _error(404, "not_found", "Not found.")
    if exc.status_code == 405:
        return _error(405, "method_not_allowed", "Method not allowed.")
    return _error(exc.status_code, "error", "Request failed.")


# ---------------------------------------------------------------------------
# Response bodies (match docs/monsters.yaml).
# ---------------------------------------------------------------------------
class Stats(BaseModel):
    hp: int
    attack: int
    defence: int
    speed: int


class MonsterSummary(BaseModel):
    id: str
    name: str
    image_url: str
    elements: list[Element]
    rarity: Rarity


class MonsterDetail(MonsterSummary):
    starter: bool
    stats: Stats


def _image_url(monster_id: str) -> str:
    return f"/monsters/{monster_id}/image"


def _summary(m: Monster) -> MonsterSummary:
    return MonsterSummary(
        id=m.id, name=m.name, image_url=_image_url(m.id), elements=m.elements, rarity=m.rarity
    )


def _detail(m: Monster) -> MonsterDetail:
    return MonsterDetail(
        id=m.id, name=m.name, image_url=_image_url(m.id), elements=m.elements,
        rarity=m.rarity, starter=m.is_starter,
        stats=Stats(hp=m.hp, attack=m.attack, defence=m.defence, speed=m.speed),
    )


def _not_found() -> ApiError:
    return ApiError(404, "monster_not_found", "This monster does not exist.")


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------
@app.get("/health")
def health() -> dict:
    """Used by docker compose to know the service is up."""
    return {"status": "ok"}


@app.get("/monsters", response_model=list[MonsterSummary])
def list_monsters(
    repo: Repo,
    element: Element | None = None,
    rarity: Rarity | None = None,
) -> list[MonsterSummary]:
    """US-10: every monster in the game, owned or not. Optional filters."""
    return [_summary(m) for m in repo.list_monsters(element, rarity)]


@app.get("/monsters/{monster_id}", response_model=MonsterDetail)
def get_monster(monster_id: MonsterId, repo: Repo) -> MonsterDetail:
    """US-11: one monster with its image link and every stat."""
    monster = repo.get(monster_id)
    if monster is None:
        raise _not_found()
    return _detail(monster)


@app.get(
    "/monsters/{monster_id}/image",
    response_class=Response,
    responses={200: {"content": {"image/png": {}}}},
)
def get_monster_image(monster_id: MonsterId, repo: Repo) -> Response:
    """The PNG stored in the database for this monster."""
    image = repo.get_image(monster_id)
    if image is None:
        raise _not_found()
    return Response(
        content=image,
        media_type="image/png",
        headers={"Cache-Control": "private, max-age=3600", "X-Content-Type-Options": "nosniff"},
    )


@app.get("/internal/monsters", response_model=list[MonsterDetail])
def internal_get_monsters(
    repo: Repo,
    ids: Annotated[str, Query(min_length=1, max_length=1000)],
) -> list[MonsterDetail]:
    """For Ownership and Encounter: several monsters with stats, in the order asked.

    The same id may appear more than once (a team can hold two of one species).
    """
    wanted = ids.split(",")
    if len(wanted) > MAX_INTERNAL_IDS:
        raise ApiError(400, "invalid_request", f"At most {MAX_INTERNAL_IDS} ids per call.")
    if any(not re.fullmatch(MONSTER_ID_PATTERN, i) for i in wanted):
        raise ApiError(400, "invalid_request", "Invalid monster id in 'ids'.")

    found = repo.get_many(sorted(set(wanted)))
    missing = sorted(set(wanted) - found.keys())
    if missing:
        raise ApiError(404, "monster_not_found", "Unknown monster ids: " + ", ".join(missing))
    return [_detail(found[i]) for i in wanted]


@app.get("/internal/starters", response_model=list[MonsterSummary])
def internal_starters(repo: Repo) -> list[MonsterSummary]:
    """For Ownership: the monsters marked as starters in the seed."""
    return [_summary(m) for m in repo.starters()]

