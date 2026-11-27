"""An in-memory MonsterRepository, so unit tests run without Postgres."""

from app.repository import Monster
from app.seed import SeedMonster


class InMemoryMonsterRepository:
    def __init__(self, seed: list[tuple[SeedMonster, bytes]]) -> None:
        self._monsters = {
            m.id: Monster(
                id=m.id, name=m.name, elements=list(m.elements), rarity=m.rarity, hp=m.hp,
                attack=m.attack, defence=m.defence, speed=m.speed, is_starter=m.is_starter,
            )
            for m, _ in seed
        }
        self._images = {m.id: image for m, image in seed}

    def list_monsters(self, element, rarity):
        return [
            m for _, m in sorted(self._monsters.items())
            if (element is None or element in m.elements) and (rarity is None or m.rarity == rarity)
        ]

    def get(self, monster_id):
        return self._monsters.get(monster_id)

    def get_many(self, monster_ids):
        return {i: self._monsters[i] for i in monster_ids if i in self._monsters}

    def get_image(self, monster_id):
        return self._images.get(monster_id)

    def starters(self):
        return [m for _, m in sorted(self._monsters.items()) if m.is_starter]
