"""Unit tests of the seed loader: the real seed is valid, broken seeds are refused."""

import json
import shutil

import pytest

from app.seed import SeedError, load_seed

from conftest import SEED_DIR


def test_real_seed_is_valid(seed):
    assert len(seed) >= 2
    for monster, image in seed:
        assert image.startswith(b"\x89PNG")
        assert monster.hp > 0 and monster.attack > 0 and monster.defence > 0


def _copy_seed(tmp_path, change):
    shutil.copytree(SEED_DIR / "images", tmp_path / "images")
    data = json.loads((SEED_DIR / "monsters.json").read_text())
    change(data)
    (tmp_path / "monsters.json").write_text(json.dumps(data))
    return tmp_path


def test_unknown_element_is_refused(tmp_path):
    seed_dir = _copy_seed(tmp_path, lambda d: d[0].update(elements=["lava"]))
    with pytest.raises(SeedError):
        load_seed(seed_dir)


def test_image_outside_images_folder_is_refused(tmp_path):
    seed_dir = _copy_seed(tmp_path, lambda d: d[0].update(image="../monsters.json"))
    with pytest.raises(SeedError, match="outside"):
        load_seed(seed_dir)


def test_duplicate_id_is_refused(tmp_path):
    seed_dir = _copy_seed(tmp_path, lambda d: d.append(dict(d[0])))
    with pytest.raises(SeedError, match="twice"):
        load_seed(seed_dir)


def test_non_png_image_is_refused(tmp_path):
    seed_dir = _copy_seed(tmp_path, lambda d: None)
    (seed_dir / "images" / "mon-001.png").write_bytes(b"not a png")
    with pytest.raises(SeedError, match="PNG"):
        load_seed(seed_dir)
