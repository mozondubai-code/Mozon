"""Loading and querying the Mozon Broast menu."""

from __future__ import annotations

import json
import os
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import Any

DEFAULT_MENU_PATH = Path(__file__).resolve().parent / "data" / "menu.json"

# Set this to point the server at an alternative menu.json (a seasonal menu, a
# second branch, or a test fixture) without touching the package data.
MENU_PATH_ENV_VAR = "MOZON_MENU_PATH"


class MenuError(Exception):
    """Raised when the menu cannot be loaded or a lookup cannot be satisfied."""


@dataclass(frozen=True)
class MenuItem:
    id: str
    name: str
    description: str
    price: float
    category_key: str
    category_label: str
    is_drink: bool


@dataclass(frozen=True)
class Category:
    key: str
    label: str
    emoji: str
    is_drink: bool
    items: tuple[MenuItem, ...]


@dataclass(frozen=True)
class Promotions:
    codes: tuple[str, ...]
    food_discount_rate: float
    note: str

    def is_valid(self, code: str | None) -> bool:
        if not code or not code.strip():
            return False
        return code.strip().upper() in self.codes


@dataclass(frozen=True)
class Catalog:
    restaurant: dict[str, Any]
    promotions: Promotions
    categories: tuple[Category, ...]

    @property
    def items(self) -> tuple[MenuItem, ...]:
        return tuple(item for category in self.categories for item in category.items)

    @property
    def currency(self) -> str:
        return str(self.restaurant.get("currency", "AED"))

    def category(self, key: str) -> Category:
        wanted = key.strip().lower()
        for category in self.categories:
            if category.key == wanted or category.label.lower() == wanted:
                return category
        known = ", ".join(category.key for category in self.categories)
        raise MenuError(f"Unknown category {key!r}. Available categories: {known}.")

    def find(self, query: str) -> MenuItem:
        """Resolve a user-supplied item reference to exactly one menu item.

        Tries id, then exact name, then a unique substring match, so callers can
        say "4 Pcs Broast", "broast-4-pcs-broast" or just "avocado".
        """
        needle = query.strip().lower()
        if not needle:
            raise MenuError("No item name given.")

        for item in self.items:
            if item.id.lower() == needle or item.name.lower() == needle:
                return item

        partial = [item for item in self.items if needle in item.name.lower()]
        if len(partial) == 1:
            return partial[0]
        if not partial:
            raise MenuError(
                f"No menu item matches {query!r}. Use list_menu or search_menu to see what is available."
            )
        names = ", ".join(item.name for item in partial[:8])
        suffix = ", ..." if len(partial) > 8 else ""
        raise MenuError(
            f"{query!r} matches {len(partial)} items — be more specific. Candidates: {names}{suffix}."
        )

    def search(
        self,
        query: str = "",
        *,
        category: str | None = None,
        max_price: float | None = None,
    ) -> list[MenuItem]:
        needle = query.strip().lower()
        pool = self.category(category).items if category else self.items
        results = []
        for item in pool:
            if needle and needle not in item.name.lower() and needle not in item.description.lower():
                continue
            if max_price is not None and item.price > max_price:
                continue
            results.append(item)
        return results


def _build_catalog(payload: dict[str, Any]) -> Catalog:
    categories = []
    for raw_category in payload.get("categories", []):
        key = raw_category["key"]
        label = raw_category["label"]
        is_drink = bool(raw_category.get("is_drink", False))
        items = tuple(
            MenuItem(
                id=raw_item["id"],
                name=raw_item["name"],
                description=raw_item.get("description", ""),
                price=float(raw_item["price"]),
                category_key=key,
                category_label=label,
                is_drink=is_drink,
            )
            for raw_item in raw_category.get("items", [])
        )
        categories.append(
            Category(key=key, label=label, emoji=raw_category.get("emoji", ""), is_drink=is_drink, items=items)
        )

    raw_promotions = payload.get("promotions", {})
    promotions = Promotions(
        codes=tuple(code.upper() for code in raw_promotions.get("codes", [])),
        food_discount_rate=float(raw_promotions.get("food_discount_rate", 0.0)),
        note=str(raw_promotions.get("note", "")),
    )

    if not categories:
        raise MenuError("Menu file contains no categories.")

    return Catalog(
        restaurant=dict(payload.get("restaurant", {})),
        promotions=promotions,
        categories=tuple(categories),
    )


def load_catalog(path: str | os.PathLike[str] | None = None) -> Catalog:
    """Read the menu from ``path``, ``$MOZON_MENU_PATH`` or the bundled default."""
    menu_path = Path(path or os.environ.get(MENU_PATH_ENV_VAR) or DEFAULT_MENU_PATH)
    try:
        payload = json.loads(menu_path.read_text(encoding="utf-8"))
    except FileNotFoundError as exc:
        raise MenuError(f"Menu file not found: {menu_path}") from exc
    except json.JSONDecodeError as exc:
        raise MenuError(f"Menu file {menu_path} is not valid JSON: {exc}") from exc
    return _build_catalog(payload)


@lru_cache(maxsize=1)
def get_catalog() -> Catalog:
    """Process-wide cached catalog, used by the MCP tools."""
    return load_catalog()
