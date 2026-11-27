from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.main import app, get_repo
from app.seed import load_seed

from fakes import InMemoryMonsterRepository

# services/monsters/tests -> repo root -> seed/
SEED_DIR = Path(__file__).resolve().parents[3] / "seed"


@pytest.fixture(scope="session")
def seed():
    return load_seed(SEED_DIR)


@pytest.fixture
def client(seed):
    """The real app, with the database swapped for the in-memory repository.

    Not used as a context manager, so the startup step (which needs Postgres)
    does not run.
    """
    app.dependency_overrides[get_repo] = lambda: InMemoryMonsterRepository(seed)
    yield TestClient(app)
    app.dependency_overrides.clear()
