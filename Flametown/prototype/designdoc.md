# Flametown Prototype Design Doc

Stan na: 2026-07-19

Ten dokument opisuje aktualny design gry widoczny w prototypie `Flametown/prototype`. To nie jest docelowa wizja calego projektu, tylko zapis tego, co faktycznie dziala i jak obecnie odbierana jest gra.

## 1. High concept

Flametown jest prototypem lekkiego city buildera, w ktorym miasto buduje sie przez stawianie klockow tetromino na nieregularnej mapie. Kazdy ruch rozszerza miejski footprint o cztery pola, a pojedyncze pola w obrebie klocka automatycznie zamieniaja sie w budynki i fragmenty drog.

Rdzen fantasy gry to polaczenie:

- czytelnej logiki przestrzennej rodem z tetromino
- organicznego, troche bajkowego wygladu miasta
- lekkiego poczucia "rosnacej osady", a nie twardej gry ekonomicznej

Prototyp nie ma jeszcze ekonomii, punktacji, celow ani porazki. Jego glownym celem jest sprawdzenie, czy samo ukladanie miasta z klockow jest satysfakcjonujace wizualnie i przestrzennie.

## 2. Core fantasy i doswiadczenie gracza

Aktualne doswiadczenie gracza opiera sie na trzech odczuciach:

1. "Dostaje klocek i probuje znalezc dla niego dobre miejsce."
2. "Miasto musi rosnac spojnie, wiec kazdy ruch dokleja sie do juz istniejacej tkanki."
3. "Po postawieniu klocka plansza staje sie bardziej miejska: pojawiaja sie domy, sklepy i drogi."

To oznacza, ze prototyp jest bardziej gra o ksztalcie i ekspansji niz o mikro-zarzadzaniu pojedynczym budynkiem.

## 3. Core loop

Aktualna petla rozgrywki jest bardzo prosta:

1. Gra losuje nowy klocek tetromino.
2. Gracz klika preview, aby "podniesc" klocek.
3. Gracz obraca klocek i szuka miejsca na planszy.
4. Gra pokazuje ghost piece z informacja, czy ruch jest legalny.
5. Gracz stawia klocek.
6. Cztery pola dostaja typy zabudowy i drogi.
7. Gra losuje nastepny klocek.

To jest petla natychmiastowa, bez tur przeciwnika, czasu, zasobow ani dodatkowych kosztow akcji.

## 4. Zasady planszy i placementu

Plansza jest duza i otwarta. Domyslny rozmiar siatki to `256x256`, z mozliwoscia resetu gry i wyboru rozmiaru w zakresie `16-512`.

Najwazniejsze zasady placementu:

- pierwszy klocek mozna postawic w dowolnym miejscu mieszacym sie w granicach planszy
- kolejne klocki musza stykac sie krawedzia z juz zbudowanym miastem
- nie wolno nachodzic na zajete pola
- nie wolno wychodzic poza plansze

To daje prosty model ekspansji:

- start jest swobodny
- dalsza rozbudowa jest przyrostowa i zwarta
- kazdy ruch realnie zmienia sylwetke miasta

## 5. Klocki i geometria

Gra korzysta z klasycznego zestawu siedmiu tetromino:

- `I`
- `O`
- `T`
- `S`
- `Z`
- `J`
- `L`

Kazdy klocek ma cztery stany rotacji. Logika rotacji i kolizji jest czysto gridowa, a nieregularnosc swiata pojawia sie dopiero w renderze. To wazne, bo gra wizualnie wyglada bardziej organicznie, ale mechanicznie pozostaje czytelna i przewidywalna.

## 6. Struktura miasta

Kazde pole zajete przez nowo postawiony klocek dostaje automatycznie jeden element miasta. Aktualnie gra nie pyta gracza, co chce zbudowac na danym polu. To jest generowane proceduralnie.

Obecna mieszanka elementow:

- `house`
- `park`
- szeroka lista nazwanych sklepow fantasy `Shop_*`

W praktyce znaczy to:

- domy i parki buduja podstawowa tkanke osady
- sklepy nadaja miastu charakter, humor i bardziej "settingowy" ton

Prototype odszedl juz od generycznych kategorii typu `shop/plaza/fountain/decoration` na rzecz konkretnych nazw lokali, takich jak `Shop_DracoBell`, `Shop_GuiltyTreasures` czy `Shop_SmithMart`. To wzmacnia ton lekkiego fantasy comedy.

## 7. Drogi

Kazde nowo postawione pole dostaje drogi na swoich krawedziach. System drog robi dwie rzeczy:

- jesli nowe pole styka sie z juz istniejacym polem, probuje zachowac ciaglosc drogi na wspolnej krawedzi
- w pozostalych kierunkach losuje wystapienie drogi

Efekt designowy:

- miasto szybko wyglada jak zywa tkanka komunikacyjna
- uklady nie sa w pelni planowane przez gracza, ale sprawiaja wrazenie spojnych
- kazdy nowy klocek dopisuje kolejny fragment ulicznej narracji

## 8. Interfejs i sterowanie

UI jest minimalistyczne i funkcjonalne. Najwazniejsze elementy to:

- preview aktualnego klocka w panelu bocznym
- skrot instrukcji sterowania
- przycisk `New Game`
- pole do ustawienia rozmiaru siatki przed restartem

Sterowanie:

- klik na preview: podnies klocek
- `Tab` lub prawy przycisk myszy: obrot
- lewy klik na planszy: postaw klocek
- scroll: zoom
- srodkowy przycisk myszy i drag: pan
- `WASD` lub strzalki: pan

To sterowanie wspiera bardziej "stol mapy" niz "arcade" feeling. Gracz oglada plansze, zbliza, oddala i spokojnie szuka dobrego miejsca.

## 9. Feedback i czytelnosc

Aktualny prototyp daje kilka warstw feedbacku:

- ghost piece pokazuje przewidywane polozenie klocka
- ghost rozroznia placement legalny i nielegalny
- nowo postawione pola dostaja krotka bounce animation
- preview zawsze pokazuje, jaki klocek jest aktualnie dostepny
- autosave sprawia, ze miasto "trwa", a nie znika po odswiezeniu

To sa male rzeczy, ale razem buduja poczucie kontroli i ciaglosci.

## 10. Warstwa wizualna

Aktualny look gry da sie opisac jako:

- top-down / mapa stolowa
- nieregularna, lekko organiczna geometria terenu
- ciepłe fantasy town vibes
- lekko ilustracyjny, nie techniczny charakter

Kluczowe elementy wizualne:

- swiat bazuje na gridzie z jitterem wierzcholkow, wiec pola nie wygladaja idealnie geometrycznie
- tla sa tileowane w przestrzeni swiata, wiec ruszaja sie razem z kamera
- obszar zabudowany ma osobna teksture miasta i cieplejszy tint
- zewnetrzna krawedz miasta jest celowo zmiekczona fringe'em i erosion stripem, zeby footprint nie wygladal zbyt sterylnie
- zamiast klasycznych linii siatki widoczne sa punktowe znaczniki wezlow mapy

To bardzo wazna decyzja estetyczna: mechanika jest gridowa, ale prezentacja probuje ukryc "sucha tabelkowosc" i sprzedac graczowi wizje zywego miasteczka.

## 11. Assety i reprezentacja elementow

System wizualny dziala warstwowo:

- jesli dla elementu istnieje PNG, gra renderuje asset
- jesli assetu nie ma, uzywany jest fallback emoji z katalogu elementow

Obecnie w repo jest szeroki zestaw bezposrednich assetow dla sklepow `Shop_*` oraz kilka assetow dodatkowych, m.in.:

- domy `house_*`
- parki `park_*`
- fontanna `fountain_1.png`
- tekstury terenu i miasta
- `MapPoint.png`

To sprawia, ze swiat jest juz blizej finalnej stylistyki niz czysty placeholder, ale nadal pozostaje mieszanka assetow docelowych i fallbackow.

## 12. Kamera i rytm gry

Kamera wspiera:

- plynny pan
- zoom w duzym zakresie
- eksploracje duzej planszy

Wplywa to na tempo gry. Aktualny prototyp nie cisnie gracza do szybkich decyzji. Zamiast tego zachowuje spokojny rytm:

- obejrzyj fragment mapy
- obroc klocek
- dopasuj ksztalt
- odpal kolejny przyrost miasta

To wzmacnia charakter "relaxed spatial toy" bardziej niz "hard puzzle".

## 13. Co aktualnie jest najwazniejsze w designie

Na obecnym etapie prototyp testuje przede wszystkim:

- czy tetromino jako jednostka rozbudowy miasta daje przyjemne decyzje przestrzenne
- czy organiczny render lagodzi surowosc gridu
- czy proceduralne przypisywanie budynkow wystarcza, by kazdy ruch wygladal nagradzajaco
- czy miasto rosnace tylko przez styk krawedziowy daje dobra czytelnosc ekspansji

Jeszcze nie testuje:

- ekonomii
- strategii dlugoterminowej
- specjalnych budynkow z aktywnymi efektami
- celow, misji, ograniczen, win/lose state
- wyboru rodzaju zabudowy przez gracza

## 14. Ograniczenia aktualnego designu

W obecnym prototypie widac tez swiadome braki:

- brak metagry i progresji
- brak presji zasobowej
- brak roznic funkcjonalnych miedzy typami pol poza wygladem
- drogi sa glownie warstwa wizualna, a nie system symulacyjny
- placement jest czytelny, ale decyzje moga z czasem stac sie powtarzalne bez dodatkowych regul

To nie sa bledy same w sobie. Na tym etapie prototyp celowo weryfikuje najpierw "czy samo budowanie z klockow jest fun".

## 15. Podsumowanie

Aktualny Flametown to spokojny, przestrzenny city builder-puzzle toy, w ktorym miasto rosnie przez doklejanie tetromino do wspolnej tkanki urbanistycznej. Sila prototypu lezy dzis w polaczeniu bardzo prostej reguly placementu z coraz bogatszym, bardziej organicznym wygladem miasta fantasy.

Jesli prototyp ma byc dalej rozwijany, najbardziej naturalne kolejne osie designu to:

- nadanie znaczenia roznym typom zabudowy
- dodanie lekkich celow albo ograniczen, bez utraty relaksujacego tonu
- wzmocnienie czytelnosci tozsamosci dzielnic i wzrostu miasta w czasie
