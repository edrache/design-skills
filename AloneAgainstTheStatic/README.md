# Alone Against the Static — wersja przeglądarkowa

Solowa przygoda *Call of Cthulhu* 7e (Chaosium) w przeglądarce.
Projekt prywatny; treść scenariusza pozostaje własnością Chaosium.

Bez zależności i bez kroku budowania: czysty ES-moduł, `fetch` na plikach JSON,
testy na wbudowanym `node --test`.

## Uruchomienie

Z katalogu głównego repozytorium:

```bash
python3 -m http.server 8080
```

- Gra: <http://127.0.0.1:8080/AloneAgainstTheStatic/>
- Narzędzie autorskie: <http://127.0.0.1:8080/AloneAgainstTheStatic/tools/dev.html>

Moduły ES wymagają serwera HTTP — otwarcie `index.html` przez `file://` nie zadziała.

## Testy i walidacja

```bash
cd AloneAgainstTheStatic
npm test
npm run validate
```

Walidator rozdziela **błędy** (niespójny graf, brakujące klucze, martwe przejścia)
od **ostrzeżeń** (przejścia poza wyekstrahowany zakres, flagi zapalane bez odczytu).
Błędów ma być zero; ostrzeżenia są normalne, dopóki scenariusz nie jest przepisany do końca.

## Dane

| Plik | Zawartość |
|---|---|
| `data/story.json` | mechanika paragrafów, przejścia, klucze tekstów |
| `data/text.en.json` | teksty angielskie |
| `data/text.pl.json` | teksty polskie; klucze `__en.*` to podgląd oryginału |
| `data/characters.json` | karty Alex i Charlie (pola `en`/`pl`) |
| `data/media.json` | grafiki, lektor, muzyka scen |

Pole `extracted` w `story.json` mówi, które paragrafy są już przepisane.
Przejścia poza ten zakres to w grze zaślepka, a w walidatorze ostrzeżenie.

## Tłumaczenie

```bash
node tools/make-translation.mjs
```

Skrypt generuje `data/text.pl.json` z kompletem kluczy w kolejności paragrafów.
Uzupełniasz puste wartości; klucz `__en.<klucz>` tuż nad każdym wpisem zawiera
oryginał, więc nie musisz otwierać drugiego pliku. Ponowne uruchomienie skryptu
nie kasuje tego, co już przetłumaczone, i zgłasza klucze bez paragrafu.

Pusty string zachowuje się jak brak tłumaczenia — `src/ui/i18n.js` spada wtedy
na angielski, więc niedokończona lokalizacja nigdy nie pokazuje pustego akapitu.

**Zasady i słownik: [`docs/tlumaczenie.md`](docs/tlumaczenie.md).** Zawiera
przypisanie płci bohaterom (Alex — kobieta, Charlie — mężczyzna), mapę
paragrafów na ścieżki postaci oraz terminologię mechaniczną według polskiego
Startera 7. edycji *Zewu Cthulhu* (Black Monk Games). Nazwy cech, umiejętności
i stanów w panelu postaci pochodzą z tego samego źródła — patrz `src/ui/sheet.js`.

## Media

Pliki wrzucasz do `media/narration/`, `media/music/`, `media/img/`
i wpisujesz ścieżki do `data/media.json`. Brakujący plik nie psuje gry:
grafika usuwa się sama, a dźwięk po prostu nie zagra.

## Narzędzie autorskie

`tools/dev.html` listuje paragrafy: scena, początek tekstu, postęp tłumaczenia,
mechanika, przejścia i podpięte media. Nie jest częścią gry.

## Deploy

```bash
./universal-deploy/deploy.sh --go alone-against-the-static
```

Bez `--go` skrypt działa w trybie próbnym.
