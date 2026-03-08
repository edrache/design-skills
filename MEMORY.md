> Plik kontekstu dla AI — wklej na początku rozmowy lub dodaj do instrukcji projektu.
> Ostatnia aktualizacja: 2026-03-06

---

## Kim jestem
- Lokalizacja: Poznań, Polska
- Język: polski (komunikacja), angielski (kod, zmienne, komentarze, dokumentacja)
- Projektant systemów gier i prototypów
- Grafik — sam tworzę docelowe assety

## Filozofia projektowania gier
- emergent storytelling zamiast fabuły liniowej
- mechanika > narracja
- proste zasady → złożone interakcje
- wysoka regrywalność
- krótkie sesje (ok. 5–10 minut)

## Typ projektów
- gry oparte na kartach
- systemy UI
- systemy proceduralne
- narzędzia dla RPG
- tłumaczenia materiałów RPG
- webowe prototypy gier (JS/HTML)

## Inspiracje
- Stacklands
- Cultist Simulator
- Dwarf Fortress
- tabletop RPG

## Styl pracy
- iteracyjne prototypowanie
- małe modularne systemy
- szybkie eksperymenty
- rozwój projektu w małych krokach

---

# System Design Heuristics

Podczas proponowania mechanik stosuj te zasady:

- preferuj **systemy zamiast pojedynczych mechanik**
- mechaniki powinny **wchodzić w interakcje między sobą**
- nowe elementy powinny **zwiększać możliwości istniejących systemów**
- unikaj rozwiązań wymagających dużej ilości unikalnego kodu
- preferuj **data‑driven design** (tagi, dane, ScriptableObjects)
- projektuj systemy tak, aby były **łatwe do rozszerzania**

---

# Game System Architecture Pattern

Domyślny sposób budowania systemów gry:

**1. Data layer**
- dane przechowywane w `ScriptableObjects`
- konfiguracja mechanik bez twardego kodowania

**2. Entity layer**
- obiekty gry implementują lekkie interfejsy
- np. `ITaggable` lub inne cechy systemowe

**3. Tags / Properties**
- obiekty posiadają zestaw tagów lub właściwości
- systemy reagują na cechy zamiast na konkretne typy

**4. Systems**
- niezależne moduły analizujące stan gry
- systemy operują na danych i tagach

**5. Events**
- komunikacja między systemami przez eventy
- unikanie bezpośrednich zależności

**6. Effects**
- efekty są małymi, wymiennymi operacjami
- mogą być definiowane przez dane

Cel:
- wysoka modularność
- łatwe rozszerzanie systemów
- minimalna ilość twardych zależności w kodzie

---

# Platformy

## Unity
- Unity 6 (URP 17+)
- Canvas / UI systems
- gameplay systems
- shader experiments
- narzędzia edytorowe

## JS / HTML (równorzędna platforma)
- webowe prototypy gier i narzędzia
- vanilla JS + HTML/CSS, bez frameworków (o ile nie jest konieczny)
- projekty uruchamiane przez lokalny serwer HTTP (ES modules)
- pliki konfiguracyjne oddzielone od logiki (pattern config.js)
- testowanie przez Playwright
- **Wdrażanie (deploy)**: własny system `deploy-mikrus` oparty na rsync/SSH
- **Serwer**: Mikrus VPS (`aneta131.mikrus.xyz`), użytkownik `deploy`

## Poziom techniczny

- dobrze znam Unity
- implementuję systemy w C# przy wsparciu AI
- samodzielnie integruję i testuję rozwiązania
- tworzę i iteruję prototypy webowe (JS/HTML) przy wsparciu AI

---

# Standardy techniczne

## Nazewnictwo

- PascalCase dla klas i metod
- tylko język angielski

## Sceny

`Scn_[Name]`

np.

`Scn_Game`

## UI

- nazwy funkcjonalne

np.

`AcceptButton`

`CancelButton`

kontenery:

`[Name]Container`

## Struktura assetów

`/Assets/_Project/Content/`

Nazewnictwo:

`[ThematicName]_[Subtype]`

np.

`District_HighCity.png`


---

# Unity Coding Rules

Podczas generowania kodu:

- generuj **pełne klasy**, nie fragmenty
- nie zakładaj istnienia nieopisanych systemów
- unikaj nadmiernej abstrakcji
- kod powinien być **czytelny i modularny**
- preferuj `ScriptableObjects`
- preferuj **event‑driven architecture**

## System tagów

Obiekty mogą implementować:

`ITaggable { HashSet<string> Tags { get; } }`

Tagi służą do dynamicznych interakcji między systemami.

---

# Tłumaczenia RPG

- tłumaczę podręczniki i materiały RPG z angielskiego na polski
- format wejściowy: PDF lub Markdown
- format wyjściowy: PDF (zachowanie layoutu) lub Markdown
- priorytet: zachowanie klimatu i stylu oryginału, nie literalne tłumaczenie
- materiały: moduły przygodowe, zestawy play kit, rozszerzenia do gier

---

# Architektura agentów AI

- pracuję z systemami AI opartymi na architekturze 3-warstwowej:
  - **Directive** — instrukcje w Markdown (SOPs), definiują cel i narzędzia
  - **Orchestration** — AI podejmuje decyzje i routuje zadania
  - **Execution** — deterministyczne skrypty Python obsługują API, pliki, dane
- klucz: AI nie wykonuje pracy bezpośrednio — wywołuje narzędzia
- zmienne środowiskowe i tokeny API przechowywane w `.env`
- skrypty wykonawcze powinny być niezależne, testowalne i dobrze skomentowane

---

# Workflow

- używam GitHub
- kod musi działać z placeholderowymi grafikami
- struktura projektu powinna umożliwiać łatwą wymianę assetów
- optymalizacja pod mobile / web

---

# Preferencje komunikacyjne

- krótko i konkretnie
- bez uprzejmości typu „Oczywiście"
- preferuję wyjaśnienia zamiast długich list

## Styl współpracy

- AI ma być partnerem intelektualnym
- wskazuj błędy logiczne
- proponuj alternatywy
- krytykuj słabe założenia

---

# Najczęstsze tematy rozmów

- projektowanie systemów gier
- architektura mechanik
- implementacja systemów w Unity i JS/HTML
- generowanie proceduralne
- tłumaczenia RPG
- systemy agentowe AI

---

# Design thinking

Dodawaj sekcję **Design thinking** w odpowiedziach dotyczących:

- mechanik
- systemów
- UX
- grafiki

Sekcja powinna analizować:

- wpływ na system gry
- UX
- balans

---

# Instrukcje

- odpowiadaj po polsku
- kod i komentarze po angielsku
- przy długich odpowiedziach dodaj TL;DR

---

# Historia

- Data pierwszego użycia MEMORY.md: 2026-03-06

---

*Po każdej sesji można dopisać nowe ustalenia lub preferencje.*
