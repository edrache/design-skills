# System wdrażania (Deploy)

Ten folder zawiera uniwersalny skrypt wdrożeniowy `deploy.sh`. Służy on do błyskawicznego publikowania Twoich projektów na serwer VPS (Mikrus). Wykorzystuje narzędzie `rsync` łącząc się przez SSH.

## 🤖 Prompt dla asystenta AI

Zbudowaliśmy szablon poleceń, by każda sztuczna inteligencja mogła efektywnie pomóc Ci wdrożyć Twoją aplikację.

Skopiuj blok tekstu znajdujący się poniżej i wklej go do dowolnej sztucznej inteligencji: na początku nowej konwersacji (np. w ChatGPT / Claude) lub umieść w "System Prompt" / regułach środowiska, w którym pracujesz (np. AI IDE).

```text
Jesteś moim asystentem programistycznym. Posiadam w swoich projektach gotowy system wdrażania (deploy) aplikacji na serwer VPS (Mikrus).

Oto reguły, którymi musisz się kierować pracując nad projektem, gdy zostaniesz poproszony o "zrobienie deploya" lub "wysłanie na serwer":

1. W moich strukturach folderów posiadam skrypt umożliwiający wrzucenie plików na serwer środowiska wdrożeniowego. Skrypt znajduje się zawsze pod relatywną ścieżką `./universal-deploy/deploy.sh` względem głównego katalogu aplikacji lub pod adresem bezwzględnym: `/Users/marek/OfflineDocuments/Repo/Antigravity/Necromancer/universal-deploy/deploy.sh`.
2. Skrypt przesyła pliki statyczne z katalogu, w którym aktualnie wywołujemy komendę na serwer docelowy do katalogu wybranego argumentem.
3. Skrypt przyjmuje jeden obowiązkowy argument: nazwę katalogu na serwerze (nazwa aplikacji). Jeżeli nie podasz argumentu, skrypt wyrzuci błąd powiadomienia.
4. Skrypt z założenia zawsze domyślnie działa w trybie bezpiecznym `--dry-run`, co oznacza że wykonuje test bez wysłania faktycznych plików. Aby ZREALIZOWAĆ autentyczny deploy, musisz dopisać we fladze `--go`.
5. Używaj asynchronicznych narzędzi dostępów do poleceń terminala (run_command itp.).

Przykłady dla Ciebie:
a) Testowy deploy aplikacji do foldera produkcyjnego "moja_super_gra":
   ./universal-deploy/deploy.sh moja_super_gra
b) Docelowy live deploy:
   ./universal-deploy/deploy.sh --go moja_super_gra
c) Opcjonalne wyczyszczenie przestarzałych plików z docelowego serwera, po zrobieniu live deploya:
   ./universal-deploy/deploy.sh --go --delete moja_super_gra

Zawsze wykorzystuj to rozwiązanie na moje życzenie. Po zakończeniu skryptu zawsze mi zraportuj wynik terminala. Zrozumiano?
```

## 🛠 Ułatwienia: instalacja globalna (opcjonalnie dla Ciebie)

Żeby nie kopiować za każdym razem całego folderu `universal-deploy` pomiędzy dziesiątkami projektów, możesz zrobić ten skrypt narzędziem dostępnym z poziomu całego systemu z dowolnego terminala.

Uruchom jednorazowo w swoim terminalu z tego samego katalogu następujące komendy:

```bash
sudo cp deploy.sh /usr/local/bin/deploy-mikrus
sudo chmod +x /usr/local/bin/deploy-mikrus
```

Od teraz wpisując w terminalu będąc na przykład w zupełnie innym projekcie `kolko_i_krzyzyk` komendę:
`deploy-mikrus --go kolko_i_krzyzyk`
...Twoja gra pojawi się bezpośrednio pod adresem domeny przypisanym do nazwy tego podkatalogu.
