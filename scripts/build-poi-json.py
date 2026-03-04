#!/usr/bin/env python3
"""
build-poi-json.py — Convert OSM speed camera and speed limit PBF extracts to GeoJSON.

This data is for the TrueRoute mobile app ONLY — it is NOT rendered on the website.

Usage:
    python3 build-poi-json.py cameras.osm.pbf limits.osm.pbf output.json

Requires: osmium (pip install osmium)
"""

import json
import math
import re
import sys

import osmium


def parse_maxspeed(value):
    """Parse maxspeed tag value, normalizing to km/h as int or None.

    Handles:
      - Plain numeric: "60" → 60
      - MPH: "30 mph" → 48
      - Country-specific defaults like "RU:urban" → None
    """
    if value is None:
        return None

    value = value.strip()

    # Plain integer
    if re.fullmatch(r"\d+", value):
        return int(value)

    # "XX mph" — convert to km/h
    mph_match = re.fullmatch(r"(\d+)\s*mph", value, re.IGNORECASE)
    if mph_match:
        return round(int(mph_match.group(1)) * 1.609)

    # "XX km/h" explicit
    kmh_match = re.fullmatch(r"(\d+)\s*km/?h", value, re.IGNORECASE)
    if kmh_match:
        return int(kmh_match.group(1))

    # Country-specific defaults (e.g. "RU:urban", "UA:urban") — not a numeric value
    return None


def parse_direction(value):
    """Parse direction tag to float degrees, or None."""
    if value is None:
        return None
    try:
        return float(value)
    except (ValueError, TypeError):
        return None


class CameraHandler(osmium.SimpleHandler):
    """Extracts speed camera nodes from an OSM PBF file."""

    def __init__(self):
        super().__init__()
        self.features = []

    def node(self, n):
        if not n.location.valid():
            return

        props = {
            "type": "speed_camera",
            "maxspeed": parse_maxspeed(n.tags.get("maxspeed")),
            "direction": parse_direction(n.tags.get("direction")),
        }

        self.features.append({
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [n.location.lon, n.location.lat],
            },
            "properties": props,
        })


class SpeedLimitHandler(osmium.SimpleHandler):
    """Extracts speed limit ways from an OSM PBF file.

    Represents each way as a Point at the midpoint of its first segment.
    """

    def __init__(self):
        super().__init__()
        self.features = []

    def way(self, w):
        maxspeed = parse_maxspeed(w.tags.get("maxspeed"))
        if maxspeed is None:
            return

        # Compute midpoint of the first segment (first two nodes)
        nodes = list(w.nodes)
        if len(nodes) < 2:
            return

        n0 = nodes[0]
        n1 = nodes[1]

        if not n0.location.valid() or not n1.location.valid():
            return

        mid_lon = (n0.location.lon + n1.location.lon) / 2.0
        mid_lat = (n0.location.lat + n1.location.lat) / 2.0

        props = {
            "type": "speed_limit",
            "maxspeed": maxspeed,
            "highway": w.tags.get("highway"),
        }

        self.features.append({
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [mid_lon, mid_lat],
            },
            "properties": props,
        })


def main():
    if len(sys.argv) != 4:
        print(
            "Usage: python3 build-poi-json.py <cameras.osm.pbf> <limits.osm.pbf> <output.json>",
            file=sys.stderr,
        )
        sys.exit(1)

    cameras_pbf = sys.argv[1]
    limits_pbf = sys.argv[2]
    output_path = sys.argv[3]

    # Extract speed cameras
    camera_handler = CameraHandler()
    camera_handler.apply_file(cameras_pbf)

    # Extract speed limits (need node locations for way midpoints)
    limit_handler = SpeedLimitHandler()
    limit_handler.apply_file(limits_pbf, locations=True)

    all_features = camera_handler.features + limit_handler.features

    geojson = {
        "type": "FeatureCollection",
        "features": all_features,
    }

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(geojson, f, ensure_ascii=False)

    print(
        f"{len(camera_handler.features)} cameras, "
        f"{len(limit_handler.features)} speed limit segments written"
    )


if __name__ == "__main__":
    main()
