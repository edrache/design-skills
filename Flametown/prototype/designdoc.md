# Flametown Prototype Design Doc

Stan na: 2026-07-19

Ten dokument opisuje aktualny design gry widoczny w prototypie `Flametown/prototype`. To nie jest docelowa wizja całego projektu, tylko zapis tego, co faktycznie działa, co jest czytelne dla gracza i jakie systemy już dziś wpływają na decyzje podczas gry.

## 1. High concept

Flametown jest prototypem lekkiego city buildera z logiką placementu opartą o klocki miejskie i prostą warstwą deckbuildera. Gracz nie stawia pojedynczych budynków, tylko całe czteropolowe klocki, które doklejają nowe fragmenty miasta do istniejącej tkanki, a dostęp do kolejnych klocków przechodzi przez system ręki, decku i odrzuconych.

Rdzeń fantasy gry opiera się dziś na połączeniu:

- prostych, bardzo czytelnych decyzji przestrzennych
- organicznego, bajkowego wyglądu miasta fantasy
- lekkiej symulacji życia miasta poprzez mieszkańców, drogi i przepływ towarów
- miękkiej punktacji, która nagradza dobre układanie sklepów w klastry

To nie jest już tylko toy do dokładania kształtów. Prototyp w obecnej formie testuje, czy samo budowanie z klocków może napędzać jednocześnie:

- prosty system ruchu mieszkańców
- scoring i przepływ towarów oparty o układ dzielnic handlowych
- lekką ekonomię deckbuildera, w której towary finansują draw i zakupy nowych klocków

## 2. Fantasy i doświadczenie gracza

Aktualne doświadczenie gracza opiera się na kilku odczuciach naraz:

1. "Najpierw wybieram starter, potem zarządzam jednym klockiem w ręce i próbuję znaleźć dla niego dobre miejsce."
2. "Każdy kolejny ruch musi sensownie doczepić się do miasta, więc jego kształt ma znaczenie."
3. "Preview pokazuje mi nie tylko geometrię, ale też jakie typy pól wylądują na planszy."
4. "Miasto po chwili zaczyna żyć: pojawiają się mieszkańcy, sklepy tworzą specjalizacje, a licznik surowców rośnie z dobrze zaprojektowanej tkanki oraz z aktywnego klikania sklepów."
5. "Towary nie są już tylko wynikiem. Służą też do dobierania kolejnych klocków i kupowania nowych opcji do talii."

To przesuwa prototyp z czystej układanki przestrzennej w stronę spokojnego city-builder puzzle, gdzie placement, czytelność dzielnic i lekka ekonomia wizualna zaczynają działać razem.

## 3. Core loop

Obecna pętla rozgrywki wygląda tak:

1. Przy nowej grze gracz wybiera jeden z 6 starterów.
2. Wybrany starter trafia do talii i zostaje dobrany do ręki.
3. Preview pokazuje aktualny klocek z ręki.
4. Gracz podnosi klocek, obraca go i szuka miejsca na planszy.
5. Ghost piece pokazuje legalność placementu.
6. Gracz stawia klocek.
7. Zagrany klocek schodzi z ręki i trafia na stos odrzuconych.
8. Na planszy pojawiają się budynki i drogi.
9. Jeśli w klocku był dom z dostępem do krawędzi ruchu, może pojawić się mieszkaniec.
10. Mieszkańcy poruszają się po mieście i naliczają towary, gdy mijają sklepy.
11. Gracz może też kliknąć sklep na planszy, by dostać `+1` towaru, ale z cooldownem per budynek.
12. Gdy ręka jest pusta lub niepełna, gracz może dobrać do limitu, płacąc `20` sztuk jednego typu towaru.
13. Gdy deck jest pusty, discard tasuje się z powrotem do decku.
14. Gracz może otworzyć sklep i kupić nowy klocek za `100` sztuk towaru zgodnego z ofertą; kupiony klocek trafia na stos odrzuconych.

To nadal jest pętla szybka i bez przeciwnika, ale nie jest już całkowicie neutralna systemowo. Ułożenie dzielnic, sieci przejść i tempo zdobywania towarów wpływają bezpośrednio na tempo rozbudowy talii.

## 4. Plansza i reguły placementu

Plansza jest duża i otwarta. Domyślny rozmiar siatki to `256x256`, a nową grę można zacząć z rozmiarem w zakresie `16-512`.

Najważniejsze reguły placementu:

- pierwszy klocek można postawić w dowolnym miejscu, jeśli mieści się na planszy
- każdy kolejny klocek musi stykać się krawędzią z istniejącym miastem
- kontakt tylko rogiem nie wystarcza
- nie wolno nachodzić na zajęte pola
- nie wolno wychodzić poza planszę

To daje model wzrostu miasta, który jest jednocześnie prosty i czytelny: swobodny start, potem zwarta ekspansja wymagająca myślenia o kształcie granicy miasta.

## 5. Klocki i planowanie zawartości

Warstwa deckbuildera używa dziś wyłącznie klocków `2x2`, opartych o shape `O`.

Aktualnie istnieje 6 ręcznie zdefiniowanych starterów:

- `Draco Bell`
- `Potable Potions`
- `Hello Nursery`
- `Smith Mart`
- `Fragile Reptile`
- `Critical Rolls`

Każdy taki klocek ma stały skład:

- `1 house`
- `2 park`
- `1 shop`

Shop na starterze zawsze odpowiada nazwie klocka i jego grupie towaru. Preview jest więc wiążące: gracz widzi dokładny skład aktualnego klocka z ręki przed placementem.

Aktualne zasady planowania pól:

- każdy klocek ma dokładnie cztery zaplanowane pola
- obecne startery mają stały, deterministyczny skład
- każdy klocek zawiera dokładnie jeden sklep
- kupione klocki w obecnym prototypie korzystają z tej samej puli 6 definicji co startery

To daje graczowi realny poziom planowania: każda decyzja placementowa dotyczy jednocześnie geometrii, przyszłego spawnu mieszkańców i specjalizacji handlowej dokładanej do talii.

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
- sklepy tworzą specjalizacje dzielnic i są głównym źródłem towarów

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

## 9. Towary, draw i ekonomia

Prototyp ma już aktywny panel `Goods flow`. Liczniki nie są tylko wynikiem wizualnym, ale pełnią rolę waluty do tempa dalszej gry.

Towary powstają dziś na dwa sposoby:

- pasywnie: gdy mieszkaniec przekracza środek krawędzi i mija sklep
- aktywnie: gdy gracz kliknie sklep na planszy

Zasada naliczania przez mieszkańców jest taka:

- gdy mieszkaniec przekracza środek krawędzi, gra sprawdza pola stykające się z tą krawędzią
- jeśli przy tej krawędzi znajduje się sklep punktujący dla konkretnego dobra, odpowiedni licznik rośnie
- wartość nie jest stała: sklep daje tyle jednostek dobra, ile wynosi rozmiar jego klastra dla danej grupy towaru
- jeśli obie strony tej samej krawędzi dają punkty do tego samego dobra, popup może zwinąć się do jednego większego bonusu, np. `+2`

Zasada aktywacji kliknięciem jest taka:

- kliknięcie sklepu daje `+1` towaru jego typu
- sklep po kliknięciu wchodzi na cooldown `6000 ms`
- cooldown nie blokuje pasywnego naliczania przez mieszkańców
- cooldown jest rysowany jako krótki pasek na środku pola sklepu

Towary są dziś używane do dwóch wydatków:

- dociąg do limitu ręki kosztuje `20` sztuk jednego typu towaru
- zakup nowego klocka w sklepie kosztuje `100` sztuk towaru zgodnego z ofertą

To oznacza, że aktualny stan ekonomii zależy od trzech rzeczy naraz:

- czy mieszkańcy rzeczywiście przemieszczają się przez miasto
- czy sklepy są układane w większe, wartościowsze klastry
- czy gracz aktywnie klika sklepy, by przyspieszyć tempo rozwoju talii

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
- preview pokazuje planowane typy pól dla aktualnego klocka z ręki
- panel po prawej pokazuje liczebność `Ręka / Deck / Odrzucone`
- panel po prawej pokazuje też akcje draw i sklep ofert
- po hoverze na zbudowanym polu podświetla się cały odpowiadający mu klaster
- tooltip przy kursorze pokazuje ikonę i rozmiar klastra
- dla sklepu `Any` tooltip może pokazać kilka linii, po jednej dla każdej pasującej grupy towaru
- nowo postawione pola dostają krótką animację bounce
- pop-upy punktowe unoszą się nad planszą, gdy mieszkaniec aktywuje scoring
- kliknięty sklep pokazuje wizualny cooldown jako krótki pasek na środku pola

To sprawia, że nawet przy dość lekkiej symulacji gracz może dość szybko zrozumieć zależność między układem miasta, klastrami i wynikiem.

## 12. Interfejs i sterowanie

Najważniejsze elementy UI to dziś:

- starter picker z 6 opcjami na początku runu
- panel preview aktualnego klocka
- wskaźniki `Ręka`, `Deck`, `Odrzucone`
- przyciski draw per typ towaru
- rozwijany prosty sklep z ofertami kupna nowych klocków
- skrót sterowania
- przycisk `Tutorial`
- przycisk `New Game`
- pole do ustawienia rozmiaru siatki przed restartem
- panel punktacji `Goods flow`
- debug panel z informacjami o stanie planszy
- zawsze widoczny badge wersji prototypu

Sterowanie:

- klik na preview: podnieś klocek z ręki
- `Tab` lub prawy przycisk myszy: obrót
- lewy klik na pustym polu planszy: postaw klocek
- lewy klik na zajętym sklepie: aktywuj sklep
- scroll: zoom
- środkowy przycisk myszy i drag: pan
- `WASD` lub strzałki: pan

Kamera ma już bezwładność przy klawiaturowym przesuwaniu, więc poruszanie po dużej mapie jest bardziej płynne niż w pierwszych buildach.

## 13. Tutorial

Prototyp ma osobny, interaktywny tutorial uruchamiany z poziomu UI. Nie jest to tylko ekran z tekstem.

Tutorial:

- przełącza gracza na osobne plansze treningowe
- prowadzi krok po kroku przez sterowanie kamerą, starter / rękę / placement, obrót, pierwszy placement, zasadę styku krawędziowego, nielegalny ghost, klastry i scoring
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
- liczniki towarów
- stan `drawPile / hand / discardPile`
- wybrany starter
- oferty sklepu
- cooldowny budynków
- mieszkańcy
- pozycja i zoom kamery
- seed świata potrzebny do stabilnej rekonstrukcji geometrii

W praktyce daje to spokojny, długofalowy rytm: gracz może budować duże miasto, wracać do niego po odświeżeniu strony i obserwować, jak jego układ wpływa na późniejszy przepływ mieszkańców, tempo zdobywania towarów i rozwój talii.

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
