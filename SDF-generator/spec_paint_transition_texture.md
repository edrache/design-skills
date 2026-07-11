# Specyfikacja: Generowanie tekstury przejścia z klipu wideo (efekt rozlewającej się farby)

## Cel

Stworzenie narzędzia (skrypt Python + instrukcja CLI) które na wejściu przyjmuje klip wideo przedstawiający rozlewającą się farbę/tusz i produkuje plik PNG gotowy do użycia jako `Transition Texture` w komponencie **UIEffect** (biblioteka Coffee UIEffects dla Unity).

Wynikowa tekstura koduje w **kanale alpha** kolejność pojawiania się farby: piksel zamalowany jako pierwszy ma alpha bliskie `1.0`, piksel zamalowany jako ostatni — bliskie `0.0`. Piksele nigdy niepomalowane mają alpha `0.0`.

---

## Jak UIEffect używa tej tekstury

Komponent `UIEffect` z `TransitionFilter = Cutoff` lub `Dissolve` pobiera kanał **alpha** z `Transition Tex` i porównuje go z parametrem `Transition Rate` (0–1):

- piksel jest widoczny gdy `alpha > transitionRate`
- animując `transitionRate` od `1.0 → 0.0` UI element pojawia się w takiej kolejności jak farba w wideo
- `transitionReverse = true` odwraca kierunek (znikanie zamiast pojawiania)

Tekstura musi zatem:
- być w formacie RGBA PNG
- przechowywać dane przejścia w kanale **alpha** (RGB może być dowolne, np. `(0,0,0)`)
- **nie** używać sRGB (liniowa przestrzeń kolorów)

---

## Wymagania wejściowe

| Parametr | Opis |
|---|---|
| Plik wideo | MP4, MOV lub inne ffmpeg-compatible |
| Tło | Ciemne (czarne lub bliskie czerni) |
| Farba/tusz | Jasna (biała lub jasna barwa) |
| Kontrast | Wystarczający do progowania binarnego |
| Rozdzielczość | Dowolna — skrypt przeskaluje do docelowej |
| FPS | Dowolne — wszystkie klatki są przetwarzane |

Jeśli wideo jest kolorowe, skrypt automatycznie konwertuje do grayscale przed przetwarzaniem.

---

## Wymagania narzędziowe

- Python 3.9+
- `ffmpeg` (w PATH)
- Biblioteki Python: `numpy`, `Pillow`, `scipy`

Instalacja:
```bash
pip install numpy pillow scipy
brew install ffmpeg   # macOS
```

---

## Algorytm

### Krok 1 — Ekstrakcja klatek
ffmpeg wyodrębnia wszystkie klatki wideo do katalogu tymczasowego jako PNG w grayscale.

### Krok 2 — Time map
Dla każdego piksela `(x, y)` znajdź **pierwszy numer klatki** `F`, w którym wartość piksela przekroczyła próg binarny (domyślnie `128`).

```
time_map[x, y] = F / (total_frames - 1)   → zakres 0.0 .. 1.0
```

Piksele, które nigdy nie przekroczyły progu, dostają wartość `0.0`.

### Krok 3 — Opcjonalne rozmycie
Opcjonalne Gaussian blur (promień konfigurowalny) na time_map wygładza artefakty z progowania i daje miększy gradient na krawędziach.

### Krok 4 — Zapis do kanału alpha
Wynikowy PNG: RGB = `(0, 0, 0)`, Alpha = time_map znormalizowana do `0–255`.

---

## Interfejs skryptu

```
python paint_to_transition.py \
  --input   <ścieżka do wideo>     \
  --output  <ścieżka do PNG>       \
  --size    512                    \  # rozmiar wynikowej tekstury (kwadrat)
  --threshold 128                  \  # próg binarny (0–255)
  --blur    0                      \  # promień Gaussian blur (0 = wyłączony)
  --invert                            # opcjonalnie: odwraca alpha (0→1, 1→0)
```

### Przykład użycia
```bash
python paint_to_transition.py \
  --input paint_spread.mp4 \
  --output transition_mask.png \
  --size 512 \
  --threshold 100 \
  --blur 2
```

---

## Wymagania dotyczące wyjścia

- Format: PNG, RGBA
- Rozmiar: zgodny z parametrem `--size` (kwadrat, potęga 2: 256, 512, 1024)
- Kanał alpha: `0` = piksel niepomalowany lub zamalowany jako ostatni, `255` = zamalowany jako pierwszy
- Kanały RGB: `(0, 0, 0)` — bez znaczenia dla UIEffect, ale czyste
- Przestrzeń kolorów: liniowa (nie sRGB)

---

## Ustawienia importu w Unity

Po wrzuceniu PNG do projektu:

| Ustawienie | Wartość |
|---|---|
| Texture Type | Default |
| sRGB (Color Texture) | **wyłączone** |
| Alpha Source | Input Texture Alpha |
| Alpha Is Transparency | **wyłączone** |
| Compression | None lub jakościowa bez dithering |

---

## Użycie w UIEffect (Unity)

```csharp
var effect = GetComponent<UIEffect>();
effect.transitionFilter   = TransitionFilter.Cutoff; // lub Dissolve
effect.transitionTexture  = transitionTexturePNG;
effect.transitionRate     = 1f; // start: nic niewidoczne

// Animacja pojawiania się (DOTween):
DOTween.To(() => effect.transitionRate,
           x  => effect.transitionRate = x,
           0f, duration);
```

---

## Dodatkowe uwagi

- Skrypt powinien informować o postępie (klatka X / Y) — przetwarzanie długich klipów może trwać kilka sekund
- Klatki tymczasowe powinny być czyszczone po zakończeniu (katalog temp)
- Jeśli `--blur > 0`, rozmycie aplikuj **po** obliczeniu time_map, nie na klatkach — inaczej próg binarny traci precyzję
- Przy `--invert`: piksele zamalowane jako pierwsze dostają alpha `0`, ostatnie `1` — efekt: farba znika zamiast się pojawia (alternatywa do `transitionReverse` w Unity)
