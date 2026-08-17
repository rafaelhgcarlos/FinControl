# Design System do FinControl

O FinControl usa um design system leve, construído com Tailwind, variáveis CSS e Lucide. A fonte dos tokens está em `src/styles/tokens.css`; o mapeamento para utilitários está em `tailwind.config.ts`.

## Princípios

- Use tokens semânticos (`surface`, `foreground`, `border`, `primary`, `success`, `warning`, `danger` e `info`) em componentes compartilhados. Evite repetir valores hexadecimais.
- Estado nunca deve ser comunicado apenas por cor: combine cor com texto, ícone ou atributo acessível.
- Controles interativos têm alvo mínimo de 44 px no mobile, foco visível e estado `disabled`.
- Light e dark mode alteram os mesmos tokens; componentes não devem criar paletas paralelas sem necessidade de domínio.
- Componentes de UI não conhecem contas, cartões ou transações. Componentes financeiros ficam dentro de `features/*`.

## Tokens

| Grupo | Tokens principais | Uso |
| --- | --- | --- |
| Superfície | `canvas`, `surface`, `surface-subtle` | página, cards e áreas secundárias |
| Texto | `foreground`, `muted-foreground` | conteúdo principal e auxiliar |
| Estrutura | `border`, `rounded-control`, `rounded-surface`, `shadow-surface` | contornos, raio e elevação |
| Ação | `primary`, `primary-foreground` | ação principal e foco |
| Estado | `success`, `warning`, `danger`, `info` | feedback acompanhado de texto/ícone |

## Componentes-base

- `Button`: variantes `primary`, `secondary`, `ghost` e `danger`; use `loading` durante operações assíncronas.
- `IconButton`: exige `aria-label` e deve ser usado para ações somente com ícone.
- `Input`, `CurrencyInput`, `Select` e `Textarea`: compartilham o mesmo estilo em `components/ui/styles.ts`.
- `Card`: variantes `default`, `subtle` e `interactive`.
- `Badge` representa estado local com rótulo. Feedback transitório usa a API global `useToast` (`success`, `error`, `warning` e `info`), com fechamento automático, ação secundária opcional e `alert` para erros.
- `Modal` e `ConfirmDialog`: diálogo genérico e confirmação destrutiva padronizada.
- `Tabs`: navegação entre seções com semântica `tablist`/`tab`.
- `LoadingState`, `Skeleton`, `CardSkeleton`, `ListSkeleton`, `TableSkeleton` e `DashboardSkeleton`: spinner para espera curta e skeletons que preservam a estrutura do conteúdo.
- `Progress`: representa apenas percentuais derivados de valores reais; não use progresso fictício para operações de duração indeterminada.
- `EmptyState`: explica por que não há conteúdo e oferece uma próxima ação quando ela existe.

## Regras de uso

1. Procure um componente existente antes de criar markup local equivalente.
2. Adicione variantes ao componente-base apenas quando o padrão ocorrer em mais de um contexto.
3. Classes específicas do domínio podem complementar tokens, mas não devem redefinir foco, disabled ou estados semânticos.
4. Componentes novos precisam funcionar por teclado, em dark mode e em largura mobile.
