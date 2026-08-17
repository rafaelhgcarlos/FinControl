# FinControl

Base do MVP do FinControl em React, TypeScript, Vite, Firebase e Tailwind CSS.

## Guias internos

- [Design System](docs/design-system.md): tokens, componentes-base, estados e regras de uso.
- [Arquitetura](docs/architecture.md): estrutura por features, critérios de pertencimento e estratégia de migração gradual.

## Requisitos

- Node.js 20+
- JDK 21+ para executar os emuladores do Firebase
- Firebase CLI para emuladores locais quando necessario

## Scripts

- `npm run dev`: inicia o Vite
- `npm run build`: valida TypeScript strict e gera `dist`
- `npm run lint`: executa ESLint
- `npm run test`: executa Vitest
- `npm run test:rules`: valida Security Rules e isolamento usando o emulador do Firestore
- `npm run test:e2e`: executa a jornada integrada em Chromium com Auth e Firestore locais
- `npm run test:mvp`: executa lint, testes unitarios, Security Rules, jornada E2E e build
- `npm run firebase:emulators`: inicia os emuladores locais de Authentication e Firestore
- `npm run firebase:deploy-rules`: publica as regras do Firestore no projeto configurado

## Firebase

O MVP deve permanecer no Firebase Spark. A configuracao inicial usa Authentication e Cloud Firestore, com regras em `firestore.rules`, indices em `firestore.indexes.json` e emuladores em `firebase.json`.

Copie `.env.example` para `.env.local` e preencha as variaveis do projeto Firebase. Quando `VITE_USE_FIREBASE_EMULATORS=true`, inicie `npm run firebase:emulators` antes de `npm run dev`. Os emuladores usam Auth em `127.0.0.1:9099` e Firestore em `127.0.0.1:8080`.

Para usar o Firebase remoto, autentique o CLI com `firebase login` e publique as regras com `npm run firebase:deploy-rules`.

## Validacao completa do MVP

A jornada da issue #17 usa apenas o projeto descartavel `demo-fincontrol` e os emuladores locais. Ela nao le nem grava dados de producao e permanece compativel com o plano Spark.

Na primeira execucao, instale o Chromium usado pelo Playwright:

```bash
npx playwright install chromium
```

Depois execute toda a validacao:

```bash
npm ci
npm run test:mvp
```

A suite cria usuarios unicos e descartaveis a cada execucao e cobre cadastro, contas, categorias, receitas, despesas, transferencias, dashboard, historico, cartoes, compra parcelada, fatura, recorrencias, orcamentos, metas, calendario, relatorios e configuracoes. Tambem verifica saldos e valores agregados, isolamento entre dois usuarios, modo offline, dark mode, cancelamento e o launcher global em desktop e smartphone. Os estados unitarios e de erro continuam cobertos pelo Vitest; as Security Rules e o isolamento por usuario sao executados em `test:rules`.

Os dados dos emuladores sao descartados ao final de `test:e2e`. Relatorios HTML e traces de falha ficam em `playwright-report/` e `test-results/`, ambos ignorados pelo Git.

A jornada usa nomes acessíveis e resultados financeiros como contratos para permanecer válida durante evoluções visuais.

### Administracao no plano Spark

O papel administrativo nao pode ser concedido pelo cliente. Para promover um usuario, crie manualmente pelo Console do Firebase o documento `admins/{uid}` com `active: true` e `createdAt` como timestamp. As Security Rules permitem que o usuario leia somente a propria associacao e impedem criacao ou alteracao pelo aplicativo.

A metrica opcional de usuarios cadastrados deve ser publicada manualmente em `adminMetrics/overview`, usando apenas `registeredUsers` e `updatedAt`. Administradores gerenciam categorias globais e consultam auditoria, mas continuam sem acesso às colecoes financeiras privadas. Cada alteracao administrativa grava no mesmo lote apenas `userId`, acao, entidade, ID e timestamp.
