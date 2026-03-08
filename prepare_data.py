import os
import base64
import json
import random
import csv

workspace_root = '/Users/marek/OfflineDocuments/Repo/Antigravity/Design'
img_dir = '/Users/marek/OfflineDocuments/Repo/Antigravity/Design/html/pdf-cards/img'
tsv_path = os.path.join(workspace_root, 'cards_data.tsv')

images = ['0.png', '1.png', '2.png', '3.png']
img_data = {}

for img in images:
    path = os.path.join(img_dir, img)
    if os.path.exists(path):
        with open(path, 'rb') as f:
            encoded = base64.b64encode(f.read()).decode('utf-8')
            img_data[f'img/{img}'] = f'data:image/png;base64,{encoded}'

cards_data = []
with open(tsv_path, 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f, delimiter='\t')
    for row in reader:
        cards_data.append({
            "title": row['Tytuł'],
            "type": row['Typ'],
            "rules": row['Opis']
        })

# Repeat 3 times to get 27 cards
final_cards = []
for _ in range(3):
    for card in cards_data:
        c = card.copy()
        img_key = random.choice(list(img_data.keys()))
        c['image'] = img_key
        # For simplicity in index.html modification, we use the image field for base64
        c['image'] = img_data[img_key]
        final_cards.append(c)

with open(f'{workspace_root}/cards_prepared.json', 'w') as f:
    json.dump(final_cards, f, indent=4)
