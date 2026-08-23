# Fear of the Unknown — generator

Statyczna aplikacja do losowania tabel tworzenia miasta, postaci i tajemnicy.

## Uruchomienie

```bash
node FearOfTheUnknown/scripts/build-data.mjs
python3 -m http.server 8080
```

Następnie otwórz `http://127.0.0.1:8080/FearOfTheUnknown/`.

## Źródła danych

- `PDF_input/FearOfTheUnknown/PL/3_fotu_CREATION_1_town.md`
- `PDF_input/FearOfTheUnknown/PL/4_fotu_CREATION_2_character.md`
- `PDF_input/FearOfTheUnknown/PL/8_fotu_oracle.md`
- `PDF_input/FearOfTheUnknown/PL/fotu_d66_tabele_PL_miasteczko_PL90_poprawka.csv`

Po zmianie źródeł uruchom ponownie `scripts/build-data.mjs`, aby odświeżyć
`data.js`.
