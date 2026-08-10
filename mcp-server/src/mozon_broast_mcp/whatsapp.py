"""Building the WhatsApp order message and wa.me link.

The message layout matches the one the order page sends, so orders arriving
from an assistant look identical to orders placed on the website.
"""

from __future__ import annotations

from dataclasses import dataclass
from urllib.parse import quote

from .catalog import Catalog, MenuError
from .pricing import Quote


@dataclass(frozen=True)
class Customer:
    name: str
    phone: str
    company: str
    office: str = ""
    email: str = ""
    delivery_date: str = ""
    delivery_time: str = ""
    party_size: str = ""
    payment_method: str = ""
    notes: str = ""

    def validate(self) -> None:
        missing = [
            label
            for label, value in (
                ("name", self.name),
                ("phone", self.phone),
                ("company", self.company),
                ("delivery_date", self.delivery_date),
                ("delivery_time", self.delivery_time),
                ("payment_method", self.payment_method),
            )
            if not value.strip()
        ]
        if missing:
            raise MenuError(
                "The order page requires these details before an order can be sent: " + ", ".join(missing) + "."
            )


def build_message(catalog: Catalog, customer: Customer, quote_: Quote) -> str:
    currency = quote_.currency
    company_line = customer.company
    if customer.office.strip():
        company_line += f" | {customer.office.strip()}"
    if customer.email.strip():
        company_line += f"\n📧 {customer.email.strip()}"

    payment_line = customer.payment_method
    if quote_.promo_code:
        payment_line += f"\n🎁 Promo: {quote_.promo_code}"

    items = "\n".join(
        f"{line.item.name} x{line.quantity} = {currency} {line.line_total:.2f}" for line in quote_.lines
    )

    totals = f"🍔 Food: {currency} {quote_.food_subtotal:.2f}"
    if quote_.drinks_subtotal > 0:
        totals += f"\n🥤 Drinks: {currency} {quote_.drinks_subtotal:.2f}"
    if quote_.promo_applied and quote_.discount > 0:
        totals += f"\n💸 Discount: -{currency} {quote_.discount:.2f}"

    message = f"""🍗 *{catalog.restaurant.get("name", "Mozon Broast").upper()} — NEW ORDER* 🍗

👤 *Name:* {customer.name}
📞 *Phone:* {customer.phone}
🏢 *Company:* {company_line}

📅 *Date:* {customer.delivery_date}
⏰ *Time:* {customer.delivery_time}
👥 *Party Size:* {customer.party_size}
💳 *Payment:* {payment_line}

🛒 *ITEMS:*
{items}

{totals}
💰 *TOTAL: {currency} {quote_.total:.2f}*"""

    if customer.notes.strip():
        message += f"\n\n📝 Notes: {customer.notes.strip()}"
    return message


def build_link(catalog: Catalog, message: str) -> str:
    number = str(catalog.restaurant.get("whatsapp", "")).lstrip("+")
    if not number:
        raise MenuError("The menu file has no WhatsApp number for this restaurant.")
    return f"https://wa.me/{number}?text={quote(message)}"
