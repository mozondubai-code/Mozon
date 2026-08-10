from urllib.parse import parse_qs, urlparse

import pytest

from mozon_broast_mcp.catalog import MenuError, load_catalog
from mozon_broast_mcp.pricing import quote_from_request
from mozon_broast_mcp.whatsapp import Customer, build_link, build_message


@pytest.fixture(scope="module")
def catalog():
    return load_catalog()


@pytest.fixture
def customer():
    return Customer(
        name="Ahmed Ali",
        phone="+971 50 000 0000",
        company="NMC Hospital",
        office="Floor 3, Office 12",
        email="ahmed@nmc.ae",
        delivery_date="2026-08-12",
        delivery_time="1:00 PM",
        party_size="6-10",
        payment_method="Cash on Delivery",
        notes="Extra garlic sauce",
    )


def test_message_contains_order_details(catalog, customer):
    quote = quote_from_request(catalog, [("8 Pcs Broast", 2), ("Orange Juice", 3)], promo_code="CORP5")
    message = build_message(catalog, customer, quote)

    assert "MOZON BROAST — NEW ORDER" in message
    assert "*Name:* Ahmed Ali" in message
    assert "NMC Hospital | Floor 3, Office 12" in message
    assert "📧 ahmed@nmc.ae" in message
    assert "8 Pcs Broast x2 = AED 94.00" in message
    assert "Orange Juice x3 = AED 33.00" in message
    assert "🍔 Food: AED 94.00" in message
    assert "🥤 Drinks: AED 33.00" in message
    assert "💸 Discount: -AED 9.40" in message
    assert "*TOTAL: AED 117.60*" in message
    assert "🎁 Promo: CORP5" in message
    assert "📝 Notes: Extra garlic sauce" in message


def test_optional_fields_are_omitted_when_blank(catalog):
    minimal = Customer(
        name="Sara",
        phone="0500000000",
        company="A2Z Center",
        delivery_date="2026-08-12",
        delivery_time="7:00 PM",
        payment_method="Card on Delivery",
    )
    quote = quote_from_request(catalog, [("French Fries", 1)])
    message = build_message(catalog, minimal, quote)

    assert "📧" not in message
    assert "🥤 Drinks" not in message  # no drinks in this basket
    assert "💸 Discount" not in message
    assert "📝 Notes" not in message
    assert "*TOTAL: AED 8.00*" in message


def test_link_points_at_the_restaurant_and_carries_the_message(catalog, customer):
    quote = quote_from_request(catalog, [("Value Meal", 1)])
    message = build_message(catalog, customer, quote)
    link = build_link(catalog, message)

    parsed = urlparse(link)
    assert parsed.scheme == "https"
    assert parsed.netloc == "wa.me"
    assert parsed.path == "/971524877701"
    assert parse_qs(parsed.query)["text"][0] == message


def test_missing_required_details_are_reported_together():
    incomplete = Customer(name="Sara", phone="", company="", delivery_date="2026-08-12", delivery_time="", payment_method="")
    with pytest.raises(MenuError) as excinfo:
        incomplete.validate()
    message = str(excinfo.value)
    assert "phone" in message
    assert "company" in message
    assert "delivery_time" in message
    assert "payment_method" in message
    assert "name" not in message
