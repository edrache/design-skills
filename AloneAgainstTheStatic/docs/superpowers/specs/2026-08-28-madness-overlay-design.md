# Warstwa szaleństwa na grafice paragrafu

Data: 2026-08-28

## Cel

W paragrafach ataku szaleństwa (328–333) kadr lokacji ma się rozpaść: obraz
rwie się szumem, a spod spodu pulsuje `media/img/madness.webp` — ciemna klatka
pełna oczu. Gracz ma poczuć dyskomfort dokładnie wtedy, kiedy postać go czuje.
Poza tymi paragrafami efekt istnieje w formie szczątkowej i budzi się dopiero
przy niskiej Poczytalności, więc końcówka gry brudzi się stopniowo, a nie
skokowo.

## Zakres

1. Paragrafy 328–333: pełny efekt — zniekształcenie kadru i pulsujące
   przenikanie z `madness.webp`.
2. Pozostałe paragrafy: ten sam efekt w słabszej skali, sterowany `--dread`
   (czyli spadkiem Poczytalności i liczbą oszustw — patrz `src/ui/dread.js`),
   z progiem odcięcia, żeby gra przy pełnej Poczytalności wyglądała czysto.
3. Pulsowanie: nieregularne zrywy, nie stałe krycie i nie jednorazowy błysk.
4. Ustępstwa: suwak „Efekty tekstu” skaluje efekt, `prefers-reduced-motion`
   gasi ruch.

Poza zakresem: zmiany w `media.json`, nowe grafiki, dźwięk, efekty na tekście.

## Struktura DOM — `src/ui/journal.js`

`createEntryBlock` przestaje wstawiać gołe `<img>`, a zamiast tego składa
dwuwarstwową figurę:

```html
<figure class="entry-art" data-madness="entry">
  <img class="entry-image" src="…/locations/09.webp" alt="" loading="lazy" decoding="async">
  <img class="entry-madness" src="…/madness.webp" alt="" aria-hidden="true" loading="lazy" decoding="async">
</figure>
```

- `dataset.image` zostaje **na bloku** `.journal-entry`, tak jak dziś —
  dziedziczenie kadru przez paragrafy `inherit` (328–333) działa bez zmian,
  a `lastEntryImage()` nie wymaga poprawki.
- `.entry-image` zachowuje klasę, `src`, `alt=""` i obsługę `error`
  (usunięcie węzła). Przy błędzie ładowania kadru usuwana jest **cała
  figura**, nie sam obraz — inaczej zostałaby sama warstwa szaleństwa.
- Warstwa `.entry-madness` powstaje zawsze, niezależnie od paragrafu i
  poziomu `--dread`. Powód: poziom zmienia się w trakcie rozgrywki, a bloki
  już wyrenderowane zostają w dzienniku. Jeden URL dla całej gry, więc
  przeglądarka pobiera go raz. Błąd ładowania warstwy usuwa tylko ją.
- `data-madness` na figurze przyjmuje `"entry"` dla paragrafów 328–333 i
  `"drift"` dla pozostałych. Atrybut jest zarazem selektorem dla
  `effects.js` (analogicznie do dzisiejszego `[data-effect]`).

## Poziomy — nowy moduł `src/ui/madness.js`

Same czyste funkcje, bez DOM — wzorowane na `src/ui/effects.js`, testowalne
pod Node.

```js
export const MADNESS_ENTRIES = Object.freeze([328, 329, 330, 331, 332, 333]);

export const DRIFT_FLOOR = 0.55;   // poniżej tego --dread nie robi nic
export const DRIFT_MAX = 0.4;      // maksimum dla zwykłego paragrafu
export const ENTRY_BASE = 1;       // paragrafy szaleństwa

export function madnessBase({ entryId, dread })     // → 0…1
export function pulseAt(timeMs, base)               // → { blend, warp }
```

- `madnessBase` zwraca `ENTRY_BASE` dla identyfikatora z `MADNESS_ENTRIES`.
  Dla pozostałych: `0` przy `dread <= DRIFT_FLOOR`, dalej liniowo do
  `DRIFT_MAX` przy `dread = 1`. Wejścia spoza zakresu (`NaN`, `null`,
  identyfikator jako łańcuch) nie wywracają funkcji — łańcuch jest
  normalizowany przez `Number`, reszta daje `0`.
- `pulseAt` zwraca dwie liczby:
  - `blend` — krycie warstwy szaleństwa, `0…1`,
  - `warp` — siła zniekształcenia kadru, `0…1`.

  Obie składają się z **podkładu** (`base * 0.28` dla `blend`,
  `base * 0.2` dla `warp`) i **zrywu**. Podkład jest po to, żeby przy
  `base = 1` obraz nigdy nie wracał do czystości — dyskomfort ma trwać
  między pulsami.
- Zryw: deterministyczny `slotNoise(slot)` (ten sam wzór co w `effects.js`:
  `sin(slot * 12.9898) * 43758.5453`, część ułamkowa) na slotach
  `PULSE_SLOT_MS = 1600`. Slot odpala puls, gdy `slotNoise(slot) < 0.15 + 0.5 * base`
  — czyli przy pełnym poziomie mniej więcej dwa na trzy sloty. Obwiednia:
  `sin(π * into / PULSE_LENGTH_MS)` przy `PULSE_LENGTH_MS = 700`.
  Determinizm jest celowy: pozwala przetestować rozkład pulsów bez
  podstawiania generatora losowego, dokładnie jak `burstAt`.
- Czas ujemny lub nieliczbowy daje sam podkład, bez zrywu.

## Zniekształcenie — filtr `#madness-warp`

Nowy filtr w `index.html`, obok `#vhs-static-*`:

```html
<filter id="madness-warp" x="-6%" y="-6%" width="112%" height="112%" color-interpolation-filters="sRGB">
  <feTurbulence type="fractalNoise" baseFrequency="0.004 0.09" numOctaves="2" seed="23" result="bands" />
  <feDisplacementMap in="SourceGraphic" in2="bands" scale="0" xChannelSelector="R" yChannelSelector="G" result="torn" />
  <feTurbulence type="fractalNoise" baseFrequency="0.7 0.5" numOctaves="1" seed="31" result="grain" />
  <feDisplacementMap in="torn" in2="grain" scale="0" xChannelSelector="R" yChannelSelector="A" />
</filter>
```

Dwa stopnie: pierwszy `feDisplacementMap` (niska częstotliwość w X, wysoka
w Y) rwie obraz w poziome pasma trackingu, drugi dokłada drobne ziarno.
Atrybuty `scale` obu i `seed`/`baseFrequency` turbulencji przepisuje pętla
rAF — w pliku stoją zera, więc bez skryptu filtr jest neutralny.

Filtr działa na **całej figurze**, nie na samym kadrze. To jest sedno
efektu: obie warstwy najpierw zlewają się trybem `screen`, a dopiero złożenie
idzie przez zniekształcenie. Dzięki temu oczy nie leżą *na* kadrze, tylko
rwą się razem z nim. Dodatkowa korzyść: reguła `.entry-image { filter: none }`
zostaje nietknięta, więc `test/style.test.js` nie wymaga przepisania.

Jeden filtr, nie cztery kubełki jak przy `#vhs-static-*`. Kubełki istnieją
tam, bo filtr dzieli dziesiątki fragmentów tekstu naraz; tu na ekranie jest
zwykle jedna, najwyżej kilka figur, więc wspólne atrybuty wystarczą.

## Sterowanie — `src/ui/effects.js`

Rozszerzenie istniejącej pętli, **bez drugiego `requestAnimationFrame`**.

- `observe(block)` zbiera dodatkowo `block.querySelectorAll("[data-madness]")`
  do osobnego zbioru `madnessObserved`, podpiętego pod ten sam
  `IntersectionObserver` (osobny zbiór `madnessActive`).
- W `tick()`, po pętli po `active`, drugi przebieg po `madnessActive`:

  ```js
  const entryId = Number(element.closest(".journal-entry")?.dataset.entryId);
  const base = madnessBase({ entryId, dread }) * textEffectsScale;
  const { blend, warp } = reducedMotion
    ? { blend: base * 0.5, warp: 0 }
    : pulseAt(time, base);
  ```

  `dread` i `textEffectsScale` są już liczone w `tick()` — bez dodatkowych
  odczytów CSS.
- Zapis: `--madness-blend` (liczba `0…1`) i `--madness-filter`
  (`url(#madness-warp)` albo usunięcie własności). Poniżej progu
  `MADNESS_EPSILON = 0.01` obie własności są zdejmowane, tak jak `--vhs-filter`.
- `warp > 0` na dowolnym celu podtrzymuje pętlę (`anyVisible = true`), tak jak
  amplituda tekstu — inaczej pulsowanie zamarłoby po pierwszej klatce.
- Atrybuty filtra ustawiane raz na klatkę, z maksimum `warp` po widocznych
  celach: `scale` pasm `= 26 * warp`, `scale` ziarna `= 5 * warp`, `seed`
  z istniejącego `crawlAt(time, dread)`.
- `unobserveAll()` czyści również `--madness-blend` i `--madness-filter`
  z celów szaleństwa i opróżnia oba nowe zbiory.
- Brak filtra w dokumencie (środowisko testowe) nie wywraca modułu — jak dziś,
  referencje zostają `null`.

## Style — `style.css`

```css
.entry-art {
  position: relative;
  margin: 0 0 1.8rem;
  isolation: isolate;
  filter: var(--madness-filter, none);
}

.entry-madness {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  mix-blend-mode: screen;
  opacity: var(--madness-blend, 0);
  pointer-events: none;
}
```

`.entry-image` traci własny `margin` (przechodzi na figurę), reszta reguły
zostaje bez zmian — łącznie z `filter: none`, którego pilnuje test.

Pod `@media (prefers-reduced-motion: reduce)` figura ma wymuszone
`filter: none`. Krycie warstwy zostaje, bo samo w sobie się nie rusza; gasi je
już `effects.js`, zmniejszając `blend` o połowę.

## Testy

- **`test/madness.test.js`** (nowy): `madnessBase` dla paragrafu szaleństwa,
  dla paragrafu poniżej i powyżej progu, dla wejść śmieciowych; `pulseAt` —
  podkład bez zrywu, obecność zrywu w znanym slocie, monotoniczność względem
  `base`, zakres `0…1`, zachowanie przy `base = 0` (obie liczby zerowe).
- **`test/ui.test.js`**: `createEntryBlock` buduje `figure.entry-art` z dwiema
  warstwami; `data-madness` ma wartość `"entry"` dla 330 i `"drift"` dla 31;
  `dataset.image` nadal siedzi na bloku; brak grafiki w `media.json` nadal
  nie tworzy figury.
- **`test/style.test.js`**: `.entry-art` składa `var(--madness-filter…)`,
  `.entry-madness` używa `mix-blend-mode: screen` i `var(--madness-blend…)`,
  reguła `prefers-reduced-motion` zeruje filtr figury. Istniejący test
  `.entry-image` zostaje bez zmian i musi przechodzić.
- **`test/effects.test.js`**: pętla ustawia zmienne na celu `[data-madness]`
  i zdejmuje je poniżej progu, a `unobserveAll()` czyści je z odpiętych węzłów.

## Ryzyka

- **Wydajność.** `filter` SVG na obrazie 4:3 w każdej klatce jest droższy niż
  na fragmencie tekstu. Ograniczeniem jest `IntersectionObserver`: figury poza
  widokiem wypadają z pętli. Jeśli mimo to spadną klatki, pierwszym cięciem
  jest rezygnacja z drugiego `feDisplacementMap` (ziarna).
- **`mix-blend-mode` wewnątrz elementu z `filter`.** `filter` tworzy kontekst
  składania, więc `screen` zadziała w obrębie figury i nie przecieknie na tło
  strony. Wymaga sprawdzenia w przeglądarce, nie tylko w testach jednostkowych.
- **Dyskomfort ponad miarę.** Podkład `0.28` przy `base = 1` może okazać się
  za mocny w czytaniu. To jedna stała w `madness.js` — strojenie po obejrzeniu.
