"""
Generuje PDF z kartami LARP "Cień nad Zakonem".

Źródła:
  - LARP_cards/all_cards.json  (dane kart + pole "image")
  - LARP_cards/images/         (grafiki 1:1)

Wyjście:
  - LARP_cards/karty_cien_nad_zakonem.pdf
"""

import json
import base64
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE_DIR   = Path(__file__).parent.parent
CARDS_JSON = BASE_DIR / "LARP_cards" / "all_cards.json"
IMAGES_DIR = BASE_DIR / "LARP_cards" / "images"
FALLBACK   = BASE_DIR / "html" / "pdf-cards" / "img" / "0.png"
OUT_PDF    = BASE_DIR / "LARP_cards" / "karty_cien_nad_zakonem.pdf"
TMP_HTML   = BASE_DIR / ".tmp" / "all_cards_preview.html"

# --- Ładowanie danych ---
with open(CARDS_JSON, encoding="utf-8") as f:
    cards = json.load(f)

with open(FALLBACK, "rb") as f:
    fallback_b64 = base64.b64encode(f.read()).decode()

def load_b64(fname: str) -> str:
    path = IMAGES_DIR / fname
    if path.exists():
        with open(path, "rb") as f:
            return base64.b64encode(f.read()).decode()
    return fallback_b64

# --- Formatowanie tekstu reguł (pogrubienie słów kluczowych Plotek) ---
KEYWORDS = ["SZANTAŻ:", "OCZYSZCZENIE:", "HISTORIA:", "WYMIANA:", "WIECZERZA:", "ROZSIEWANIE:", "KONFRONTACJA:"]

def format_rules(text: str) -> str:
    for kw in KEYWORDS:
        text = text.replace(kw, f"<br/><strong>{kw}</strong>")
    return text

# --- Kolor obramowania wg grupy ---
GROUP_COLOR = {
    "Karty Zakonne":   "#2c4a1e",  # ciemna zieleń
    "Karty Zakazane":  "#5a1a1a",  # ciemna czerwień
    "Mikstury":        "#1a3a5a",  # ciemny granat
    "Dowody Grzechu":  "#4a3a1a",  # ciemny brąz
    "Stany i Inne":    "#2a2a2a",  # ciemna szarość
    "Plotki":          "#3a1a4a",  # ciemny fiolet
    "Plotka":          "#3a1a4a",  # ciemny fiolet
}

# --- HTML ---
CSS = """
@page { size: 63mm 88mm; margin: 0; }
body {
    margin: 0; padding: 0;
    font-family: 'EB Garamond', serif;
    background: white;
    -webkit-print-color-adjust: exact;
}
.card-view {
    width: 63mm; height: 88mm;
    background: white; color: black;
    padding: 3.5mm;
    display: flex; flex-direction: column;
    box-sizing: border-box;
    overflow: hidden;
    page-break-after: always;
    border: none;
}
.card-type {
    font-size: 7px; font-weight: 700;
    text-align: center; text-transform: uppercase;
    letter-spacing: 0.8px; color: #555;
    margin-bottom: 1px;
    font-family: 'Cinzel', serif;
}
.card-title {
    font-size: 12px; font-weight: 700; line-height: 1.15;
    text-align: center; text-transform: uppercase;
    font-family: 'Cinzel', serif;
    padding-bottom: 3px; margin-bottom: 4px;
    border-bottom-width: 2px; border-bottom-style: solid;
}
.image-container {
    width: 100%; border-width: 1.5px; border-style: solid;
    background: #fff; overflow: hidden;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
}
.card-image { width: 100%; height: 100%; object-fit: contain; }
.rules-container {
    margin-top: 4px; flex-grow: 1;
    border-width: 1.5px; border-style: solid;
    padding: 5px 6px;
    display: flex; flex-direction: column; justify-content: center;
    font-size: 10px; line-height: 1.25;
}
.flavor-text {
    font-style: italic;
    border-bottom: 1px solid rgba(0,0,0,0.15);
    margin-bottom: 4px; padding-bottom: 4px;
    font-size: 8.5px; color: #444; text-align: center;
}
strong { font-weight: 700; }
.bottom-bar {
    border-top-width: 1.5px; border-top-style: solid;
    padding-top: 3px; margin-top: 3px;
    flex-shrink: 0;
}
.bottom-bar .historia-label {
    font-size: 7.5px; font-weight: 700;
    text-align: center; letter-spacing: 1px;
    font-family: 'Cinzel', serif;
    margin-bottom: 2px;
}
.bottom-bar table {
    width: 100%; border-collapse: collapse;
    table-layout: fixed;
}
.bottom-bar td {
    border-width: 1px; border-style: solid;
    text-align: center; font-size: 7px;
    font-family: 'Cinzel', serif; font-weight: 700;
    padding: 1px 0;
    width: 10%;
}
"""

GOOGLE_FONTS = (
    "https://fonts.googleapis.com/css2?"
    "family=Cinzel:wght@400;700"
    "&family=EB+Garamond:ital,wght@0,400;0,700;1,400"
    "&display=swap"
)

html_parts = [f"""<!DOCTYPE html>
<html lang="pl">
<head>
<meta charset="UTF-8">
<link href="{GOOGLE_FONTS}" rel="stylesheet">
<style>{CSS}</style>
</head>
<body>
"""]

for c in cards:
    group  = c.get("group", "")
    color  = GROUP_COLOR.get(group, "#222")
    img_b64 = load_b64(c.get("image", "")) if c.get("image") else fallback_b64

    rules_txt = format_rules(c.get("rules", ""))
    flavor_html = (
        f'<div class="flavor-text">{c["flavor"]}</div>'
        if c.get("flavor") else ""
    )
    if c.get("bottom") and "HISTORIA" in c["bottom"]:
        cells = "".join(f'<td style="border-color:{color};">{i}</td>' for i in range(1, 11))
        bottom_html = f"""<div class="bottom-bar" style="border-color:{color};">
  <div class="historia-label" style="color:{color};">HISTORIA</div>
  <table><tr>{cells}</tr></table>
</div>"""
    elif c.get("bottom"):
        bottom_html = f'<div class="bottom-bar" style="border-color:{color};">{c["bottom"]}</div>'
    else:
        bottom_html = ""

    # Dynamiczne rozmiary
    rules_len = len(c.get("rules", ""))
    if rules_len > 300:
        img_h, rules_fs = "22mm", "8.5px"
    elif rules_len > 180:
        img_h, rules_fs = "27mm", "9.5px"
    else:
        img_h, rules_fs = "35mm", "10.5px"

    card_html = f"""
<div class="card-view">
  <div class="card-type">{c.get("type","")}</div>
  <div class="card-title" style="border-color:{color};">{c["title"]}</div>
  <div class="image-container" style="height:{img_h};border-color:{color};">
    <img src="data:image/png;base64,{img_b64}" class="card-image">
  </div>
  <div class="rules-container" style="border-color:{color};font-size:{rules_fs};">
    {flavor_html}
    <div>{rules_txt}</div>
  </div>
  {bottom_html}
</div>"""

    count = c.get("count", 1)
    html_parts.extend([card_html] * count)

html_parts.append("</body></html>")
html = "".join(html_parts)

TMP_HTML.parent.mkdir(exist_ok=True)
with open(TMP_HTML, "w", encoding="utf-8") as f:
    f.write(html)

# --- Renderowanie PDF ---
OUT_PDF.parent.mkdir(exist_ok=True)
with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page()
    page.goto(f"file://{TMP_HTML}", wait_until="networkidle")
    page.pdf(
        path=str(OUT_PDF),
        width="63mm", height="88mm",
        print_background=True,
        display_header_footer=False,
        margin={"top": "0", "right": "0", "bottom": "0", "left": "0"},
    )
    browser.close()

total = sum(c.get("count", 1) for c in cards)
print(f"PDF wygenerowany: {OUT_PDF}")
print(f"Karty: {len(cards)} unikalnych, {total} arkuszy łącznie")
