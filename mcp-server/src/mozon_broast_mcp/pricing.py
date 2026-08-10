"""Order pricing, mirroring the arithmetic in the Mozon Broast order page.

The page splits the basket into food and drinks, applies a promo code to the
food subtotal only, and rounds to two decimals at each step. These functions
reproduce that exactly so a quote from the MCP server always matches the total
the customer sees on the website.
"""

from __future__ import annotations

from dataclasses import dataclass
from decimal import ROUND_HALF_UP, Decimal

from .catalog import Catalog, MenuError, MenuItem

CENTS = Decimal("0.01")


def _round(value: Decimal) -> Decimal:
    """Round half-up to two decimals, matching the page's Math.round(x*100)/100."""
    return value.quantize(CENTS, rounding=ROUND_HALF_UP)


@dataclass(frozen=True)
class OrderLine:
    item: MenuItem
    quantity: int

    @property
    def line_total(self) -> Decimal:
        return _round(Decimal(str(self.item.price)) * self.quantity)


@dataclass(frozen=True)
class Quote:
    lines: tuple[OrderLine, ...]
    food_subtotal: Decimal
    drinks_subtotal: Decimal
    discount: Decimal
    total: Decimal
    promo_code: str | None
    promo_applied: bool
    currency: str

    @property
    def item_count(self) -> int:
        return sum(line.quantity for line in self.lines)


def build_lines(catalog: Catalog, requested: list[tuple[str, int]]) -> tuple[OrderLine, ...]:
    """Resolve ``(item reference, quantity)`` pairs against the menu.

    Repeated references are merged so ``[("fries", 1), ("fries", 2)]`` becomes a
    single line of three.
    """
    if not requested:
        raise MenuError("An order needs at least one item.")

    merged: dict[str, OrderLine] = {}
    for reference, quantity in requested:
        if quantity < 1:
            raise MenuError(f"Quantity for {reference!r} must be at least 1 (got {quantity}).")
        item = catalog.find(reference)
        existing = merged.get(item.id)
        merged[item.id] = OrderLine(item=item, quantity=(existing.quantity if existing else 0) + quantity)
    return tuple(merged.values())


def price_order(catalog: Catalog, lines: tuple[OrderLine, ...], promo_code: str | None = None) -> Quote:
    food_subtotal = Decimal("0")
    drinks_subtotal = Decimal("0")
    for line in lines:
        if line.item.is_drink:
            drinks_subtotal += line.line_total
        else:
            food_subtotal += line.line_total

    food_subtotal = _round(food_subtotal)
    drinks_subtotal = _round(drinks_subtotal)

    promo_applied = catalog.promotions.is_valid(promo_code)
    rate = Decimal(str(catalog.promotions.food_discount_rate))
    discount = _round(food_subtotal * rate) if promo_applied else Decimal("0.00")
    total = _round(food_subtotal - discount + drinks_subtotal)

    return Quote(
        lines=lines,
        food_subtotal=food_subtotal,
        drinks_subtotal=drinks_subtotal,
        discount=discount,
        total=total,
        promo_code=promo_code.strip().upper() if promo_code and promo_code.strip() else None,
        promo_applied=promo_applied,
        currency=catalog.currency,
    )


def quote_from_request(
    catalog: Catalog,
    requested: list[tuple[str, int]],
    promo_code: str | None = None,
) -> Quote:
    return price_order(catalog, build_lines(catalog, requested), promo_code)
