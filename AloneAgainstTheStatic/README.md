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

## Rozgrywka

Na ekranie widać wyłącznie bieżący paragraf. Tekst odsłania się akapit po
akapicie: klik w tło (albo Enter/Spacja) domyka wypisywany akapit, kolejny
odsłania następny. Gdy gra czeka na kliknięcie, na końcu odsłoniętego
fragmentu miga `▶`. Nieodsłonięta reszta akapitu jest w DOM od początku,
tylko ukryta (`visibility: hidden`) — dzięki temu słowa od pierwszej klatki
stoją na docelowych pozycjach i nie przeskakują przy zawijaniu wierszy. Po ostatnim akapicie pojawia się to, co należy — wybory,
przyciski decyzji po rzucie, albo strzałka `→` prowadząca do następnego
paragrafu. Rzut kośćmi wymaga świadomego kliknięcia w bramkę
`RZUĆ: <TEST> · <próg>`; wynik jest już wyliczony przez silnik, bramka jest
wyłącznie prezentacją. Wszystkie przeczytane paragrafy zostają w **Dzienniku**
w górnym pasku — tylko do odczytu, w kolejności czytania.

Gra zapisuje się sama po każdej ramce i wznawia zapis przy wejściu na stronę.
Wznowiona ramka pojawia się od razu w całości: gracz ją już przeczytał, a stan
odsłonięcia nie jest zapisywany.
Przycisk **Nowa gra** w górnym pasku porzuca zapis i wraca do wyboru postaci —
pyta o potwierdzenie, bo zapis jest tylko jeden. Przycisk pojawia się wyłącznie
w trakcie rozgrywki.

## Pamięć poznanych paragrafów

Gra pamięta — ponad pojedynczą rozgrywką — co gracz już widział. Pamięć siedzi
w osobnym wpisie `localStorage` (`aats-progress`), więc **Nowa gra** jej nie
kasuje; robi to dopiero **Wyczyść poznane paragrafy** w ustawieniach.

- Paragraf odwiedzony wcześniej: proza w alfie 70%, nagłówek „PARAGRAF *n*”
  w żółtej ramce.
- Opcja wyboru podjęta wcześniej: alfa 50%, nadal klikalna. To osobny stan od
  opcji `once` i zablokowanych guardem, które są wyszarzone i nieaktywne.
- Test rozgałęziający się na różne paragrafy: przy bramce `RZUĆ:` wypisane
  gałęzie, które gracz już przeszedł (`Już było: Sukces · Porażka`). Po rzucie
  ta sama informacja zostaje pod kośćmi.

Paragraf liczy się w chwili, gdy trafia na ekran, a nie po doczytaniu. Dziennik
pokazuje stan z chwili wejścia w paragraf, nie bieżący — flaga jedzie w rekordzie
archiwum. Silnik o tej pamięci nic nie wie: gałąź rzutu wylicza się w
`src/ui/progress.js` ze zdarzenia, które i tak renderuje dziennik.

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
| `data/media.json` | grafiki i lektor paragrafów |
| `data/music.json` | spis utworów tła (generowany, patrz „Media") |
| `data/reveal.json` | rytm odsłaniania tekstu (prędkość, pauzy, wejścia) |

`data/reveal.json` steruje tempem prezentacji: `charsPerSecond` (znaki na
sekundę), `punctuationPauseMs` (dodatkowa pauza po znaku — klucz to sam znak),
`choiceStaggerMs` (odstęp między pojawiającymi się wyborami) i `dieStaggerMs`
(odstęp między odsłanianymi kośćmi). Każde pole waliduje się osobno — literówka
w jednym nie psuje pozostałych, a brak pliku cofa grę do wartości domyślnych
z `src/ui/reveal.js`. `prefers-reduced-motion` wyłącza samo wypisywanie liter;
kliknięcia zostają, żeby ustawienie nie zmieniało rozgrywki.

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

## Znaczniki stylu tekstu

Fragmenty tekstu można oznaczać znacznikami `[tag]…[/tag]`, które nadają im
wygląd i efekty. Głosy: `[charlie]` `[alex]` `[mark]` `[julie]` `[tom]`
`[you]` `[voice]`. Tony: `[horror]` `[whisper]` `[shout]` `[thought]`
`[radio]` `[sign]` `[wrong]`. Opis narracyjny nie ma znacznika — jest domyślny.

Znaczniki zagnieżdżają się. `[[` to literalny nawias kwadratowy, a `]]` to
literalne domknięcie `]`.

Akapit będący w całości jedną kwestią dostaje układ scenariuszowy z kreską
i nazwą mówiącego; kwestia w środku opisu zostaje inline.

Nowy efekt dodajesz wpisem w `src/ui/voices.js` i regułą w `style.css`.
Nieznany znacznik jest ostrzeżeniem walidatora, a nie błędem — możesz go
wpisać, zanim powstanie implementacja.

```bash
npm run tag           # propozycje znaczników dialogów, bez zapisu
npm run tag -- --write
npm run tag -- --from 81 --write  # tylko paragrafy od 81 wzwyż
```

Narzędzie oznacza wyłącznie znaczniki głosów i tylko wtedy, gdy imię mówiącego
pada w tej samej atrybucji co kwestia. Kwestie bohatera (`[you]`) i postaci
nienazwanych (`[voice]`), a także wszystkie znaczniki tonu, autor dopisuje
sam — narzędzie ich nie zgaduje.

Natężenie efektów rośnie wraz ze spadkiem Poczytalności i jest sterowane
suwakiem **Efekty tekstu** w ustawieniach. `prefers-reduced-motion` wyłącza
ruch automatycznie.

### Edytor znaczników

Lokalny edytor pozwala przechodzić po numerach paragrafów, zaznaczać fragmenty
tekstu i nakładać znaczniki przyciskiem. Obok tekstu pokazuje podgląd z tego
samego renderera co gra oraz wzornik wszystkich dostępnych efektów.

```bash
npm run tag:editor
```

Następnie otwórz `http://127.0.0.1:4174/tools/tag-editor.html`. Edytor domyślnie
pracuje na `data/text.pl.json`; plik można przełączyć na angielski w prawym
górnym rogu. Zmiany zapisuje przycisk **Zapisz** albo skrót `Ctrl+S`/`Cmd+S`.
Przejście do innego paragrafu nie gubi niezapisanych zmian. Serwer odrzuca
niedomknięte znaczniki i nie nadpisze tekstu, jeśli plik został w międzyczasie
zmieniony przez inne narzędzie.

## Media

Grafiki i lektora wrzucasz do `media/img/` i `media/narration/`, a ścieżki
wpisujesz do `data/media.json`. Brakujący plik nie psuje gry: grafika usuwa się
sama, a dźwięk po prostu nie zagra.

Muzyka tła działa bez wpisywania czegokolwiek — wystarczy wrzucić pliki do
`media/music/` i uruchomić:

```bash
npm run music
```

Skrypt spisuje katalog do `data/music.json` (robi to też `npm test`, przez
`pretest`). Gra tasuje pulę, odtwarza każdy utwór raz na rundę i przenika
między nimi przez 6 sekund; po wyczerpaniu puli tasuje ją od nowa i nigdy nie
puszcza tego samego kawałka dwa razy pod rząd. Głośnością steruje suwak
**Głośność muzyki** w ustawieniach — zero pauzuje muzykę. Jeśli przeglądarka
zablokuje autoodtwarzanie, muzyka wchodzi przy pierwszym kliknięciu gracza.

Same pliki dźwiękowe są w `.gitignore`, więc do repozytorium trafia tylko spis.
Na maszynie bez tych plików gra po prostu milczy.

## Narzędzie autorskie

`tools/dev.html` listuje paragrafy: scena, początek tekstu, postęp tłumaczenia,
mechanika, przejścia i podpięte media. Nie jest częścią gry.

## Deploy

```bash
./universal-deploy/deploy.sh --go alone-against-the-static
```

Bez `--go` skrypt działa w trybie próbnym.
