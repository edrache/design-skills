// Nazwy cech i umiejętności wg polskiego Startera 7. edycji Zewu Cthulhu
// (Black Monk Games). Dane trzymają klucze angielskie, więc tłumaczenie żyje
// tutaj i jest wspólne dla karty postaci oraz dziennika rzutów.
export const SKILLS_PL = {
  "Credit Rating": "Majętność",
  Dodge: "Unik",
  "Drive Auto": "Prowadzenie Samochodu",
  "Fighting (Brawl)": "Walka Wręcz (Bijatyka)",
  "First Aid": "Pierwsza Pomoc",
  Intimidate: "Zastraszanie",
  "Language (Own)": "Język Ojczysty",
  Listen: "Nasłuchiwanie",
  Luck: "Szczęście",
  "Natural World": "Wiedza o Naturze",
  Navigate: "Nawigacja",
  Persuade: "Perswazja",
  Psychology: "Psychologia",
  Sanity: "Poczytalność",
  "Science (Biology)": "Nauka (Biologia)",
  "Science (Chemistry)": "Nauka (Chemia)",
  "Spot Hidden": "Spostrzegawczość",
  Stealth: "Ukrywanie",
};

export const CHARACTERISTICS_PL = {
  STR: "S",
  CON: "KON",
  SIZ: "BC",
  DEX: "ZR",
  APP: "WYG",
  INT: "INT",
  POW: "MOC",
  EDU: "WYK",
};

// Nieznana nazwa zostaje w oryginale — lepiej pokazać angielski klucz niż nic.
export function termName(name, locale) {
  if (locale !== "pl") return name;
  return SKILLS_PL[name] ?? CHARACTERISTICS_PL[name] ?? name;
}
