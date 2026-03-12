#!/usr/bin/env python3
"""
build-geocode-db.py — Convert OSM PBF to SQLite FTS5 geocode database.

Extracts named places (nodes) and building addresses (nodes + way centroids)
from OSM data and builds a full-text search index with proximity support.

Usage: python3 build-geocode-db.py <input.osm.pbf> <output.db>

Requires: pip install osmium

Schema (compatible with GeocoderRepository.kt):
  places(id INTEGER PRIMARY KEY,   ← auto-assigned rowid; used as FTS5 content_rowid
         name TEXT, name_uk TEXT, name_en TEXT,
         addr_street TEXT, addr_housenumber TEXT, city TEXT,
         display_name TEXT, lat REAL, lng REAL,
         type TEXT, rank INTEGER NOT NULL)
  places_fts  — FTS5 virtual table (content='places', content_rowid='rowid')
  places_spatial — R-tree proximity index
"""

import os
import re
import sqlite3
import sys

import osmium


PLACE_TYPES = frozenset({"city", "town", "village", "hamlet", "suburb", "neighbourhood"})

# Rank values: lower = more important (matches app sort: ORDER BY rank ASC)
PLACE_RANK = {
    "city":          1,
    "town":          5,
    "village":      10,
    "hamlet":       15,
    "suburb":       18,
    "neighbourhood": 20,
    "street":       30,
    "place":        40,
    "address":      50,
}

# Ukrainian street name abbreviation normalization pairs
UA_STREET_ABBREVS = [
    ("вул.", "вулиця"),
    ("пр.", "проспект"),
    ("пров.", "провулок"),
    ("б-р", "бульвар"),
    ("пл.", "площа"),
]


def build_display_name(addr_street, addr_housenumber, city):
    """Build a full display name from address components.

    Example: 'вул. Шевченка 15, Львів'
    """
    parts = []
    if addr_street:
        if addr_housenumber:
            parts.append(f"{addr_street} {addr_housenumber}")
        else:
            parts.append(addr_street)
    if city:
        parts.append(city)
    return ", ".join(parts)


def normalize_street_name(name):
    """Expand Ukrainian street abbreviations for better FTS matching.

    Returns the original name plus expanded forms joined by space,
    so FTS5 matches both abbreviated and full forms.
    """
    if not name:
        return ""

    expanded = name
    for abbrev, full in UA_STREET_ABBREVS:
        pattern = re.escape(abbrev)
        if re.search(pattern, expanded, re.IGNORECASE):
            expanded = re.sub(pattern, full, expanded, flags=re.IGNORECASE)
            return f"{name} {expanded}"

    return name


class PlaceHandler(osmium.SimpleHandler):
    """Extract named places and addresses from OSM nodes and ways."""

    def __init__(self):
        super().__init__()
        # Each row: (name, name_uk, name_en, addr_street, addr_housenumber,
        #            city, display_name, lat, lng, type, rank)
        # Note: no id column — SQLite assigns INTEGER PRIMARY KEY automatically
        self.places = []

    def node(self, n):
        tags = {t.k: t.v for t in n.tags}

        name = tags.get("name", "")
        addr_street = tags.get("addr:street", "")
        addr_housenumber = tags.get("addr:housenumber", "")

        if not name and not addr_street:
            return

        name_uk = tags.get("name:uk", "")
        name_en = tags.get("name:en", "")
        lat = n.location.lat
        lng = n.location.lon
        city = tags.get("addr:city", "")

        place_tag = tags.get("place", "")
        if place_tag in PLACE_TYPES:
            place_type = place_tag
        elif addr_housenumber and addr_street:
            place_type = "address"
            if not name:
                name = f"{addr_street} {addr_housenumber}"
        elif addr_street:
            place_type = "street"
            if not name:
                name = addr_street
        else:
            place_type = "place"

        display_name = build_display_name(addr_street, addr_housenumber, city) if addr_street else name
        rank = PLACE_RANK.get(place_type, 40)

        self.places.append(
            (name, name_uk, name_en, addr_street, addr_housenumber,
             city, display_name, lat, lng, place_type, rank)
        )

    def way(self, w):
        tags = {t.k: t.v for t in w.tags}

        addr_housenumber = tags.get("addr:housenumber", "")
        addr_street = tags.get("addr:street", "")

        if not addr_housenumber or not addr_street:
            return

        lats = []
        lons = []
        for node in w.nodes:
            if node.location.valid():
                lats.append(node.location.lat)
                lons.append(node.location.lon)

        if not lats:
            return

        lat = sum(lats) / len(lats)
        lng = sum(lons) / len(lons)

        name = f"{addr_street} {addr_housenumber}"
        name_uk = tags.get("name:uk", "")
        name_en = tags.get("name:en", "")
        city = tags.get("addr:city", "")
        display_name = build_display_name(addr_street, addr_housenumber, city)

        self.places.append(
            (name, name_uk, name_en, addr_street, addr_housenumber,
             city, display_name, lat, lng, "address", PLACE_RANK["address"])
        )


def build_db(input_path, output_path):
    handler = PlaceHandler()
    handler.apply_file(input_path, locations=True)

    if os.path.exists(output_path):
        os.remove(output_path)

    conn = sqlite3.connect(output_path)
    cur = conn.cursor()

    # id INTEGER PRIMARY KEY — SQLite auto-assigns this as the rowid.
    # GeocoderRepository joins: places p INNER JOIN places_fts fts ON p.id = fts.rowid
    # This works because INTEGER PRIMARY KEY IS the rowid in SQLite.
    cur.execute(
        """CREATE TABLE places (
            id INTEGER PRIMARY KEY,
            name TEXT,
            name_uk TEXT,
            name_en TEXT,
            addr_street TEXT,
            addr_housenumber TEXT,
            city TEXT,
            display_name TEXT,
            lat REAL,
            lng REAL,
            type TEXT,
            rank INTEGER NOT NULL DEFAULT 40
        )"""
    )

    # FTS5 content table — content_rowid='rowid' references places.id (= rowid)
    cur.execute(
        """CREATE VIRTUAL TABLE places_fts USING fts5(
            name,
            name_uk,
            name_en,
            display_name,
            content='places',
            content_rowid='rowid'
        )"""
    )

    # R-tree spatial index for proximity / bounding-box queries
    cur.execute(
        """CREATE VIRTUAL TABLE places_spatial USING rtree(
            id,
            min_lat, max_lat,
            min_lng, max_lng
        )"""
    )

    # Insert without id — SQLite assigns auto-increment INTEGER PRIMARY KEY
    cur.executemany(
        """INSERT INTO places
            (name, name_uk, name_en, addr_street, addr_housenumber,
             city, display_name, lat, lng, type, rank)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        handler.places,
    )

    # Rebuild FTS5 index from content table
    cur.execute("INSERT INTO places_fts(places_fts) VALUES ('rebuild')")

    # Populate R-tree (rowid = id = INTEGER PRIMARY KEY)
    cur.execute(
        """INSERT INTO places_spatial (id, min_lat, max_lat, min_lng, max_lng)
           SELECT rowid, lat, lat, lng, lng FROM places"""
    )

    conn.commit()
    conn.close()

    addr_count = sum(1 for p in handler.places if p[9] == "address")
    print(f"Inserted {len(handler.places)} places ({addr_count} addresses from nodes+ways)")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print(f"Usage: {sys.argv[0]} <input.osm.pbf> <output.db>", file=sys.stderr)
        sys.exit(1)

    build_db(sys.argv[1], sys.argv[2])
