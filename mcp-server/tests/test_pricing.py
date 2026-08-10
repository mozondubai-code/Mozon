from decimal import Decimal

import pytest

from mozon_broast_mcp.catalog import MenuError, load_catalog
from mozon_broast_mcp.pricing import _round, quote_from_request


@pytest.fixture(scope="module")
def catalog():
    return load_catalog()


def test_food_only_order(catalog):
    quote = quote_from_request(catalog, [("8 Pcs Broast", 2)])
    assert quote.food_subtotal == Decimal("94.00")
    assert quote.drinks_subtotal == Decimal("0.00")
    assert quote.discount == Decimal("0.00")
    assert quote.total == Decimal("94.00")
    assert quote.item_count == 2


def test_discount_applies_to_food_but_not_drinks(catalog):
    quote = quote_from_request(
        catalog,
        [("8 Pcs Broast", 2), ("Orange Juice", 3)],
        promo_code="CORP5",
    )
    assert quote.food_subtotal == Decimal("94.00")
    assert quote.drinks_subtotal == Decimal("33.00")
    assert quote.discount == Decimal("9.40")  # 10% of food only
    assert quote.total == Decimal("117.60")
    assert quote.promo_applied is True
    assert quote.promo_code == "CORP5"


def test_drinks_only_order_gets_no_discount(catalog):
    quote = quote_from_request(catalog, [("Mango Juice", 4)], promo_code="MOZON10")
    assert quote.food_subtotal == Decimal("0.00")
    assert quote.drinks_subtotal == Decimal("48.00")
    assert quote.discount == Decimal("0.00")
    assert quote.total == Decimal("48.00")


def test_invalid_promo_code_is_recorded_but_not_applied(catalog):
    quote = quote_from_request(catalog, [("Value Meal", 1)], promo_code="freefood")
    assert quote.promo_applied is False
    assert quote.promo_code == "FREEFOOD"
    assert quote.discount == Decimal("0.00")
    assert quote.total == Decimal("68.00")


def test_blank_promo_code_is_treated_as_absent(catalog):
    quote = quote_from_request(catalog, [("Value Meal", 1)], promo_code="   ")
    assert quote.promo_code is None
    assert quote.promo_applied is False


def test_repeated_items_are_merged_into_one_line(catalog):
    quote = quote_from_request(catalog, [("French Fries", 1), ("french fries", 2)])
    assert len(quote.lines) == 1
    assert quote.lines[0].quantity == 3
    assert quote.total == Decimal("24.00")


def test_item_id_and_name_resolve_to_the_same_line(catalog):
    by_name = quote_from_request(catalog, [("4 Pcs Broast", 1)])
    by_id = quote_from_request(catalog, [("broast-4-pcs-broast", 1)])
    assert by_name.total == by_id.total == Decimal("24.00")


def test_empty_order_is_rejected(catalog):
    with pytest.raises(MenuError, match="at least one item"):
        quote_from_request(catalog, [])


def test_zero_quantity_is_rejected(catalog):
    with pytest.raises(MenuError, match="at least 1"):
        quote_from_request(catalog, [("French Fries", 0)])


def test_large_corporate_order(catalog):
    quote = quote_from_request(
        catalog,
        [
            ("20 Pcs Broast", 2),  # 230 food
            ("Chicken Madhoot Family (10 persons)", 1),  # 135 food
            ("Hummus Plate", 4),  # 32 food
            ("Mocktail (Jug)", 2),  # 80 drinks
        ],
        promo_code="NMC10",
    )
    assert quote.food_subtotal == Decimal("397.00")
    assert quote.drinks_subtotal == Decimal("80.00")
    assert quote.discount == Decimal("39.70")
    assert quote.total == Decimal("437.30")
    assert quote.item_count == 9


@pytest.mark.parametrize(
    ("value", "expected"),
    [
        ("1.005", "1.01"),  # half-up, as JS Math.round(x*100)/100 does
        ("1.004", "1.00"),
        ("2.675", "2.68"),
        ("10", "10.00"),
    ],
)
def test_rounding_is_half_up_to_two_decimals(value, expected):
    assert _round(Decimal(value)) == Decimal(expected)
