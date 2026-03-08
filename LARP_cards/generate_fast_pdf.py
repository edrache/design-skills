import json
import base64
from playwright.sync_api import sync_playwright

with open('/Users/marek/OfflineDocuments/Repo/Antigravity/Design/.tmp/mikstury_cards.json') as f:
    cards = json.load(f)

with open('/Users/marek/OfflineDocuments/Repo/Antigravity/Design/html/pdf-cards/img/0.png', 'rb') as img_f:
    img_b64 = base64.b64encode(img_f.read()).decode('utf-8')

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
    flavor_html = f'<div class="flavor-text italic">{c.get("flavor", "")}</div>' if c.get("flavor") else ""
    html_content += f"""
    <div class="card-view">
        <div class="card-type">{c['type']}</div>
        <div class="card-title">{c['title']}</div>
        <div class="image-container">
            <img src="data:image/png;base64,{img_b64}" class="card-image">
        </div>
        <div class="rules-container">
            <div class="rules-text">{c['rules']}</div>
            {flavor_html}
        </div>
    </div>
    """

html_content += "</body></html>"

with open('/Users/marek/OfflineDocuments/Repo/Antigravity/Design/.tmp/fast_cards.html', 'w') as f:
    f.write(html_content)

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page()
    page.goto('file:///Users/marek/OfflineDocuments/Repo/Antigravity/Design/.tmp/fast_cards.html', wait_until="networkidle")
    
    # Save as PDF!
    page.pdf(
        path='/Users/marek/OfflineDocuments/Repo/Antigravity/Design/PDF_output/mikstury_karty.pdf',
        width='63mm',
        height='88mm',
        print_background=True,
        display_header_footer=False,
        margin={"top": "0", "right": "0", "bottom": "0", "left": "0"}
    )
    
    browser.close()

print("Fast PDF created successfully!")
