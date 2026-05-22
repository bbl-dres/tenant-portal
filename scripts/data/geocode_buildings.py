"""One-off geocoder for data/buildings.geojson + data/tenancies.json.

Replaces the hand-typed approximate coordinates with real WGS84 lng/lat
returned by the public swisstopo SearchServer ("Address Search"):
    https://docs.geo.admin.ch/access-data/search.html

Endpoint:
    GET https://api3.geo.admin.ch/rest/services/ech/SearchServer
        ?searchText=<street> <houseNumber>, <postalCode> <city>
        &type=locations
        &sr=4326
        &origins=address

We keep the existing FeatureCollection structure intact and only mutate
geometry.coordinates (buildings.geojson) and lat/lng (tenancies.json).
Run once and commit the output.

Usage:
    python scripts/data/geocode_buildings.py
"""
from __future__ import annotations

import json
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BUILDINGS = ROOT / "data" / "buildings.geojson"
TENANCIES = ROOT / "data" / "tenancies.json"

ENDPOINT = "https://api3.geo.admin.ch/rest/services/ech/SearchServer"
USER_AGENT = "tenant-portal-prototype/geocoder (github.com/bbl-dres/tenant-portal)"


def geocode(street: str, house_number: str, postal_code: str, city: str) -> tuple[float, float] | None:
    """Return (lng, lat) for an address, or None if no result.

    swisstopo's "address" origin returns the rooftop / building entrance
    coordinate, which is exactly what we need for the Standort map.
    """
    query = f"{street} {house_number}, {postal_code} {city}".strip()
    params = {
        "searchText": query,
        "type":       "locations",
        "sr":         "4326",
        "origins":    "address",
        "limit":      "1",
    }
    url = f"{ENDPOINT}?{urllib.parse.urlencode(params)}"
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=15) as resp:
        payload = json.loads(resp.read().decode("utf-8"))
    results = payload.get("results", [])
    if not results:
        return None
    attrs = results[0].get("attrs", {})
    lng = attrs.get("lon")
    lat = attrs.get("lat")
    if lng is None or lat is None:
        return None
    return float(lng), float(lat)


def main() -> int:
    buildings = json.loads(BUILDINGS.read_text(encoding="utf-8"))
    tenancies = json.loads(TENANCIES.read_text(encoding="utf-8"))

    # buildingId → (lng, lat) so we can sync tenancies in one pass.
    new_coords: dict[str, tuple[float, float]] = {}

    for feature in buildings["features"]:
        props = feature["properties"]
        bid = props["buildingId"]
        addr = f"{props['street']} {props['houseNumber']}, {props['postalCode']} {props['city']}"
        try:
            coords = geocode(props["street"], props["houseNumber"], props["postalCode"], props["city"])
        except Exception as e:
            print(f"  ! {bid} ({addr}): request failed — {e}", file=sys.stderr)
            continue
        if coords is None:
            print(f"  ? {bid} ({addr}): no geocoder result, keeping existing coordinates", file=sys.stderr)
            continue
        lng, lat = coords
        old_lng, old_lat = feature["geometry"]["coordinates"]
        feature["geometry"]["coordinates"] = [round(lng, 6), round(lat, 6)]
        new_coords[bid] = (round(lng, 6), round(lat, 6))
        print(f"  + {bid:<10} {addr:<60} {old_lng:.4f},{old_lat:.4f} -> {lng:.6f},{lat:.6f}")
        time.sleep(0.2)  # be polite to the public endpoint

    # Sync the denormalised lat/lng on tenancies (keyed by buildingId).
    updated_tenancies = 0
    for t in tenancies:
        bid = t.get("buildingId")
        if bid in new_coords:
            lng, lat = new_coords[bid]
            t["lat"] = lat
            t["lng"] = lng
            updated_tenancies += 1

    BUILDINGS.write_text(json.dumps(buildings, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    TENANCIES.write_text(json.dumps(tenancies, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print()
    print(f"Updated {len(new_coords)} building(s) in buildings.geojson")
    print(f"Updated {updated_tenancies} tenancy record(s) in tenancies.json")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
