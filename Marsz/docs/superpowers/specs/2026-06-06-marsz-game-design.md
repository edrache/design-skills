# Design: Marsz — Gra Karciana (prezent urodzinowy dla Pawła)

**Data:** 2026-06-06
**Platforma:** Przeglądarka mobilna (HTML/CSS/JS)
**Styl:** Reigns-like swipe card game
**Kontekst:** Paweł zawodowo prowadzi sesje RPG dla dzieci. Gra jest prezentem urodzinowym dla niego.

---

## 1. Pętla rozgrywki

Gracz (Paweł) widzi jedną kartę na raz. Przeciąga kartę w lewo lub prawo, wybierając reakcję na sytuację. Po zwolnieniu karty zasoby się aktualizują, pojawia się krótki komentarz narracyjny i wchodzi następna karta. Powtarzać aż do przegranej.

### Krok po kroku

1. Karta pojawia się na środku ekranu
2. Gracz zaczyna przeciągać kartę
3. Przy przeciąganiu w lewo — stopniowo pojawia się lewa etykieta
4. Przy przeciąganiu w prawo — stopniowo pojawia się prawa etykieta
5. Po przekroczeniu progu (np. 40% szerokości ekranu) — decyzja jest potwierdzona
6. Karta odlatuje, pojawia się feedback narracyjny
7. Zasoby animują się (±wartości widoczne przez chwilę)
8. Następna karta wchodzi na ekran

---

## 2. Zasoby

Dwa zasoby, oba startują na **50**, zakres **0–100**.

| Zasób | Ikona | Opis |
|---|---|---|
| **Psychika Pawła** | 🧠 | Zdrowie psychiczne prowadzącego |
| **Zaangażowanie dzieci** | 🎲 | Poziom skupienia i entuzjazmu graczy |

**Złota zasada napięcia:** Decyzja dobra dla Zaangażowania jest zazwyczaj zła dla Psychiki — i odwrotnie. Nie zawsze, ale wystarczająco często, żeby gracz czuł dylemat.

Gracz nie powinien czuć, że optymalizuje liczby. Powinien czuć, że podejmuje decyzje fabularne jako Mistrz Gry.

---

## 3. Stany końcowe (Game Over)

### Psychika → 0
> **"Siedzę w kącie i szeptem tłumaczę zasady ścianie. Sesja trwa beze mnie."**

*Trigger:* Paweł zbyt często ustępował dzieciom.

### Zaangażowanie → 0
> **"Dzieci bawią się w berka w ogrodzie. Nikt nie pamięta, że w lochach czeka smok."**

*Trigger:* Paweł był zbyt restrykcyjny — fabuła wygrała, ale straciła publiczność.

### Zaangażowanie → 100
> **"Dzieci przejęły narrację. Jestem teraz NPC o imieniu 'Stary Typ'. Proszę o wodę, ale nikt mnie nie słyszy."**

*Trigger:* Paweł puszczał wodze za często — chaos stał się nową normą.

### Ekran Game Over zawiera
- Humorystyczny tytuł zakończenia
- Liczbę rozegranych kart
- Przycisk: **"Zagraj jeszcze raz"**

---

## 4. Struktura karty

### Pola

| Pole | Typ | Opis |
|---|---|---|
| `id` | string | Unikalny identyfikator |
| `illustration` | string | Emoji lub nazwa pliku grafiki |
| `situation` | string | Treść sytuacji (1–2 zdania, pierwsza osoba lub narracja) |
| `left_label` | string | Etykieta lewego wyboru (2–5 słów) |
| `right_label` | string | Etykieta prawego wyboru (2–5 słów) |
| `left_feedback` | string | Komentarz narracyjny po wyborze lewym (1 zdanie) |
| `right_feedback` | string | Komentarz narracyjny po wyborze prawym (1 zdanie) |
| `left_effects` | object | `{ "sanity": int, "engagement": int }` |
| `right_effects` | object | `{ "sanity": int, "engagement": int }` |

### Zasada etykiet
Etykiety opisują **reakcję Pawła**, nie skutek mechaniczny. Gracz podejmuje decyzję fabularną, nie optymalizuje liczby.

### Format JSON (przykład)

```json
{
  "id": "redstone",
  "illustration": "🎮",
  "situation": "Jedno z dzieci zaczyna tłumaczyć, jak działa farma redstone w Minecrafcie.",
  "left_label": "Słucham uważnie",
  "right_label": "Wracamy do gry",
  "left_feedback": "Teraz wiem o redstone więcej niż chciałem wiedzieć przez całe życie.",
  "right_feedback": "Dziecko kiwa głową i przez chwilę milczy. Przez chwilę.",
  "left_effects": { "sanity": -10, "engagement": 5 },
  "right_effects": { "sanity": 5, "engagement": -10 }
}
```

---

## 5. Talia kart (25 kart)

### Balans

| Efekt dominujący | Liczba kart |
|---|---|
| Zaangażowanie ↑, Psychika ↓ | 17 |
| Psychika ↑, Zaangażowanie ↓ | 6 |
| Mieszane / obie opcje kosztują | 2 |

Celowo więcej kart kusi Zaangażowaniem kosztem Psychiki — bo tak działa praca z dziećmi.

---

### Karta 01 — Farma redstone

**Sytuacja:** Jedno z dzieci zaczyna tłumaczyć, jak działa farma redstone w Minecrafcie.

| | Lewo | Prawo |
|---|---|---|
| **Etykieta** | Słucham uważnie | Wracamy do gry |
| **Feedback** | Teraz wiem o redstone więcej niż chciałem wiedzieć przez całe życie. | Dziecko kiwa głową i przez chwilę milczy. Przez chwilę. |
| **Efekty** | Psychika -10 / Zaangażowanie +5 | Psychika +5 / Zaangażowanie -10 |

---

### Karta 02 — Siedemnaście wilków

**Sytuacja:** Dziecko chce zabrać ze sobą siedemnaście wilków jako zwierzęta towarzyszące.

| | Lewo | Prawo |
|---|---|---|
| **Etykieta** | Niech ma wilki | Tylko jeden wilk |
| **Feedback** | Drużyna porusza się teraz w otoczeniu wyjącego stada. Klimat jest. | Kompromis osiągnięty. Wilk ma na imię Błysk. |
| **Efekty** | Psychika -10 / Zaangażowanie +15 | Psychika +5 / Zaangażowanie -5 |

---

### Karta 03 — Oswajanie złoczyńcy

**Sytuacja:** Dzieci chcą oswoić Mrocznego Władcę zamiast z nim walczyć.

| | Lewo | Prawo |
|---|---|---|
| **Etykieta** | Pozwalam im spróbować | Mroczny Władca atakuje |
| **Feedback** | Mroczny Władca ma teraz na imię Pan Puszek i wymaga głaskania co turę. | Piorun ognisty. Walka wróciła na właściwe tory. |
| **Efekty** | Psychika -15 / Zaangażowanie +10 | Psychika +5 / Zaangażowanie -10 |

---

### Karta 04 — Goblińska piekarnia

**Sytuacja:** Dzieci ignorują główny quest i otwierają piekarnię w mieście goblinów.

| | Lewo | Prawo |
|---|---|---|
| **Etykieta** | Improwizuję | Wracam do fabuły |
| **Feedback** | Kampania jest teraz o lokalnym biznesie gastronomicznym. Mam nową fabułę. | Zaginiony książę czeka. Dzieci wracają niechętnie. |
| **Efekty** | Psychika -10 / Zaangażowanie +10 | Psychika +5 / Zaangażowanie -15 |

---

### Karta 05 — Miecz świetlny w lochach

**Sytuacja:** Jedno z dzieci pyta, czy jego postać może mieć miecz świetlny.

| | Lewo | Prawo |
|---|---|---|
| **Etykieta** | Wymyślam powód | Nie ma mieczy świetlnych |
| **Feedback** | To starożytna elfia technologia. Nikt nie pyta dalej. | Dostaje zwykły miecz. Jest piękny. Dziecko jest rozczarowane. |
| **Efekty** | Psychika -15 / Zaangażowanie +15 | Psychika +5 / Zaangażowanie -10 |

---

### Karta 06 — Telefon w trakcie walki

**Sytuacja:** W połowie epickiej bitwy z hydrą jedno z dzieci wyciąga telefon.

| | Lewo | Prawo |
|---|---|---|
| **Etykieta** | Czekam | Konfiskuję telefon |
| **Feedback** | Hydra też czeka. Wszyscy czekamy. Hydra wygląda na zmęczoną. | Telefon znika. Walka wraca. Atmosfera jest napięta. |
| **Efekty** | Psychika -10 / Zaangażowanie -5 | Psychika +5 / Zaangażowanie -15 |

---

### Karta 07 — Urodzinowy przywilej

**Sytuacja:** Jubilat oznajmia, że powinien wygrywać każdą walkę, bo ma urodziny.

| | Lewo | Prawo |
|---|---|---|
| **Etykieta** | Ma rację | Rzucamy kością |
| **Feedback** | Bohater jubilata jest dziś niepokonany. Dzieci są zachwycone. Ja mniej. | Los jest bezstronny. Nawet w urodziny. |
| **Efekty** | Psychika -10 / Zaangażowanie +10 | Psychika +5 / Zaangażowanie -5 |

---

### Karta 08 — Kłótnia o siłę postaci

**Sytuacja:** Dwoje dzieci kłóci się, czyja postać jest silniejsza.

| | Lewo | Prawo |
|---|---|---|
| **Etykieta** | Organizuję pojedynek | Oboje są równi |
| **Feedback** | Wygrywa szczęśliwszy rzut. Przegrana strona jest oburzona. | Ogłaszam remis dyplomatyczny. Nikt nie jest zadowolony. |
| **Efekty** | Psychika -10 / Zaangażowanie +10 | Psychika +5 / Zaangażowanie -10 |

---

### Karta 09 — Adopcja potwora

**Sytuacja:** Dzieci pokonały trolka i chcą go teraz adoptować.

| | Lewo | Prawo |
|---|---|---|
| **Etykieta** | Trolek dołącza do drużyny | Trolek ucieka |
| **Feedback** | Ma na imię Grześ i nosi plecak. Dzieci go kochają. | Trolek wraca do swojego bagna. Żegnamy go z mieszanymi uczuciami. |
| **Efekty** | Psychika -15 / Zaangażowanie +15 | Psychika +5 / Zaangażowanie -10 |

---

### Karta 10 — Przerwa na przekąski

**Sytuacja:** W trakcie finałowej bitwy dzieci oznajmiają, że są głodne.

| | Lewo | Prawo |
|---|---|---|
| **Etykieta** | Robimy przerwę | Po walce |
| **Feedback** | Wracam z herbatą. Mam chwilę spokoju. Cenię ją. | Motywuję ich perspektywą nagrody. Bitwa przyspiesza. |
| **Efekty** | Psychika +10 / Zaangażowanie -5 | Psychika -5 / Zaangażowanie +5 |

---

### Karta 11 — Wszyscy mówią naraz

**Sytuacja:** Każde dziecko wykrzykuje inny plan ataku jednocześnie.

| | Lewo | Prawo |
|---|---|---|
| **Etykieta** | Niech mówią | Cisza! |
| **Feedback** | Z chaosu wyłania się coś na kształt strategii. Jakoś. | Patrzą na mnie z respektem. To uczucie nie potrwa długo. |
| **Efekty** | Psychika -15 / Zaangażowanie +5 | Psychika +10 / Zaangażowanie -15 |

---

### Karta 12 — Śmierć bohatera

**Sytuacja:** Postać jednego z dzieci ginie od smoczego oddechu.

| | Lewo | Prawo |
|---|---|---|
| **Etykieta** | Bohater jednak żyje | Śmierć to część gry |
| **Feedback** | Cudowne ocalenie. Dziecko znów się uśmiecha. Moje zasady płaczą. | Płakało przez trzy minuty, potem stworzyło nowego bohatera z toporem. |
| **Efekty** | Psychika -10 / Zaangażowanie +10 | Psychika +5 / Zaangażowanie -15 |

---

### Karta 13 — Zdrada w drużynie

**Sytuacja:** Jedno z dzieci szepce mi na ucho, że chce zdradzić resztę drużyny.

| | Lewo | Prawo |
|---|---|---|
| **Etykieta** | Zdrada wchodzi | Działajcie razem |
| **Feedback** | Chaos. Krzyki. Śmiech. Ktoś rzuca kością przez stół. | Jedność drużyny zostaje przywrócona. Dziecko jest rozczarowane. |
| **Efekty** | Psychika -10 / Zaangażowanie +15 | Psychika +5 / Zaangażowanie -5 |

---

### Karta 14 — Dziura w zasadach

**Sytuacja:** Dziecko znalazło w podręczniku lukę, która czyni jego postać nieśmiertelną.

| | Lewo | Prawo |
|---|---|---|
| **Etykieta** | Luka działa | Jestem Mistrzem Gry |
| **Feedback** | Nieśmiertelny elf w pierwszej lidze. Nie wiem, co robię z życiem. | Zamykam podręcznik. Moje słowo jest prawem. Wzrok dzieci mówi inaczej. |
| **Efekty** | Psychika -10 / Zaangażowanie +5 | Psychika +5 / Zaangażowanie -10 |

---

### Karta 15 — Smok jako wierzchowiec

**Sytuacja:** Dzieci chcą dosiadać smoka zamiast z nim walczyć.

| | Lewo | Prawo |
|---|---|---|
| **Etykieta** | Smok jest wierzchowcem | Smok odlatuje |
| **Feedback** | Lecimy nad królestwem. Dzieci są zachwycone. Smok mniej. | Smok kpi z nas i znika za chmurami. Wracamy na ziemię. |
| **Efekty** | Psychika -10 / Zaangażowanie +15 | Psychika +5 / Zaangażowanie -10 |

---

### Karta 16 — Rodzic woła dziecko

**Sytuacja:** Mama jednego z graczy woła go z drugiego pokoju.

| | Lewo | Prawo |
|---|---|---|
| **Etykieta** | Gra czeka | Gramy bez niego chwilę |
| **Feedback** | Siedzę w ciszy. To chwila spokoju, której nie zaplanowałem. | Jego postać 'idzie po wodę'. Wróci za minutę. Może. |
| **Efekty** | Psychika +10 / Zaangażowanie -10 | Psychika -5 / Zaangażowanie +5 |

---

### Karta 17 — Współczucie dla złoczyńcy

**Sytuacja:** Dzieci wysłuchały historii Mrocznego Czarnoksiężnika i teraz mu współczują.

| | Lewo | Prawo |
|---|---|---|
| **Etykieta** | Czarnoksiężnik przemawia | Czarnoksiężnik atakuje |
| **Feedback** | Wzruszająca przemowa o trudnym dzieciństwie. Ktoś płacze. Ja też trochę. | Koniec sentymentów. Kule ognia są uczciwe. |
| **Efekty** | Psychika -10 / Zaangażowanie +10 | Psychika +5 / Zaangażowanie -5 |

---

### Karta 18 — Liczenie łupów

**Sytuacja:** Dzieci zatrzymują się na 20 minut, żeby posortować zdobyty skarb według koloru.

| | Lewo | Prawo |
|---|---|---|
| **Etykieta** | Sortujcie | Czas na przygodę |
| **Feedback** | Matematyka, negocjacje, małe kłótnie. Żyję. | Skarb trafi do ekwipunku później. Teraz czeka dungeon. |
| **Efekty** | Psychika -10 / Zaangażowanie +5 | Psychika +5 / Zaangażowanie -10 |

---

### Karta 19 — Sojusz z Królem Goblinów

**Sytuacja:** Dzieci chcą zaproponować sojusz Królowi Goblinów zamiast go pokonać.

| | Lewo | Prawo |
|---|---|---|
| **Etykieta** | Sojusz zostaje zawarty | Gobliny są wrogami |
| **Feedback** | Gobliny są teraz sprzymierzeńcami. Wszystko, co wiedziałem o tej kampanii, przestaje obowiązywać. | Dyplomacja kończy się przed trojgiem drzwi lochu. |
| **Efekty** | Psychika -10 / Zaangażowanie +10 | Psychika +5 / Zaangażowanie -10 |

---

### Karta 20 — Nadawanie imion wszystkiemu

**Sytuacja:** Dzieci chcą nadać imię każdemu NPC, zwierzęciu i większemu kamieniowi.

| | Lewo | Prawo |
|---|---|---|
| **Etykieta** | Nadajcie imiona | To są bezimienni wieśniacy |
| **Feedback** | Kamień przy wejściu do lochu ma na imię Zbyszek. Akceptuję to. | Wieśniacy są bezimienni i tak zostanie. Dzieci protestują. |
| **Efekty** | Psychika -15 / Zaangażowanie +10 | Psychika +5 / Zaangażowanie -10 |

---

### Karta 21 — Epicka przemowa

**Sytuacja:** Dziecko chce wygłosić 10-minutową przemowę do armii orków przed bitwą.

| | Lewo | Prawo |
|---|---|---|
| **Etykieta** | Słucham przemowy | Rzut na perswazję |
| **Feedback** | Orki są wzruszone. Ja też. Nie spodziewałem się tego. | Kości decydują. Rzut 17. Orki oklaskują i odchodzą. |
| **Efekty** | Psychika -10 / Zaangażowanie +15 | Psychika +5 / Zaangażowanie +5 |

---

### Karta 22 — Spór o mapę

**Sytuacja:** Dzieci nie mogą uzgodnić, czy iść w lewo do wulkanu, czy w prawo do zamku.

| | Lewo | Prawo |
|---|---|---|
| **Etykieta** | Dzielimy drużynę | Rzut na orientację |
| **Feedback** | Dwie grupy, dwie fabuły, jeden ja. Nie wiem, co robię. | Kość decyduje. Zamek. Wulkan poczeka. |
| **Efekty** | Psychika -15 / Zaangażowanie +5 | Psychika +5 / Zaangażowanie -5 |

---

### Karta 23 — Latający ognisty kot

**Sytuacja:** Dziecko chce mieć znajomego — kota, który lata i zieje ogniem.

| | Lewo | Prawo |
|---|---|---|
| **Etykieta** | Magiczny kociak istnieje | Koty nie latają |
| **Feedback** | Ma na imię Płomyk. Jest uroczy i niebezpieczny. Głównie niebezpieczny. | Dostaje zwykłego kota. Dziecko jest rozczarowane. Kot też chyba. |
| **Efekty** | Psychika -10 / Zaangażowanie +15 | Psychika +5 / Zaangażowanie -5 |

---

### Karta 24 — Sesja się nie kończy

**Sytuacja:** Jest już późno. Rodzice zaraz przyjadą. Dzieci krzyczą, że sesja nie może się skończyć.

| | Lewo | Prawo |
|---|---|---|
| **Etykieta** | Jeszcze jedna scena | Sesja kończy się tutaj |
| **Feedback** | Gramy dalej. Nie wiem, co jest za tymi drzwiami, ale to będzie epickie. | "Bohaterowie odpoczywają przy ognisku." Dzieci wzdychają. Ja nie. |
| **Efekty** | Psychika -15 / Zaangażowanie +10 | Psychika +10 / Zaangażowanie -15 |

---

### Karta 25 — Zwrot na stronę zła

**Sytuacja:** Dziecko oznajmia, że jego bohater przechodzi na stronę zła, bo złoczyńcy mają lepsze stroje.

| | Lewo | Prawo |
|---|---|---|
| **Etykieta** | Pozwalam na zwrot fabularny | Stroje dobra też są spoko |
| **Feedback** | Drużyna ma teraz wewnętrznego zdrajcę. Genialne i przerażające jednocześnie. | Wymieniamy płaszcze. Bohater zostaje bohaterem. Na razie. |
| **Efekty** | Psychika -15 / Zaangażowanie +15 | Psychika +5 / Zaangażowanie -5 |

---

## 6. Wizualny feedback zasobów

Po każdej decyzji:
- Paski zasobów animują się płynnie
- Przy pasku pojawia się liczba zmiany (+10, -5 itp.) przez ~1.5 sekundy
- Zmiany są widoczne, ale nie dominują ekranu — focus pozostaje na fabule i humorze

---

## 7. Filozofia designu

Gracze nie powinni czuć, że optymalizują liczby. Powinni czuć, że podejmują śmieszne decyzje Mistrza Gry.

System zasobów istnieje tylko po to, żeby tworzyć napięcie między:
- utrzymaniem zaangażowania dzieci
- ochroną resztek psychiki Pawła

Najlepsza decyzja nie zawsze powinna być oczywista. Czasem zachowanie psychiki zaszkodzi zaangażowaniu. Czasem bawienie dzieci wywoła chaos. To napięcie jest rdzeniem gry.
