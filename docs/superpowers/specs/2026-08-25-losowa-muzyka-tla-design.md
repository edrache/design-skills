# Losowa muzyka w tle — Alone Against the Static

Data: 2026-08-25

## Cel

Gracz wrzuca pliki mp3 do `AloneAgainstTheStatic/media/music/`, a gra odtwarza je
w losowej kolejności, płynnie przenikając między utworami. Bez konfigurowania
czegokolwiek w JSON-ie i bez nowych elementów interfejsu.

## Zakres

Jedna globalna playlista. Istniejący, nieużywany mechanizm „scen” (`playScene`,
`media.json → scenes`) zostaje usunięty z kodu wykonywanego. Pole `scene`
w `data/story.json` pozostaje nietknięte jako dane.

## Architektura

### `tools/build-music.mjs` + `data/music.json`

Przeglądarka nie potrafi wylistować katalogu, więc spis utworów powstaje
offline. Skrypt skanuje `media/music/`, bierze pliki `.mp3` (bez ukrytych,
bez `.gitkeep`), sortuje alfabetycznie dla stabilnego diffa i zapisuje:

```json
{ "tracks": ["media/music/01-drive.mp3", "media/music/02-cabin.mp3"] }
```

Skrypt eksportuje czystą funkcję `collectTracks(dir)` (testowalną) obok
uruchomienia jako CLI.

Skrypty npm:

- `npm run music` — regeneracja na żądanie,
- `npm test` — regeneruje spis przed uruchomieniem testów, żeby nie zdążył się
  zdezaktualizować. Regeneracja siedzi wprost w komendzie `test`, a nie w haku
  `pretest`: npm z `ignore-scripts=true` (tak jest skonfigurowany ten host)
  pominąłby hak.

### `src/ui/playlist.js`

Czysta logika bez DOM-u: `createPlaylist(tracks, random = Math.random)`.

- `next()` zwraca kolejny utwór z potasowanej rundy,
- po wyczerpaniu rundy tasuje pulę ponownie (Fisher–Yates),
- pierwszy utwór nowej rundy nigdy nie równa się ostatniemu utworowi
  poprzedniej (przy puli > 1),
- pusta pula → `next()` zwraca `null`,
- pula jednoelementowa → ten sam utwór w kółko (powtórka jest tu jedyną
  możliwością).

RNG jest wstrzykiwany, więc testy są deterministyczne.

### `src/ui/audio.js`

`playScene()` i odczyt `media.scenes` znikają. Nowe API:

- `startMusic(tracks)` — buduje playlistę i próbuje ruszyć,
- `stopMusic()`,
- `stopAll()` (istnieje) obejmuje też muzykę.

Zasady odtwarzania:

- Każdy węzeł muzyczny ma własny **gain 0–1** opisujący postęp przenikania.
  Realna głośność to `gain × settings.values.musicVolume`. Dzięki temu
  poruszenie suwaka w trakcie przenikania skaluje obie ścieżki, zamiast
  przerywać fade (dzisiejszy kod ubija timery przy zmianie głośności).
- Crossfade trwa 6 s. Gdy do końca bieżącego utworu zostaje ≤ 6 s, startuje
  następny: nowy narasta od 0, stary opada do 0 i jest pauzowany.
- Zdarzenie `ended` jest zabezpieczeniem: gdyby `duration` był nieznany,
  przełączenie i tak nastąpi (bez przenikania).
- `musicVolume = 0` → muzyka jest pauzowana; podniesienie suwaka ją wznawia.

Narracja (`playNarration`) działa jak dotąd, z własnym, krótszym fade'em.

### Autoplay

Start próbowany od razu przy starcie gry (ekran ładowania). Gdy `play()`
zostanie odrzucone przez politykę autoplay, rejestrowany jest jednorazowy
nasłuch `pointerdown` i `keydown` na dokumencie; przy pierwszej interakcji
gracza (w praktyce wybór postaci) muzyka wchodzi fade-inem.

### `src/ui/main.js`

Ładuje `music.json` obok pozostałych danych (brak pliku → pusta lista,
nie przerywa startu), wywołuje `audio.startMusic(tracks)` po utworzeniu
audio i usuwa wywołanie `playScene`.

## Obsługa błędów

Muzyka jest opcjonalna — każda awaria kończy się ciszą, nigdy wyjątkiem:
brak `music.json`, pusta lista, brak `globalThis.Audio`, odrzucone lub
rzucające `play()`, nieudane tworzenie węzła.

## Testy

- `test/playlist.test.js` — tasowanie, brak powtórki na styku rund, pula
  jedno- i zeroelementowa, deterministyczny RNG.
- `test/audio.test.js` — przepisany: crossfade przy zbliżaniu się do końca,
  master volume w trakcie fade'u, `ended` jako zabezpieczenie, retry po
  interakcji, `stopAll`.
- `test/build-music.test.js` — `collectTracks` filtruje rozszerzenia i sortuje.
