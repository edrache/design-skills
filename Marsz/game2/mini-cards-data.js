const RAW_MINI_BRANCHES = {
  "phone-scroll": {
    left: [
      ["Przerwa trwa juz czwarta minute i ktos odpala kolejny mem z dzwiekiem.", "Ogladamy ostatni", "Ucinasz po tym", "Memy wygrywaja jeszcze chwile.", "Maja domkniecie i latwiej wracaja do gry.", { sanity: -4, engagement: 4 }, { sanity: 2, engagement: -1 }],
      ["Gdy wracacie, gracz od telefonu proponuje wrzucic memicznego kupca do sceny.", "Wpuszczam kupca", "Zostawiam zart za drzwiami", "Scena robi sie lzejsza i bardziej wspolna.", "Klimat broni sie, ale wymaga energii.", { sanity: -2, engagement: 4 }, { sanity: 2, engagement: -2 }],
      ["Pod koniec sceny stół pyta, czy takie przerwy beda teraz regula.", "Mowisz: tylko awaryjnie", "Robisz z tego zwyczaj", "Granica jest jasna i daje oddech.", "Ludzie sa zadowoleni, ale ton kampanii sie rozmywa.", { sanity: 3, engagement: 1 }, { sanity: -4, engagement: 3 }],
    ],
    right: [
      ["Telefon znika, ale mem nadal krazy po glowach i ktos prycha w najgorszym momencie.", "Obracam to w drobny zart", "Cisne dalej bez reakcji", "Smiech ma ujscie i szybciej gaśnie.", "Napiecie wraca wolniej, ale wraca.", { sanity: -1, engagement: 3 }, { sanity: 2, engagement: -2 }],
      ["Gracz od telefonu przeprasza i pyta, jak chcecie ratowac nastroj.", "Dajesz mu opisac detal sceny", "Prosisz o cisze i sluchanie", "Czuje sie wlaczony zamiast zgaszony.", "Porzadek wraca, lecz odrobine sztywnieje.", { sanity: 2, engagement: 3 }, { sanity: 1, engagement: -1 }],
      ["Po scenie grupa pyta, czy w horrorze mozna czasem schodzic z tonu.", "Tak, ale sygnalem", "Wole trzymac mrok", "Ustalacie bezpieczny wentyl na przyszlosc.", "Granice sa ostre, jednak wymagaja pilnowania.", { sanity: 3, engagement: 1 }, { sanity: 1, engagement: -2 }],
    ],
  },
  "fantasy-gun": {
    left: [
      ["Runiczne pistolety pojawiaja sie przy stole i natychmiast wszyscy chca swoje wersje.", "Kazdy dostaje wariant", "Tylko ten bohater ma wyjatek", "Ekscytacja rośnie razem z chaosem stylu.", "Unikalnosc zostaje, ale trzeba jej bronic.", { sanity: -4, engagement: 5 }, { sanity: -1, engagement: 2 }],
      ["Kowal pyta, czy bron ma dawne pochodzenie i mozna dorobic jej lore.", "Improwizujesz rod broni", "Ucinasz na poziomie gadzetu", "Swiat peka mniej, bo dostaje historie.", "Sprzet dziala, ale troche wystaje z realiow.", { sanity: -2, engagement: 3 }, { sanity: 1, engagement: -1 }],
      ["Druzyna teraz planuje build pod strzelaniny zamiast lochu.", "Przerabiasz pare starc", "Wracasz do mieczy po tej scenie", "Sesja zyskuje nowy smak, lecz kosztuje spojnosc.", "Ustalasz granice zanim gatunek odplynie.", { sanity: -3, engagement: 4 }, { sanity: 2, engagement: -2 }],
    ],
    right: [
      ["Gracz wzdycha, ale od razu pyta o kusze, ktora chociaz brzmi widowiskowo.", "Dajesz jej bajer", "Trzymasz zwykla bron", "Kompromis od razu laduje lepiej.", "Konwencja jest czysta, lecz mniej blyszczy.", { sanity: 2, engagement: 2 }, { sanity: 3, engagement: -2 }],
      ["Reszta stolu dorzuca pomysly na bronie pasujace do swiata.", "Robicie minute brainstormu", "Wybierasz jedna propozycje i gracie", "Kazdy czuje wklad i klimat nie cierpi.", "Tempo wygrywa, ale kilka glow zostaje glodnych.", { sanity: 1, engagement: 3 }, { sanity: 2, engagement: -1 }],
      ["Po walce gracz przyznaje, ze bardziej chodzilo mu o styl niz pistolety.", "Obiecujesz sceny pod ten styl", "Mowisz: styl tak, bron nie", "Potrzeba jest uslyszana i wraca ogien do gry.", "Zasady stoja twardo, ale trzeba karmic fantazje inaczej.", { sanity: 2, engagement: 3 }, { sanity: 1, engagement: -2 }],
    ],
  },
  "last-minute-cancel": {
    left: [
      ["Reszta ekipy pyta, czy gracie luzniejszy odcinek czy cisniesz kampanie dalej.", "Robie odcinek poboczny", "Cisne glowny watek", "Wieczor oddycha i nie zjada planu glównego.", "Sesja trwa, ale sklad czuje sie prowizorycznie.", { sanity: 2, engagement: 2 }, { sanity: -2, engagement: 2 }],
      ["Nieobecni pisza nagle, ze jednak chca streszczenie i loot.", "Dajesz im recap bez nagrod", "Przyznajesz drobne fanty", "Sprawiedliwosc zostaje po twojej stronie.", "Mniej zgrzyta przy powrocie, ale pachnie naginaniem.", { sanity: 2, engagement: -1 }, { sanity: -2, engagement: 2 }],
      ["Po sesji grupa pyta, czy taka wersja awaryjna moze zostac formatem.", "Tak, przy jednym braku", "Nie, tylko wyjatkowo", "Masz bufor na przyszlosc bez rozwalania skladu.", "Chronisz kampanie, ale mniej elastycznie.", { sanity: 3, engagement: 1 }, { sanity: 1, engagement: -2 }],
    ],
    right: [
      ["Wieczor zostaje pusty i gracze pytaja, czy chociaz zrobicie krotki call fabularny.", "Robie 20 minut recapu", "Odpuszczam calkiem", "Kontaktu starcza, by nie rozsypac rytmu.", "Masz wolne, ale nitka kampanii luzuje sie mocniej.", { sanity: 2, engagement: 2 }, { sanity: 3, engagement: -2 }],
      ["Notatki pala cie z wyrzutu sumienia, bo tyle prep poszlo w nic.", "Zapisujesz reuse na przyszlosc", "Zamykasz notes i nie patrzysz", "Frustracja zmienia sie w paliwo.", "Wieczor regeneruje, ale material dalej gryzie.", { sanity: 3, engagement: 0 }, { sanity: 1, engagement: -1 }],
      ["Przy nowym terminie wszyscy boja sie kolejnego odwolu.", "Prosisz o twarde potwierdzenia", "Liczycie na lepszy humor", "Zasady zmniejszaja chaos organizacyjny.", "Sympatycznie, ale ryzykownie jak poprzednio.", { sanity: 3, engagement: 0 }, { sanity: -3, engagement: -2 }],
    ],
  },
  "zero-notes": {
    left: [
      ["Po twoim streszczeniu jedna osoba nadal myli wroga z burmistrzem.", "Rysuje szybka sciage", "Licze, ze juz wystarczy", "Wszyscy lapia wspolny grunt.", "Szybciej ruszacie, ale mgla jeszcze zostaje.", { sanity: 2, engagement: 2 }, { sanity: -2, engagement: -1 }],
      ["Gracze zaczynaja dopowiadac brakujace szczegoly po swojemu.", "Przyjmujesz najlepsze wersje", "Korygujesz fabuly od razu", "Pamiec grupy robi sie wspolna i zywa.", "Porzadek wraca, choc tempo siada.", { sanity: 1, engagement: 3 }, { sanity: 2, engagement: -1 }],
      ["Padal pomysl, by po kazdej sesji jedna osoba pisala recap.", "Wprowadzam dyzur", "Zostaje przy swoim recapcie", "Odpowiedzialnosc rozklada sie po stole.", "Masz kontrole, ale nadal wszystko niesiesz sam.", { sanity: 3, engagement: 1 }, { sanity: -1, engagement: 0 }],
    ],
    right: [
      ["Cisza trwa tak dlugo, ze ktos zaczyna zmyślac totalnie nowy watek.", "Pozwalam na ten skret", "Wracam do faktow po swojemu", "Chaos staje sie nowa przygoda, ale ryzyko rośnie.", "Ratujesz fabule, choć ton robi sie suchy.", { sanity: -3, engagement: 3 }, { sanity: 1, engagement: -2 }],
      ["Dwoch graczy odpada mentalnie, bo nie wiedza juz o co walczyc.", "Daje testowe wspomnienie", "Niech sie domysla dalej", "Wraca im punkt zaczepienia.", "Niewiedza dalej zjada tempo.", { sanity: 1, engagement: 2 }, { sanity: -3, engagement: -3 }],
      ["Po sesji wszyscy przyznaja, ze bez notatek beda tak wracac co tydzien.", "Zakladacie wspolna kartke", "Wzdychasz i nic nie zmieniasz", "Nastepny start ma szanse byc lzejszy.", "Problem zostaje wpisany do krajobrazu kampanii.", { sanity: 3, engagement: 1 }, { sanity: -3, engagement: -1 }],
    ],
  },
  "joke-loop": {
    left: [
      ["Dowcipy laduja tak dobrze, ze kolejny NPC dostaje glos kabareciarza.", "Podbijam ten styl", "Przyhamowuje po jednym zartcie", "Stol buzuje, a powaga ucieka dalej.", "Humor zostaje, ale troche wraca kontrola.", { sanity: -3, engagement: 4 }, { sanity: -1, engagement: 2 }],
      ["Najcichszy gracz wreszcie sie wlacza, bo luzniej mu grac w tym tonie.", "Oddaje mu scene", "Wracam do glownego watku", "Zyskujesz glos, ktory zwykle milczy.", "Scena sie spina, ale mniej wszystkich wpuszcza.", { sanity: 1, engagement: 3 }, { sanity: 2, engagement: -1 }],
      ["Po przerwie pytaja, czy kampania ma byc juz bardziej komediowa.", "Tak, ale z dramatem", "Nie, tylko chwilowy oddech", "Macie wspolny nowy smak sesji.", "Ramka jest ustawiona, zanim kabaret przejmie tron.", { sanity: -1, engagement: 3 }, { sanity: 2, engagement: -2 }],
    ],
    right: [
      ["Prosba o ton dziala, ale zartownis jeszcze rzuca ostatnim bon motem.", "Pozwalam mu zamknac scene", "Ucinasz od razu", "Atmosfera wraca miekkiej.", "Wraca szybciej, lecz z lekkim tarciem.", { sanity: 1, engagement: 1 }, { sanity: 2, engagement: -1 }],
      ["Reszta stolu patrzy, czy teraz tez wolno im docisnac swoje granie.", "Pytam, kto chce wejsc serio", "Po prostu opisuje konsekwencje", "Dajesz im wspolny sygnal.", "Scena wraca, ale mniej partycypacyjnie.", { sanity: 2, engagement: 2 }, { sanity: 1, engagement: -1 }],
      ["Po sesji zartownis mowi, ze nie chcial psuc nastroju, tylko ratowal energie.", "Dogadujecie sygnal na przyszlosc", "Mowisz, ze po prostu stop", "Masz narzedzie zamiast konfliktu.", "Granica istnieje, ale mniej jego wspiera.", { sanity: 3, engagement: 1 }, { sanity: 1, engagement: -2 }],
    ],
  },
  "lore-vacuum": {
    left: [
      ["Kebab natychmiast dostaje nazwe, herb i stalego klienta z druzyny.", "Buduje mini lore lokalu", "Trzymam to jako jednorazowy gag", "Stol lapie swiat przez jedzenie.", "Zart dziala, ale nie zjada calej mapy.", { sanity: -2, engagement: 4 }, { sanity: 1, engagement: 2 }],
      ["Wlasciciel kebabu zna plotke o przepowiedni i chce sprzedac info za sos.", "Gram w to", "Odcinam watek poboczny", "Laczysz glupotke z fabula.", "Klimat wraca szybciej, ale z mniejszym entuzjazmem.", { sanity: -1, engagement: 3 }, { sanity: 2, engagement: -1 }],
      ["Od teraz gracze pytaja, co jeszcze ma miasto do jedzenia zamiast o starozytnych bogow.", "Daje im kulinarne haki", "Wprowadzam znow przepowiednie mocniej", "Masz nowy kanal na swiatotworzenie.", "Watek glowny odzyskuje szacunek po korekcie kursu.", { sanity: -2, engagement: 3 }, { sanity: 2, engagement: -2 }],
    ],
    right: [
      ["Wracasz do przepowiedni, ale jedna osoba nadal glodna glupiego detalu.", "Wplatam detal obok", "Ignoruje to i cisne dalej", "Drobny mostek ratuje uwage.", "Ton zostaje czysty, ale czesc stolu jeszcze odpada.", { sanity: 1, engagement: 2 }, { sanity: 2, engagement: -2 }],
      ["Mentor pyta druzyne o to, czego wlasciwie szukaja, nie tylko gdzie zjesc.", "Pozwalam im odpowiedziec po swojemu", "Przerywam i daje konkret", "Ludzie sami wpadaja z powrotem do historii.", "Masz porzadek, lecz mniej ich glosu.", { sanity: 2, engagement: 3 }, { sanity: 1, engagement: -1 }],
      ["Po scenie ustalacie, ze wielkie lore lepiej podawac przez konkret i praktyke.", "Zmienie styl wprowadzen", "Zostaje przy wielkich mowach", "Dopasowujesz paliwo do grupy.", "Trzymasz wizje, ale ryzykujesz kolejne kebaby.", { sanity: 3, engagement: 1 }, { sanity: -2, engagement: -1 }],
    ],
  },
  "solo-spotlight": {
    left: [
      ["Gwiazda sceny improwizuje kolejny plan i reszta znow siedzi cicho.", "Wplatam ich w jego plan", "Pozwalam mu dalej prowadzic", "Inni odzyskuja uchwyt bez zrywania rytmu.", "Tempo jest mocne, ale tlo dalej milczy.", { sanity: 1, engagement: 2 }, { sanity: -2, engagement: 1 }],
      ["Jedna z cichszych osob pisze ci spojrzeniem, ze chcialaby cos zagrac.", "Daje jej pytanie wprost", "Licze, ze sama wejdzie", "Dostaje bezpieczne wejscie do sceny.", "Szansa mija i milknie na dluzej.", { sanity: 2, engagement: 3 }, { sanity: -3, engagement: -2 }],
      ["Po scenie dominujacy gracz pyta, czy przesadza z iloscia pomyslow.", "Umawiacie limit rund", "Mowisz, ze jest ok", "Jasne ramy pomagaja wszystkim.", "Przywilej zostaje, ale koszt rozlewa sie dalej.", { sanity: 3, engagement: 1 }, { sanity: -3, engagement: -1 }],
    ],
    right: [
      ["Pytanie do innych budzi dwie nowe idee naraz i scena na chwile zwalnia.", "Robie szybka kolejke", "Biere pierwsza odpowiedz", "Kazdy wie, kiedy ma wejsc.", "Tempo trzyma sie lepiej, ale jedna osoba znow znika.", { sanity: 2, engagement: 3 }, { sanity: 1, engagement: -1 }],
      ["Gwiazda stołu widzi, ze oddajesz pole i reaguje odrobine urażony.", "Dziekuje mu za naped", "Ignoruje focha", "Czuje sie doceniony i latwiej odpuszcza.", "Scena dziala, ale relacja lekko trzeszczy.", { sanity: 1, engagement: 2 }, { sanity: -1, engagement: -2 }],
      ["Pod koniec walki stol sam zaczyna pilnowac rotacji glosu.", "Wzmacniam ten zwyczaj", "Wracam do spontanu", "Masz kulturę stołu, nie tylko gaszenie problemu.", "Bywa szybciej, ale stary schemat moze wracac.", { sanity: 3, engagement: 2 }, { sanity: 0, engagement: -1 }],
    ],
  },
  "rules-unread": {
    left: [
      ["Po kolejnym tlumaczeniu gracz znow pyta o ten sam zapis dwa starcia pozniej.", "Robie mu sciage", "Licze na pamiec", "Pomoc jest konkretna i odciaza cie pozniej.", "Wracasz do tej samej sciany szybciej niz chcesz.", { sanity: 2, engagement: 1 }, { sanity: -3, engagement: -1 }],
      ["Reszta stolu zaczyna podpowiadac za ciebie.", "Oddaje im te role", "Prosze o chwile ciszy", "Wspolna pomoc skraca twoj koszt.", "Porzadek wraca, ale tylko ty dzwigasz nauczanie.", { sanity: 2, engagement: 2 }, { sanity: -1, engagement: -1 }],
      ["Po sesji pytasz, co pomoze mu ogarnac postac do nastepnego razu.", "Umawiacie wdrozenie przed gra", "Mowisz: przeczytaj sam", "Masz plan zamiast frustracji.", "Odpowiedzialnosc jest jasna, lecz ryzyko powtorki rosnie.", { sanity: 3, engagement: 1 }, { sanity: 1, engagement: -2 }],
    ],
    right: [
      ["Gracz faktycznie czyta karte, ale reszta zaczyna sie wiercic z nudow.", "Daje im szybki roleplay obok", "Czekamy wspolnie", "Przestoj boli mniej i scena nie umiera.", "Nauka jest skuteczna, ale energia spada mocniej.", { sanity: 1, engagement: 2 }, { sanity: 2, engagement: -2 }],
      ["Po przeczytaniu odkrywa, ze umiejetnosc jest lepsza niz myslal.", "Pozwalam od razu jej uzyc", "Zostawiam to na pozniej", "Dostaje nagrode za wysilek i latwiej zapamieta.", "Wiedza zostaje, ale bez iskry.", { sanity: 2, engagement: 3 }, { sanity: 1, engagement: -1 }],
      ["Stol pyta, czy od teraz przed sesja robicie mini check postaci.", "Tak, na starcie spotkania", "Nie, licze na samodyscypline", "Prewencja kosztuje minute, ale ratuje godzine.", "Mniej rytualu, wiecej ryzyka powtorki.", { sanity: 3, engagement: 0 }, { sanity: -2, engagement: -1 }],
    ],
  },
  "mood-break": {
    left: [
      ["Rabat u smoka otwiera lawine kolejnych finansowych dowcipow.", "Gram z nimi chwile", "Ucinam po jednym", "Scena zmienia sie w rozbawiony przerywnik.", "Humor dostaje ujscie i nie zjada calego ognia.", { sanity: -3, engagement: 4 }, { sanity: -1, engagement: 2 }],
      ["Jeden z graczy nagle wpada na pomysl skarbca rozliczanego apką smokPay.", "Wpuszczam smokPay do swiata", "Zostawiam to jako mem poza kadrem", "Grupa czuje wspolny styl i bawi sie swietnie.", "Dowcip zostaje, ale mniej zmienia setting.", { sanity: -2, engagement: 3 }, { sanity: 1, engagement: -1 }],
      ["Po scenie pytaja, czy horror waszej kampanii nie powinien miec bardziej luznych przelotow.", "Tak, co jakis czas", "Nie, to byl wyjatek", "Masz plan na oddechy bez utraty tozsamosci.", "Bronisz tonu, ale musisz dawac wentyle gdzie indziej.", { sanity: 1, engagement: 3 }, { sanity: 2, engagement: -2 }],
    ],
    right: [
      ["Smok nie zna BLIK-a, ale ktos i tak parska smiechem pod nosem.", "Daje smokowi sarkastyczna riposte", "Ide dalej bez mrugniecia", "Scena wraca lagodniej, a smok zyskuje charakter.", "Groza trzyma fason, lecz robi sie bardziej lodowata.", { sanity: 1, engagement: 2 }, { sanity: 2, engagement: -1 }],
      ["Gracz od dowcipu przeprasza i chce jeszcze raz wejsc w scene.", "Pozwalam mu opisac strach", "Biere inicjatywe i opisuje sam", "Przeprasza dzialaniem, nie tylko slowem.", "Masz kontrole, ale mniej wspoltworzenia.", { sanity: 2, engagement: 2 }, { sanity: 1, engagement: -1 }],
      ["Potem grupa pyta, skad ma wiedziec, kiedy zart juz wybija klimat.", "Umawiacie bezpieczne slowo", "Liczycie na wyczucie", "Macie prosty zawor na przyszlosc.", "Spontan zostaje, ale i ryzyko takich wbitek.", { sanity: 3, engagement: 1 }, { sanity: -1, engagement: -1 }],
    ],
  },
  "missing-backstory": {
    left: [
      ["Improwizowany bohater w pierwszej scenie zmienia zdanie co do charakteru trzy razy.", "Wiazemy go z jednym NPC", "Pozwalamy plywac dalej", "Dostaje kotwice i robi sie bardziej czytelny.", "Wolnosc zostaje, ale stol gubi kim on jest.", { sanity: 2, engagement: 1 }, { sanity: -2, engagement: 2 }],
      ["Reszta graczy zaczyna podpowiadac mu tlo postaci.", "Zbieram pomysly i wybieramy", "Prosze ich, by nie sterowali", "Tworzycie wspolny punkt zaczepienia.", "Ochrona autonomii kosztuje tempo startu.", { sanity: 1, engagement: 3 }, { sanity: -1, engagement: -1 }],
      ["Po sesji pytasz, czy dopisze reszte miedzy spotkaniami.", "Dostaje trzy pytania domowe", "Mowisz: zobaczymy w praniu", "Masz szanse domknac koncept lekko.", "Improwizacja dalej rządzi, wraz z ryzykiem dziur.", { sanity: 3, engagement: 1 }, { sanity: -2, engagement: 0 }],
    ],
    right: [
      ["Szablon rusza sprawnie, ale gracz boi sie, ze bedzie zbyt generyczny.", "Dajesz mu jeden wlasny twist", "Mowisz, ze dopracuje potem", "Ma poczucie wlasnosci bez utraty startu.", "Jedziecie szybciej, lecz z mniejsza iskra.", { sanity: 2, engagement: 2 }, { sanity: 1, engagement: -1 }],
      ["Druzyna od razu podlapuje prosty archetyp i latwiej wchodzi w relacje.", "Prosisz ich o wiezi z nim", "Lecicie dalej bez rozpiski", "Nowa postac szybciej zyje w grupie.", "Relacje przyjda pozniej, ale teraz sa plytsze.", { sanity: 2, engagement: 3 }, { sanity: 1, engagement: 0 }],
      ["Po grze gracz dziekuje, bo start byl latwy, lecz chce poglabic postac.", "Umawiacie upgrade przed nastepna sesja", "Mowisz: rozwijaj w trakcie", "Bezpieczny start przeradza sie w plan.", "Jest przestrzen, ale brak terminu grozi rozmyciem.", { sanity: 3, engagement: 1 }, { sanity: 0, engagement: 1 }],
    ],
  },
  "schedule-chaos": {
    left: [
      ["Czesc grupy protestuje, bo staly termin nie pasuje im co tydzien.", "Robie tryb co drugi tydzien", "Prosze o test miesiaca", "Regula robi sie bardziej realna.", "Masz twardosc, ale czesc ludzi dalej marudzi.", { sanity: 2, engagement: 1 }, { sanity: 1, engagement: -2 }],
      ["Kalendarz nagle wyglada czytelnie i jedna osoba sama proponuje dyzury przypomnien.", "Biere ten pomysl", "Wole sam pilnowac", "Chaos organizacyjny schodzi z twojej glowy.", "Kontrola zostaje u ciebie, razem z obciazeniem.", { sanity: 3, engagement: 1 }, { sanity: -1, engagement: 0 }],
      ["Po dwoch tygodniach widac, kto naprawde moze sie dostosowac.", "Przebudowuje sklad uczciwie", "Nadal naginam termin pod wszystkich", "Masz grupę, ktora faktycznie gra.", "Dalej gonisz miraż idealnej frekwencji.", { sanity: 3, engagement: 1 }, { sanity: -3, engagement: -2 }],
    ],
    right: [
      ["Dyskusja rosnie do kolejnych 60 wiadomosci bez decyzji.", "Robie ankiete z deadlinem", "Czytam to dalej", "Elastycznosc dostaje wreszcie ramke.", "Mgla gestnieje i zjada ci wieczor.", { sanity: 2, engagement: 1 }, { sanity: -4, engagement: -2 }],
      ["Jedna osoba odpisuje po dobie i znow przewraca caly uklad.", "Mowie: termin zamkniety", "Probuje dopasowac jeszcze raz", "Reszta widzi, ze proces ma koniec.", "Wszyscy sa mili, ale nic sie nie zlepia.", { sanity: 2, engagement: -1 }, { sanity: -3, engagement: -2 }],
      ["W efekcie kolejna sesja znow przesuwa sie o tydzien.", "Zakladam od teraz staly slot", "Nadal plyne z nurtem", "Wreszcie wyciagasz lekcje z chaosu.", "To samo wraca jako domyslny styl organizacji.", { sanity: 3, engagement: 0 }, { sanity: -3, engagement: -2 }],
    ],
  },
  "genre-drift": {
    left: [
      ["Cyber-oko zachwyca stol, a dwie kolejne osoby chca gadzety z przyszlosci.", "Robie z tego artefakty", "Hamuje po tym jednym", "Nowa estetyka rozkwita w polowie swiata.", "Wyjatek brzmi cool, ale nie zjada calego tonu.", { sanity: -3, engagement: 4 }, { sanity: -1, engagement: 2 }],
      ["NPC reaguje na motocykl jak na pradawny relikt z legend.", "Buduje lore hybrydy", "Traktuje to jako dziwactwo", "Mieszanka zaczyna miec swoje zasady.", "Scena sie broni, ale zgrzyt nadal slychac.", { sanity: -2, engagement: 3 }, { sanity: 1, engagement: -1 }],
      ["Druzyna planuje teraz cala kampanie pod techno-fantasy vibe.", "Przestawiam swiat odrobinke", "Mowie: tylko lokalny eksperyment", "Wchodzisz w nowy smak na własnych warunkach.", "Chronisz rdzen kampanii, zostawiajac iskre jako wyjatek.", { sanity: -2, engagement: 4 }, { sanity: 2, engagement: -2 }],
    ],
    right: [
      ["Granica gatunku staje sie jasna, ale jedna osoba czuje sie przygaszona.", "Daje jej inny cool gadzet", "Prosze o zaufanie do tonu", "Fantazja zostaje nakarmiona bez zmiany epoki.", "Spójnosc wygrywa, lecz trzeba domknac emocje.", { sanity: 2, engagement: 2 }, { sanity: 1, engagement: -2 }],
      ["Reszta stolu dorzuca pomysly, jak zrobic low fantasy bardziej soczyste.", "Zbieram dwa pomysly", "Wracam do sceny od razu", "Masz swiezosc bez skoku gatunkowego.", "Tempo jest lepsze, ale mniej wspolnej kreatywnosci.", { sanity: 2, engagement: 3 }, { sanity: 1, engagement: -1 }],
      ["Po sesji grupa przyznaje, ze chciala tylko wiecej widowiskowosci.", "Dokladam widowisko w ramach tonu", "Mowie, ze trzymamy surowosc", "Potrzeba zostaje uslyszana i kanalizowana.", "Ton jest czysty, ale musisz nim lepiej karmic ich apetyt.", { sanity: 3, engagement: 2 }, { sanity: 1, engagement: -2 }],
    ],
  },
  "table-sidequest": {
    left: [
      ["Rozmowa o serialach rozlewa sie na pol stolu i scena praktycznie staje.", "Daje im minute i wracam", "Czekam cierpliwie dalej", "Masz szanse odzyskac rytm po oddechu.", "Konwersacja zjada coraz wiecej powietrza.", { sanity: -1, engagement: 1 }, { sanity: -4, engagement: -3 }],
      ["Jedna osoba, ktora sluchala ciebie, tez odpina uwage i odpływa.", "Wrzucam nagly zwrot", "Licze, ze sami ucichna", "Fabula znow ma czym zahaczyc stół.", "Scena dogorywa obok dialogu o sezonach.", { sanity: -1, engagement: 3 }, { sanity: -3, engagement: -2 }],
      ["Po sesji wiesz juz, ze bez zasad stol zawsze rozjedzie sie na dwa kanaly.", "Ustalam sygnal stop", "Nic nie zmieniam", "Masz prosty bezpiecznik na przyszlosc.", "Problem wraca jako staly balast.", { sanity: 3, engagement: 0 }, { sanity: -3, engagement: -1 }],
    ],
    right: [
      ["Zwracasz uwage i jedna osoba od razu przeprasza, druga przewraca oczami.", "Miekko tlumacze po co", "Zostawiam samo upomnienie", "Latwiej im przyjac granice bez urazy.", "Przygoda wraca, ale niesmak zostaje dluzszy.", { sanity: 1, engagement: 1 }, { sanity: 2, engagement: -2 }],
      ["Gdy rozmowa cichnie, pytasz pobocznych graczy co robia ich postacie.", "Wlaczam ich do sceny", "Wracam do glownego mowiacego", "Maja powod, by sluchac dalej.", "Cisza wraca, ale uwaga nie trzyma sie wszystkich.", { sanity: 2, engagement: 3 }, { sanity: 1, engagement: -1 }],
      ["Po grze grupa sama proponuje krotkie przerwy na off-topic.", "Wprowadzam je oficjalnie", "Wole spontanicznie", "Rozladowujesz potrzebe gadania poza scenami.", "Mniej ram, ale wieksza szansa na wciecia.", { sanity: 3, engagement: 1 }, { sanity: -1, engagement: -1 }],
    ],
  },
  "npc-ignore": {
    left: [
      ["Sprzedawca lin okazuje sie bardziej interesujacy niz mentor po trzech zdaniach.", "Daje mu plotke od mentora", "Pozwalam handlowi wygrac", "Fabula wraca przez boczne drzwi.", "Gracze biora to, co lubia, ale mentor blednie.", { sanity: -1, engagement: 3 }, { sanity: -3, engagement: 2 }],
      ["Mentor stoi obok coraz bardziej zraniony dramaturgicznie.", "Robie z niego milczacego obserwatora", "Kazę mu przerwac handel", "Scena nie traci go calkiem.", "Wraca sila, ale brzmi bardziej sztucznie.", { sanity: 1, engagement: 1 }, { sanity: 2, engagement: -1 }],
      ["Po wyjsciu ze sklepu druzyna pyta, czy mentor byl w ogole wazny.", "Wiaziesz go z ich zakupem", "Odpowiadam suchym 'tak'", "Przyziemny hook ciagnie ich do watku.", "Informacja jest jasna, ale mniej organiczna.", { sanity: 2, engagement: 2 }, { sanity: 1, engagement: -1 }],
    ],
    right: [
      ["Mentor ucina handel i od razu prosi o jedna konkretna decyzje od druzyny.", "Pytam, kto pierwszy reaguje", "Monologuje dalej", "Stol wchodzi w scene szybciej.", "Watek wraca, ale dalej jest bardziej jednostronny.", { sanity: 2, engagement: 2 }, { sanity: 1, engagement: -1 }],
      ["Kupowanie lin nadal jednak siedzi im z tylu glowy.", "Obiecuje zakupy po rozmowie", "Ignoruje temat do konca", "Maja pewnosc, ze potrzeba nie przepada.", "Scena trzyma ton, ale czesc uwagi ucieka.", { sanity: 1, engagement: 2 }, { sanity: 2, engagement: -2 }],
      ["Po wszystkim widzisz, ze najlepiej dzialaja NPC z praktyczna stawka.", "Tak ich projektuje dalej", "Zostaje przy tajemniczych mowach", "Uczysz sie, co naprawde wciaga te grupe.", "Wizja zostaje, ale bedzie trudniej o ich fokus.", { sanity: 3, engagement: 1 }, { sanity: -2, engagement: -1 }],
    ],
  },
  "late-player": {
    left: [
      ["Spóźnialski wpada w polowie sceny i nie wie, kto z kim rozmawia.", "Robie mu wejscie fabularne", "Daję suche streszczenie", "Wchodzi chaosowo, ale z sensem.", "Jest szybciej, lecz bardziej topornie.", { sanity: 1, engagement: 2 }, { sanity: 2, engagement: -1 }],
      ["Reszta stołu widzi, ze naprawde ruszyles bez czekania.", "Chwale punktualnych", "Nie komentuje tego", "Wzmacniasz dobra norme bez kazania.", "Gracie dalej, ale sygnal jest slabszy.", { sanity: 2, engagement: 1 }, { sanity: 1, engagement: 0 }],
      ["Po sesji spóźnialski pyta, czy to nowa zasada na stale.", "Tak, start o czasie", "Zobaczymy zaleznie od dnia", "Granica staje sie przewidywalna.", "Elastycznosc brzmi milo, lecz zostawia furtke do powtorki.", { sanity: 3, engagement: 0 }, { sanity: -1, engagement: -1 }],
    ],
    right: [
      ["Czekanie robi z kazdego ospale zombie, zanim jeszcze rzucony zostanie pierwszy test.", "Odpalam luzna rozgrzewke", "Siedzimy i czekamy dalej", "Przynajmniej energia nie spada w pustke.", "Minuty dalej topnieja bez zwrotu.", { sanity: -1, engagement: 2 }, { sanity: -3, engagement: -2 }],
      ["Spóźnialski wpada zadowolony, bo przeciez wszyscy i tak czekali.", "Mowie o koszcie dla grupy", "Macham reka i gramy", "Jest szansa, ze cos do niego dotrze.", "Uprzejmosc zamienia sie w zla norme.", { sanity: 1, engagement: -1 }, { sanity: -3, engagement: -2 }],
      ["Przy kolejnym ustalaniu terminu punktualni zaczynaja tracic cierpliwosc.", "Ustalam polityke startu", "Licze na samoregulacje", "Chronisz ludzi, ktorzy byli na czas.", "Frustracja powoli zmienia stol w piach.", { sanity: 3, engagement: 0 }, { sanity: -3, engagement: -2 }],
    ],
  },
  "combat-tab-out": {
    left: [
      ["Przypomnienie stawki budzi gracza, ale on prosi o szybkie podsumowanie sytuacji.", "Daje mu dwie liczby i cel", "Mowie: sluchaj od teraz", "Ma szanse wejsc bez dlugiej pauzy.", "Granica jest jasna, ale powrot trudniejszy.", { sanity: 1, engagement: 2 }, { sanity: 2, engagement: -1 }],
      ["Reszta stołu obserwuje, czy bedziesz to tolerowal dluzej.", "Wspolnie ustalamy tempo tur", "Robie wyjatek tylko raz", "Masz zasadę zamiast improwizowanej zlosci.", "Sygnał jest miekki i moze nie wystarczyc.", { sanity: 2, engagement: 2 }, { sanity: 0, engagement: -1 }],
      ["Po walce gracz przyznaje, ze utknal, bo jego tury byly za rzadkie.", "Skrotuje kolejke", "Mowie, ze ma byc gotowy", "Problem techniczny robi sie naprawialny.", "Odpowiedzialnosc jest po jego stronie, ale tarcie zostaje.", { sanity: 3, engagement: 1 }, { sanity: 1, engagement: -2 }],
    ],
    right: [
      ["Pomijasz go po chwili i walka przyspiesza, ale czuje sie publicznie skarzony.", "Po turze wyjasniam krotko czemu", "Zostawiam to bez komentarza", "Tempo zostaje, a on ma szanse zrozumiec zasade.", "Szybko, ale bardziej ostro.", { sanity: 2, engagement: 1 }, { sanity: 2, engagement: -2 }],
      ["Pozostali gracze nagle sa bardziej gotowi na swoje tury.", "Chwale ten rytm", "Po prostu korzystam z poprawy", "Dobra norma dostaje wzmocnienie.", "Jest lepiej teraz, ale mniej swiadomie na przyszlosc.", { sanity: 2, engagement: 2 }, { sanity: 1, engagement: 0 }],
      ["Po starciu pytasz, czy online potrzebuje bardziej klarownej struktury.", "Wprowadzam limit czasu tury", "Zostaje po staremu", "Techniczny kontrakt ratuje kolejne walki.", "Stara forma moze znow wypchnac kogos poza stol.", { sanity: 3, engagement: 1 }, { sanity: -2, engagement: -1 }],
    ],
  },
  "prep-wasted": {
    left: [
      ["Gracze skręcaja tak ostro, ze twoje mapy nagle zostaja tylko dekoracja.", "Recyklinguje elementy ukradkiem", "Porzucam prep bez zalu", "Troche odzyskujesz pracy bez kneblowania wyboru.", "Wolnosc jest czysta, ale koszt psychiczny wyzszy.", { sanity: -1, engagement: 2 }, { sanity: -3, engagement: 3 }],
      ["Improwizacja nagle rodzi swietny poboczny watek, ktorego nie miales.", "Idę w niego calkiem", "Wrzuce go tylko jako przedsmak", "Grupa czuje, ze swiat naprawde reaguje.", "Dajesz im smak wolnosci bez wywracania planu.", { sanity: -2, engagement: 4 }, { sanity: 1, engagement: 1 }],
      ["Po sesji patrzysz na zmarnowany prep i zastanawiasz sie jak pracowac madrzej.", "Notuje modułowe klocki", "Zaciskam zeby i robię tak dalej", "Kolejne przygotowania beda odporniejsze.", "Ta sama rana czeka na nastepny raz.", { sanity: 3, engagement: 1 }, { sanity: -3, engagement: -1 }],
    ],
    right: [
      ["Podsuwasz przygotowany trop i polowa stolu go bierze, ale jedna osoba czuje szyny.", "Maskuje trop konsekwencjami", "Cisne jawnie w ten kierunek", "Prowadzenie jest lzejsze do przyjecia.", "Prep sie przydaje, lecz slychac zgrzyt.", { sanity: 2, engagement: 1 }, { sanity: 1, engagement: -2 }],
      ["Gdy trafiaja na twoj material, scena od razu rozkwita, bo jest dopracowana.", "Daje im wiecej wyboru w srodku", "Trzymam plan zwartym", "Masz jakość i swobode jednoczesnie.", "Jest efektownie, ale mniej ich.", { sanity: 2, engagement: 3 }, { sanity: 2, engagement: -1 }],
      ["Po grze widzisz, ze najlepiej dziala prep, ktory mozna przesuwac między watkami.", "Tak przygotowuje dalej", "Dalej pisze liniowo", "Twoj wysilek zaczyna pracowac wielokrotnie.", "Ryzyko kolejnego zderzenia zostaje wysokie.", { sanity: 3, engagement: 1 }, { sanity: -2, engagement: -1 }],
    ],
  },
  "grim-joke": {
    left: [
      ["Lzejsza wersja pogrzebu rozladowuje napiecie, ale wszyscy juz mowia pol-zartem.", "Wplatam cieply toast", "Pozwalam scenie odplynac", "Emocja zostaje w lagodniejszej formie.", "Scena zmienia sie w zwykly przerywnik.", { sanity: 1, engagement: 2 }, { sanity: -3, engagement: 2 }],
      ["Jeden z graczy, ktory bal sie ciezkich scen, wreszcie wchodzi do rozmowy.", "Daje mu glos", "Wracam do fabuly", "Masz wiecej ludzi w scenie kosztem tonu.", "Fabula rusza, ale bez dodatkowego serca.", { sanity: 1, engagement: 3 }, { sanity: 1, engagement: -1 }],
      ["Po wszystkim pytaja, czy pogrzeby i dramaty w ogole maja byc tak ciezkie.", "Kalibrujemy intensywnosc", "Mowie, ze tak ma byc", "Macie wspolny poziom ciezaru.", "Wizja zostaje, ale nie wszyscy w niej oddychaja swobodnie.", { sanity: 3, engagement: 1 }, { sanity: 1, engagement: -2 }],
    ],
    right: [
      ["Prosba o powage zamraza stół na chwile, bo wszyscy czuja jej wagę.", "Dorzuce jedno zdanie wsparcia", "Ide dalej bez osłony", "Granica brzmi ludzko, nie jak reprymenda.", "Scena trzyma sie mocno, ale robi sie chlodniejsza.", { sanity: 1, engagement: 1 }, { sanity: 2, engagement: -1 }],
      ["Zartownis przeprasza i pyta, czy moze powiedziec cos juz serio.", "Tak, oddaje mu moment", "Nie, prowadzę dalej sam", "Naprawia scene własnym ruchem.", "Kontrola wraca, lecz mniej go wlacza.", { sanity: 2, engagement: 2 }, { sanity: 1, engagement: -1 }],
      ["Po sesji grupa docenia, ze pilnujesz tonu, ale chce tez sygnalow wyjscia awaryjnego.", "Ustalam krotkie sprawdzenie przy ciezkich scenach", "Zostaje przy intuicji", "Masz narzedzie do dramaturgii i bezpieczenstwa.", "Sceny dalej beda mocne, ale bardziej ryzykowne spolecznie.", { sanity: 3, engagement: 1 }, { sanity: -1, engagement: -1 }],
    ],
  },
  "loot-obsession": {
    left: [
      ["Drobny loot cieszy druzyne tak bardzo, ze od razu szukaja kolejnych kieszeni.", "Daje jeden trop i stop", "Pozwalam szabrowac dalej", "Maja nagrode, ale nie przejmują calej sceny.", "Tabelka dropu zjada dramaturgie dalej.", { sanity: -1, engagement: 2 }, { sanity: -3, engagement: 3 }],
      ["Krewny zmarlego NPC patrzy na nich z niedowierzaniem.", "Opisuje jego reakcje", "Pomijam ten dysonans", "Swietnie przypominasz, ze swiat to widzi.", "Loot jest czysty, ale bardziej bezduszny.", { sanity: 1, engagement: 1 }, { sanity: -2, engagement: 1 }],
      ["Po chwili gracze sami pytaja, czy nie przesadzaja z pazernoscia.", "Obracam to w ceche postaci", "Mowie, ze loot byl i jedziemy", "Masz ciekawy haczyk charakterologiczny.", "Nawyk zostaje niezbadany i powroci szybciej.", { sanity: 2, engagement: 2 }, { sanity: -1, engagement: 0 }],
    ],
    right: [
      ["Trzymasz fokus sceny, ale jedna osoba nerwowo pyta, czy cos przegapia mechanicznie.", "Obiecuje loot po rozmowie", "Mowie, ze teraz nie to", "Uspokajasz FOMO bez oddawania sceny.", "Ton wygrywa, lecz niepokoj zostaje.", { sanity: 1, engagement: 2 }, { sanity: 2, engagement: -2 }],
      ["Dramatyczna rozmowa nagle trafia mocniej, bo nikt nie liczy monet.", "Pozwalam im zadac pytania rodzinie", "Domykam scene szybko", "Historia daje im nowa wartosc do gonienia.", "Masz klimat, ale mniej szansy na ich aktywnosc.", { sanity: 2, engagement: 3 }, { sanity: 1, engagement: -1 }],
      ["Po sesji widzisz, ze grupa lubi czytelne nagrody po scenach emocjonalnych.", "Projektuje takie pozniej", "Zostaje przy samym story", "Nagroda i fabula przestaja byc wrogami.", "Potrzeba zostaje, wiec bedzie wracac w zlych momentach.", { sanity: 3, engagement: 1 }, { sanity: -2, engagement: -1 }],
    ],
  },
  "homework-energy": {
    left: [
      ["Uproszczona sesja od razu rozluznia ramiona calej grupy.", "Robie krotki cel i finisz", "Zostawiam luzny epizod", "Maja jasny tor bez przeciazania.", "Jest lzej, ale mniej domkniecia.", { sanity: 2, engagement: 2 }, { sanity: 1, engagement: 1 }],
      ["Zmeczone osoby zaczynaja jednak rzucac dobre pomysly, gdy presja spada.", "Oddaje im inicjatywe", "Trzymam prosty rytm", "Niska energia zamienia sie w wspoltworzenie.", "Wieczor zostaje bezpieczny i prosty.", { sanity: 1, engagement: 3 }, { sanity: 2, engagement: 1 }],
      ["Po sesji grupa mówi, ze takie lżejsze odcinki bardzo im ratuja zycie.", "Wpisuje je jako tryb awaryjny", "Zostawiam to spontanicznie", "Masz narzedzie zamiast poczucia winy.", "Pomysl jest dobry, ale moze zniknac bez rytualu.", { sanity: 3, engagement: 2 }, { sanity: 1, engagement: 0 }],
    ],
    right: [
      ["Plan jedzie dalej, ale widzisz, jak dwa spojrzenia gasna po pierwszych zawiłosciach.", "Skracam exposition w biegu", "Brne dalej jak bylo", "Ratujesz czesc tempa bez rezygnacji z watku.", "Fabuła zostaje, grupa coraz mniej.", { sanity: -1, engagement: 1 }, { sanity: -4, engagement: -3 }],
      ["Jedna osoba przyznaje, ze dzis nie ma glowy na intrygę.", "Robie przeskok do akcji", "Prosze, by wytrwala", "Dajesz jej wejscie mniej obciazajace.", "Napiecie wisi, bo potrzeba nie zostala uslyszana.", { sanity: 1, engagement: 2 }, { sanity: -3, engagement: -2 }],
      ["Po sesji czujesz, ze plan byl dobry, tylko nie na ten wieczor.", "Notuje lzejsza wersje", "Obwiniam grupe i ide dalej", "Kolejny raz bedzie mniej bolesny.", "Frustracja zostaje po obu stronach stolu.", { sanity: 3, engagement: 1 }, { sanity: -3, engagement: -2 }],
    ],
  },
  "missing-recap-reader": {
    left: [
      ["Czytasz recap i po dwoch zdaniach jedna osoba mowi 'o, teraz kojarze'.", "Daje jej dopowiedziec", "Jadę dalej z tekstem", "Pamiec stolu budzi sie szybciej.", "Recap dziala, lecz bardziej jednostronnie.", { sanity: 1, engagement: 2 }, { sanity: 1, engagement: 0 }],
      ["Ktos pyta, czy moze streszczac nastepnym razem zamiast ciebie.", "Przyjmuje propozycje", "Mowie, ze sam to zrobie", "Dzielisz ciężar i budujesz uwage.", "Masz kontrole, ale dalej niesiesz caly recap sam.", { sanity: 3, engagement: 2 }, { sanity: -1, engagement: 0 }],
      ["Po rozgrzewce sesja rusza znacznie gladziej niz zwykle po przerwie.", "Wprowadzam recap otwierajacy na stale", "Traktuje to jako awaryjny rytual", "Masz sprawdzony zaplon na start.", "Narzędzie jest, ale moze byc stosowane za rzadko.", { sanity: 3, engagement: 1 }, { sanity: 1, engagement: 0 }],
    ],
    right: [
      ["Startujecie od razu i po minucie pada pytanie: 'czekaj, po co tu jestesmy?'", "Robie mikro-przypomnienie w scenie", "Udaje, ze nie slyszalem", "Korygujesz kurs bez pelnego postoju.", "Dezorientacja rozlewa sie dalej.", { sanity: 1, engagement: 1 }, { sanity: -3, engagement: -2 }],
      ["Gracze zaczynaja zgadywac motywacje NPC, zupelnie obok faktow.", "Wplatam wskazowke dialogiem", "Niech bledza chwile", "Odnajduja kierunek bez szkolnego recapu.", "Błądzenie zjada czas i pewnosc.", { sanity: 1, engagement: 2 }, { sanity: -2, engagement: -1 }],
      ["Po sesji widac, ze bez jakiejś formy powrotu zawsze gubicie pierwszy kwadrans.", "Ustalam recapy ustne", "Nadal licze na czytanie tekstu", "Dopasowujesz narzedzie do ludzi, nie marzenia.", "Liczysz na cud, ktory juz raz nie przyszedl.", { sanity: 3, engagement: 1 }, { sanity: -2, engagement: -1 }],
    ],
  },
  "sudden-pvp": {
    left: [
      ["Starcie zaczyna sie ostro i reszta stolu natychmiast wybiera strony.", "Ustalam stawke bez zabijania", "Pozwalam na pelny ogien", "Masz konflikt, ale pod kontrola.", "Emocje eksploduja i kampania drzy.", { sanity: -2, engagement: 4 }, { sanity: -4, engagement: 4 }],
      ["Jeden z graczy nie chce PvP, ale nie wie jak to powiedziec w tym szumie.", "Robie pause check", "Licze, ze sobie poradza", "Bezpieczenstwo wraca do stolu.", "Ryzyko urazy rośnie pod spodem.", { sanity: 2, engagement: 1 }, { sanity: -3, engagement: -2 }],
      ["Po scenie grupa pyta, czy takie starcia maja w ogole zielone swiatlo.", "Umawiacie warunki PvP", "Mowie, ze bywa jak wyjdzie", "Konflikt dostaje bezpieczne ramy.", "Niepewnosc zostaje i wróci w zlym momencie.", { sanity: 3, engagement: 1 }, { sanity: -2, engagement: 0 }],
    ],
    right: [
      ["Stopujesz prowokacje, ale obaj gracze nadal mają wysokie cisnienie.", "Daje im scene slowna", "Przeskakuje od razu dalej", "Wypuszczasz pare bez łamania kampanii.", "Konflikt przygasa, ale zostaje pod dywanem.", { sanity: 1, engagement: 2 }, { sanity: 2, engagement: -2 }],
      ["Reszta stołu oddycha z ulga, bo nie chciala wojny wewnetrznej.", "Pytam ich o wspolny cel", "Wracam do kolejnej sceny", "Druzyna dostaje znow os wspolpracy.", "Kryzys mija, ale mniej wspolnie przepracowany.", { sanity: 2, engagement: 2 }, { sanity: 1, engagement: -1 }],
      ["Po sesji dwaj buntownicy przyznaja, ze chcieli po prostu wiekszego napiecia.", "Dokladam rywali z zewnatrz", "Mowie, ze maja tego nie robic", "Potrzeba konfliktu dostaje lepszy kanał.", "Zakaz jest jasny, ale glod emocji zostaje.", { sanity: 3, engagement: 2 }, { sanity: 1, engagement: -2 }],
    ],
  },
  "session-end-cliffhanger": {
    left: [
      ["Dodatkowa scena niesie was dalej, ale zegar juz patrzy bardzo zle.", "Scinam opis do sedna", "Gram szeroko mimo godziny", "Dostajecie payoff bez totalnego rozlania.", "Finał smakuje, lecz koszt poranka rośnie.", { sanity: -1, engagement: 3 }, { sanity: -4, engagement: 4 }],
      ["Gracze są nakręceni i zaczynaja dorzucac kolejne pomysly zamiast domykac.", "Mowie: jedna decyzja i koniec", "Pozwalam jeszcze chwile", "Masz emocje i granice jednoczesnie.", "Noc puchnie razem z entuzjazmem.", { sanity: -1, engagement: 2 }, { sanity: -3, engagement: 3 }],
      ["Po zakonczonej scenie wszyscy sa szczesliwi, ale ty wiesz, ze jutro zaplacisz.", "Umawiam krotszy start nastepnym razem", "Biere to na klate", "Odzyskujesz troche kontroli nad kosztem.", "Heroiczny overrun moze stac sie nawykiem.", { sanity: 2, engagement: 1 }, { sanity: -3, engagement: 1 }],
    ],
    right: [
      ["Zatrzymujesz sie na cliffhangerze, a stół niemal wyje z frustracji i zachwytu.", "Daje im minutę teorii", "Urwana scena i do domu", "Napiecie ma ujscie, ale nie pożera nocy.", "Hak jest mocny, lecz bardziej brutalny.", { sanity: 1, engagement: 3 }, { sanity: 2, engagement: 1 }],
      ["Na czacie od razu ruszaja spekulacje o finale.", "Podsyłam im jedna zajawke", "Zostawiam cisze", "Podtrzymujesz ogien miedzy sesjami.", "Mniej twojej pracy teraz, ale tez mniej paliwa.", { sanity: 1, engagement: 3 }, { sanity: 2, engagement: 0 }],
      ["Przed kolejnym spotkaniem wszyscy wpadaja juz gotowi do gry.", "Startuje od razu od akcji", "Robie jeszcze recap i rozbieg", "Cliffhanger procentuje natychmiast.", "Zabezpieczasz start, ale rozmywasz czesc impetu.", { sanity: 2, engagement: 3 }, { sanity: 1, engagement: 1 }],
    ],
  },
};

window.MARSZ_CARD_BRANCHES = RAW_MINI_BRANCHES;
