Original prompt: przygotuj grę wg tej specyfikacji. Jeśli karta nie ma grafiki to użyj tempowej [temp-image.png](Marsz/images/temp-image.png) . Całość wrzuć do folderu [game1](Marsz/game1/)

- 2026-06-06: Utworzono samodzielną grę webową w `Marsz/game1/` z lokalną kopią placeholdera w `assets/temp-image.png`.
- 2026-06-06: Dodano 25 kart, zasoby `sanity` i `engagement`, ekran startu i game over oraz sterowanie swipe / klawiatura.
- 2026-06-06: Dodano `window.render_game_to_text` i `window.advanceTime(ms)` pod testy automatyczne.
- 2026-06-06: Sprawdzono `node --check Marsz/game1/app.js` oraz serwowanie `index.html` i `assets/temp-image.png` po lokalnym HTTP.
- 2026-06-06: Poprawiono transform hintow decyzji na mobile oraz bezpieczne zwalnianie pointer capture.
- 2026-06-06: Przeniesiono opisy decyzji nad karte, skompresowano HUD do jednej linii i dodano intro bohatera z `assets/hero.png`.
- 2026-06-06: Wydzielono talie do osobnego pliku `cards-data.js`, zeby dalo sie latwo podmieniac opisy bez zmian w logice gry.
- 2026-06-06: Proba smoke testu Playwrightem byla zablokowana przez sandbox Chromium; do pelnej kontroli wizualnej potrzebne jest uruchomienie browser testu poza tym ograniczeniem.
- 2026-06-06: Dodano system mini-kart oparty o 3 agenty konsekwencji (`mini-card-agents.js`): Agent Impulsu, Agent Stolu i Agent Nastepstw.
- 2026-06-06: Kazda z 23 kart glownych dostala komplet 6 odgalezien mini-kart (`mini-cards-data.js`), po 3 dla wyboru lewego i 3 dla prawego, z odziedziczona grafika karty glownej.
- 2026-06-06: Zmieniono logike `app.js`, zeby po wyborze na karcie glownej uruchamiala sie sekwencja 3 mini-kart, a po niej dopiero kolejna karta glowna.
- 2026-06-06: Dodano meta-UI dla mini-kart: etap `Mini 1/3`, agent prowadzacy i oznaczenie, czy konsekwencje wynikaja z wyboru lewego czy prawego.
- 2026-06-06: Rozdzielono liczniki na glowne karty i wszystkie decyzje oraz dodano obsluge zamykania feedbacku klawiszem `Enter`.
- 2026-06-06: Przeszedl smoke test lokalny po HTTP + Playwright poza sandboxem; potwierdzono wejscie z karty glownej do pierwszej mini-karty z poprawna grafika i stanem gry.
- TODO: Warto jeszcze zrobic dluzszy przebieg mobilny `main -> 3 mini -> kolejna main -> game over`, zwlaszcza pod katem swipe + przypadkowego zamykania feedbacku po tapie.
