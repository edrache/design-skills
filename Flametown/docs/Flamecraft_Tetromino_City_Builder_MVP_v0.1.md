# Flamecraft Tetromino City Builder -- MVP Design Document (v0.1)

Stan dokumentu: 2026-07-19

## 1. High Concept

Gra typu cozy city builder osadzona w świecie **Flamecraft**. Gracz
rozbudowuje miasto, dokładając wielopolowe klocki miasta, a dostęp do
kolejnych klocków przechodzi przez prosty system deckbuildera:
`draw pile`, `hand`, `discard pile` i zakupy nowych klocków.

To nie jest już wyłącznie układanka o kształtach. MVP łączy trzy warstwy:

- placement wielopolowych klocków,
- lekką symulację miasta z mieszkańcami i drogami,
- ekonomię towarów, która napędza draw i rozwój talii.

Inspiracje:

- Flamecraft
- Dorfromantik
- deckbuildery z rosnącą talią

------------------------------------------------------------------------

## 2. Filary projektu

- Budowanie miasta z czytelnych, wielopolowych klocków.
- Szybkie decyzje placementowe o realnych konsekwencjach ekonomicznych.
- Miasto, które wygląda na żywe dzięki mieszkańcom i ruchowi po drogach.
- Sklepy fantasy i towary jako centralny element klimatu Flamecraft.
- Relaksująca pętla bez presji czasu i bez przeciwnika.

------------------------------------------------------------------------

## 3. Design Rules

1. Jedno pole klocka = jeden element miasta.
2. MVP używa dziś wyłącznie klocków czteropolowych.
3. System powinien wspierać w przyszłości inne rozmiary i kształty klocków.
4. Placement musi pozostać prosty: pierwszy klocek swobodnie, kolejne przez styk krawędziowy.
5. Drogi są częścią logiki miasta, nie tylko dekoracją.
6. Mieszkańcy i towary mają wzmacniać wartość dobrego układania, a nie zastępować placement.
7. Towary powinny mieć czytelne zastosowanie w dalszym rozwoju talii.
8. MVP ma testować przyjemność z pętli "stawiaj -> zarabiaj -> dobieraj -> kupuj -> stawiaj dalej".
9. Projekt pozostaje wierny światu Flamecraft przez roster sklepów, towarów i lekki, bajkowy ton.

------------------------------------------------------------------------

## 4. Core Loop (MVP)

1. Wybierz jeden z 6 startowych klocków.
2. Dobierz klocek do ręki.
3. Podnieś klocek, obróć go i znajdź legalne miejsce.
4. Dołóż klocek do miasta.
5. Zagrany klocek trafia na stos odrzuconych.
6. Mieszkańcy poruszają się po drogach i generują towary przy sklepach.
7. Gracz może też kliknąć sklep, by aktywnie dostać jego towar.
8. Gdy ma dość jednego typu towaru, dobiera kolejne klocki do limitu ręki.
9. Gdy ma dość towaru zgodnego z ofertą sklepu, kupuje nowy klocek do talii.
10. Gdy deck się wyczerpie, discard tasuje się z powrotem do decku.

------------------------------------------------------------------------

## 5. Klocki i startery

Na starcie gracz wybiera 1 z 6 klocków:

- Draco Bell
- Potable Potions
- Hello Nursery
- Smith Mart
- Fragile Reptile
- Critical Rolls

Każdy starter jest dziś klockiem `2x2` o stałym składzie:

- `1 house`
- `2 park`
- `1 shop`

Shop na klocku determinuje typ towaru i specjalizację handlową nowego
fragmentu miasta. Wszystkie startery są deterministyczne, więc gracz już
na początku podejmuje świadomą decyzję o pierwszym kierunku rozwoju.

------------------------------------------------------------------------

## 6. Deckbuilder Layer

MVP zawiera prosty system talii:

- `draw pile`
- `hand`
- `discard pile`

Aktualne zasady:

- początkowy limit ręki wynosi `1`
- nigdy nie dobieramy więcej klocków niż mamy w decku
- zagrany klocek schodzi z ręki na `discard pile`
- jeśli `draw pile` jest pusty, a trzeba dobrać, `discard pile` jest tasowany do decku

To jest fundament dalszego rozwoju. W przyszłości łatwo będzie zwiększać
rozmiar ręki, wprowadzać rzadsze klocki, ulepszenia talii albo bardziej
rozbudowany draft zakupów.

------------------------------------------------------------------------

## 7. Plansza i Placement

Najważniejsze zasady placementu:

- pierwszy klocek można położyć w dowolnym miejscu planszy
- każdy kolejny klocek musi stykać się krawędzią z istniejącym miastem
- kontakt tylko rogiem nie wystarcza
- nie można nachodzić na zajęte pola
- nie można wyjść poza planszę
- klocek można obracać przed placementem

Gra daje czytelny feedback placementowy przez preview i ghost piece.

------------------------------------------------------------------------

## 8. Typy pól miasta

W MVP pola dzielą się na trzy główne typy:

- `house`
- `park`
- `shop`

Rola pól:

- domy są źródłem mieszkańców
- parki budują spokojniejszą tkankę miasta
- sklepy są źródłem towarów i głównym motorem ekonomii

------------------------------------------------------------------------

## 9. Drogi i Mieszkańcy

Drogi nie są już tylko wizualne. Każde nowe pole dostaje połączenia,
które budują sieć ruchu miasta.

Mieszkańcy:

- mogą pojawić się po postawieniu domu
- poruszają się po grafie dróg i krawędzi miasta
- wybierają kolejne odnogi na skrzyżowaniach
- są pasywnym źródłem zbierania towarów przy sklepach

Ten system daje miastu poczucie życia i zamienia placement w decyzję o
przyszłym przepływie przez dzielnice handlowe.

------------------------------------------------------------------------

## 10. Towary i Aktywacja Sklepów

Każdy sklep jest powiązany z konkretnym towarem. Towary powstają na dwa
sposoby:

- pasywnie: gdy mieszkaniec mija sklep
- aktywnie: gdy gracz kliknie sklep na planszy

Nowa mechanika aktywacji:

- kliknięcie budynku daje jego towar
- klik aktywuje cooldown tylko dla tego budynku
- cooldown nie blokuje pasywnego zbierania przez mieszkańców
- cooldown jest widoczny jako slider na polu budynku

To dodaje lekką warstwę aktywnej gry bez niszczenia cozy charakteru.

------------------------------------------------------------------------

## 11. Draw i Zakupy

Towary są walutą rozwoju.

Aktualne koszty w MVP:

- dobranie do limitu ręki kosztuje `20` sztuk jednego, wybranego typu towaru
- kupno nowego klocka kosztuje `100` sztuk towaru zgodnego z ofertą

Model zakupu:

- w sklepie widoczne są konkretne oferty klocków
- gracz płaci za wybraną ofertę
- kupiony klocek trafia do `discard pile`

To oznacza, że rozbudowa talii zależy od tego, jakiego typu dzielnice
gracz rozwija i które towary potrafi produkować najwydajniej.

------------------------------------------------------------------------

## 12. MVP Scope

### Zawiera

- wybór startowego klocka,
- placement i obracanie klocków,
- preview aktualnego klocka z ręki,
- `draw pile / hand / discard pile`,
- dociąg finansowany towarami,
- sklep z zakupem nowych klocków do talii,
- domy, parki i sklepy,
- drogi i ruch mieszkańców,
- pasywne zbieranie towarów przez mieszkańców,
- aktywację sklepów kliknięciem z cooldownem,
- prosty HUD ekonomii i panel stanu talii,
- zapis i odczyt stanu gry.

### Nie zawiera

- wielu klocków w ręce na starcie rozgrywki,
- rozbudowanej metaprogresji,
- unikalnych zdolności poszczególnych budynków poza typem towaru,
- przeciwnika, presji czasu lub porażki,
- warunku zwycięstwa i pełnej kampanii,
- rozwiniętych systemów smoków Flamecraft,
- zaawansowanej ekonomii monet, kontraktów i questów.

------------------------------------------------------------------------

## 13. Backlog

### Deckbuilder

- zwiększanie rozmiaru ręki,
- więcej typów klocków niż obecne startery,
- rzadsze lub lepsze klocki,
- alternatywa między jawnie widocznym sklepem a losowanymi nagrodami.

### Miasto

- więcej typów pól i budynków,
- bardziej charakterystyczne dzielnice,
- dodatkowe mechaniki synergii między sąsiedztwami,
- bogatsza logika dróg i ruchu.

### Flamecraft

- Artisan Dragons,
- Fancy Dragons,
- mocniejsze powiązanie sklepów z postaciami i zadaniami,
- bardziej rozpoznawalne systemy świata Flamecraft.

------------------------------------------------------------------------

## 14. Otwarte pytania

- Jak szybko powinna rosnąć ręka gracza w kolejnych etapach gry?
- Czy zakup nowych klocków ma zostać przy sklepie jawnym, czy częściowo przejść na losowany market?
- Czy każdy budynek powinien w przyszłości mieć osobną zdolność aktywną poza generowaniem towaru?
- Czy towary mają pozostać jedyną walutą, czy pojawią się też monety i osobne koszty?
- Jaki będzie długoterminowy cel runu: wynik, rozrost miasta, kontrakty, czy zestaw milestone'ów?
