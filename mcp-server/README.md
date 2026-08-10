# 🍗 Mozon Broast MCP Server

An [MCP](https://modelcontextprotocol.io) server that gives an AI assistant access to the
Mozon Broast menu, order pricing and WhatsApp ordering flow — the same menu and the same
arithmetic as the public order page at <https://mozondubai-code.github.io/mozon-broast>.

With this connected, a customer can say *"what's good for 8 people in the office under
AED 400?"* or *"price 2× 20 pcs broast with CORP5"* and the assistant answers from the real
menu, then hands back a WhatsApp link that sends the order to the restaurant.

## Tools

| Tool | What it does |
| --- | --- |
| `get_restaurant_info` | Location, hours, delivery area, contact number, active promo codes |
| `list_menu` | All 65 items with prices, optionally filtered to one category |
| `search_menu` | Search by name or description, with optional category and max-price filters |
| `check_promo_code` | Whether a code is valid and what discount it gives |
| `price_order` | Prices a basket — food subtotal, drinks subtotal, discount, total |
| `create_whatsapp_order` | Builds the `wa.me` link with the order pre-filled as a message |

There is also a `menu://mozon-broast` resource holding the full menu as plain text.

`create_whatsapp_order` does **not** place an order. It returns a link containing a
pre-filled message; the customer still has to open it and press send in WhatsApp.

## Pricing rules

These mirror the order page exactly:

- Promo codes (`CORP5`, `NMC10`, `OFFICE5`, `MOZON10`) take **10% off food only**.
- Drinks are always charged in full and never discounted.
- Every step rounds half-up to two decimals, matching the page's `Math.round(x * 100) / 100`.

An invalid code is reported back rather than silently ignored, so the assistant can tell the
customer their code didn't work instead of quoting a total the restaurant won't honour.

## Setup

Requires Python 3.10+ and [uv](https://docs.astral.sh/uv/).

```bash
cd mcp-server
uv sync
uv run pytest        # 42 tests covering the menu, pricing and message building
uv run mozon-broast-mcp   # starts the server on stdio
```

## Connecting it to Claude for Desktop

Add this to `claude_desktop_config.json` (macOS:
`~/Library/Application Support/Claude/claude_desktop_config.json`, Windows:
`%AppData%\Claude\claude_desktop_config.json`), using the absolute path to this directory:

```json
{
  "mcpServers": {
    "mozon-broast": {
      "command": "uv",
      "args": ["--directory", "/ABSOLUTE/PATH/TO/Mozon/mcp-server", "run", "mozon-broast-mcp"]
    }
  }
}
```

You may need the full path to `uv` in `command` — get it with `which uv` (macOS/Linux) or
`where uv` (Windows). On Windows use double backslashes or forward slashes in the path.

Fully quit and reopen Claude for Desktop, then check the connectors menu for `mozon-broast`.

To connect it to Claude Code instead:

```bash
claude mcp add mozon-broast -- uv --directory /ABSOLUTE/PATH/TO/Mozon/mcp-server run mozon-broast-mcp
```

## Updating the menu

`src/mozon_broast_mcp/data/menu.json` is **generated**, not hand-written. The order page is
the source of truth for prices, so when the menu changes there, regenerate the JSON rather
than editing it:

```bash
uv run python scripts/extract_menu.py ../../Mozon-broast/index-1.html
```

The script reads the page's `menuData`, `VALID_CODES`, discount rate and `wa.me` number, and
fails loudly if the page grows a category it doesn't have display metadata for — add it to
`CATEGORY_META` in the script and re-run. Run the tests afterwards; `test_catalog.py` asserts
the item count and promo codes, so a menu change surfaces as a test failure rather than a
quiet drift between the site and the server.

Point `MOZON_MENU_PATH` at a different `menu.json` to run the server against another menu
(a seasonal one, or a second branch) without touching the package data.

## Layout

```
mcp-server/
├── pyproject.toml
├── scripts/extract_menu.py          # regenerates menu.json from the order page
├── src/mozon_broast_mcp/
│   ├── catalog.py                   # menu loading, item lookup, search
│   ├── pricing.py                   # subtotals, promo discount, totals
│   ├── whatsapp.py                  # order message + wa.me link
│   ├── server.py                    # MCP server and tool definitions
│   └── data/menu.json               # generated — do not edit by hand
└── tests/
```

Note for anyone extending this: the server talks MCP over stdio, so nothing may be written to
stdout. Use the `logging` module (which writes to stderr) — a stray `print()` corrupts the
JSON-RPC stream and breaks the connection.
