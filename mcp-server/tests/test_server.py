"""Exercise the tool functions directly — @mcp.tool() leaves them callable."""

import asyncio

from mozon_broast_mcp.server import (
    OrderItem,
    check_promo_code,
    create_whatsapp_order,
    get_restaurant_info,
    list_menu,
    mcp,
    price_order,
    search_menu,
)


def test_all_tools_are_registered():
    tools = asyncio.run(mcp.list_tools())
    assert {tool.name for tool in tools} == {
        "get_restaurant_info",
        "list_menu",
        "search_menu",
        "check_promo_code",
        "price_order",
        "create_whatsapp_order",
    }
    assert all(tool.description for tool in tools)


def test_restaurant_info_covers_the_basics():
    info = get_restaurant_info()
    assert "Al Nahda 2" in info
    assert "+971 52 487 7701" in info
    assert "CORP5" in info
    assert "65 items across 6 categories" in info


def test_list_menu_full_and_filtered():
    full = list_menu()
    assert "Broasted Chicken (broast)" in full
    assert "Drinks & Juices (drinks) — excluded from promo discounts" in full

    drinks = list_menu("drinks")
    assert "Orange Juice — AED 11.00" in drinks
    assert "Broasted Chicken" not in drinks


def test_list_menu_rejects_unknown_category_without_raising():
    assert "Unknown category" in list_menu("desserts")


def test_search_menu_reports_matches_and_misses():
    assert "Truffle Beef Burger (Single)" in search_menu("truffle")
    assert search_menu("", category="drinks", max_price=2).startswith("1 match(es):")
    assert "No menu items match" in search_menu("pizza")


def test_check_promo_code():
    assert "valid — 10% off food" in check_promo_code("corp5")
    assert "is not a valid promo code" in check_promo_code("FREEFOOD")


def test_price_order_shows_the_discount_breakdown():
    quote = price_order(
        [OrderItem(item="8 Pcs Broast", quantity=2), OrderItem(item="Orange Juice", quantity=3)],
        promo_code="CORP5",
    )
    assert "Food subtotal:   AED 94.00" in quote
    assert "Drinks subtotal: AED 33.00" in quote
    assert "Discount (CORP5): -AED 9.40 (10% off food)" in quote
    assert "TOTAL:           AED 117.60" in quote


def test_price_order_warns_about_an_invalid_code():
    quote = price_order([OrderItem(item="Value Meal")], promo_code="FREEFOOD")
    assert "is not valid" in quote
    assert "TOTAL:           AED 68.00" in quote


def test_price_order_reports_an_unknown_item_as_text():
    assert "No menu item matches" in price_order([OrderItem(item="pepperoni pizza")])


def test_create_whatsapp_order_returns_quote_link_and_preview():
    result = create_whatsapp_order(
        items=[OrderItem(item="Value Meal", quantity=2)],
        name="Ahmed Ali",
        phone="+971500000000",
        company="NMC Hospital",
        delivery_date="2026-08-12",
        delivery_time="1:00 PM",
        payment_method="Cash on Delivery",
        promo_code="CORP5",
    )
    assert "TOTAL:           AED 122.40" in result
    assert "https://wa.me/971524877701?text=" in result
    assert "Message preview:" in result


def test_create_whatsapp_order_refuses_incomplete_details():
    result = create_whatsapp_order(
        items=[OrderItem(item="Value Meal")],
        name="Ahmed Ali",
        phone="",
        company="",
        delivery_date="2026-08-12",
        delivery_time="1:00 PM",
        payment_method="",
    )
    assert "requires these details" in result
    assert "wa.me" not in result
