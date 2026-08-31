# RUBRICA 6D & CRITÉRIOS DE ACEITAÇÃO GAUNTLET

Toda entrega no Fitcoach Pro deve ser avaliada e aprovada rigorosamente sob os 6 pilares de qualidade:

| Dimensão | Peso | Descrição & Critérios |
|---|:---:|---|
| **D1: Funcionalidade** | 20% | Atendimento total aos requisitos de negócio, tratamento de casos de borda e zero regressão funcional. |
| **D2: Robustez & Resiliência** | 20% | Tratamento gracioso de erros, operação offline completa (PWA), sincronização sem perda de dados e logs informativos. |
| **D3: Experiência / Uau (Craft)** | 20% | Clareza visual imediata, microinterações fluidas, loading/empty states polidos, tipografia intencional e alto valor percebido. |
| **D4: Consistência & Theming** | 15% | Respeito estrito aos Design Tokens, paleta Sky/Slate, modo claro e escuro calibrados e tipografia `Outfit` / `DM Sans`. |
| **D5: Performance** | 10% | Rotas sob `React.lazy()`, memoização de componentes reativos, assets com `loading="lazy"`, zero *layout thrashing*. |
| **D6: Testabilidade & A11y** | 15% | 100% de conformidade com WCAG 2.1 AA, semântica WAI-ARIA, navegação por teclado e zero erros de tipo (`tsc --noEmit`). |

### 🚫 Bloqueantes Automáticos (FAIL)
- Erros de compilação TypeScript (`tsc --noEmit != 0`).
- Violações de detectores de design (`detect.mjs`).
- Touch targets inferiores a $44 \times 44\text{px}$ em fluxos primários de toque.
- Regressão de tema (texto ilegível no modo claro ou escuro).
