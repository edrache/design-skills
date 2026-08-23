# Alone Against the Static — wersja przeglądarkowa

Data: 2026-08-23
Gałąź: `game/alone-against-the-static`
Katalog docelowy: `AloneAgainstTheStatic/`

## Cel

Przeglądarkowa wersja solowej przygody *Alone Against the Static* (Call of Cthulhu 7e,
Chaosium, 2023) — 371 paragrafów, dwie postacie, 15 zakończeń. Grywalna na desktopie
i telefonie, dwujęzyczna (EN/PL), z miejscem na lektora, muzykę i grafiki dochodzące
stopniowo.

Zastosowanie prywatne — dla autora i znajomych, bez publicznego adresu. Treść
scenariusza pozostaje własnością Chaosium; publikacja wymagałaby licencji, której
ten projekt nie zakłada.

## Decyzje

| Rzecz | Wybór |
|---|---|
| Mechanika CoC | pełna automatyzacja — gra rzuca, liczy i kieruje; gracz decyduje fabularnie oraz o push / Luck |
| Układ ekranu | tekst plus stały panel postaci (desktop) / szuflada od dołu (telefon) |
| Rzut kością | w strumieniu tekstu, zostaje w dzienniku rozgrywki |
| Styl | VHS: czerń, linie skanowania, rozjechany kolor, maszynowy chrom; akapity groteską |
| Cofanie | brak — decyzja jest decyzją, rzut jest rzutem |
| Zapisy | jeden autosave; nowa gra kasuje poprzednią; bez śledzenia postępu między rozgrywkami |
| Lektor | autoodtwarzanie po wejściu w paragraf, z pauzą i globalnym wyłącznikiem |
| Tłumaczenie PL | wykonuje autor repozytorium; dostaje pliki tekstowe z kluczami |
| Pierwsza wersja | pionowy plaster: pełny silnik i UI, dane dla ~30 pierwszych paragrafów |

Technologia zgodna z konwencją repozytorium: statyczne HTML/CSS/JS bez bundlera
i bez backendu, narzędzia deweloperskie w Node, deploy przez `universal-deploy/deploy.sh`.

## Mechanika, którą trzeba odwzorować

Rdzeń CoC 7e w wersji Quick-Start:

- test d100 roll-under; progi Regular (≤ wartość), Hard (≤ ½), Extreme (≤ ⅕)
- krytyk 01, fumble 100 (albo 96+ przy umiejętności poniżej 50)
- kości bonusowe i karne: dodatkowa kość dziesiątek, wybór lepszego (bonus) lub
  gorszego (penalty) wyniku; bonus i penalty znoszą się parami
- pushing: powtórzenie nieudanego rzutu z gorszymi konsekwencjami; niedostępne
  dla rzutów bojowych i Sanity
- Sanity: rzut przeciw bieżącemu SAN, strata zapisana jako `X/Y`
- wydawanie Luck 1:1 na podbicie wyniku; nie dotyczy rzutów Damage, Luck i Sanity
  ani rzutów przepchniętych

Uproszczenia wprowadzone przez samą książkę:

- walka to pojedynczy rzut z rozgałęzieniem — bez inicjatywy, rund i rzutów
  przeciwstawnych; modyfikatory podane wprost w treści paragrafu
- pościgi i bouts of madness równie skrócone
- używane rzuty: CON, DEX, INT, POW, STR, Sanity, Luck, Dodge, Fighting (Brawl),
  First Aid, Listen, Mechanical Repair, Natural World, Navigate, Persuade,
  Psychology, Spot Hidden, Stealth

Progi i paragrafy systemowe, z kolejnością rozstrzygania zdefiniowaną przez autora:

- 0 HP → **324**; strata ≥ ½ max HP jednym ciosem → **325**
- 0 SAN → **334**; strata > ⅕ SAN w ciągu dnia → **328**; strata > 5 SAN naraz → **329**
- kolejność: obrażenia przed Sanity; 324 przed 325; 334 przed 328 i 329
- **329** losuje 1D4 → 330–333; wylosowany już odwiedzony paragraf pomija się
  na rzecz nieodwiedzonego; gdy wszystkie cztery wyczerpane → 334
- 330–333 nakładają trwałą kość karną odpowiednio na Fighting (Brawl),
  Spot Hidden, Persuade i Intimidate, oraz Listen; kumulują się
- po każdym z nich gra wraca do paragrafu zapamiętanego przy utracie Sanity

Log sheet: 36 flag boolowskich zapalanych przez paragrafy (`Check/tick X`)
i odczytywanych jako warunki (`If X is checked… go to Y`, `you cannot… you must go to Z`).

Pozostałe konstrukcje występujące w tekście: liczenie wizyt w paragrafie
(„The first time you read this entry"), wybory jednorazowe („select an option
you have not already chosen") oraz stos powrotu.

## Architektura

Podział przebiega między mechaniką a tekstem. Powód jest praktyczny: tłumaczenie
wykonuje człowiek, który ma edytować wyłącznie pliki tekstowe i nie mieć fizycznej
możliwości zepsucia logiki gry.

```
AloneAgainstTheStatic/
  index.html
  data/
    story.json          struktura 371 paragrafów: rzuty, warunki, przejścia, klucze tekstów
    text.en.json        teksty angielskie      }  identyczne zestawy kluczy
    text.pl.json        teksty polskie         }  pilnowane przez walidator
    characters.json     Alex i Charlie: cechy, umiejętności, ekwipunek, backstory
    media.json          paragraf → grafika i lektor, scena → muzyka
  src/
    engine/dice.js      rzuty d100, poziomy sukcesu, kości bonusowe i karne
    engine/state.js     stan gry, serializowalny
    engine/rules.js     progi HP/SAN, bouts of madness, kolejność 324/325/328/329/334
    engine/runner.js    interpreter paragrafu
    ui/                 dziennik, panel postaci, ekrany, audio, i18n
  tools/
    extract.mjs         jednorazowa ekstrakcja z PDF
    validate.mjs        walidacja danych i tłumaczeń
    dev.html            skok do dowolnego paragrafu (narzędzie autorskie, poza grą)
  test/
```

### Model danych

Paragraf 5 jako przykład:

```json
{
  "id": 5,
  "scene": "arrival",
  "text": ["e5.p1", "e5.p2", "e5.p3"],
  "on": [
    { "roll": "CON", "onFail": [{ "flag": "touched_by_cold" }] }
  ],
  "choices": [
    { "text": "e5.c1", "goto": 6 },
    { "text": "e5.c2", "goto": 12 }
  ],
  "from": [4, 8]
}
```

Odwzorowanie konstrukcji książki:

| Konstrukcja | Zapis |
|---|---|
| rzut z rozgałęzieniem | `{ "roll": "Psychology", "onSuccess": {"goto": 4}, "onFail": {"goto": 8} }` |
| „Make a Hard … roll" | `"difficulty": "hard"` |
| kość bonusowa / karna | `"dice": 1` / `"dice": -1` |
| „check/tick X" | `{ "flag": "x" }` |
| „If X is checked… go to Y" | `"guards": [{ "if": "x", "goto": 33 }]` |
| „The first time you read this entry…" | `{ "if": ["unsettled", {"visits": 1}], "goto": 67 }` |
| wybór jednorazowy | `"once": true` |
| strata punktów | `{ "san": "1" }`, `{ "hp": "1d6" }` |
| rzut Sanity `1/1D6` | `{ "sanCheck": "1/1d6" }` |
| „Return to the entry you noted" | `"goto": "@return"` |
| dostępny push | `"push": { "onSuccess": …, "onFail": … }` |

Klucze tekstów są przewidywalne (`e<id>.p<n>` dla akapitów, `e<id>.c<n>` dla wyborów),
więc plik tłumaczenia da się czytać liniowo bez zaglądania do struktury.

### Moduły silnika

Wszystkie bez dostępu do DOM, testowane przez `node:test`.

**`dice.js`** — `roll(target, {dice, difficulty})` zwraca komplet informacji o rzucie:
wartości obu kości dziesiątek, jednostki, wynik końcowy i poziom sukcesu. Generator
losowy wstrzykiwany, więc testy przechodzą ścieżki deterministycznie.

**`state.js`** — cały stan w jednym serializowalnym obiekcie: postać, HP, SAN, Luck, MP,
flagi log sheeta, licznik wizyt w każdym paragrafie, zużyte wybory, stos powrotu,
trwałe modyfikatory z bouts of madness. Operacje zwracają nowy stan zamiast mutować
istniejący.

**`rules.js`** — reguły CoC nakładane na stan. Po każdej stracie zwraca ewentualne
przekierowanie do paragrafu systemowego wraz z zapisem punktu powrotu, zgodnie
z kolejnością zdefiniowaną powyżej.

**`runner.js`** — interpreter. Bierze paragraf i stan, wykonuje strażniki, tekst, kroki
i wybory, zwraca listę zdarzeń do wyświetlenia oraz nowy stan. Interfejs jednokierunkowy:
UI nie liczy niczego, tylko rysuje zdarzenia i oddaje decyzje gracza.

## Interfejs

Kolumna tekstu plus panel postaci — stały po prawej na desktopie, wysuwany od dołu
na telefonie, gdzie w pasku zawsze widać HP / SAN / Luck. Rozgrywka rośnie jako jeden
przewijalny dziennik: nowy paragraf dopisuje się pod poprzednim, starsze przygasają,
widok przewija się do świeżego tekstu. Rzut pojawia się tam, gdzie padł, i tam zostaje;
przyciski decyzji znikają po użyciu, wynik zostaje. Dziennik służy do czytania, nie
do klikania — cofnąć się nie da.

Styl: czerń, linie skanowania i rozjechany kolor jako chrom; numery paragrafów, panel,
bloki rzutów i HUD maszynowym krojem; akapity groteską, bo tekstu jest dużo. Intensywność
linii skanowania jako zmienna CSS wystawiona w ustawieniach, wyłączana automatycznie
przy `prefers-reduced-motion`.

Dziennik gromadzi całą rozgrywkę bez ograniczenia — realistycznie od kilkudziesięciu
do stu paragrafów, więc długość strony nie jest problemem.

Pozostałe ekrany: wybór postaci (Alex albo Charlie z porównaniem statystyk i rzutem
3D6×5 na Luck), pełna karta postaci oraz ekran końca po „THE END" — pokazuje, którym
zakończeniem to było, końcowe HP i SAN, listę zapalonych flag log sheeta i przycisk
nowej gry. Bez porównania z poprzednimi rozgrywkami, bo tych nie zapisujemy.

Ustawienia zapamiętywane: język, lektor on/off, osobna głośność lektora i muzyki,
intensywność linii skanowania, rozmiar tekstu.

## Języki

Przełącznik EN/PL w nagłówku, wybór zapamiętany. Zmiana języka w trakcie gry przeładowuje
teksty już wyświetlonego dziennika; stan gry jest od nich niezależny, więc nic nie ginie.
Brakujący klucz w `text.pl.json` cicho spada na angielski, a walidator wypisuje listę
nieprzetłumaczonych kluczy. Plik do tłumaczenia jest ułożony w kolejności paragrafów,
z angielskim oryginałem przy każdym kluczu.

## Media

```json
{
  "entries": { "5": { "image": "img/05-cabin.jpg", "audio": { "en": "…", "pl": "…" } } },
  "scenes":  { "arrival": "music/drive.mp3", "cabin": "music/cabin.mp3" }
}
```

Lektor startuje sam po wejściu w paragraf — po pierwszej interakcji gracza, bo wcześniej
przeglądarki blokują dźwięk. Muzyka jest przypisana do sceny, nie do paragrafu: dopóki
kolejne paragrafy należą do tej samej sceny, utwór gra bez przerwy; zmiana sceny robi
kilkusekundowe przenikanie. Sceny nadawane są przy ekstrakcji na podstawie miejsca akcji
i można je potem przestawić w jednym pliku. Brakujące pliki nie istnieją dla gry — bez
błędów i pustych ikon.

## Ekstrakcja treści

Źródłem struktury i kolejności jest PDF czytany przez PyMuPDF (dostępny w `.venv`),
z rozdzieleniem stron na kolumny i sortowaniem bloków po współrzędnej pionowej.
Sprawdzone na stronie z paragrafami 3–8: numery, akapity, rzuty i trace numbers wychodzą
jako osobne bloki we właściwej kolejności.

Istniejący `output/markdown/cha23181_-_alone_against_the_static_v6.md` **nie nadaje się
na źródło podstawowe** — ma przetasowaną kolejność akapitów wewnątrz paragrafów (efekt
czytania kolumn w złej kolejności; widoczne w paragrafach 1, 3, 23) oraz brakujące numery
281 i 365. Służy natomiast jako niezależna kontrolka: porównanie słowo po słowie wskaże
miejsca, gdzie któreś ze źródeł zgubiło tekst, i tylko te trzeba obejrzeć ręcznie.

Do naprawy po ekstrakcji zostają podmianki znakowe: `!` w miejsce `Th` (`!e`, `!is`,
`!ey`, `!at`, `!ere`, `!en`), `%` w miejsce `fl`, oraz ligatury `ﬀ` i `ﬁ`. Wszystkie
wykrywalne regułą i sprawdzalne słownikiem.

Wynik ekstrakcji trafia do `story.json` i `text.en.json`, jest commitowany i od tego
momentu edytowany ręcznie. PDF przestaje być zależnością buildu.

## Walidacja i testy

`tools/validate.mjs`, uruchamiany w testach i przed deployem:

- każde `goto` wskazuje istniejący paragraf
- każdy paragraf jest osiągalny ze STARTU

W fazie pionowego plastra oba te sprawdzenia działałyby przeciwko nam, bo większość
wyborów prowadzi poza wyekstrahowany fragment. Dlatego walidator ma tryb częściowy:
`story.json` deklaruje pole `extracted` z zakresem gotowych paragrafów, a cele spoza
niego są raportowane jako „jeszcze nieprzepisane", nie jako błąd. W grze taki wybór
prowadzi do czytelnej zaślepki z numerem paragrafu zamiast do zepsutego ekranu.
Po zakończeniu ekstrakcji pole znika i oba sprawdzenia obowiązują bez wyjątków.
- każda flaga jest gdzieś zapalana i gdzieś czytana
- `text.pl.json` ma komplet kluczy z `text.en.json` (braki jako ostrzeżenie, nie błąd)
- każdy paragraf z `text` ma odpowiadające klucze w pliku językowym

Testy w trzech warstwach: jednostkowe dla kości i progów; walidator jako test całości
danych; testy przejść, w których ustawiona sekwencja kości prowadzi zapisaną ścieżką
od STARTU do konkretnego zakończenia ze sprawdzaniem flag i statystyk po drodze.

## Obsługa błędów

| Sytuacja | Zachowanie |
|---|---|
| uszkodzony zapis w localStorage | cicha nowa gra z komunikatem |
| brak pliku audio, muzyki lub grafiki | paragraf działa normalnie, bez nich |
| brak klucza tłumaczenia | fallback na angielski, wpis w raporcie walidatora |
| nieznane `goto` | wyłapane przez walidator przed deployem |

## Zakres pierwszej wersji

Pionowy plaster: kompletny silnik, UI, walidator i mechanika, ale dane tylko dla około
30 pierwszych paragrafów — od STARTU do pierwszej nocy w chacie. Fragment ma być grywalny
i pokazywać styl, rzuty, panel postaci i przełącznik języka. Dopiero po jego zatwierdzeniu
ekstrakcja pozostałych paragrafów.

Ryzyko takiego cięcia — że model danych okaże się za wąski dopiero przy paragrafie 300 —
jest ograniczone tym, że lista konstrukcji mechanicznych w tabeli powyżej powstała
z przeglądu **całego** tekstu, nie tylko pierwszych paragrafów.

## Poza zakresem

Tryb wielu slotów zapisu, śledzenie postępu między rozgrywkami, licznik odkrytych
zakończeń, tryb offline (service worker), konta użytkowników, generyczny silnik pod inne
gry paragrafowe. Żadna z tych rzeczy nie jest potrzebna do zagrania w tę grę i każda
kosztuje więcej niż daje na tym etapie.
