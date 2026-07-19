# Flametown Prototype Design Doc

Stan na: 2026-07-19

Ten dokument opisuje aktualny design gry widoczny w prototypie `Flametown/prototype`. To nie jest docelowa wizja całego projektu, tylko zapis tego, co faktycznie działa, co jest czytelne dla gracza i jakie systemy już dziś wpływają na decyzje podczas gry.

## 1. High concept

Flametown jest prototypem lekkiego city buildera z logiką placementu opartą o tetromino. Gracz nie stawia pojedynczych budynków, tylko całe czteropolowe klocki, które doklejają nowe fragmenty miasta do istniejącej tkanki.

Rdzeń fantasy gry opiera się dziś na połączeniu:

- prostych, bardzo czytelnych decyzji przestrzennych
- organicznego, bajkowego wyglądu miasta fantasy
- lekkiej symulacji życia miasta poprzez mieszkańców, drogi i przepływ towarów
- miękkiej punktacji, która nagradza dobre układanie sklepów w klastry

To nie jest już tylko toy do dokładania kształtów. Prototyp w obecnej formie testuje, czy samo budowanie z tetromino może napędzać też prosty system ruchu mieszkańców i scoring oparty o układ dzielnic handlowych.

## 2. Fantasy i doświadczenie gracza

Aktualne doświadczenie gracza opiera się na kilku odczuciach naraz:

1. "Dostaję klocek i próbuję znaleźć dla niego dobre miejsce."
2. "Każdy kolejny ruch musi sensownie doczepić się do miasta, więc jego kształt ma znaczenie."
3. "Preview pokazuje mi nie tylko geometrię, ale też jakie typy pól wylądują na planszy."
4. "Miasto po chwili zaczyna żyć: pojawiają się mieszkańcy, sklepy tworzą specjalizacje, a licznik surowców rośnie sam z dobrze zaprojektowanej tkanki."

To przesuwa prototyp z czystej układanki przestrzennej w stronę spokojnego city-builder puzzle, gdzie placement, czytelność dzielnic i lekka ekonomia wizualna zaczynają działać razem.

## 3. Core loop

Obecna pętla rozgrywki wygląda tak:

1. Gra losuje nowe tetromino.
2. Jednocześnie planuje dla jego czterech pól konkretne typy zabudowy.
3. Preview pokazuje kształt i ikony planowanych pól.
4. Gracz podnosi klocek, obraca go i szuka miejsca na planszy.
5. Ghost piece pokazuje legalność placementu.
6. Gracz stawia klocek.
7. Na planszy pojawiają się budynki i drogi.
8. Jeśli w klocku był dom z dostępem do krawędzi ruchu, może pojawić się mieszkaniec.
9. Mieszkańcy poruszają się po mieście i naliczają punkty, gdy mijają sklepy.
10. Gra losuje kolejny klocek.

To nadal jest pętla szybka i bez przeciwnika, ale nie jest już całkowicie neutralna systemowo. Ułożenie dzielnic i sieci przejść zaczyna bezpośrednio wpływać na wynik.

## 4. Plansza i reguły placementu

Plansza jest duża i otwarta. Domyślny rozmiar siatki to `256x256`, a nową grę można zacząć z rozmiarem w zakresie `16-512`.

Najważniejsze reguły placementu:

- pierwszy klocek można postawić w dowolnym miejscu, jeśli mieści się na planszy
- każdy kolejny klocek musi stykać się krawędzią z istniejącym miastem
- kontakt tylko rogiem nie wystarcza
- nie wolno nachodzić na zajęte pola
- nie wolno wychodzić poza planszę

To daje model wzrostu miasta, który jest jednocześnie prosty i czytelny: swobodny start, potem zwarta ekspansja wymagająca myślenia o kształcie granicy miasta.

## 5. Tetromino i planowanie zawartości klocka

Gra korzysta z klasycznego zestawu siedmiu tetromino: `I`, `O`, `T`, `S`, `Z`, `J`, `L`.

Ważna zmiana względem wcześniejszego prototypu: zawartość budynków jest planowana już w momencie wygenerowania aktualnego klocka, a nie dopiero po postawieniu. Dzięki temu preview jest wiążące i gracz może podejmować decyzję placementową, wiedząc z góry, czy dany klocek niesie domy, park czy sklep.

Aktualne zasady planowania pól:

- każdy klocek ma dokładnie cztery zaplanowane pola
- rozkład typów korzysta z wag z katalogu elementów
- jeden klocek może zawierać najwyżej jeden sklep
- sklepy typu `Any` są celowo dużo rzadsze niż sklepy przypisane do konkretnego dobra

To daje graczowi lekki, ale realny poziom planowania: czasem opłaca się zagrać klocek pod geometrię, a czasem pod przyszły układ dzielnic handlowych.

## 6. Typy pól i zawartość miasta

Aktualnie prototyp używa trzech głównych rodzin pól:

- `house`
- `park`
- nazwanego rosteru sklepów fantasy `Shop_*`

Sklepy są przypisane do grup towarów:

- `Bread`
- `Crystal`
- `Iron`
- `Meat`
- `Plant`
- `Potion`
- `Any` jako wildcard sklepowy

To ważne, bo sklepy nie są tylko kosmetyczną wariacją. Ich przynależność do grupy wpływa zarówno na klastry, jak i na punktację.

W praktyce role pól są dziś następujące:

- domy są źródłem mieszkańców
- parki budują spokojniejszą tkankę miasta i mają własne klastry, ale bez aktywnej punktacji
- sklepy tworzą specjalizacje dzielnic i są głównym źródłem wyniku

## 7. Drogi i sieć ruchu

Każde nowo postawione pole dostaje drogi na krawędziach. System drog:

- zachowuje ciągłość z sąsiednimi polami, jeśli po drugiej stronie istnieje już odpowiednia krawędź
- w innych kierunkach losuje lokalne odnogi
- buduje wspólny graf przejść po wierzchołkach i krawędziach siatki

Drogi nie są już tylko dekoracją. Są podstawą ruchu mieszkańców i pośrednio podstawą punktacji. Dobrze rosnące miasto powinno więc wyglądać na połączone nie tylko wizualnie, ale też funkcjonalnie.

## 8. Mieszkańcy

Po postawieniu domu gra może stworzyć mieszkańca przypisanego do tego domu, jeśli istnieje krawędź, po której da się rozpocząć ruch. Mieszkańcy:

- spawnują się tylko raz na dom
- poruszają się po grafie krawędzi miasta
- na skrzyżowaniach wybierają losowy dalszy kierunek
- unikają natychmiastowego zawracania, chyba że trafią w ślepy koniec
- poruszają się szybciej po prawdziwych krawędziach drogowych niż po zwykłych krawędziach dostępnych do spaceru

Z punktu widzenia designu to bardzo ważne: mieszkańcy zamieniają statyczną planszę w coś, co wygląda jak żyjące miasto, a jednocześnie są nośnikiem systemu scoringowego.

## 9. Punktacja i przepływ towarów

Prototyp ma już aktywną punktację. Nie ma jeszcze klasycznego celu wygranej ani porażki, ale istnieje stale rosnący wynik w panelu `Goods flow`.

Zasada naliczania jest dziś taka:

- gdy mieszkaniec przekracza środek krawędzi, gra sprawdza pola stykające się z tą krawędzią
- jeśli przy tej krawędzi znajduje się sklep punktujący dla konkretnego dobra, odpowiedni licznik rośnie
- wartość punktów nie jest stała: sklep daje tyle punktów, ile wynosi rozmiar jego klastra dla danej grupy towaru
- jeśli obie strony tej samej krawędzi dają punkty do tego samego dobra, popup może zwinąć się do jednego większego bonusu, np. `+2`

To oznacza, że aktualny wynik zależy od dwóch rzeczy naraz:

- czy mieszkańcy rzeczywiście przemieszczają się przez miasto
- czy sklepy są układane w większe, wartościowsze klastry

Jest to lekka ekonomia pasywna, a nie pełny system produkcji, ale już dziś daje sens budowaniu określonych układów.

## 10. Klastry budynków

System klastrów jest jedną z najważniejszych współczesnych mechanik prototypu.

Zasady łączenia:

- `house` łączy się tylko z `house`
- `park` łączy się tylko z `park`
- sklepy łączą się według grup towarów, a nie według pełnej nazwy budynku
- połączenia są ortogonalne, nie diagonalne
- sklep `Any` działa jako wildcard, ale tylko w obrębie systemu sklepowego

To daje specyficzne zachowanie:

- dwa różne sklepy `Bread` należą do tego samego klastra
- sklep `Any` może mostkować sklepowe klastry pasujących grup
- `Any` nie łączy się z domami ani parkami
- rozmiar klastra jest stale cache'owany w stanie gry i dostępny dla hovera oraz scoringu

Klastry są więc jednocześnie narzędziem czytelności wizualnej i podstawą matematyki punktacji.

## 11. Feedback, hover i czytelność systemów

Aktualny prototyp daje kilka warstw feedbacku mechanicznego:

- ghost piece pokazuje przyszłe położenie klocka
- ghost rozróżnia placement legalny i nielegalny
- preview pokazuje planowane typy pól dla aktualnego klocka
- po hoverze na zbudowanym polu podświetla się cały odpowiadający mu klaster
- tooltip przy kursorze pokazuje ikonę i rozmiar klastra
- dla sklepu `Any` tooltip może pokazać kilka linii, po jednej dla każdej pasującej grupy towaru
- nowo postawione pola dostają krótką animację bounce
- pop-upy punktowe unoszą się nad planszą, gdy mieszkaniec aktywuje scoring

To sprawia, że nawet przy dość lekkiej symulacji gracz może dość szybko zrozumieć zależność między układem miasta, klastrami i wynikiem.

## 12. Interfejs i sterowanie

Najważniejsze elementy UI to dziś:

- panel preview aktualnego klocka
- skrót sterowania
- przycisk `Tutorial`
- przycisk `New Game`
- pole do ustawienia rozmiaru siatki przed restartem
- panel punktacji `Goods flow`
- debug panel z informacjami o stanie planszy
- zawsze widoczny badge wersji prototypu

Sterowanie:

- klik na preview: podnieś klocek
- `Tab` lub prawy przycisk myszy: obrót
- lewy klik na planszy: postaw klocek
- scroll: zoom
- środkowy przycisk myszy i drag: pan
- `WASD` lub strzałki: pan

Kamera ma już bezwładność przy klawiaturowym przesuwaniu, więc poruszanie po dużej mapie jest bardziej płynne niż w pierwszych buildach.

## 13. Tutorial

Prototyp ma osobny, interaktywny tutorial uruchamiany z poziomu UI. Nie jest to tylko ekran z tekstem.

Tutorial:

- przełącza gracza na osobne plansze treningowe
- prowadzi krok po kroku przez sterowanie kamerą, podnoszenie klocka, obrót, pierwszy placement, zasadę styku krawędziowego, nielegalny ghost, klastry i scoring
- ma też modal z pełną tekstową wersją zasad
- po zamknięciu lub ukończeniu wraca do poprzedniego miasta gracza, więc nie nadpisuje zwykłego progresu

To ważny element designu, bo przy obecnej liczbie miękkich systemów gra przestała być już całkowicie samoobjaśniająca.

## 14. Warstwa wizualna

Look gry można dziś opisać jako:

- top-down / mapa stolikowa
- organiczna siatka z jitterem wierzchołków
- ciepłe fantasy town vibes
- połączenie tile'owanych tekstur świata z nazwanymi assetami lokali

Kluczowe decyzje wizualne:

- świat bazuje na gridzie, ale render ukrywa jego surowość przez nieregularną geometrię
- teren bazowy i obszar zabudowany mają osobne tekstury świata
- footprint miasta jest zmiękczany overdrawem, fringe'em i erosion stripem
- zamiast klasycznych linii siatki widać punktowe znaczniki węzłów mapy
- drogi zmieniają styl wraz z zoomem: z daleka są prostsze, a z bliska przechodzą w teksturowany look
- mieszkańcy są renderowani jako małe smoki ze zmirrowaniem kierunku i lekkim bobem chodu

Estetycznie gra nadal próbuje sprzedać iluzję żywego, bajkowego miasta, mimo że u podstaw pozostaje deterministyczna logika siatki.

## 15. Assety i reprezentacja elementów

System reprezentacji działa warstwowo:

- jeśli dla elementu istnieje PNG, gra renderuje asset
- jeśli assetu nie ma, używany jest fallback z katalogu elementów
- nad niektórymi polami pojawiają się ikony grup towarów
- preview i plansza korzystają z tego samego systemu ikon, więc informacja o typie pola jest spójna

Repo zawiera dziś szeroki zestaw bezpośrednich assetów dla sklepów `Shop_*`, domów, parków, tekstur terenu, drogi, punktów mapy i sprite'a mieszkańca.

## 16. Persistence i rytm gry

Gra autosave'uje stan do `localStorage`. Zapisywane są między innymi:

- zajęte pola miasta
- liczności elementów
- liczba postawionych klocków
- wynik punktowy
- mieszkańcy
- pozycja i zoom kamery
- seed świata potrzebny do stabilnej rekonstrukcji geometrii

W praktyce daje to spokojny, długofalowy rytm: gracz może budować duże miasto, wracać do niego po odświeżeniu strony i obserwować, jak jego układ wpływa na późniejszy przepływ mieszkańców i punktów.

## 17. Co prototyp testuje teraz

Najważniejsze pytania designowe obecnej wersji to:

- czy placement tetromino nadal jest przyjemny, gdy dokładamy do niego planowane typy pól
- czy gracz rozumie zależność między sklepami, klastrami, ruchem mieszkańców i punktacją
- czy `Any` jako rzadki wildcard sklepowy daje ciekawe mostkowanie dzielnic handlowych
- czy lekki scoring pasywny wzmacnia satysfakcję z budowania bez niszczenia relaksującego tonu
- czy tutorial i hover tooltipy wystarczają, by te systemy były czytelne

## 18. Czego nadal jeszcze nie ma

Mimo wzrostu liczby systemów, prototyp nadal nie ma kilku rzeczy typowych dla pełnej gry:

- warunku zwycięstwa lub porażki
- ekonomii zasobowej w sensie kosztów, produkcji i wydatków
- aktywnych zdolności budynków
- ręcznego wyboru typu zabudowy dla każdego pola
- misji, kampanii albo meta-progresji
- presji czasu albo przeciwnika

To nadal przede wszystkim sandboxowo-puzzlowy prototyp z lekkim scoringiem, a nie pełnoprawny city builder strategiczny.

## 19. Podsumowanie

Aktualny Flametown nie jest już tylko spokojną zabawką do układania miasta z tetromino. To prototyp city-builder puzzle, w którym kształt miasta, grupy sklepów, klastry i ruch mieszkańców zaczynają razem tworzyć prostą, ale już znaczącą warstwę systemową.

Najmocniejsze cechy obecnego designu to:

- czytelne zasady placementu
- silna zgodność między preview a wynikiem placementu
- żywsza plansza dzięki mieszkańcom
- scoring, który nagradza sensowny urban layout zamiast czysto losowego wzrostu
- organiczna prezentacja ukrywająca surowość gridu

Najbardziej naturalne dalsze kierunki rozwoju to:

- dodanie bardziej świadomych decyzji ekonomicznych
- zwiększenie różnic funkcjonalnych między domami, parkami i sklepami
- rozwinięcie celów krótkoterminowych bez utraty relaksującego tonu
- mocniejsze budowanie tożsamości dzielnic i specjalizacji miasta
