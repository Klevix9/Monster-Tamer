"""All SQL of the monsters service lives here.

The endpoints in main.py only talk to a MonsterRepository. In the unit tests we
replace it with an in-memory version (tests/fakes.py), so the tests need no
database (Lab 06: unit tests run in milliseconds, without Docker).

Every query uses parameters (%s). User input is never pasted into SQL text.
"""

from dataclasses import dataclass
from typing import Protocol

from .seed import SeedMonster


@dataclass(frozen=True)
class Monster:
    id: str
    name: str
    elements: list[str]
    rarity: str
    hp: int
    attack: int
    defence: int
    speed: int
    is_starter: bool


class MonsterRepository(Protocol):
    def list_monsters(self, element: str | None, rarity: str | None) -> list[Monster]: ...
    def get(self, monster_id: str) -> Monster | None: ...
    def get_many(self, monster_ids: list[str]) -> dict[str, Monster]: ...
    def get_image(self, monster_id: str) -> bytes | None: ...
    def starters(self) -> list[Monster]: ...


SCHEMA = """
CREATE TABLE IF NOT EXISTS monsters (
    id          TEXT PRIMARY KEY,
    name        TEXT     NOT NULL,
    elements    TEXT[]   NOT NULL CHECK (cardinality(elements) BETWEEN 1 AND 2),
    rarity      TEXT     NOT NULL,
    hp          INTEGER  NOT NULL CHECK (hp > 0),
    attack      INTEGER  NOT NULL CHECK (attack > 0),
    defence     INTEGER  NOT NULL CHECK (defence > 0),
    speed       INTEGER  NOT NULL CHECK (speed > 0),
    is_starter  BOOLEAN  NOT NULL,
    image_png   BYTEA    NOT NULL
)
"""

# Insert new monsters, update the ones that changed in the seed. Running it twice
# (every restart) leaves the table the same: the seed is idempotent.
UPSERT = """
INSERT INTO monsters (id, name, elements, rarity, hp, attack, defence, speed, is_starter, image_png)
VALUES (%s, %s, %s::text[], %s, %s, %s, %s, %s, %s, %s)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name, elements = EXCLUDED.elements, rarity = EXCLUDED.rarity,
    hp = EXCLUDED.hp, attack = EXCLUDED.attack, defence = EXCLUDED.defence,
    speed = EXCLUDED.speed, is_starter = EXCLUDED.is_starter, image_png = EXCLUDED.image_png
"""

def init_and_seed(conn, seed: list[tuple[SeedMonster, bytes]]) -> None:
    """Create the table and load the seed, in one transaction (all or nothing)."""
    cur = conn.cursor()
    try:
        cur.execute(SCHEMA)
        for m, image in seed:
            cur.execute(
                UPSERT,
                (m.id, m.name, list(m.elements), m.rarity, m.hp, m.attack,
                 m.defence, m.speed, m.is_starter, image),
            )
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close()


def _to_monster(row) -> Monster:
    return Monster(
        id=row[0], name=row[1], elements=list(row[2]), rarity=row[3], hp=row[4],
        attack=row[5], defence=row[6], speed=row[7], is_starter=row[8],
    )


class PostgresMonsterRepository:
    """The real repository, used by the running service."""

    def __init__(self, conn) -> None:
        self._conn = conn

    def _query(self, sql: str, params: tuple = ()) -> list:
        cur = self._conn.cursor()
        try:
            cur.execute(sql, params)
            return cur.fetchall()
        finally:
            cur.close()

    def list_monsters(self, element: str | None, rarity: str | None) -> list[Monster]:
        rows = self._query(
            "SELECT id, name, elements, rarity, hp, attack, defence, speed, is_starter "
            "FROM monsters "
            "WHERE (%s::text IS NULL OR %s::text = ANY(elements)) "
            "AND (%s::text IS NULL OR rarity = %s::text) "
            "ORDER BY id",
            (element, element, rarity, rarity),
        )
        return [_to_monster(r) for r in rows]

    def get(self, monster_id: str) -> Monster | None:
        rows = self._query(
            "SELECT id, name, elements, rarity, hp, attack, defence, speed, is_starter "
            "FROM monsters WHERE id = %s",
            (monster_id,),
        )
        return _to_monster(rows[0]) if rows else None

    def get_many(self, monster_ids: list[str]) -> dict[str, Monster]:
        rows = self._query(
            "SELECT id, name, elements, rarity, hp, attack, defence, speed, is_starter "
            "FROM monsters WHERE id = ANY(%s::text[])",
            (list(monster_ids),),
        )
        return {r[0]: _to_monster(r) for r in rows}

    def get_image(self, monster_id: str) -> bytes | None:
        rows = self._query("SELECT image_png FROM monsters WHERE id = %s", (monster_id,))
        return bytes(rows[0][0]) if rows else None

    def starters(self) -> list[Monster]:
        rows = self._query(
            "SELECT id, name, elements, rarity, hp, attack, defence, speed, is_starter "
            "FROM monsters WHERE is_starter ORDER BY id"
        )
        return [_to_monster(r) for r in rows]
