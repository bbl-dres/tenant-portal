"""One-off generator for data/floors.geojson + data/spaces.geojson.

Emits mock floor outlines and room polygons for every BBL-managed building
listed in BUILDINGS below. Each floor is an 80 m x 30 m rectangle centred at
the building's tenancy coordinates; each floor carries 17 rooms (8 north,
corridor, 8 south) on a regular grid. Floor count varies by building so the
demo shows small / medium / large portfolios side-by-side.

Run once and commit the output; not part of any build pipeline.

Usage:
    python scripts/data/generate-floor-spaces.py
"""
from __future__ import annotations

import json
from pathlib import Path

# Building footprint dimensions (same for every building in the prototype —
# real buildings differ but the goal is plausible mock data, not surveying
# accuracy).  ~80 m east-west, ~33 m north-south.
HALF_WIDTH_LNG  = 0.0005    # half of  ~80 m at this latitude
HALF_HEIGHT_LAT = 0.00015   # half of  ~33 m

COLS = 8
ROWS = 3  # north / corridor / south


# Layout catalogue.  Each layout names the 8 north-row useTypes and the 8
# south-row useTypes; the corridor is generated automatically.
LAYOUTS = {
    "ground": {
        "north": ["Reception", "Office", "Office", "TrainingRoom",
                  "MeetingRoom", "Office", "WC", "TechnicalRoom"],
        "south": ["Lounge", "Cafeteria", "PrintRoom", "Kitchenette",
                  "Office", "Office", "Office", "Storage"],
    },
    "standard": {
        "north": ["Office", "Office", "Office", "MeetingRoom",
                  "MeetingRoom", "Office", "WC", "TechnicalRoom"],
        "south": ["Office", "Office", "FocusRoom", "Kitchenette",
                  "Office", "Office", "Office", "Storage"],
    },
    "attic": {
        "north": ["Office", "Office", "Office", "MeetingRoom",
                  "Office", "Office", "WC", "TechnicalRoom"],
        "south": ["Archive", "Archive", "Storage", "Kitchenette",
                  "Office", "Office", "Office", "Storage"],
    },
}

# Per-useType room metadata.  Areas in m^2.  isBookable drives the drawer
# label on the floor-detail page.
USE_META = {
    "Office":        {"area": 68, "capacity": 4,  "bookable": False},
    "MeetingRoom":   {"area": 68, "capacity": 8,  "bookable": True},
    "FocusRoom":     {"area": 68, "capacity": 1,  "bookable": True},
    "TrainingRoom":  {"area": 68, "capacity": 20, "bookable": True},
    "Reception":     {"area": 68, "capacity": 2,  "bookable": False},
    "Lounge":        {"area": 68, "capacity": 8,  "bookable": False},
    "Cafeteria":     {"area": 68, "capacity": 16, "bookable": False},
    "Kitchenette":   {"area": 68, "capacity": 0,  "bookable": False},
    "PrintRoom":     {"area": 68, "capacity": 0,  "bookable": False},
    "WC":            {"area": 68, "capacity": 0,  "bookable": False},
    "TechnicalRoom": {"area": 68, "capacity": 0,  "bookable": False},
    "Storage":       {"area": 68, "capacity": 0,  "bookable": False},
    "Archive":       {"area": 68, "capacity": 0,  "bookable": False},
    "Corridor":      {"area": 600, "capacity": 0, "bookable": False},
}


# One entry per building.  Floor count picked to be plausible against the
# tenancy GF (data/tenancies.json) and the building's real-world function
# (small offices → 1-2 floors; bigger ministries → 3-5).
BUILDINGS = [
    {"buildingId": "BLD-2010", "lng": 7.4459, "lat": 46.9481,
     "ve": "UVEK", "dep": "GS UVEK",      "floors": ["EG", "1OG"]},
    {"buildingId": "BLD-2011", "lng": 7.4884, "lat": 46.9766,
     "ve": "UVEK", "dep": "BAFU",         "floors": ["EG", "1OG", "2OG", "3OG", "4OG"]},
    {"buildingId": "BLD-2012", "lng": 7.4880, "lat": 46.9763,
     "ve": "UVEK", "dep": "ARE",          "floors": ["EG", "1OG"]},
    {"buildingId": "BLD-2013", "lng": 7.4858, "lat": 46.9776,
     "ve": "UVEK", "dep": "BAV",          "floors": ["EG", "1OG", "2OG", "3OG"]},
    {"buildingId": "BLD-2014", "lng": 7.4863, "lat": 46.9779,
     "ve": "UVEK", "dep": "BAZL",         "floors": ["EG", "1OG", "2OG"]},
    {"buildingId": "BLD-2015", "lng": 7.4815, "lat": 46.9744,
     "ve": "UVEK", "dep": "BFE",          "floors": ["EG", "1OG", "2OG"]},
    {"buildingId": "BLD-2016", "lng": 7.9505, "lat": 47.2872,
     "ve": "UVEK", "dep": "ASTRA",        "floors": ["EG", "1OG"]},
    {"buildingId": "BLD-2017", "lng": 7.2569, "lat": 47.1493,
     "ve": "UVEK", "dep": "BAKOM",        "floors": ["EG", "1OG", "2OG"]},
    {"buildingId": "BLD-2018", "lng": 8.5614, "lat": 47.4502,
     "ve": "UVEK", "dep": "MeteoSchweiz", "floors": ["EG", "1OG"]},
    {"buildingId": "BLD-2019", "lng": 8.7869, "lat": 46.1748,
     "ve": "UVEK", "dep": "MeteoSchweiz", "floors": ["EG"]},
]

FLOOR_DISPLAY = {
    "EG":  ("EG",     0),
    "1OG": ("1. OG",  1),
    "2OG": ("2. OG",  2),
    "3OG": ("3. OG",  3),
    "4OG": ("4. OG",  4),
}


def layout_for(slug: str, slugs: list[str]) -> str:
    """Pick a layout based on floor position within the building."""
    if slug == "EG":
        return "ground"
    if slug == slugs[-1] and len(slugs) >= 3:
        return "attic"
    return "standard"


def rect(lng_min: float, lat_min: float, lng_max: float, lat_max: float):
    return [[
        [lng_min, lat_min],
        [lng_max, lat_min],
        [lng_max, lat_max],
        [lng_min, lat_max],
        [lng_min, lat_min],
    ]]


def feature(props: dict, ring) -> dict:
    return {
        "type": "Feature",
        "properties": props,
        "geometry": {"type": "Polygon", "coordinates": ring},
    }


def build_building(b: dict) -> tuple[list[dict], list[dict]]:
    """Return (floor-features, space-features) for one building."""
    lng_w = b["lng"] - HALF_WIDTH_LNG
    lng_e = b["lng"] + HALF_WIDTH_LNG
    lat_s = b["lat"] - HALF_HEIGHT_LAT
    lat_n = b["lat"] + HALF_HEIGHT_LAT
    col_w = (lng_e - lng_w) / COLS
    row_h = (lat_n - lat_s) / ROWS
    lat_n_row_s = lat_n - row_h       # bottom of north row
    lat_s_row_n = lat_s + row_h       # top of south row

    floor_features: list[dict] = []
    space_features: list[dict] = []

    for slug in b["floors"]:
        display, level = FLOOR_DISPLAY[slug]
        floor_id = f"{b['buildingId']}-{slug}"
        layout = LAYOUTS[layout_for(slug, b["floors"])]

        # Floor polygon
        floor_features.append(feature(
            {
                "floorId": floor_id,
                "buildingId": b["buildingId"],
                "name": display,
                "levelNumber": level,
                "areaGross": 2240,
                "floorPlanDocumentId": None,
            },
            rect(lng_w, lat_s, lng_e, lat_n),
        ))

        # Corridor — full width, middle row
        space_features.append(feature(
            {
                "spaceId":   f"{floor_id}-00",
                "floorId":   floor_id,
                "buildingId": b["buildingId"],
                "name":      f"{display} · 00",
                "useType":   "Corridor",
                "area":      USE_META["Corridor"]["area"],
                "capacity":  USE_META["Corridor"]["capacity"],
                "isBookable": USE_META["Corridor"]["bookable"],
                "occupierVe":  None,
                "occupierDep": None,
            },
            rect(lng_w, lat_s_row_n, lng_e, lat_n_row_s),
        ))

        # North row — room numbers 01-08
        for col, use_type in enumerate(layout["north"]):
            room_no = col + 1
            meta = USE_META[use_type]
            x_min = lng_w + col * col_w
            x_max = x_min + col_w
            space_features.append(feature(
                {
                    "spaceId":   f"{floor_id}-{room_no:02d}",
                    "floorId":   floor_id,
                    "buildingId": b["buildingId"],
                    "name":      f"{display} · {room_no:02d}",
                    "useType":   use_type,
                    "area":      meta["area"],
                    "capacity":  meta["capacity"],
                    "isBookable": meta["bookable"],
                    "occupierVe":  b["ve"],
                    "occupierDep": b["dep"],
                },
                rect(x_min, lat_n_row_s, x_max, lat_n),
            ))

        # South row — room numbers 09-16
        for col, use_type in enumerate(layout["south"]):
            room_no = col + 9
            meta = USE_META[use_type]
            x_min = lng_w + col * col_w
            x_max = x_min + col_w
            space_features.append(feature(
                {
                    "spaceId":   f"{floor_id}-{room_no:02d}",
                    "floorId":   floor_id,
                    "buildingId": b["buildingId"],
                    "name":      f"{display} · {room_no:02d}",
                    "useType":   use_type,
                    "area":      meta["area"],
                    "capacity":  meta["capacity"],
                    "isBookable": meta["bookable"],
                    "occupierVe":  b["ve"],
                    "occupierDep": b["dep"],
                },
                rect(x_min, lat_s, x_max, lat_s_row_n),
            ))

    return floor_features, space_features


def main() -> None:
    all_floors: list[dict] = []
    all_spaces: list[dict] = []
    for b in BUILDINGS:
        floors, spaces = build_building(b)
        all_floors.extend(floors)
        all_spaces.extend(spaces)

    base = Path(__file__).resolve().parents[1] / "data"

    floors_fc = {
        "type": "FeatureCollection",
        "name": "BBL Floors",
        "crs": {"type": "name",
                 "properties": {"name": "urn:ogc:def:crs:OGC:1.3:CRS84"}},
        "features": all_floors,
    }
    (base / "floors.geojson").write_text(
        json.dumps(floors_fc, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8")

    spaces_fc = {
        "type": "FeatureCollection",
        "name": "BBL Spaces",
        "crs": {"type": "name",
                 "properties": {"name": "urn:ogc:def:crs:OGC:1.3:CRS84"}},
        "features": all_spaces,
    }
    (base / "spaces.geojson").write_text(
        json.dumps(spaces_fc, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8")

    print(f"Wrote {len(all_floors)} floors and {len(all_spaces)} spaces "
          f"across {len(BUILDINGS)} buildings.")


if __name__ == "__main__":
    main()
