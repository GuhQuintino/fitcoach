# Slice Summary - Sanitização e Primeiro Nome do Coach em Mensagens de WhatsApp e Contato

- **Status:** COMPLETED
- **Perfil / Stack:** `full-stack` / PWA (React 19 + TypeScript + Vite + Tailwind CSS + Vitest)
- **Arquivos Criados/Modificados:**
  - `utils/textUtils.ts`: Adicionado helper puro e canônico `getFirstName(fullName?: string | null, fallback = ''): string` com divisão por whitespace e fallback resiliente.
  - `pages/student/Dashboard.tsx`: Atualização de telas de aprovação pendente, renovação de acesso vencido, card "Falar com Coach" e mensagem direta de WhatsApp (`Olá Gustavo! Você poderia me ajudar?`), substituindo sobrenomes por primeiro nome e normalizando aria-labels.
  - `pages/student/Profile.tsx`: Atualização da função `getWhatsappUrl()` com primeiro nome sanitizado e mensagem padronizada (`Olá Gustavo! Você poderia me ajudar?`), além de aria-label e texto do botão "Falar com Gustavo".
  - `pages/WaitingApproval.tsx`: Atualização da mensagem de pré-cadastro para WhatsApp (`Olá Gustavo! Meu nome é ... e acabei de criar minha conta no Fitcoach. Poderia liberar meu acesso?`) e texto informativo da UI ("O treinador Gustavo liberará seu acesso em breve.").
  - `tests/unit/phoneAndTextUtils.test.ts`: Atualização com testes unitários para a função `getFirstName`.
  - `tests/unit/coachNameFormatting.regression.test.ts`: Criação de suíte de teste de regressão dedicada com 14 asserções estritas validando extração de nome, casos de borda e blindagem contra vazamento de sobrenomes ("Quintino", "Santos") em URLs e interfaces.

### Entregas End-to-End da Fatia:
1. **Dados & Modelos:** Preservado o schema canônico de `profiles.full_name` sem alteração de banco, tratando em nível de utilitário puro e formatador na camada de aplicação.
2. **Serviços & Contratos:** `getFirstName` exportado em `utils/textUtils.ts` atendendo aos contratos do Dashboard, Profile e WaitingApproval.
3. **Interface & Componentes:** Cards, botões e telas informativas atualizados com primeiro nome amigável e acessibilidade WCAG (aria-labels atualizados e coerentes).
4. **Testes & Validação:** 
   - `npx vitest run tests/unit/coachNameFormatting.regression.test.ts tests/unit/phoneAndTextUtils.test.ts`: 24/24 testes aprovados.
   - `npm test`: 27 arquivos de teste, 262/262 testes aprovados.
   - `npx tsc --noEmit`: 0 erros de tipagem.
   - `npm run build`: Build de produção Vite concluído com sucesso em 9.10s.

### Desvios / Decisões Técnicas (Deviation Rules):
- **Regra 1 (Bug Fix Autônomo) & Anti-Regression Mandate:** Implementado teste de regressão específico (`tests/unit/coachNameFormatting.regression.test.ts`) contendo asserções negativas estritas (`expect(message).not.toContain('Quintino')` e `expect(message).not.toContain('Santos')`) para blindar contra qualquer reincidência.

### Handover para Stage 3 / Stage 4:
- Rotas afetadas para inspeção:
  - `/#/student/dashboard`: Card "Falar com Coach" na seção de atalhos inferiores, telas condicionais de pendência e vencimento.
  - `/#/student/profile`: Botão WhatsApp do Coach no cabeçalho.
  - `/#/waiting-approval`: Tela de onboarding pós-cadastro do aluno.
