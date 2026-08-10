"""MCP server exposing the Mozon Broast menu and order flow as tools.

Runs over stdio, so nothing may be written to stdout — every log line goes to
stderr via the standard logging module.
"""

from __future__ import annotations

import logging

from mcp.server import MCPServer
from pydantic import BaseModel, Field

from .catalog import Catalog, MenuError, get_catalog
from .pricing import Quote, quote_from_request
from .whatsapp import Customer, build_link, build_message

logger = logging.getLogger(__name__)

mcp = MCPServer(
    "mozon-broast",
    version="1.0.0",
    instructions=(
        "Tools for the Mozon Broast restaurant in Al Nahda 2, Dubai. Use them to browse the menu, "
        "price a basket including promo-code discounts, and turn a confirmed order into a WhatsApp "
        "link the customer sends to the restaurant. Prices are in AED and match the public order page. "
        "Always price an order and show the customer the total before creating a WhatsApp link."
    ),
)


class OrderItem(BaseModel):
    """One line of an order."""

    item: str = Field(description="Menu item name or id, e.g. '4 Pcs Broast' or 'broast-4-pcs-broast'")
    quantity: int = Field(default=1, ge=1, description="How many of this item")


def _requested(items: list[OrderItem]) -> list[tuple[str, int]]:
    return [(entry.item, entry.quantity) for entry in items]


def _format_quote(catalog: Catalog, quote: Quote) -> str:
    currency = quote.currency
    lines = [
        f"- {line.item.name} x{line.quantity} @ {currency} {line.item.price:.2f} = {currency} {line.line_total:.2f}"
        for line in quote.lines
    ]
    body = [f"Order — {quote.item_count} item(s)", *lines, ""]
    body.append(f"Food subtotal:   {currency} {quote.food_subtotal:.2f}")
    if quote.drinks_subtotal > 0:
        body.append(f"Drinks subtotal: {currency} {quote.drinks_subtotal:.2f}")

    if quote.promo_applied:
        rate = catalog.promotions.food_discount_rate
        body.append(f"Discount ({quote.promo_code}): -{currency} {quote.discount:.2f} ({rate:.0%} off food)")
    elif quote.promo_code:
        codes = ", ".join(catalog.promotions.codes)
        body.append(f"Promo code {quote.promo_code} is not valid — no discount applied. Valid codes: {codes}.")

    body.append(f"TOTAL:           {currency} {quote.total:.2f}")
    return "\n".join(body)


@mcp.tool()
def get_restaurant_info() -> str:
    """Get Mozon Broast's location, opening hours, delivery area, contact number and current offers."""
    catalog = get_catalog()
    info = catalog.restaurant
    promotions = catalog.promotions
    return "\n".join(
        [
            f"{info.get('name', 'Mozon Broast')}",
            f"Location: {info.get('location', 'n/a')}",
            f"Hours: {info.get('hours', 'n/a')}",
            f"Delivery: {info.get('delivery', 'n/a')}",
            f"Phone / WhatsApp: {info.get('phone', 'n/a')}",
            f"Order online: {info.get('order_url', 'n/a')}",
            f"Currency: {catalog.currency}",
            "",
            f"Promo codes: {', '.join(promotions.codes) or 'none'} "
            f"({promotions.food_discount_rate:.0%} off food, drinks excluded)",
            promotions.note,
            "",
            f"Menu: {len(catalog.items)} items across {len(catalog.categories)} categories "
            f"({', '.join(category.key for category in catalog.categories)}).",
        ]
    )


@mcp.tool()
def list_menu(category: str | None = None) -> str:
    """List menu items with prices.

    Args:
        category: Optional category key or label to narrow the listing
            (broast, madhoot, burger, wraps, fries, drinks). Omit for the full menu.
    """
    catalog = get_catalog()
    try:
        categories = [catalog.category(category)] if category else list(catalog.categories)
    except MenuError as exc:
        return str(exc)

    currency = catalog.currency
    blocks = []
    for entry in categories:
        header = f"{entry.emoji} {entry.label} ({entry.key})".strip()
        if entry.is_drink:
            header += " — excluded from promo discounts"
        rows = [
            f"  {item.name} — {currency} {item.price:.2f}" + (f" · {item.description}" if item.description else "")
            for item in entry.items
        ]
        blocks.append("\n".join([header, *rows]))
    return "\n\n".join(blocks)


@mcp.tool()
def search_menu(query: str, category: str | None = None, max_price: float | None = None) -> str:
    """Search the menu by name or description.

    Args:
        query: Text to look for, e.g. 'burger', 'spicy', 'mojito'. Pass an empty string to match everything.
        category: Optional category key to search within.
        max_price: Optional ceiling in AED; only items at or below this price are returned.
    """
    catalog = get_catalog()
    try:
        results = catalog.search(query, category=category, max_price=max_price)
    except MenuError as exc:
        return str(exc)

    if not results:
        criteria = f"{query!r}"
        if category:
            criteria += f" in category {category!r}"
        if max_price is not None:
            criteria += f" under {catalog.currency} {max_price:.2f}"
        return f"No menu items match {criteria}."

    currency = catalog.currency
    rows = [
        f"- {item.name} ({item.category_label}) — {currency} {item.price:.2f}"
        + (f" · {item.description}" if item.description else "")
        for item in results
    ]
    return "\n".join([f"{len(results)} match(es):", *rows])


@mcp.tool()
def check_promo_code(code: str) -> str:
    """Check whether a promo code is valid and what discount it gives.

    Args:
        code: The promo code to check, e.g. 'CORP5'.
    """
    catalog = get_catalog()
    promotions = catalog.promotions
    normalised = code.strip().upper()
    if promotions.is_valid(code):
        return (
            f"{normalised} is valid — {promotions.food_discount_rate:.0%} off food items. "
            "Drinks are excluded from the discount."
        )
    return f"{normalised or code!r} is not a valid promo code. Valid codes: {', '.join(promotions.codes)}."


@mcp.tool()
def price_order(items: list[OrderItem], promo_code: str | None = None) -> str:
    """Price a basket of menu items, applying a promo code if one is given.

    The discount applies to food only; drinks are always charged in full.

    Args:
        items: The items and quantities to price.
        promo_code: Optional promo code, e.g. 'CORP5'.
    """
    catalog = get_catalog()
    try:
        quote = quote_from_request(catalog, _requested(items), promo_code)
    except MenuError as exc:
        return str(exc)
    return _format_quote(catalog, quote)


@mcp.tool()
def create_whatsapp_order(
    items: list[OrderItem],
    name: str,
    phone: str,
    company: str,
    delivery_date: str,
    delivery_time: str,
    payment_method: str,
    office: str = "",
    email: str = "",
    party_size: str = "",
    promo_code: str | None = None,
    notes: str = "",
) -> str:
    """Turn a confirmed order into a WhatsApp link the customer opens to send it to the restaurant.

    This does not place the order — it produces a wa.me link containing a
    pre-filled message. The customer still has to press send in WhatsApp.
    Confirm the priced total with the customer before calling this.

    Args:
        items: The items and quantities being ordered.
        name: Customer name.
        phone: Customer phone or WhatsApp number.
        company: Company or building name for the delivery.
        delivery_date: Delivery date, e.g. '2026-08-12'.
        delivery_time: Delivery time, e.g. '1:00 PM'.
        payment_method: One of 'Cash on Delivery', 'Card on Delivery', 'Bank Transfer', 'Monthly Corporate Invoice'.
        office: Optional floor or office number.
        email: Optional customer email.
        party_size: Optional number of people, e.g. '6-10'.
        promo_code: Optional promo code to apply.
        notes: Optional special instructions, e.g. 'extra garlic sauce, no spicy'.
    """
    catalog = get_catalog()
    customer = Customer(
        name=name,
        phone=phone,
        company=company,
        office=office,
        email=email,
        delivery_date=delivery_date,
        delivery_time=delivery_time,
        party_size=party_size,
        payment_method=payment_method,
        notes=notes,
    )
    try:
        customer.validate()
        quote = quote_from_request(catalog, _requested(items), promo_code)
        message = build_message(catalog, customer, quote)
        link = build_link(catalog, message)
    except MenuError as exc:
        return str(exc)

    logger.info("Built WhatsApp order for %s — %s %.2f", name, quote.currency, quote.total)
    return "\n".join(
        [
            _format_quote(catalog, quote),
            "",
            "WhatsApp link (the customer must open it and press send):",
            link,
            "",
            "Message preview:",
            message,
        ]
    )


@mcp.resource("menu://mozon-broast")
def menu_resource() -> str:
    """The full Mozon Broast menu as plain text."""
    return list_menu()


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
    mcp.run(transport="stdio")


if __name__ == "__main__":
    main()
