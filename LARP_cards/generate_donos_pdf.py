import os
import base64
from playwright.sync_api import sync_playwright

output_pdf = '/Users/marek/OfflineDocuments/Repo/Antigravity/Design/LARP_cards/Karta_Donos.pdf'
image_path = '/Users/marek/OfflineDocuments/Repo/Antigravity/Design/LARP_cards/images/Donos.png'

with open(image_path, 'rb') as f:
    img_b64 = base64.b64encode(f.read()).decode('utf-8')

html_content = f"""
<!DOCTYPE html>
<html lang="pl">
<head>
    <meta charset="UTF-8">
    <link href="https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,700;1,400;1,700&display=swap" rel="stylesheet">
    <style>
        @page {{
            size: 200mm 90mm;
            margin: 0;
        }}
        body {{
            margin: 0;
            padding: 0;
            width: 200mm;
            height: 90mm;
            background: white;
            box-sizing: border-box;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: 'EB Garamond', serif;
            -webkit-print-color-adjust: exact;
        }}
        .card-border {{
            width: 194mm;
            height: 84mm;
            border: 2px dashed #000;
            padding: 3mm 4mm;
            display: flex;
            flex-direction: row;
            box-sizing: border-box;
            align-items: center;
        }}
        .image-column {{
            width: 65mm;
            display: flex;
            align-items: center;
            justify-content: center;
            padding-right: 2mm;
        }}
        .image-column img {{
            width: 65mm;
            height: 65mm;
            object-fit: contain;
        }}
        .content-column {{
            flex: 1;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            align-items: stretch;
            height: 100%;
        }}
        .header {{
            text-align: center;
            margin-top: 2mm;
        }}
        .header .type {{
            font-weight: bold;
            font-size: 15pt;
            letter-spacing: 0.5px;
            line-height: 1.1;
        }}
        .header .title {{
            font-weight: bold;
            font-style: italic;
            font-size: 16pt;
            margin-top: 8px;
        }}
        .form-area {{
            flex-grow: 1;
            display: flex;
            flex-direction: column;
            justify-content: center;
            font-size: 11pt;
        }}
        .form-row {{
            text-align: center;
        }}
        .line {{
            /* border-bottom usunięty by pozostawić puste miejsce */
        }}
        .line-indented {{
            width: 80%;
            margin: 18px auto 14px auto;
        }}
        .line-full {{
            width: 108%;
            margin-left: -4%;
            margin-top: 24px;
        }}
        .signature-area {{
            display: flex;
            justify-content: flex-end;
            align-items: flex-end;
            margin-top: 16px;
            margin-right: -4%;
        }}
        .signature-text {{
            font-style: italic;
            font-size: 12pt;
            margin-right: 6px;
            margin-bottom: -2px;
        }}
        .signature-line {{
            width: 150px;
        }}
        .footer {{
            text-align: center;
            font-weight: bold;
            font-style: italic;
            font-size: 11pt;
            margin-bottom: 2mm;
        }}
    </style>
</head>
<body>
    <div class="card-border">
        <div class="image-column">
            <img src="data:image/png;base64,{img_b64}" alt="Liber Obedientiae">
        </div>
        <div class="content-column">
            <div class="header">
                <div class="type">PRZEDMIOT<br>DONOS</div>
                <div class="title">BRACIA PATRZĄ, BÓG WIDZI</div>
            </div>
            
            <div class="form-area">
                <div class="form-row">
                    <span>Ja, niżej podpisany sługa Boży, donoszę na brata/siostrę:</span>
                    <div class="line line-indented"></div>
                </div>
                
                <div class="form-row">
                    <span>Oskarżam go o następujący występek:</span>
                    <div class="line line-full"></div>
                    <div class="line line-full" style="width: 100%; margin-left: -4%; margin-top: 32px;"></div>
                </div>
                
                <div class="signature-area">
                    <span class="signature-text">Podpis (opcjonalnie):</span>
                    <div class="line signature-line"></div>
                </div>
            </div>
            
            <div class="footer">
                Wrzuć w dowolnym momencie do Skrzynki Donosów. Limit w ręce: 1
            </div>
        </div>
    </div>
</body>
</html>
"""

html_path = '/Users/marek/OfflineDocuments/Repo/Antigravity/Design/.tmp/karta_donos.html'
with open(html_path, 'w') as f:
    f.write(html_content)

print("Starting playwright to generate PDF...")
with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page()
    page.goto(f'file://{html_path}', wait_until="networkidle")
    
    page.pdf(
        path=output_pdf,
        width='200mm',
        height='90mm',
        print_background=True,
        display_header_footer=False,
        margin={"top": "0", "right": "0", "bottom": "0", "left": "0"}
    )
    browser.close()

print(f"Generated beautifully at {output_pdf}")
