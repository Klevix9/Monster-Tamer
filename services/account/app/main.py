"""Account service: player registration, login and profile."""

import os
from http import HTTPStatus

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import sessionmaker
from starlette.exceptions import HTTPException

from app.db import Base, User, make_engine
from app.errors import ApiError
from app.security import hash_password
from app.validation import check_password, clean_username


# ---- request and response shapes (outside create_app) ----
class RegisterRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    username: str
    password: str


class Player(BaseModel):
    id: str
    username: str
    display_name: str
    avatar: str


def create_app() -> FastAPI:
    app = FastAPI(title="Monster Tamers - Account", version="0.1.0")

    # ---- database ----
    engine = make_engine(os.environ.get("DB_PATH", "/data/account.db"))
    Base.metadata.create_all(engine)
    app.state.Session = sessionmaker(engine)

    # ---- error handlers ----
    @app.exception_handler(ApiError)
    async def api_error_handler(request, exc: ApiError):
        return JSONResponse(status_code=exc.status,
                            content={"error": exc.error, "message": exc.message})

    @app.exception_handler(RequestValidationError)
    async def validation_handler(request, exc):
        return JSONResponse(status_code=400,
                            content={"error": "invalid_request",
                                     "message": "Missing or invalid fields."})

    @app.exception_handler(HTTPException)
    async def http_error_handler(request, exc: HTTPException):
        error = HTTPStatus(exc.status_code).phrase.lower().replace(" ", "_")
        return JSONResponse(status_code=exc.status_code, headers=exc.headers,
                            content={"error": error, "message": exc.detail})

    # ---- endpoints ----
    @app.get("/health")
    def health() -> dict:
        return {"status": "ok"}

    @app.post("/auth/register", status_code=201, response_model=Player)
    def register(body: RegisterRequest, request: Request):
        username = clean_username(body.username)
        check_password(body.password)

        user = User(username=username, display_name=username,
                    password_hash=hash_password(body.password))

        with request.app.state.Session() as session:
            session.add(user)
            try:
                session.commit()
            except IntegrityError:
                session.rollback()
                raise ApiError(409, "username_taken", "This username is already taken.")

            # TODO (US-06): call Ownership POST /internal/starter once it exists.
            return Player(id=user.id, username=user.username,
                          display_name=user.display_name, avatar=user.avatar)

    return app
