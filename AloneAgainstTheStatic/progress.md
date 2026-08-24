Original prompt: przy wyborze postaci w [AloneAgainstTheStatic](AloneAgainstTheStatic/) dodaj grafikę postaci - [charlie.png](AloneAgainstTheStatic/media/img/charlie.png) oraz [alex.png](AloneAgainstTheStatic/media/img/alex.png)

- Dodano portrety `media/img/alex.png` i `media/img/charlie.png` do kafelków wyboru postaci.
- Przebudowano układ kafelków, aby portret, dane postaci i wskaźnik wyboru mieściły się responsywnie.
- `npm test`: 164/164 testów zaliczonych.
- `npm run validate`: 0 błędów; 17 istniejących ostrzeżeń o nieprzepisanych paragrafach i flagach.
- Zweryfikowano wizualnie ekran wyboru przy 1280×720 i 390×844: oba portrety są widoczne i nie kolidują z tekstem.
- Zweryfikowano wybór Alex: ekran przechodzi do gry (paragraf 1, dwa aktywne wybory), bez błędów konsoli.
- Powiększono portrety i usunięto pionowe przesunięcie kafelka Charlie.
- Siatka wymusza teraz identyczną wysokość obu pól wyboru przy każdym układzie.
- Po zmianie ponownie zaliczono 172/172 testy i walidację z 0 błędów.
- Widok 1280×720: kafelki są wyrównane i mają identyczne wymiary.
- Widok 390×844: oba kafelki mają dokładnie 353,21875 × 216 px, a oba portrety 105,296875 × 137,609375 px.
- Wybór Alex nadal przechodzi do paragrafu 1 z dwoma aktywnymi wyborami; brak błędów konsoli.
- TODO: brak.
