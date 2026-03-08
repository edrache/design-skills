import os
import json
import base64
import glob
import shutil
from playwright.sync_api import sync_playwright

artifacts_dir = '/Users/marek/.gemini/antigravity/brain/71aa5e13-4f0a-407d-993a-9fd2bc5a830c'
out_images_dir = '/Users/marek/OfflineDocuments/Repo/Antigravity/Design/PDF_output/images'
os.makedirs(out_images_dir, exist_ok=True)

# Map title to glob pattern for image
title_to_img_pattern = {
    # Mikstury
    "Wino Opatrzności": "potion_1_wino_*.png",
    "Łzy Pańskie": "potion_2_lzy_*.png",
    "Napar Kojący": "potion_3_napar_*.png",
    "Wilcza Jagoda": "potion_4_wilcza_*.png",
    "Wywar Z Wilczej Jagody": "potion_4_wilcza_*.png",
    "Jad Skorpeny": "potion_5_skorpena_*.png",
    "Nalewka Z Muchomora": "potion_6_muchomor_*.png",
    "Esencja Prawdy": "potion_7_prawda_*.png",
    "Wywar Z Mamrota": "potion_8_mamrot_*.png",
    "Olej Nienawiści": "potion_9_nienawisc_*.png",
    # Zakonne
    "Srebrny Klucz": "01_klucz_*.png",
    "Święta Oliwa": "02_oliwa_*.png",
    "Zioła Lecznicze": "03_ziola_*.png",
    "Woda Święcona": "04_woda_*.png",
    "Klucz Cieśli": "05_klucz_ciesli_*.png",
    "Indult": "06_indult_*.png",
    "Litania Pokutna": "07_litania_*.png"
}

# Cache base64 images and copy to output
b64_images = {}
for title, pattern in title_to_img_pattern.items():
    matches = glob.glob(f"{artifacts_dir}/{pattern}")
    if matches:
        target_path = os.path.join(out_images_dir, f"{title.replace(' ', '_')}.png")
        shutil.copy2(matches[-1], target_path) # Take the last one if multiple
        with open(matches[-1], 'rb') as f:
            b64_images[title] = base64.b64encode(f.read()).decode('utf-8')

# Fallback base64
with open('/Users/marek/OfflineDocuments/Repo/Antigravity/Design/html/pdf-cards/img/0.png', 'rb') as img_f:
    img_b64_fallback = base64.b64encode(img_f.read()).decode('utf-8')

with open('/Users/marek/OfflineDocuments/Repo/Antigravity/Design/.tmp/target_cards.json') as f:
    cards = json.load(f)

# Build raw HTML
html_content = f"""
<!DOCTYPE html>
<html lang="pl">
<head>
    <meta charset="UTF-8">
    <link href="https://fonts.googleapis.com/css2?family=Grenze+Gotisch:wght@400;700&family=Cinzel:wght@400;700&family=EB+Garamond:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet">
    <style>
        @page {{
            size: 63mm 88mm;
            margin: 0;
        }}
        body {{
            margin: 0;
            padding: 0;
            font-family: 'EB Garamond', serif;
            background: white;
            box-sizing: border-box;
            -webkit-print-color-adjust: exact;
        }}
        .card-view {{
            width: 63mm;
            height: 88mm;
            background: white;
            color: black;
            padding: 4mm;
            display: flex;
            flex-direction: column;
            box-sizing: border-box;
            position: relative;
            border: none;
            overflow: hidden;
            page-break-after: always;
        }}
        .card-type {{
            font-size: 8px;
            font-weight: 700;
            text-align: center;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: #4a5568;
            margin-bottom: 2px;
            font-family: 'Cinzel', serif;
        }}
        .card-title {{
            font-size: 13px;
            line-height: 1.2;
            font-weight: 700;
            text-align: center;
            border-bottom: 2px solid black;
            padding-bottom: 4px;
            margin-bottom: 6px;
            text-transform: uppercase;
            display: flex;
            flex-direction: column;
            justify-content: center;
            min-height: 24px;
            font-family: 'Cinzel', serif;
        }}
        .image-container {{
            width: 100%;
            height: 38mm;
            border: 1.5px solid black;
            background: #fff;
            position: relative;
            overflow: hidden;
            display: flex;
            align-items: center;
            justify-content: center;
        }}
        .card-image {{
            width: 100%;
            height: 100%;
            object-fit: cover;
        }}
        .rules-container {{
            margin-top: 5px;
            flex-grow: 1;
            border: 1.5px solid black;
            padding: 6px;
            display: flex;
            flex-direction: column;
            justify-content: center;
            font-size: 11px;
            line-height: 1.3;
        }}
        .flavor-text {{
            font-style: italic;
            border-top: 1px solid rgba(0,0,0,0.1);
            margin-top: 6px;
            padding-top: 4px;
            font-size: 9px;
            color: #444;
            text-align: center;
        }}
        .italic {{ font-style: italic; }}
    </style>
</head>
<body>
"""

for c in cards:
    img_b64 = b64_images.get(c['title'], img_b64_fallback)
    flavor_html = f'<div class="flavor-text italic">{c.get("flavor", "")}</div>' if c.get("flavor") else ""
    
    count = c.get('count', 1)
    
    card_html = f"""
    <div class="card-view">
        <div class="card-type">{c['type']}</div>
        <div class="card-title">{c['title']}</div>
        <div class="image-container">
            {"<img src='data:image/png;base64," + img_b64 + "' class='card-image'>" if img_b64 else ""}
        </div>
        <div class="rules-container">
            <div class="rules-text">{c['rules']}</div>
            {flavor_html}
        </div>
    </div>
    """
    
    for _ in range(count):
        html_content += card_html

html_content += "</body></html>"

with open('/Users/marek/OfflineDocuments/Repo/Antigravity/Design/.tmp/zestaw_kart.html', 'w') as f:
    f.write(html_content)

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page()
    page.goto('file:///Users/marek/OfflineDocuments/Repo/Antigravity/Design/.tmp/zestaw_kart.html', wait_until="networkidle")
    
    # Save as PDF!
    out_path = '/Users/marek/OfflineDocuments/Repo/Antigravity/Design/PDF_output/karty_zakonne_zakazane_mikstury.pdf'
    page.pdf(
        path=out_path,
        width='63mm',
        height='88mm',
        print_background=True,
        display_header_footer=False,
        margin={"top": "0", "right": "0", "bottom": "0", "left": "0"}
    )
    
    browser.close()

print(f"Generated successfully at {out_path}!")
