"""Wyciąga paragrafy z PDF-a z zachowaniem kolejności czytania dwóch kolumn.

Uruchomienie z katalogu głównego repozytorium:
    .venv/bin/python3 AloneAgainstTheStatic/tools/extract.py
"""
import json
import re
import sys
from pathlib import Path

import fitz

ROOT = Path(__file__).resolve().parents[2]
PDF = ROOT / "PDF_input" / "cha23181_-_alone_against_the_static_v6.pdf"
OUT = Path(__file__).resolve().parent / "raw-entries.json"

# Konwersja PDF-a gubi ligatury: "Th" wychodzi jako "!", "fl" jako "%".
REPLACEMENTS = [
    # Normalizacja cudzysłowów/apostrofów musi iść pierwsza — wzorce ze słowami
    # typu "!at's" czy "!ey're" zakładają już prosty apostrof.
    ("’", "'"), ("“", '"'), ("”", '"'), ("—", "—"),
    ("!e ", "The "), ("!is ", "This "), ("!ey ", "They "), ("!at ", "That "),
    ("!ere", "There"), ("!en ", "Then "), ("!ose ", "Those "), ("!rough", "Through"),
    ("!ink", "Think"), ("!ank", "Thank"),
    # "!" bywa też skrótem "Th" lub "fi" w innych formach gramatycznych i przy
    # znakach interpunkcyjnych, których powyższe wzorce (wymagające spacji po
    # słowie) nie łapią — znalezione przez przeszukanie całego wyekstrahowanego
    # tekstu pod kątem wszystkich wystąpień "!" i sprawdzenie kontekstu w PDF-ie.
    ("!at's", "That's"), ("!eir", "Their"), ("!en,", "Then,"), ("!ese", "These"),
    ("!ey're", "They're"), ("!is…", "This…"), ("!ick", "Thick"), ("!ousands", "Thousands"),
    ("!underous", "Thunderous"),
    ("!nd", "find"), ("!ght", "fight"), ("!lls", "fills"), ("!repit", "firepit"),
    ("con!rm", "confirm"),
    ("%o", "flo"), ("%a", "fla"), ("%e", "fle"), ("%i", "fli"), ("%u", "flu"),
    ("ﬀ", "ff"), ("ﬁ", "fi"), ("ﬂ", "fl"), ("ﬃ", "ffi"), ("ﬄ", "ffl"),
    # Kilka adnotacji "trace" ma pojedynczy, uszkodzony podpis cyfrowy — najpewniej
    # wadliwa mapa ToUnicode w osadzonym podzbiorze czcionki dla tego konkretnego
    # wystąpienia. Każdy wzorzec poniżej sprawdzono, renderując dany fragment
    # strony do obrazu i odczytując prawdziwe cyfry z glifów; każdy występuje
    # w całym PDF-ie dokładnie raz, więc podmiana jest bezpieczna.
    ("hho6 ", "229, "),  # s. 66, trace paragrafu 250: "(hho6 242, 276)" -> "(229, 242, 276)"
    ("hnk6 ", "285, "),  # s. 87, trace paragrafu 337: "(hnk6 336)" -> "(285, 336)"
    ("10k,", "105,"),  # s. 86, trace paragrafu 327: "(10k, 111)" -> "(105, 111)"
    ("36o,", "369,"),  # s. 96, trace paragrafu 370: "(36o, 371)" -> "(369, 371)"
    ("17n)", "178)"),  # s. 52, trace paragrafu 180: "(17n)" -> "(178)"
    ("\x07o to ilm.", "Go to 367."),  # s. 95, uszkodzony cały wiersz odsyłacza paragrafu 366
    # PyMuPDF zachowuje łącznik z końca wiersza, a kolejną linię dokleja po
    # spacji. Poniższe formy zostały sprawdzone bezpośrednio na renderze PDF.
    ("not- at-all-soft", "not-at-all-soft"),
    ("white- water", "whitewater"),
    ("half- heartedly", "half-heartedly"),
    ("pine- coated", "pine-coated"),
    ("half- second", "half-second"),
    ("Ush- Tik-a", "Ush-Tik-a"),
    ("sing- song", "sing-song"),
    ("dis- integrating", "disintegrating"),
    ("low- hanging", "low-hanging"),
]

# W kilku blokach ta sama uszkodzona ligatura "Th" nie jest zwracana jako "!",
# lecz jako samo "T". Ograniczamy korektę do pełnych słów potwierdzonych w PDF-ie,
# żeby nie naruszyć poprawnych wyrazów zaczynających się od tych liter.
MISSING_H_WORDS = {
    "Te": "The",
    "Tose": "Those",
    "Tey": "They",
    "Tere": "There",
    "Ten": "Then",
}
MISSING_H_RE = re.compile(r"\b(?:" + "|".join(MISSING_H_WORDS) + r")\b")

# Numer stopki stoi konsekwentnie na wysokości ok. 0.929 wysokości strony (np.
# 719.1 z 774pt), a najniższy prawdziwy nagłówek paragrafu w książce leży poniżej
# 0.85 wysokości strony — próg 0.9 rozdziela je z zapasem w obie strony.
FOOTER_Y_FRAC = 0.9

ENTRY_RE = re.compile(r"^(\d{1,3})$")
TRACE_RE = re.compile(r"^\((Start|[\d,\s]+)\)$")


def clean(text: str) -> str:
    text = text.replace("\n", " ")
    for old, new in REPLACEMENTS:
        text = text.replace(old, new)
    text = MISSING_H_RE.sub(lambda match: MISSING_H_WORDS[match.group(0)], text)
    return re.sub(r"\s+", " ", text).strip()


def block_tokens(raw_text: str) -> list[str]:
    """Dzieli blok na tokeny do przetworzenia w kolejności czytania.

    PyMuPDF czasem skleja w jeden blok rzeczy, które logicznie są osobne —
    np. treść akapitu z następującą po niej adnotacją trace ("Go to 118.\n(114)"),
    albo adnotację trace z numerem kolejnego paragrafu ("(45, 50)\n52"), gdy
    w PDF-ie brakuje między nimi odstępu. Traktujemy każdą linię bloku osobno:
    liczba samodzielna lub adnotacja "(...)" kończy bieżący fragment treści
    i staje się własnym tokenem, a zwykłe linie tekstu są sklejane w jeden
    akapit tak jak poprzednio.
    """
    tokens: list[str] = []
    buffer: list[str] = []
    for raw_line in raw_text.split("\n"):
        line = clean(raw_line)
        if not line or line == "ALONE AGAINST THE STATIC":
            continue
        if ENTRY_RE.match(line) or TRACE_RE.match(line):
            if buffer:
                # Uruchom clean ponownie po sklejeniu linii, żeby naprawić
                # artefakty dzielenia wyrazów na granicy wiersza (np. "half- second").
                tokens.append(clean(" ".join(buffer)))
                buffer = []
            tokens.append(line)
        else:
            buffer.append(line)
    if buffer:
        tokens.append(clean(" ".join(buffer)))
    return tokens


def horizontal_blocks(page):
    """Zwraca bloki tekstu w formacie zgodnym z page.get_text('blocks'), pomijając
    bloki z tekstem obróconym o 90 stopni. To podpisy ilustracji na marginesach
    strony (np. "Te Black Hills", "Chaos in the Cabin") — należą do grafik, a nie
    do treści numerowanych paragrafów, więc nie powinny trafiać do żadnego akapitu.
    """
    blocks = []
    for block in page.get_text("dict")["blocks"]:
        lines = block.get("lines")
        if not lines:
            continue
        if any(line.get("dir") != (1.0, 0.0) for line in lines):
            continue
        text = "\n".join("".join(span["text"] for span in line["spans"]) for line in lines)
        x0, y0, x1, y1 = block["bbox"]
        blocks.append((x0, y0, x1, y1, text))
    return blocks


def ordered_blocks(page):
    """Zwraca bloki tekstu w kolejności czytania: najpierw lewa kolumna, potem prawa."""
    middle = page.rect.width / 2
    blocks = [b for b in horizontal_blocks(page) if b[4].strip()]
    left = sorted((b for b in blocks if b[0] < middle * 0.9), key=lambda b: b[1])
    right = sorted((b for b in blocks if b[0] >= middle * 0.9), key=lambda b: b[1])
    return left + right


def main() -> int:
    if not PDF.exists():
        print(f"Nie znaleziono pliku: {PDF}", file=sys.stderr)
        return 1

    doc = fitz.open(PDF)
    entries: dict[str, dict] = {}
    current: dict | None = None
    # Numery paragrafów w książce idą ściśle po kolei 1..371 w kolejności czytania.
    # To pozwala odróżnić prawdziwy nagłówek paragrafu od przypadkowej samodzielnej
    # liczby o tej samej wartości gdzie indziej na stronie (numer stopki, wartość
    # w tabelce karty postaci na końcu książki itp.) — akceptujemy tylko liczbę
    # równą kolejnemu oczekiwanemu numerowi.
    expected_next = 1

    for page_number, page in enumerate(doc, start=1):
        for block in ordered_blocks(page):
            for token in block_tokens(block[4]):
                match = ENTRY_RE.match(token)
                if match:
                    # Samodzielna liczba to albo prawdziwy nagłówek kolejnego
                    # paragrafu, albo szum (numer stopki, wartość w tabelce karty
                    # postaci itp.) — nigdy treść akapitu, więc w obu przypadkach
                    # nie trafia do current["paragraphs"].
                    is_next = int(match.group(1)) == expected_next and expected_next <= 371
                    is_footer_position = block[1] > page.rect.height * FOOTER_Y_FRAC
                    if is_next and not is_footer_position:
                        current = {"id": int(match.group(1)), "page": page_number, "paragraphs": [], "trace": []}
                        entries[match.group(1)] = current
                        expected_next += 1
                    continue

                if current is None:
                    continue

                trace = TRACE_RE.match(token)
                if trace:
                    body = trace.group(1)
                    current["trace"] = [] if body == "Start" else [int(n) for n in re.findall(r"\d+", body)]
                    continue

                current["paragraphs"].append(token)

        if expected_next > 371:
            # Paragraf 371 to ostatni w książce — po jego zamknięciu kończymy,
            # zanim skrypt zdąży dopisać do niego materiały spoza numeracji
            # (dodatek o Ush-Tik-A, karty postaci, kredyty na końcu tomu).
            break

    OUT.write_text(json.dumps(entries, ensure_ascii=False, indent=2), encoding="utf-8")
    found = sorted(int(k) for k in entries)
    missing = [n for n in range(1, 372) if n not in found]
    print(f"Zapisano {len(entries)} paragrafów do {OUT}")
    print(f"Brakujące numery: {missing}" if missing else "Komplet 1-371")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
