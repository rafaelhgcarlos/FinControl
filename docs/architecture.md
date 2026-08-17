# Arquitetura do frontend

O projeto adota migração oportunística por domínio. Não há objetivo de mover todos os arquivos de uma vez.

## Estrutura-alvo

```text
src/
  components/ui/       primitives visuais sem regra financeira
  features/<dominio>/  componentes, hooks, serviços e utilitários do domínio
  firebase/            configuração, coleções e integração Firestore
  shared/              contratos realmente usados por vários domínios
  routes/              composição de rotas
  pages/               composição temporária de páginas durante a migração
```

## Critérios de pertencimento

- Um componente vai para `components/ui` quando pode ser usado sem conhecer entidades financeiras.
- Código que menciona cartão, fatura, parcela ou compra pertence a `features/cards`.
- Um tipo permanece compartilhado quando é contrato entre dois ou mais domínios, como cartões usados por analytics, orçamento e recorrências.
- Acesso ao Firebase específico de um domínio deve ficar próximo da feature; configuração e conversores genéricos permanecem compartilhados.
- `pages` coordena autenticação, carregamento e navegação enquanto a migração for gradual. Não deve duplicar apresentação já existente na feature.

## Feature-piloto: cartões

`features/cards` contém apresentação, formulários, serviços, estado de visualização da fatura e componentes testados. `features/cards/index.ts` é sua API pública, e a página `CardsPage` funciona como orquestradora. Os tipos de cartão continuam em `types/creditCard.ts` porque analytics, calendário, orçamento e recorrências consomem esse contrato.

Novos trabalhos em cartões devem entrar pela API pública da feature e evitar imports profundos fora dela. Mover arquivos só é válido quando reduz acoplamento real e mantém testes, lint e build verdes.

## Dependências

- `components/ui` não importa `features`, `pages` ou serviços financeiros.
- Uma feature pode importar UI, Firebase e contratos compartilhados.
- Features não devem importar páginas.
- Serviços compartilhados não devem depender de componentes React.
- Exports públicos evitam que consumidores conheçam a estrutura interna da feature.

Imports circulares devem ser verificados pelo desenho das dependências e pelo build TypeScript. Se duas features precisarem do mesmo contrato, ele deve ser promovido para `shared`/`types`, não duplicado.
