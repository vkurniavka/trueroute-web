#!/usr/bin/env python3
"""
build-geocode-db.py — Convert OSM PBF to SQLite FTS5 geocode database.

Usage: python3 build-geocode-db.py <input.osm.pbf> <output.db>

Requires: pip install osmium
"""

import os
import sqlite3
import sys

import osmium


PLACE_TYPES = frozenset({"city", "town", "village", "hamlet", "suburb", "neighbourhood"})


class PlaceHandler(osmium.SimpleHandler):
    """Extract named places and addresses from OSM nodes."""

    def __init__(self):
        super().__init__()
        self.places = []

    def node(self, n):
        tags = {t.k: t.v for t in n.tags}

        name = tags.get("name", "")
        addr_street = tags.get("addr:street", "")

        if not name and not addr_street:
            return

        name_uk = tags.get("name:uk", "")
        name_en = tags.get("name:en", "")
        lat = n.location.lat
        lng = n.location.lon

        place_tag = tags.get("place", "")
        if place_tag in PLACE_TYPES:
            place_type = place_tag
        elif addr_street:
            place_type = "street"
            if not name:
                name = addr_street
        else:
            place_type = "place"

        osm_id = f"n{n.id}"

        self.places.append((osm_id, name, name_uk, name_en, lat, lng, place_type))


def build_db(input_path, output_path):
    handler = PlaceHandler()
    handler.apply_file(input_path, locations=True)

    if os.path.exists(output_path):
        os.remove(output_path)

    conn = sqlite3.connect(output_path)
    cur = conn.cursor()

    cur.execute(
        """CREATE TABLE places (
            id TEXT PRIMARY KEY,
            name TEXT,
            name_uk TEXT,
            name_en TEXT,
            lat REAL,
            lng REAL,
            type TEXT
        )"""
    )

    cur.execute(
        """CREATE VIRTUAL TABLE places_fts USING fts5(
            name,
            name_uk,
            name_en,
            content='places',
            content_rowid='rowid'
        )"""
    )

    cur.executemany(
        "INSERT INTO places (id, name, name_uk, name_en, lat, lng, type) VALUES (?, ?, ?, ?, ?, ?, ?)",
        handler.places,
    )

    cur.execute("INSERT INTO places_fts(places_fts) VALUES ('rebuild')")

    conn.commit()
    conn.close()

    print(f"Inserted {len(handler.places)} places")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print(f"Usage: {sys.argv[0]} <input.osm.pbf> <output.db>", file=sys.stderr)
        sys.exit(1)

    build_db(sys.argv[1], sys.argv[2])
