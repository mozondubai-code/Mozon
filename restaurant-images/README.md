# Mozon — Restaurant Image Automation (HD)

Turn a short written instruction into a high‑quality, HD restaurant image
(food shots, menu photos, social‑media posts) — using your **Canva Pro**
membership. **No extra paid tools or API keys required.**

## How it works

```
 You type a dish/scene   ─▶   Claude generates the HD image   ─▶   Saved to Canva
 in the Google Sheet          (Canva AI, covered by your Pro)       + link back in the Sheet
```

- **Where you type instructions:** the Google Sheet
  *"Mozon — Restaurant Image Requests"*.
- **Where finished images live:** the Canva folder
  *"Mozon — Restaurant Images (HD)"*.

### Why not fully "set‑and‑forget" in Make?
Canva does **not** offer AI image *generation* through its automation/API — only
Make‑side saving/organizing. A truly unattended text‑to‑image pipeline would
need a **paid** image API (e.g. OpenAI `gpt-image-1`, ~$0.02–0.19/image). To
avoid any new cost, this setup uses your existing **Canva Pro** generation
(run by Claude) instead. You get the same result — HD images from typed
instructions — for $0 extra.

## The Google Sheet — columns

| Column | You fill? | What it's for |
|--------|-----------|----------------|
| No. | optional | Row number |
| **Dish / Instruction** | ✅ **yes** | Describe the food/scene you want |
| Extra style notes | optional | Lighting, background, mood, angle |
| Format | optional | `Poster`, `Instagram Post`, `Instagram Story`, `Menu` |
| Status | — | `To do` → Claude sets it `Done` |
| Canva Link | — | Claude pastes the finished design link here |
| Date added | optional | When you added the row |

## How to use it (each time)

1. Open the Google Sheet and add one row per image you want.
   Fill the **Dish / Instruction** column (the rest is optional).
2. Tell Claude: **"Generate the new rows in my restaurant image sheet."**
3. Claude reads the sheet, creates each HD image into the Canva folder,
   and writes the Canva link back into the sheet.
4. Open the links in Canva to add your logo / restaurant name / prices,
   then **Download → PNG/JPG (HD)** or publish straight to social media.

## Writing good instructions

Good food photos come from a few clear details. A strong instruction includes:

- **The dish** — "chicken shawarma platter", "saffron lamb chops"
- **What's around it** — sides, sauces, garnish, bread
- **Setting** — marble table, rustic wooden board, dark plate
- **Light & mood** — "warm moody restaurant lighting", "bright natural light"
- **Angle** — "top‑down", "45° close‑up", "shallow depth of field"

See `PROMPT-GUIDE.md` for ready‑to‑copy examples.

## Links

- Google Sheet: https://docs.google.com/spreadsheets/d/1qiDmWJYWGpkQWsQ4zhrwj08S1Y1EQVxAi3UKfnrzKdU/edit
- Canva folder: https://www.canva.com/folder/FAHPV8jXhW8
