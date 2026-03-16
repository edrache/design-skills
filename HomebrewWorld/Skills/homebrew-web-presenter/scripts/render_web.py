import glob
import html as html_lib
import os
import re
import sys

EMOJI_MAP = {
    'fighter': '⚔️', 'wojownik': '⚔️',
    'mage': '🧙', 'mag': '🧙', 'adept': '✨',
    'thief': '🗡️', 'złodziej': '🗡️', 'łotr': '🗡️',
    'scoundrel': '🔫',
    'ranger': '🏹', 'łowca': '🏹',
    'cleric': '🙏', 'kapłan': '🙏',
    'paladin': '🛡️', 'paladyn': '🛡️',
    'bard': '🎵',
    'druid': '🌿',
    'ace': '🚀', 'as': '🚀',
    'bounty hunter': '🤠', 'łowca nagród': '🤠',
    'slicer': '💻',
    'mechanic': '🔧', 'mechanik': '🔧',
    'jedi': '🪬',
    'firekeeper': '🔥', 'straznik ognia': '🔥',
    'rootworker': '🌿', 'korzeniarka': '🌿',
    'crooner': '🎵', 'piosenkarz': '🎵',
    'operator': '🔧', 'organizator': '💼',
    'heavy': '🛡️', 'twardziel': '🛡️',
    'necromancer': '💀',
    'knight': '🛡️',
    'rebel': '🚩',
    'optional': '🌟',
    'move': '📜',
    'gear': '🎒',
    'look': '👤',
    'background': '📜',
    'drive': '🎯',
    'starting': '🏁',
    'advance': '📈'
}

def get_emoji(text, default='📜'):
    text = text.lower()
    for key, emoji in EMOJI_MAP.items():
        if key in text:
            return emoji
    return default

def clean_content(content):
    content = re.sub(r'/\*.*?\*/', '', content, flags=re.DOTALL)
    content = re.sub(r'^\s*#\s*$', '', content, flags=re.MULTILINE)
    return content

def format_item(item):
    item = re.sub(r'\*\*(.*?)\*\*', r'<b>\1</b>', item)
    return item

def parse_markdown_to_cards(content):
    sections = re.split(r'^##\s+', content, flags=re.MULTILINE)
    cards = []
    
    for section in sections:
        if not section.strip(): continue
        lines = section.split('\n')
        title = lines[0].strip()
        body = '\n'.join(lines[1:]).strip()
        if not title: continue
        
        html_body = []
        in_list = False
        is_look = any(k.lower() in title.lower() for k in ['wygląd', 'look'])
        
        for line in body.split('\n'):
            line = line.strip()
            if not line:
                if in_list:
                    html_body.append('</ul>')
                    in_list = False
                continue
            
            if line.startswith('### '):
                if in_list: html_body.append('</ul>'); in_list = False
                html_body.append(f'<div class="section-divider"></div>')
                # Add emoji to subsection
                sub_title = line[4:].strip()
                html_body.append(f'<h3>{get_emoji(sub_title, "✨")} {sub_title}</h3>')
            elif line.startswith('- ') or line.startswith('* '):
                if is_look and ':' in line:
                    if in_list: html_body.append('</ul>'); in_list = False
                    label, options = line[2:].split(':', 1)
                    html_body.append(f'<div class="look-row"><div class="look-label">{label.strip()}</div><div class="look-options">{options.strip()}</div></div>')
                else:
                    if not in_list:
                        html_body.append('<ul>')
                        in_list = True
                    html_body.append(f'<li>{format_item(line[2:].strip())}</li>')
            else:
                if in_list: html_body.append('</ul>'); in_list = False
                html_body.append(f'<p>{format_item(line)}</p>')
        
        if in_list: html_body.append('</ul>')
        
        cards.append({
            'title': title,
            'html': '\n'.join(html_body),
            'emoji': get_emoji(title)
        })
    return cards

def generate_playbook_html(file_path, lang):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    content = clean_content(content)
    match = re.search(r'^# (.*)', content, re.MULTILINE)
    class_name = match.group(1).strip() if match else os.path.basename(file_path).replace('.md', '')
    
    cards = parse_markdown_to_cards(content)
    main_col = []
    side_col = []
    main_keywords = ['tło', 'background', 'ruchy startowe', 'starting moves', 'rozwinięcia', 'advances', 'ruch', 'move']
    
    for card in cards:
        html = f'<div class="card"><h2>{card["emoji"]} {card["title"]}</h2>{card["html"]}</div>'
        if any(k.lower() in card['title'].lower() for k in main_keywords):
            main_col.append(html)
        else:
            side_col.append(html)

    main_html = "\n".join(main_col)
    side_html = "\n".join(side_col)
    tab_id = f"{lang}_{os.path.basename(file_path).replace('.md', '').lower().replace(' ', '_')}"
    
    return tab_id, f"{get_emoji(class_name, '👤')} {class_name}", f"""
    <div id="{tab_id}" class="playbook-content lang-{lang}">
        <div class="main-column">
            {main_html}
        </div>
        <div class="side-column">
            {side_html}
        </div>
    </div>
    """

def generate_adventures_html(file_path, lang):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    match = re.search(r'^# (.*)', content, re.MULTILINE)
    title = match.group(1).strip() if match else ("Adventures" if lang == 'en' else "Przygody")

    sections = re.split(r'^###\s+', content, flags=re.MULTILINE)
    
    cards = []
    for section in sections:
        if not section.strip() or section.startswith('# '):
            continue
        
        lines = section.split('\n')
        sub_title = lines[0].strip()
        
        html_body = []
        prefix = ""
        items = []
        
        for line in lines[1:]:
            line = line.strip()
            if not line: continue
            
            if line.startswith('**') and line.endswith('**'):
                prefix = line[2:-2].strip()
                html_body.append(f'<div class="adventure-prefix">{prefix}</div>')
            elif re.match(r'^\d+\.\s+', line):
                item_text = re.sub(r'^\d+\.\s+', '', line)
                items.append(item_text)
            else:
                html_body.append(f'<p>{line}</p>')
                
        if items:
            html_body.append('<ul class="adventure-items">')
            for i, item in enumerate(items):
                html_body.append(f'<li class="rng-item"><span class="rng-num">{i+1}.</span> <span class="rng-text">{item}</span></li>')
            html_body.append('</ul>')
            
        cards.append({
            'title': sub_title,
            'html': '\n'.join(html_body)
        })

    adv_title_label = "🗺️ " + title
    tab_id = f"{lang}_adventures"
    
    html_out = [f"""
    <div id="{tab_id}" class="playbook-content lang-{lang}">
        <div class="main-column" style="grid-column: 1 / -1; display: flex; flex-direction: column; gap: 2rem;">
            <div class="card adventure-generator-card">
                <h2>✨ {title} Generator</h2>
                <div class="generator-result" id="rng-result-{lang}">
                    ...
                </div>
                <div class="generator-actions">
                    <button type="button" class="lang-toggle active rng-roll-btn" onclick="generateAdventure('{lang}')">🎲 Losuj / Roll</button>
                </div>
            </div>
            
            <div class="adventure-tables-grid" id="rng-tables-{lang}">
    """]
    
    for c in cards:
        html_out.append(f'''
                <div class="card adventure-table-card">
                    <h3>🎲 {c["title"]}</h3>
                    {c["html"]}
                </div>
        ''')
        
    html_out.append('''
            </div>
        </div>
    </div>
    ''')
    
    return tab_id, adv_title_label, "\n".join(html_out)

def generate_site(source_dir, output_dir, home_href=None):
    # Detect languages by looking for en/ pl/ folders or checking files
    langs = [d for d in os.listdir(source_dir) if os.path.isdir(os.path.join(source_dir, d)) and d in ['en', 'pl']]
    if not langs:
        langs = ['default'] # No subfolders found, treat root as default
        
    all_tabs = {}
    content_counts = {}
    all_contents = []
    
    for lang in langs:
        lang_dir = os.path.join(source_dir, lang) if lang != 'default' else source_dir
        
        playbook_files = glob.glob(os.path.join(lang_dir, "Playbook_*.md"))
        playbook_files.sort()
        
        lang_tabs = []
        for pf in playbook_files:
            tid, name, html = generate_playbook_html(pf, lang)
            lang_tabs.append((tid, name))
            all_contents.append(html)
            
        om_file = glob.glob(os.path.join(lang_dir, "Optional_Moves.md"))
        if om_file:
            with open(om_file[0], 'r', encoding='utf-8') as f:
                om_content = clean_content(f.read())
            cards = parse_markdown_to_cards(om_content)
            om_html_list = [f'<div class="card"><h2>{c["emoji"]} {c["title"]}</h2>{c["html"]}</div>' for c in cards]
            tid = f"{lang}_optional_moves"
            lang_name = "Opcjonalne Ruchy" if lang == 'pl' else "Optional Moves"
            lang_tabs.append((tid, f"🌟 {lang_name}"))
            all_contents.append(f'<div id="{tid}" class="playbook-content lang-{lang}"><div class="optional-moves-container">{" ".join(om_html_list)}</div></div>')
            
        # Adventure tab
        adv_files = glob.glob(os.path.join(lang_dir, "adventure.md")) + glob.glob(os.path.join(lang_dir, "adventures.md"))
        if adv_files:
            tid, name, adv_html = generate_adventures_html(adv_files[0], lang)
            lang_tabs.append((tid, name))
            all_contents.append(adv_html)

        all_tabs[lang] = lang_tabs
        content_counts[lang] = len(playbook_files)

    script_dir = os.path.dirname(os.path.abspath(__file__))
    skill_dir = os.path.dirname(script_dir)
    with open(os.path.join(skill_dir, 'assets', 'style.css'), 'r') as f:
        css = f.read()
    with open(os.path.join(skill_dir, 'assets', 'script.js'), 'r') as f:
        js = f.read()

    setting_name = os.path.basename(source_dir.rstrip('/'))
    
    # Language selector HTML
    lang_btns = []
    if len(langs) > 1 or (len(langs) == 1 and langs[0] != 'default'):
        for l in sorted(all_tabs.keys()):
            label = "Polski" if l == 'pl' else "English" if l == 'en' else l.upper()
            lang_btns.append(f'<button class="lang-toggle" data-lang="{l}" type="button">{label}</button>')
    
    lang_selector_html = f'<div class="lang-selector">{" ".join(lang_btns)}</div>' if lang_btns else ""

    # Tab buttons for each language
    tab_html_blocks = []
    for l, tabs in all_tabs.items():
        btns = "\n".join([f'<button class="tab lang-{l}" data-tab="{tid}" type="button">{name}</button>' for tid, name in tabs])
        tab_html_blocks.append(btns)
    
    tab_buttons = "\n".join(tab_html_blocks)
    full_contents = "\n".join(all_contents)

    # Wrap title text in spans to protect emoji and apply gradient safely
    title_display = f'<span class="title-emoji">{get_emoji(setting_name, "🌍")}</span> <span class="title-text">{setting_name.replace("_", " ")}</span>'

    toolbar_bits = []
    if len(content_counts) > 1:
        for lang in sorted(content_counts.keys()):
            label = "playbookow PL" if lang == "pl" else "playbookow EN" if lang == "en" else "playbookow"
            toolbar_bits.append(f'<span class="stat-badge">{content_counts[lang]} {label}</span>')
    elif content_counts:
        only_lang = next(iter(content_counts))
        toolbar_bits.append(f'<span class="stat-badge">{content_counts[only_lang]} playbookow</span>')
    if any("optional_moves" in tid for tabs in all_tabs.values() for tid, _ in tabs):
        toolbar_bits.append('<span class="stat-badge">Ruchy opcjonalne i szybka nawigacja</span>')
    toolbar_html = f'<div class="page-toolbar">{" ".join(toolbar_bits)}</div>' if toolbar_bits else ""

    home_link_html = ""
    if home_href:
        home_link_html = f'''
            <a class="home-link" href="{html_lib.escape(home_href, quote=True)}">
                <span aria-hidden="true">←</span>
                <span>Wroc do Homebrew Worlds</span>
            </a>
        '''

    html_template = f"""<!DOCTYPE html>
<html lang="pl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{setting_name.replace('_', ' ')} - Homebrew World</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;700;800&amp;family=Cormorant+Garamond:wght@600;700&amp;display=swap" rel="stylesheet">
    <style>
    {css}
    </style>
</head>
<body class="lang-default">
    <div class="container">
        <header class="hero">
            <p class="eyebrow">Homebrew World Setting</p>
            <div class="hero-top">
                {home_link_html}
                {lang_selector_html}
            </div>
            <h1 class="page-title">{title_display}</h1>
            <p class="page-summary">Materiały do gry Homebrew World ułożone w tej samej bibliotece wizualnej co strona główna: ciepła paleta, szklane panele i czytelny katalog playbooków.</p>
            {toolbar_html}
        </header>

        <div class="main-layout">
            <aside class="tabs-container" id="sidebar">
                <button id="sidebar-toggle" aria-label="Toggle Sidebar" aria-expanded="true" type="button">☰</button>
                <div class="tabs-list" role="tablist" aria-label="Playbook navigation">
                    {tab_buttons}
                </div>
            </aside>

            <div class="content-area">
                {full_contents}
            </div>
        </div>

        <footer>
            <span>Wygenerowano automatycznie • Homebrew World Web Presenter</span>
            <span>{setting_name.replace('_', ' ')} • katalog playbookow</span>
        </footer>
    </div>

    <script>
    {js}
    </script>
</body>
</html>
"""
    os.makedirs(output_dir, exist_ok=True)
    with open(os.path.join(output_dir, 'index.html'), 'w', encoding='utf-8') as f:
        f.write(html_template)
    return os.path.join(output_dir, 'index.html')

if __name__ == "__main__":
    if len(sys.argv) < 2:
        src = "."
    else:
        src = sys.argv[1]
    
    out = sys.argv[2] if len(sys.argv) > 2 else os.path.join(src, "web_presentation")
    result_path = generate_site(src, out)
    print(f"DONE: {result_path}")
