"""Reads seed/monsters.json and the images next to it.

The seed is checked with an allow-list (Lab 08: validate at every boundary, even
data we ship ourselves): known elements and rarities only, stats in range, and
every image must be a real PNG inside seed/images/ (no "../" tricks).
"""

import json
from pathlib import Path
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

Element = Literal["fire", "water", "earth", "dark"]
Rarity = Literal["common", "rare", "epic"]

MONSTER_ID_PATTERN = r"^[a-z0-9-]{1,40}$"
STAT_MIN, STAT_MAX = 1, 255
MAX_IMAGE_BYTES = 2_000_000
PNG_SIGNATURE = b"\x89PNG\r\n\x1a\n"


class SeedError(ValueError):
    """The seed files are broken. The service refuses to start with them."""


class SeedMonster(BaseModel):
    """One entry of seed/monsters.json, exactly as written in the file."""

    model_config = ConfigDict(extra="forbid", frozen=True)

    id: str = Field(pattern=MONSTER_ID_PATTERN)
    name: str = Field(min_length=1, max_length=40)
    image: str = Field(min_length=1, max_length=200)
    elements: list[Element] = Field(min_length=1, max_length=2)
    rarity: Rarity
    hp: int = Field(ge=STAT_MIN, le=STAT_MAX)
    attack: int = Field(ge=STAT_MIN, le=STAT_MAX)
    defence: int = Field(ge=STAT_MIN, le=STAT_MAX)
    speed: int = Field(ge=STAT_MIN, le=STAT_MAX)
    is_starter: bool


def _read_image(seed_dir: Path, relative: str) -> bytes:
    images_dir = (seed_dir / "images").resolve()
    path = (seed_dir / relative).resolve()
    if not path.is_relative_to(images_dir):
        raise SeedError(f"Image {relative!r} is outside seed/images/.")
    if not path.is_file():
        raise SeedError(f"Image {relative!r} does not exist.")
    data = path.read_bytes()
    if len(data) > MAX_IMAGE_BYTES:
        raise SeedError(f"Image {relative!r} is larger than {MAX_IMAGE_BYTES} bytes.")
    if not data.startswith(PNG_SIGNATURE):
        raise SeedError(f"Image {relative!r} is not a PNG file.")
    return data


def load_seed(seed_dir: Path) -> list[tuple[SeedMonster, bytes]]:
    """Return every seed monster with its image bytes. Raises SeedError if anything is wrong."""
    try:
        raw = json.loads((seed_dir / "monsters.json").read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise SeedError(f"Cannot read seed/monsters.json: {exc}") from exc
    if not isinstance(raw, list) or not raw:
        raise SeedError("seed/monsters.json must be a non-empty list.")

    result: list[tuple[SeedMonster, bytes]] = []
    seen: set[str] = set()
    for index, entry in enumerate(raw):
        try:
            monster = SeedMonster.model_validate(entry)
        except ValueError as exc:
            raise SeedError(f"Seed entry {index} is invalid: {exc}") from exc
        if monster.id in seen:
            raise SeedError(f"Monster id {monster.id!r} appears twice.")
        seen.add(monster.id)
        result.append((monster, _read_image(seed_dir, monster.image)))

    if not any(m.is_starter for m, _ in result):
        raise SeedError("The seed has no starter monster.")
    return result
