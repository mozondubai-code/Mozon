#!/usr/bin/env python3
"""Regenerate ``menu.json`` from the Mozon Broast order page.

The order form at https://mozondubai-code.github.io/mozon-broast keeps its
menu, promo codes and WhatsApp number inline in ``index-1.html``. That page is
the source of truth for prices, so rather than maintaining a second copy by
hand this script reads it back out and writes the JSON the MCP server loads.

Usage:
    python scripts/extract_menu.py ../../Mozon-broast/index-1.html
    python scripts/extract_menu.py <path-to-index.html> -o src/mozon_broast_mcp/data/menu.json
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import unicodedata
from pathlib import Path
from typing import Any

DEFAULT_OUTPUT = Path(__file__).resolve().parent.parent / "src" / "mozon_broast_mcp" / "data" / "menu.json"

# Display metadata for each category key used in the page's ``menuData`` object.
# ``is_drink`` marks the categories excluded from promo-code discounts, matching
# the page's ``DRINK_CATEGORY`` constant.
CATEGORY_META: dict[str, dict[str, Any]] = {
    "broast": {"label": "Broasted Chicken", "emoji": "🍗", "is_drink": False},
    "madhoot": {"label": "Madhoot (Rice)", "emoji": "🍚", "is_drink": False},
    "burger": {"label": "Burgers & Sandwiches", "emoji": "🍔", "is_drink": False},
    "wraps": {"label": "Wraps", "emoji": "🌯", "is_drink": False},
    "fries": {"label": "Fries & Appetizers", "emoji": "🍟", "is_drink": False},
    "drinks": {"label": "Drinks & Juices", "emoji": "🥤", "is_drink": True},
}

RESTAURANT = {
    "name": "Mozon Broast",
    "location": "Al Nahda 2, Near NMC Hospital, Dubai, UAE",
    "phone": "+971 52 487 7701",
    "hours": "Daily 12:00 PM – 2:00 AM",
    "delivery": "Free delivery within 5 km",
    "currency": "AED",
    "order_url": "https://mozondubai-code.github.io/mozon-broast",
}


def slugify(value: str) -> str:
    """Turn an item name into a stable, URL-safe id fragment."""
    normalised = unicodedata.normalize("NFKD", value)
    ascii_only = normalised.encode("ascii", "ignore").decode("ascii")
    slug = re.sub(r"[^a-z0-9]+", "-", ascii_only.lower()).strip("-")
    return slug or "item"


def extract_balanced_object(source: str, start: int) -> str:
    """Return the ``{...}`` literal beginning at ``start``, brace-matched."""
    if source[start] != "{":
        raise ValueError(f"expected '{{' at offset {start}")
    depth = 0
    in_string: str | None = None
    escaped = False
    for index in range(start, len(source)):
        char = source[index]
        if in_string:
            if escaped:
                escaped = False
            elif char == "\\":
                escaped = True
            elif char == in_string:
                in_string = None
            continue
        if char in "\"'`":
            in_string = char
        elif char == "{":
            depth += 1
        elif char == "}":
            depth -= 1
            if depth == 0:
                return source[start : index + 1]
    raise ValueError("unbalanced braces in menu data")


def js_object_to_json(literal: str) -> Any:
    """Parse the page's JS object literal (unquoted keys, trailing commas)."""
    quoted_keys = re.sub(r"([{,]\s*)([A-Za-z_$][\w$]*)\s*:", r'\1"\2":', literal)
    no_trailing_commas = re.sub(r",(\s*[}\]])", r"\1", quoted_keys)
    return json.loads(no_trailing_commas)


def parse_menu_data(html: str) -> dict[str, list[dict[str, Any]]]:
    match = re.search(r"const\s+menuData\s*=\s*", html)
    if not match:
        raise ValueError("could not find 'const menuData = ' in the page")
    literal = extract_balanced_object(html, match.end())
    return js_object_to_json(literal)


def parse_promo_codes(html: str) -> list[str]:
    match = re.search(r"const\s+VALID_CODES\s*=\s*\[(.*?)\]", html, re.DOTALL)
    if not match:
        raise ValueError("could not find 'const VALID_CODES' in the page")
    return re.findall(r"['\"]([^'\"]+)['\"]", match.group(1))


def parse_discount_rate(html: str) -> float:
    """Read the discount multiplier out of the page's updateTotal() maths."""
    match = re.search(r"foodSubtotal\s*\*\s*([0-9.]+)\s*\*\s*100", html)
    if not match:
        raise ValueError("could not find the discount rate in the page")
    return float(match.group(1))


def parse_whatsapp_number(html: str) -> str:
    match = re.search(r"wa\.me/(\d+)", html)
    if not match:
        raise ValueError("could not find the wa.me number in the page")
    return match.group(1)


def build_catalog(html: str) -> dict[str, Any]:
    menu_data = parse_menu_data(html)

    unknown = sorted(set(menu_data) - set(CATEGORY_META))
    if unknown:
        raise ValueError(
            f"page has categories with no metadata in CATEGORY_META: {', '.join(unknown)}. "
            "Add them to scripts/extract_menu.py and re-run."
        )

    categories = []
    seen_ids: set[str] = set()
    for key, meta in CATEGORY_META.items():
        raw_items = menu_data.get(key)
        if not raw_items:
            continue
        items = []
        for item in raw_items:
            item_id = f"{key}-{slugify(item['name'])}"
            if item_id in seen_ids:
                raise ValueError(f"duplicate item id generated: {item_id}")
            seen_ids.add(item_id)
            items.append(
                {
                    "id": item_id,
                    "name": item["name"],
                    "description": item.get("desc", ""),
                    "price": item["price"],
                }
            )
        categories.append(
            {
                "key": key,
                "label": meta["label"],
                "emoji": meta["emoji"],
                "is_drink": meta["is_drink"],
                "items": items,
            }
        )

    return {
        "restaurant": {**RESTAURANT, "whatsapp": parse_whatsapp_number(html)},
        "promotions": {
            "codes": parse_promo_codes(html),
            "food_discount_rate": parse_discount_rate(html),
            "note": (
                "Promo codes take the discount off food only; drinks are excluded. "
                "Corporate orders for 5+ people also get a free garlic sauce platter on the first order."
            ),
        },
        "categories": categories,
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("source", type=Path, help="path to the Mozon Broast order page HTML")
    parser.add_argument("-o", "--output", type=Path, default=DEFAULT_OUTPUT, help="where to write menu.json")
    args = parser.parse_args(argv)

    if not args.source.is_file():
        print(f"error: no such file: {args.source}", file=sys.stderr)
        return 1

    catalog = build_catalog(args.source.read_text(encoding="utf-8"))
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(catalog, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    item_count = sum(len(category["items"]) for category in catalog["categories"])
    print(f"wrote {args.output} — {len(catalog['categories'])} categories, {item_count} items", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
