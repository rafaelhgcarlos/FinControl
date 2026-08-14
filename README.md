# FinControl

Base do MVP do FinControl em React, TypeScript, Vite, Firebase e Tailwind CSS.

## Requisitos

- Node.js 20+
- JDK 21+ para executar os emuladores do Firebase
- Firebase CLI para emuladores locais quando necessario

## Scripts

- `npm run dev`: inicia o Vite
- `npm run build`: valida TypeScript strict e gera `dist`
- `npm run lint`: executa ESLint
- `npm run test`: executa Vitest
- `npm run firebase:emulators`: inicia os emuladores locais de Authentication e Firestore
- `npm run firebase:deploy-rules`: publica as regras do Firestore no projeto configurado

## Firebase

O MVP deve permanecer no Firebase Spark. A configuracao inicial usa Authentication e Cloud Firestore, com regras em `firestore.rules`, indices em `firestore.indexes.json` e emuladores em `firebase.json`.

Copie `.env.example` para `.env.local` e preencha as variaveis do projeto Firebase. Quando `VITE_USE_FIREBASE_EMULATORS=true`, inicie `npm run firebase:emulators` antes de `npm run dev`. Os emuladores usam Auth em `127.0.0.1:9099` e Firestore em `127.0.0.1:8080`.

Para usar o Firebase remoto, autentique o CLI com `firebase login` e publique as regras com `npm run firebase:deploy-rules`.
