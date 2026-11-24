import pytest
from fastapi.testclient import TestClient

from app.main import create_app

GOOD = {"username": "ash", "password": "Pikachu@12"}


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setenv("DB_PATH", str(tmp_path / "account.db"))
    return TestClient(create_app())


def test_health(client):
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}


def test_register_ok(client):
    r = client.post("/auth/register", json=GOOD)
    assert r.status_code == 201
    assert set(r.json()) == {"id", "username", "display_name", "avatar"}


def test_register_duplicate(client):
    client.post("/auth/register", json=GOOD)
    r = client.post("/auth/register", json=GOOD)
    assert r.status_code == 409
    assert r.json()["error"] == "username_taken"


def test_register_duplicate_other_case(client):
    client.post("/auth/register", json=GOOD)
    r = client.post("/auth/register", json={"username": "Ash", "password": "Pikachu@12"})
    assert r.status_code == 409


@pytest.mark.parametrize("password", ["Pikachu12", "P@1a", "pikachu@abc"])
def test_register_bad_password(client, password):
    r = client.post("/auth/register", json={"username": "ash", "password": password})
    assert r.status_code == 400
    assert r.json()["error"] == "invalid_password"


def test_register_missing_username(client):
    r = client.post("/auth/register", json={"password": "Pikachu@12"})
    assert r.status_code == 400


@pytest.mark.parametrize("username", ["ab", "a" * 21, "a-b", " bob ", "\u212aate"])
def test_register_bad_username(client, username):
    r = client.post("/auth/register", json={"username": username, "password": "Pikachu@12"})
    assert r.status_code == 400
    assert r.json()["error"] == "invalid_username"


def test_register_extra_field(client):
    r = client.post("/auth/register", json={**GOOD, "role": "admin"})
    assert r.status_code == 400
    assert r.json()["error"] == "invalid_request"


def test_unknown_path_error_format(client):
    r = client.get("/nope")
    assert r.status_code == 404
    assert r.json() == {"error": "not_found", "message": "Not Found"}


def test_user_survives_restart(tmp_path, monkeypatch):
    monkeypatch.setenv("DB_PATH", str(tmp_path / "account.db"))
    TestClient(create_app()).post("/auth/register", json=GOOD)
    second = TestClient(create_app())
    assert second.post("/auth/register", json=GOOD).status_code == 409