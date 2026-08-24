# Zakłócenia reaktywne — szum domyślny, kursor jako ulga

Data: 2026-08-24
Gałąź: `game/alone-against-the-static`
Poprzedni spec: [`2026-08-24-warstwa-stylu-tekstu-design.md`](2026-08-24-warstwa-stylu-tekstu-design.md)

## Cel

Warstwa efektów działa, ale jest wyłączona przez większość rozgrywki: `--dread`
liczy się jako `1 - san / startingSan`, więc przy pełnej Poczytalności amplituda
wynosi zero i nie widać nic. Nie ma też żadnej animacji w czasie — filtr ma stałe
ziarno, więc obraz jest zamrożonym zniekształceniem, które rusza się wyłącznie
przy ruchu wskaźnika.

Zmieniamy trzy rzeczy:

1. Zakłócenie staje się **stanem domyślnym**, obecnym od pierwszego paragrafu.
2. Spadek Poczytalności kupuje **ruch i nieczytelność**, nie tylko rozmiar.
3. Wskaźnik **uspokaja** zakłócenie zamiast je wzmacniać — gracz stroi taśmę,
   celując w nią.

## Decyzje

| Rzecz | Wybór |
|---|---|
| Amplituda przy pełnej Poczytalności | 0.4 px — podłoga, zawsze obecna |
| Amplituda przy zerowej Poczytalności | 2.6 px — świadomie poza próg wygodnego czytania |
| Rola bliskości wskaźnika | **redukuje** amplitudę do ~15 % wartości bazowej |
| Ulga na dotyku | okno 2500 ms po `pointerdown`, wygasające płynnie |
| Rodzaj ruchu | pełzający szum **oraz** zrywy zakłóceń |
| Sterowanie filtrem | JS ustawia zmienną CSS, CSS składa `filter` |
| Liczba filtrów SVG | cztery, po jednym na skwantowany poziom |

Poprzedni spec deklarował „amplituda nigdy powyżej 1.5 px, czytelność jest
warunkiem nadrzędnym". **Ta zasada zostaje świadomie zmieniona przez autora**:
nieczytelność przy niskiej Poczytalności jest teraz zamierzonym elementem
rozgrywki, ponieważ gracz ma zawsze dostępny sposób jej zniesienia — wskaźnik.
Bez tego mechanizmu podniesienie sufitu byłoby regresją, a nie funkcją.

## Model amplitudy

Czysta funkcja `amplitudeFor` pozostaje jedynym miejscem, gdzie liczy się
natężenie.

```
FLOOR_PX   = 0.4
CEILING_PX = 2.6
RELIEF     = 0.85

reducedMotion            → 0
base     = (FLOOR + (CEILING - FLOOR) * dread) * textEffects
amplituda = base * (1 - RELIEF * proximity)
```

Wszystkie wejścia przycinane do 0–1. Suwak „Efekty tekstu" na zerze nadal
wyłącza wszystko. `prefers-reduced-motion` nadal zeruje ruch, zostawiając barwy
i typografię.

Zmiana wobec poprzedniego modelu jest podwójna: znika mnożnik `(1 + proximity)`,
który bliskość **dodawała**, a pojawia się `(1 - RELIEF * proximity)`, który ją
**odejmuje**. Stała `MAX_AMPLITUDE_PX` znika na rzecz pary podłoga/sufit.

## Ruch

Dwie warstwy, obie sterowane `dread`, obie liczone z czasu przekazanego jako
argument — dzięki temu pozostają czystymi funkcjami i dają się testować.

**Pełzający szum.** Ziarno turbulencji przeskakuje co `SEED_STEP_MS`, malejące
od 220 ms przy pełnej Poczytalności do 40 ms przy zerowej. Równolegle pionowa
składowa `baseFrequency` oscyluje w sposób ciągły, więc między przeskokami
ziarna obraz nadal faluje.

**Zrywy.** Czas dzielony na sloty po `BURST_SLOT_MS = 900`. Dla każdego slotu
deterministyczna funkcja skrótu daje liczbę z zakresu 0–1; zryw występuje, gdy
jest ona poniżej progu `0.05 + 0.45 * dread`. Zryw trwa 140 ms z obwiednią
sinusoidalną i mnoży amplitudę przez `1 + 1.2 * dread`. Przy pełnej Poczytalności
zrywy praktycznie nie występują, więc początek gry zostaje spokojny.

Determinizm skrótu jest celowy: pozwala przetestować rozkład zrywów bez
podstawiania generatora losowego.

## Cztery filtry

Dziś wszystkie fragmenty dzielą jeden `feDisplacementMap`, którego `scale`
dostaje maksimum ze wszystkich widocznych elementów. Przy odwróconym modelu
bliskości to nie wystarcza: fragment pod kursorem ma być spokojny, gdy sąsiedni
pozostaje roztrzęsiony.

W `index.html` powstają cztery filtry `#vhs-static-0` … `#vhs-static-3`,
odpowiadające poziomom 0.4, 1.15, 1.9 i 2.6 px. Element wskazuje kubełek
najbliższy swojej amplitudzie. W każdej klatce ustawiamy cztery wartości `scale`
— poziom kubełka pomnożony przez bieżący zryw — oraz `baseFrequency` i `seed`
szumu. Cztery zapisy atrybutów na klatkę, niezależnie od liczby fragmentów.

## Składanie filtra

JS przestaje pisać po `element.style.filter`. Ustawia zmienną `--vhs-filter`, a
CSS składa ją z własnymi funkcjami:

```css
.t-horror, .t-radio { filter: var(--vhs-filter, none); }
.t-wrong { filter: blur(calc(var(--dread) * var(--text-effects) * 0.9px)) var(--vhs-filter, ); }
```

To usuwa przyczynę, dla której `[wrong]` stracił wcześniej efekt: styl inline
nadpisywał regułę blur zamiast się z nią składać. Znacznik wraca do rejestru
z polem `effect`.

## Ulga pod wskaźnikiem

Bliskość liczona jak dotąd — odległość od prostokąta elementu, promień 220 px —
ale wynik odejmuje amplitudę zamiast ją dodawać.

Mysz daje ulgę trwałą, dopóki wskaźnik jest nad dziennikiem; `pointerleave`
ją kasuje. Dotyk daje ulgę czasową: `pointerdown` o `pointerType === "touch"`
otwiera okno 2500 ms, w którym waga bliskości maleje liniowo do zera. Rozróżnia
je `event.pointerType`.

## Cykl życia pętli

Poprzednia wersja świadomie nie wznawiała pętli `rAF`, ponieważ bez generatora
zmiany w czasie kolejne klatki byłyby identyczne. Teraz taki generator istnieje,
więc pętla **musi** się podtrzymywać — ale tylko wtedy, gdy jest co animować:
jakikolwiek element z efektem w widoku, amplituda powyżej progu, brak
`prefers-reduced-motion`. Gdy warunek przestaje być spełniony, pętla gaśnie i
budzi się ponownie ze zdarzenia wskaźnika, obserwatora widoczności albo zmiany
ustawień.

Ta zmiana odwraca wcześniejszą decyzję i wymaga komentarza w kodzie
wyjaśniającego dlaczego, żeby nikt nie „naprawił" jej z powrotem.

## Poza zakresem

- Dźwięk reagujący na poziom zakłóceń.
- Zakłócenia poza znacznikami `[horror]`, `[radio]`, `[wrong]`.
- Zmiany w `src/engine/`.
- Zmiana sposobu liczenia `--dread` z Poczytalności — `dread.js` zostaje.
