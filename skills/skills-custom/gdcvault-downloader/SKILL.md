---
name: gdcvault-downloader
description: Use when the user wants to download a video or audio from GDC Vault (gdcvault.com). Handles single and batch URLs, MP4 and MP3 output.
---

# Skill: gdcvault-downloader

Pobierz wideo z GDC Vault jako MP4 lub MP3 za pomocą skryptu `execution/gdcvault_download.py`.

## Trigger

Użyj tego skilla gdy użytkownik chce:
- Pobrać film/prezentację z GDC Vault (`gdcvault.com/play/...`)
- Zapisać dźwięk z GDC Vault jako MP3
- Pobrać kilka filmów GDC Vault naraz

## Jak użyć

Zawsze aktywuj venv:
```bash
source .venv/bin/activate
```

---

## Quick reference

### Pobierz jako MP4 (domyślnie 720p)
```bash
python3 execution/gdcvault_download.py <URL>
```

### Pobierz jako MP4 z wyborem jakości
```bash
python3 execution/gdcvault_download.py <URL> --quality 480|720|1080|best
```

### Pobierz jako MP3
```bash
python3 execution/gdcvault_download.py <URL> --mp3
```

### Podaj katalog docelowy
```bash
python3 execution/gdcvault_download.py <URL> --output ~/Downloads/GDC
```

### Batch (wiele URL naraz)
```bash
python3 execution/gdcvault_download.py <URL1> <URL2> <URL3> --mp3 --output ./Downloads
```

---

## Parametry

| Parametr | Wartości | Domyślnie | Opis |
|---|---|---|---|
| `--quality` | `480`, `720`, `1080`, `best` | `720` | Jakość wideo MP4 |
| `--mp3` | flaga | wyłączone | Zamiast MP4 zapisz jako MP3 |
| `--output` | ścieżka | `.` (bieżący katalog) | Katalog docelowy |

---

## Ważne

- Tryb `--mp3` pobiera najpierw plik 480p, wycina audio przez ffmpeg, usuwa wideo. Wymaga `ffmpeg`.
- Skrypt wymaga `yt-dlp`. Jeśli brak: `pip install yt-dlp`.
- Działa tylko z filmami dostępnymi bez logowania (GDC Free Vault).
- Filmy wymagające konta GDC zwrócą błąd: *"Nie znaleziono embedu blazestreaming"*.
- Plik wyjściowy jest nazwany tytułem strony GDC Vault.

## Jak działa

1. Pobiera HTML strony GDC Vault
2. Wyciąga ID z iFrame `gdcvault.blazestreaming.com/?id=VIDEO_ID`
3. Pobiera `script_VOD.js` żeby uzyskać wzorzec URL CDN
4. Konstruuje URL HLS `.m3u8` i pobiera przez `yt-dlp`
