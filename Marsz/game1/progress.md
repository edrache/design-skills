Original prompt: przygotuj grę wg tej specyfikacji. Jeśli karta nie ma grafiki to użyj tempowej [temp-image.png](Marsz/images/temp-image.png) . Całość wrzuć do folderu [game1](Marsz/game1/)

- 2026-06-06: Utworzono samodzielną grę webową w `Marsz/game1/` z lokalną kopią placeholdera w `assets/temp-image.png`.
- 2026-06-06: Dodano 25 kart, zasoby `sanity` i `engagement`, ekran startu i game over oraz sterowanie swipe / klawiatura.
- 2026-06-06: Dodano `window.render_game_to_text` i `window.advanceTime(ms)` pod testy automatyczne.
- 2026-06-06: Sprawdzono `node --check Marsz/game1/app.js` oraz serwowanie `index.html` i `assets/temp-image.png` po lokalnym HTTP.
- 2026-06-06: Poprawiono transform hintow decyzji na mobile oraz bezpieczne zwalnianie pointer capture.
- 2026-06-06: Przeniesiono opisy decyzji nad karte, skompresowano HUD do jednej linii i dodano intro bohatera z `assets/hero.png`.
- 2026-06-06: Wydzielono talie do osobnego pliku `cards-data.js`, zeby dalo sie latwo podmieniac opisy bez zmian w logice gry.
- 2026-06-06: Proba smoke testu Playwrightem byla zablokowana przez sandbox Chromium; do pelnej kontroli wizualnej potrzebne jest uruchomienie browser testu poza tym ograniczeniem.
- TODO: Gdy bedzie zgoda na uruchomienie browsera poza sandboxem, wykonac pelny test start -> kilka decyzji -> game over i obejrzec screenshoty mobilne.
