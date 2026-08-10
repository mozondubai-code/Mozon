import pytest

from mozon_broast_mcp.catalog import MenuError, load_catalog


@pytest.fixture(scope="module")
def catalog():
    return load_catalog()


def test_menu_loads_with_every_category(catalog):
    keys = [category.key for category in catalog.categories]
    assert keys == ["broast", "madhoot", "burger", "wraps", "fries", "drinks"]
    assert len(catalog.items) == 65


def test_only_drinks_are_marked_as_drinks(catalog):
    drink_categories = {item.category_key for item in catalog.items if item.is_drink}
    assert drink_categories == {"drinks"}


def test_item_ids_are_unique(catalog):
    ids = [item.id for item in catalog.items]
    assert len(ids) == len(set(ids))


def test_every_item_has_a_positive_price(catalog):
    assert all(item.price > 0 for item in catalog.items)


def test_find_by_exact_name_is_case_insensitive(catalog):
    assert catalog.find("4 pcs broast").price == 24
    assert catalog.find("4 Pcs Broast").price == 24


def test_find_by_id(catalog):
    assert catalog.find("broast-4-pcs-broast").name == "4 Pcs Broast"


def test_find_by_unique_substring(catalog):
    assert catalog.find("avocado").name == "Avocado Juice"


def test_ambiguous_reference_lists_candidates(catalog):
    with pytest.raises(MenuError, match="be more specific"):
        catalog.find("broast")


def test_unknown_item_is_rejected(catalog):
    with pytest.raises(MenuError, match="No menu item matches"):
        catalog.find("pepperoni pizza")


def test_search_filters_by_category_and_price(catalog):
    results = catalog.search("", category="drinks", max_price=10)
    assert {item.name for item in results} == {"Lemon Mint", "Garlic Sauce", "Coleslaw", "Dynamite Sauce"}


def test_search_matches_descriptions(catalog):
    names = {item.name for item in catalog.search("pressure chicken rice")}
    assert names == {
        "Chicken Madhoot (Quarter)",
        "Chicken Madhoot (Half)",
        "Chicken Madhoot (Full)",
    }


def test_unknown_category_is_rejected(catalog):
    with pytest.raises(MenuError, match="Unknown category"):
        catalog.category("desserts")


def test_promo_codes_match_the_order_page(catalog):
    assert catalog.promotions.codes == ("CORP5", "NMC10", "OFFICE5", "MOZON10")
    assert catalog.promotions.food_discount_rate == 0.10
    assert catalog.promotions.is_valid(" corp5 ")
    assert not catalog.promotions.is_valid("FREEFOOD")
    assert not catalog.promotions.is_valid(None)
