# AGENTS.md

## Flametown Prototype

Ten katalog zawiera grywalny prototyp gry Flametown w czystym HTML/JS/canvas bez bundlera.

## Zasady pracy

- Zanim zaczniesz zmiany, przeczytaj `PROJECT_CONTEXT_FOR_AGENTS.md`.
- Po kazdej istotnej zmianie zaktualizuj:
  - `PROJECT_CONTEXT_FOR_AGENTS.md`
  - `progress.md`
  - changelog i numer wersji
- Przy kazdej zmianie zwieksz wersje w obu miejscach:
  - `package.json`
  - `config.js` jako `APP_VERSION`
- Jezeli dotykasz frontendu, zaktualizuj tez query string wersji przy `src/main.js` w `index.html`.
- Zaktualizuj tez `data-version` na elemencie `#version-badge` w `index.html`.
- Przy modulach, ktore czesto sie zmieniaja i blokuja start gry, preferuj importy odporne na cache mismatch albo aktualizuj ich query stringi razem z `main.js`.
- Utrzymuj widoczny numer wersji w prawym dolnym rogu gry.
- Jezeli zmiana dotyczy assetow, zaktualizuj tez odpowiedni status assetow i opis w dokumentacji.
- Jezeli dodajesz nowa mechanike, dopisz debug hook albo test tam, gdzie to ma sens.
- Przy kazdej zmianie mechaniki zaktualizuj tez tekstowy tutorial w grze i popup z pelnymi zasadami, tak aby opisy odpowiadaly aktualnej wersji mechanik.
- Jezeli stary opis mechaniki przestal byc prawdziwy, usun go albo przepisz, zamiast tylko dopisywac nowy tekst obok starego.

## Szybkie uruchomienie

```bash
cd /Users/marek/OfflineDocuments/Repo/Antigravity/Design/Flametown/prototype
python3 -m http.server 8091
```

Otworz:

- [http://127.0.0.1:8091/index.html](http://127.0.0.1:8091/index.html)

## Szybka checklista przed zakonczeniem pracy

- wersja podbita
- changelog dopisany
- `PROJECT_CONTEXT_FOR_AGENTS.md` zaktualizowany
- `progress.md` zaktualizowany
- testy lub przynajmniej check skladni odpalone dla zmienionych plikow
