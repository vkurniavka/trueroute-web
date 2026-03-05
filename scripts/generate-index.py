#!/usr/bin/env python3
"""generate-index.py — Build index.json for TrueRoute regional data packages.

Reads a JSONL manifest of R2 asset metadata (sha256, sizeBytes, lastModified)
written by generate-index.sh and produces index.json conforming to the
RegionIndex schema defined in src/schemas/regions.schema.ts.

Usage:
    python3 generate-index.py \
        --regions-file scripts/regions.txt \
        --cdn-base-url https://data.trueroute.app \
        --manifest /tmp/manifest.jsonl \
        --checksums /tmp/checksums.json

    Outputs index.json to stdout.
    If --checksums is given, also writes checksums.json to that path.
"""

import argparse
import json
import sys
from datetime import datetime, timezone

# Region name mapping: id -> (English name, Ukrainian name)
# Source: sample-index.json / Geofabrik Ukraine region names
REGION_NAMES = {
    "cherkasy": ("Cherkasy Oblast", "Черкаська область"),
    "chernihiv": ("Chernihiv Oblast", "Чернігівська область"),
    "chernivtsi": ("Chernivtsi Oblast", "Чернівецька область"),
    "crimea": ("Crimea", "Автономна Республіка Крим"),
    "dnipropetrovsk": ("Dnipropetrovsk Oblast", "Дніпропетровська область"),
    "donetsk": ("Donetsk Oblast", "Донецька область"),
    "ivano-frankivsk": ("Ivano-Frankivsk Oblast", "Івано-Франківська область"),
    "kharkiv": ("Kharkiv Oblast", "Харківська область"),
    "kherson": ("Kherson Oblast", "Херсонська область"),
    "khmelnytskyi": ("Khmelnytskyi Oblast", "Хмельницька область"),
    "kirovohrad": ("Kirovohrad Oblast", "Кіровоградська область"),
    "kyiv-oblast": ("Kyiv Oblast", "Київська область"),
    "kyiv-city": ("Kyiv City", "місто Київ"),
    "luhansk": ("Luhansk Oblast", "Луганська область"),
    "lviv": ("Lviv Oblast", "Львівська область"),
    "mykolaiv": ("Mykolaiv Oblast", "Миколаївська область"),
    "odesa": ("Odesa Oblast", "Одеська область"),
    "poltava": ("Poltava Oblast", "Полтавська область"),
    "rivne": ("Rivne Oblast", "Рівненська область"),
    "sumy": ("Sumy Oblast", "Сумська область"),
    "ternopil": ("Ternopil Oblast", "Тернопільська область"),
    "vinnytsia": ("Vinnytsia Oblast", "Вінницька область"),
    "volyn": ("Volyn Oblast", "Волинська область"),
    "zakarpattia": ("Zakarpattia Oblast", "Закарпатська область"),
    "zaporizhzhia": ("Zaporizhzhia Oblast", "Запорізька область"),
    "zhytomyr": ("Zhytomyr Oblast", "Житомирська область"),
}

# Asset type -> (subdirectory, filename pattern with {id} placeholder)
ASSET_PATTERNS = {
    "maps": ("maps", "{id}.pmtiles"),
    "geocode": ("geocode", "{id}.db"),
    "poi": ("poi", "{id}-cameras.json"),
}


def normalize_datetime(dt_str):
    """Normalize a datetime string to ISO 8601 with Z suffix."""
    dt_str = dt_str.strip()
    formats = [
        "%Y-%m-%dT%H:%M:%S%z",
        "%Y-%m-%dT%H:%M:%S.%f%z",
        "%Y-%m-%dT%H:%M:%SZ",
        "%a, %d %b %Y %H:%M:%S %Z",
    ]
    for fmt in formats:
        try:
            dt = datetime.strptime(dt_str, fmt)
            return dt.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        except ValueError:
            continue
    # If already ends with Z and looks like ISO, return as-is
    if dt_str.endswith("Z") and "T" in dt_str:
        return dt_str
    print(f"WARNING: Could not parse datetime '{dt_str}', using as-is", file=sys.stderr)
    return dt_str


def main():
    parser = argparse.ArgumentParser(
        description="Generate index.json for TrueRoute regional data packages"
    )
    parser.add_argument(
        "--regions-file", required=True, help="Path to regions.txt"
    )
    parser.add_argument(
        "--cdn-base-url", required=True, help="CDN base URL (e.g. https://data.trueroute.app)"
    )
    parser.add_argument(
        "--manifest", required=True, help="Path to manifest JSONL file"
    )
    parser.add_argument(
        "--checksums", help="Path to write checksums.json (optional)"
    )
    args = parser.parse_args()

    # Read region IDs from regions.txt
    with open(args.regions_file) as f:
        region_ids = [
            line.strip()
            for line in f
            if line.strip() and not line.strip().startswith("#")
        ]

    # Read manifest (JSONL: one JSON object per line)
    manifest = {}
    with open(args.manifest) as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            entry = json.loads(line)
            manifest[entry["key"]] = entry

    # Build regions array
    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    regions = []
    checksums_files = {}

    for region_id in region_ids:
        if region_id not in REGION_NAMES:
            print(
                f"WARNING: Unknown region '{region_id}', skipping",
                file=sys.stderr,
            )
            continue

        name_en, name_uk = REGION_NAMES[region_id]
        assets = {}

        for asset_type, (subdir, filename_pattern) in ASSET_PATTERNS.items():
            filename = filename_pattern.replace("{id}", region_id)
            key = f"regions/{region_id}/{subdir}/{filename}"

            if key not in manifest:
                print(f"ERROR: Missing asset in manifest: {key}", file=sys.stderr)
                sys.exit(1)

            entry = manifest[key]
            url = f"{args.cdn_base_url}/regions/{region_id}/{subdir}/{filename}"

            assets[asset_type] = {
                "url": url,
                "sizeBytes": entry["sizeBytes"],
                "sha256": entry["sha256"],
                "generatedAt": normalize_datetime(entry["lastModified"]),
            }

            checksums_files[key] = entry["sha256"]

        regions.append({
            "id": region_id,
            "name": name_en,
            "nameUk": name_uk,
            "assets": assets,
        })

    # Build index.json
    index = {
        "version": 1,
        "generatedAt": now,
        "regions": regions,
    }

    # Output index.json to stdout
    json.dump(index, sys.stdout, indent=2, ensure_ascii=False)
    sys.stdout.write("\n")

    # Optionally write checksums.json
    if args.checksums:
        checksums = {
            "generatedAt": now,
            "files": checksums_files,
        }
        with open(args.checksums, "w") as f:
            json.dump(checksums, f, indent=2)
            f.write("\n")
        print(
            f"checksums.json written to {args.checksums}",
            file=sys.stderr,
        )


if __name__ == "__main__":
    main()
