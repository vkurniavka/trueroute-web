#!/usr/bin/env python3
"""
build-poi-json.py — Extract safety and navigation POIs from OSM PBF to GeoJSON.

This data is for the TrueRoute mobile app ONLY — it is NOT rendered on the website.

Produces two output files:
  - {id}-cameras.json: Speed cameras + railroad crossings (safety POIs)
  - {id}-nav-poi.json: Fuel, hospital, pharmacy, parking (navigation POIs)

Usage:
    python3 build-poi-json.py <region.osm.pbf> <safety-output.json> <nav-output.json>

Requires: osmium (pip install osmium)
"""

import json
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


def osm_camera_type(tags: dict) -> str:
    """Map OSM camera:type / enforcement tags to TrueRoute CameraType serialized name.

    TrueRoute CameraType enum:
      FIXED        → @SerialName("fixed")
      MOBILE       → @SerialName("mobile")
      SECTION_START → @SerialName("section_start")   (M18)
      SECTION_END   → @SerialName("section_end")     (M18)

    Section / average-speed camera pair matching is out of scope until M18.
    All non-mobile cameras are mapped to "fixed".
    """
    camera_type = tags.get("camera:type", "").lower()
    if camera_type == "mobile":
        return "mobile"
    # "average_speed" section cameras are not modelled until M18
    return "fixed"


class SafetyPOIHandler(osmium.SimpleHandler):
    """Extracts speed cameras from OSM PBF.

    Output format matches the TrueRoute CamerasFile / SpeedCamera schema:
      { "version": 1, "cameras": [ { "id", "lat", "lng", "direction", "speedLimit", "type" }, ... ] }

    Railroad crossings are intentionally excluded — they are not SpeedCamera objects
    and cannot be represented in CamerasFile.cameras. They will be handled in M18
    via a separate crossings endpoint.

    NOTE: Cameras without a valid maxspeed tag are skipped because SpeedCamera.init
    requires speedLimit > 0. Track https://github.com/vkurniavka/TrueRoute/issues
    for "support cameras with unknown speed limit" (show '?' badge, allow speedLimit=0).
    """

    def __init__(self):
        super().__init__()
        self.cameras = []

    def node(self, n):
        if not n.location.valid():
            return

        tags = {t.k: t.v for t in n.tags}

        highway = tags.get("highway", "")
        enforcement = tags.get("enforcement", "")
        if highway != "speed_camera" and enforcement != "maxspeed":
            return

        # SpeedCamera.init requires speedLimit > 0.
        # Skip cameras with no OSM maxspeed tag to avoid uncaught IllegalArgumentException
        # in CameraRepository.parseCamerasFile (only catches SerializationException/IOException).
        speed_limit = parse_maxspeed(tags.get("maxspeed"))
        if speed_limit is None or speed_limit <= 0:
            return

        direction_raw = parse_direction(tags.get("direction"))
        direction = int(round(direction_raw)) if direction_raw is not None else None

        self.cameras.append({
            "id": f"cam-{n.id}",
            "lat": n.location.lat,
            "lng": n.location.lon,
            "direction": direction,
            "speedLimit": speed_limit,
            "type": osm_camera_type(tags),
        })

    def to_cameras_file(self) -> dict:
        """Return the CamerasFile-compatible dict: {"version": 1, "cameras": [...]}."""
        return {"version": 1, "cameras": self.cameras}


class NavigationPOIHandler(osmium.SimpleHandler):
    """Extracts navigation POIs: fuel, hospital, pharmacy, parking."""

    # amenity tag → POI type
    AMENITY_MAP = {
        "fuel": "fuel",
        "hospital": "hospital",
        "clinic": "hospital",
        "pharmacy": "pharmacy",
        "parking": "parking",
    }

    def __init__(self):
        super().__init__()
        self.features = []

    def node(self, n):
        if not n.location.valid():
            return

        tags = {t.k: t.v for t in n.tags}
        amenity = tags.get("amenity", "")
        poi_type = self.AMENITY_MAP.get(amenity)
        if not poi_type:
            return

        props = {
            "type": poi_type,
        }
        name = tags.get("name")
        if name:
            props["name"] = name
        name_uk = tags.get("name:uk")
        if name_uk:
            props["name_uk"] = name_uk

        # Fuel-specific: brand and fuel types
        if poi_type == "fuel":
            brand = tags.get("brand")
            if brand:
                props["brand"] = brand

        # Hospital: emergency tag
        if poi_type == "hospital":
            emergency = tags.get("emergency")
            if emergency:
                props["emergency"] = emergency

        self.features.append({
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [n.location.lon, n.location.lat],
            },
            "properties": props,
        })

    def way(self, w):
        """Handle area features (parking lots, hospitals mapped as buildings)."""
        tags = {t.k: t.v for t in w.tags}
        amenity = tags.get("amenity", "")
        poi_type = self.AMENITY_MAP.get(amenity)
        if not poi_type:
            return

        # Compute centroid
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

        props = {
            "type": poi_type,
        }
        name = tags.get("name")
        if name:
            props["name"] = name
        name_uk = tags.get("name:uk")
        if name_uk:
            props["name_uk"] = name_uk

        if poi_type == "fuel":
            brand = tags.get("brand")
            if brand:
                props["brand"] = brand

        self.features.append({
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [lng, lat],
            },
            "properties": props,
        })


def write_json(data, output_path):
    """Write a JSON object to file."""
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False)


def write_geojson(features, output_path):
    """Write a GeoJSON FeatureCollection to file."""
    geojson = {
        "type": "FeatureCollection",
        "features": features,
    }
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(geojson, f, ensure_ascii=False)


def main():
    if len(sys.argv) != 4:
        print(
            "Usage: python3 build-poi-json.py <region.osm.pbf> <safety-output.json> <nav-output.json>",
            file=sys.stderr,
        )
        sys.exit(1)

    region_pbf = sys.argv[1]
    safety_output = sys.argv[2]
    nav_output = sys.argv[3]

    # Extract speed cameras — output as CamerasFile JSON (not GeoJSON)
    safety_handler = SafetyPOIHandler()
    safety_handler.apply_file(region_pbf)

    # Extract navigation POIs (fuel, hospital, pharmacy, parking)
    nav_handler = NavigationPOIHandler()
    nav_handler.apply_file(region_pbf, locations=True)

    # cameras.json: CamerasFile schema {"version": 1, "cameras": [...]}
    # Required by CameraRepository.parseCamerasFile() → json.decodeFromString(CamerasFile.serializer(), ...)
    write_json(safety_handler.to_cameras_file(), safety_output)

    write_geojson(nav_handler.features, nav_output)

    print(
        f"Safety: {len(safety_handler.cameras)} cameras "
        f"(speed cameras only; railroad crossings excluded — M18)"
    )
    print(
        f"Navigation: {len(nav_handler.features)} features "
        f"(fuel, hospital, pharmacy, parking)"
    )


if __name__ == "__main__":
    main()
