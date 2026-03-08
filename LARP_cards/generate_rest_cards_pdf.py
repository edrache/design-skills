import os
import json
import base64
import re
from playwright.sync_api import sync_playwright

with open('/Users/marek/OfflineDocuments/Repo/Antigravity/Design/.tmp/all_cards.json') as f:
    all_cards = json.load(f)

# Filter out the already processed groups if you want, or just process the remaining
target_groups = ["Plotki", "Dowody Grzechu", "Stany i Inne"]
cards = [c for c in all_cards if c['group'] in target_groups]

# Fallback base64
with open('/Users/marek/OfflineDocuments/Repo/Antigravity/Design/html/pdf-cards/img/0.png', 'rb') as img_f:
    img_b64_fallback = base64.b64encode(img_f.read()).decode('utf-8')

# Function to bold specific keywords in rules
def format_rules(text):
    keywords = ["SZANTAŻ:", "OCZYSZCZENIE:", "HISTORIA:", "WYMIANA:", "WIECZERZA:"]
    for keyword in keywords:
        text = text.replace(keyword, f"<strong><br/>{keyword}</strong>")
    # For flavor inside Dowody Grzechu, we separated it already
    return text

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
            line-height: 1.1;
            font-weight: 700;
            text-align: center;
            border-bottom: 2px solid black;
            padding-bottom: 3px;
            margin-bottom: 4px;
            text-transform: uppercase;
            display: flex;
            flex-direction: column;
            justify-content: center;
            min-height: 20px;
            font-family: 'Cinzel', serif;
        }}
        .image-container {{
            width: 100%;
            height: 35mm;
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
            margin-top: 4px;
            flex-grow: 1;
            border: 1.5px solid black;
            padding: 6px;
            display: flex;
            flex-direction: column;
            justify-content: center;
            font-size: 10px; /* Slight reduction for longer texts */
            line-height: 1.25;
        }}
        .flavor-text {{
            font-style: italic;
            border-bottom: 1px solid rgba(0,0,0,0.1);
            margin-bottom: 4px;
            padding-bottom: 4px;
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
    img_b64 = img_b64_fallback
    flavor_html = f'<div class="flavor-text italic">{c.get("flavor", "")}</div>' if c.get("flavor") else ""
    
    count = c.get('count', 1)
    
    # Optional image container sizing based on group
    rules_style = ""
    img_container_style = ""
    # "Plotki" usually feature long text, we may shrink the image container a bit
    if len(c['rules']) > 200:
        img_container_style = "height: 25mm;"
        rules_style = "font-size: 9px;"
        
    card_html = f"""
    <div class="card-view">
        <div class="card-type">{c['type']}</div>
        <div class="card-title">{c['title']}</div>
        <div class="image-container" style="{img_container_style}">
            <img src='data:image/png;base64,{img_b64}' class='card-image'>
        </div>
        <div class="rules-container" style="{rules_style}">
            {flavor_html}
            <div class="rules-text">{format_rules(c['rules'])}</div>
        </div>
    </div>
    """
    
    for _ in range(count):
        html_content += card_html

html_content += "</body></html>"

with open('/Users/marek/OfflineDocuments/Repo/Antigravity/Design/.tmp/pozostale_karty.html', 'w') as f:
    f.write(html_content)

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page()
    page.goto('file:///Users/marek/OfflineDocuments/Repo/Antigravity/Design/.tmp/pozostale_karty.html', wait_until="networkidle")
    
    out_path = '/Users/marek/OfflineDocuments/Repo/Antigravity/Design/PDF_output/pozostale_karty.pdf'
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
