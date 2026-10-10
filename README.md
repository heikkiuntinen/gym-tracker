# Treeniloki-sovellus

Henkilökohtainen salikehityksen seurantasovellus. Projektin tarkoitus oli
opetella React-, Supabase- ja SQL-teknologioita käytännön kautta, ja samalla
rakentaa itselle sopiva sovellus treenien seuraamiseen.

## Teknologiat

- React + Vite
- Supabase (Postgres, Auth, Row Level Security)

## Ominaisuudet

- Kirjautuminen (sähköposti + salasana)
- Liikkeiden hallinta, luokiteltuna päälihasryhmän mukaan
- Harjoitusohjelmien kokoaminen liikkeistä, tavoitteineen (sarjat × toistot,
  min–max-vaihteluvälillä)


## Kansiorakenne
```bash
.
├── eslint.config.js
├── index.html
├── package.json
├── package-lock.json
├── public
│   ├── favicon.svg
│   └── icons.svg
├── README.md
├── src
│   ├── App.css
│   ├── App.jsx
│   ├── assets
│   │   ├── hero.png
│   │   ├── react.svg
│   │   └── vite.svg
│   ├── Auth.jsx
│   ├── Exercises.jsx
│   ├── index.css
│   ├── lib
│   │   └── supabaseClient.js
│   ├── main.jsx
│   └── Routines.jsx
└── vite.config.js
```

## Sovelluksen käynnistäminen
```bash
npm run dev
````

API välimuistin päivitys supabasen SQL-tablessa:
```
notify pgrst, 'reload schema'
```