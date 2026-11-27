"""Unit tests of the endpoints (Lab 06, level 1). No Docker, no database.

Each endpoint has at least one valid case (2xx) and one invalid case (error),
following the acceptance criteria of US-10 and US-11.
"""

PNG_SIGNATURE = b"\x89PNG\r\n\x1a\n"


def test_health(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


# --- US-10: browse the catalogue -------------------------------------------

def test_list_shows_every_seed_monster_with_name_and_image(client, seed):
    response = client.get("/monsters")
    assert response.status_code == 200
    body = response.json()
    assert {m["id"] for m in body} == {m.id for m, _ in seed}
    for monster in body:
        assert monster["name"]
        assert monster["image_url"] == f"/monsters/{monster['id']}/image"


def test_list_filters_by_element(client):
    body = client.get("/monsters", params={"element": "dark"}).json()
    assert body
    assert all("dark" in m["elements"] for m in body)


def test_list_rejects_unknown_element(client):
    response = client.get("/monsters", params={"element": "lava"})
    assert response.status_code == 400
    assert response.json()["error"] == "invalid_request"


# --- US-11: one monster's image and characteristics ------------------------

def test_get_monster_has_image_and_gameplay_stats(client):
    response = client.get("/monsters/mon-001")
    assert response.status_code == 200
    body = response.json()
    assert body["image_url"] == "/monsters/mon-001/image"
    # At least two characteristics that influence encounters.
    assert {"hp", "attack", "defence"} <= body["stats"].keys()
    assert body["elements"]


def test_get_unknown_monster_is_404(client):
    response = client.get("/monsters/does-not-exist")
    assert response.status_code == 404
    assert response.json()["error"] == "monster_not_found"


def test_get_monster_rejects_bad_id(client):
    response = client.get("/monsters/BAD_ID!")
    assert response.status_code == 400


def test_image_is_a_png(client):
    response = client.get("/monsters/mon-001/image")
    assert response.status_code == 200
    assert response.headers["content-type"] == "image/png"
    assert response.content.startswith(PNG_SIGNATURE)


def test_image_of_unknown_monster_is_404(client):
    assert client.get("/monsters/does-not-exist/image").status_code == 404


# --- internal endpoints (used by Ownership and Encounter) ------------------

def test_internal_monsters_in_requested_order_with_duplicates(client):
    response = client.get("/internal/monsters", params={"ids": "mon-002,mon-001,mon-002"})
    assert response.status_code == 200
    assert [m["id"] for m in response.json()] == ["mon-002", "mon-001", "mon-002"]
    assert "stats" in response.json()[0]


def test_internal_monsters_unknown_id_is_404(client):
    response = client.get("/internal/monsters", params={"ids": "mon-001,ghostcat"})
    assert response.status_code == 404
    assert "ghostcat" in response.json()["message"]


def test_internal_monsters_rejects_too_many_ids(client):
    ids = ",".join(["mon-001"] * 21)
    assert client.get("/internal/monsters", params={"ids": ids}).status_code == 400


def test_internal_monsters_requires_ids(client):
    assert client.get("/internal/monsters").status_code == 400


def test_internal_starters_are_only_starters(client, seed):
    response = client.get("/internal/starters")
    assert response.status_code == 200
    expected = {m.id for m, _ in seed if m.is_starter}
    assert {m["id"] for m in response.json()} == expected


def test_unknown_path_uses_json_error_format(client):
    response = client.get("/nope")
    assert response.status_code == 404
    assert response.json() == {"error": "not_found", "message": "Not found."}
