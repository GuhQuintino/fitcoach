# Slice Summary - Restauração do Padrão Visual Nativo & Fluxo Sequencial de Sub-Séries

- **Status:** COMPLETED
- **Perfil / Stack:** `frontend-framework` (React 19 + TypeScript + Vite + Tailwind CSS)
- **Arquivos Criados/Modificados:**
  - `pages/student/WorkoutExecution.tsx`:
    - **Remoção de Borda Lateral Grossa:** Eliminadas todas as ocorrências de `border-l-4` e linhas divisórias pesadas na esquerda das séries e sub-séries, restabelecendo o layout limpo e arredondado original do app (Print 2 - Puxada Neutra).
    - **Fundo da Linha da Série (`rowBg`):** Quando a série não está concluída, exibe exclusivamente a cor suave e clara do método (`rest_pause` com `bg-rose-50/60`, `dropset` com `bg-purple-50/60`, `cluster` com `bg-blue-50/60`, `myo_reps` com `bg-amber-50/60`, etc.) ou a cor nativa de aquecimento/preparação. Quando a série é marcada como concluída, o fundo vira obrigatoriamente o **verde claro padrão do app** (`bg-emerald-100/70 dark:bg-emerald-900/30`).
    - **Badges Compactos na Coluna Ant./Alvo:** O badge de método (ex: `[REST-PAUSE 15s ?]`) foi integrado de forma compacta e discreta na segunda coluna ("Ant. / Alvo") junto dos badges de metas do treinador, eliminando completamente a sub-barra redundante e pesada que fragmentava a tela.
    - **Grade Direta de Sub-Séries & Drops:** Removido o cabeçalho grossudo (`REST-PAUSE • Sub-Séries 2 de 2 concluídas`) e containers isolados. As sub-séries (`+1`, `+2`) e drops (`-1`, `-2`) agora utilizam rigorosamente a mesma grade de 6 colunas do app (`getGridColsClass`), alinhando cada campo com `#`, `Ant. / Alvo`, `KG`, `REPS`, `PSE` e `✓`.
    - **Linha de Total Acumulado:** Renderizada de forma discreta e elegante ao final das sub-séries: `Total acumulado na série: X reps`.
    - **Correção do Bug de Auto-Conclusão:** Em `toggleSetCompletion`, removida a marcação automática em lote de `sub_sets_records` e `drops`. Ao marcar a série principal, ela fica verde claro e as sub-séries permanecem pendentes no fluxo sequencial do aluno.
    - **Fluxo Sequencial & Timer Único:** Ao dar check na série principal ou nas sub-séries intermediárias, a micro-pausa (15s) é acionada diretamente no **timer inferior padrão do app** (`startRestTimer`), eliminando a segunda cápsula flutuante superior (`microTimer`). Quando todas as sub-séries são finalizadas, dispara o descanso normal do exercício.
    - **Aparência dos Botões de Check de Sub-Séries:** Enquanto pendente, exibe o botão limpo com borda sutil; quando concluído, exibe o verde esmeralda padrão (`bg-emerald-600 text-white`) e a linha correspondente fica com o fundo verde claro do app.
  - `utils/specialSetTokens.ts`:
    - Atualizados os tokens de `rowBg` para tons suaves e claros (`bg-rose-50/60`, `bg-purple-50/60`, `bg-blue-50/60`, `bg-amber-50/60`, `bg-emerald-50/60`, `bg-cyan-50/60`).
    - Removida qualquer classe `border-l-4` de `rowBorderLeft`.
  - `utils/specialSetTokens.test.ts`:
    - Adicionado teste unitário validando a ausência de `border-l-4` e a conformidade dos tokens suaves de `rowBg`.

### Entregas End-to-End da Fatia:
1. **Fidelidade Visual Canônica Restaurada:** Resgate do padrão visual do Print 2 (Puxada Neutra): grade limpa, fundo suave, sem bordas laterais duras na esquerda, com retorno imediato ao verde claro ao concluir qualquer série ou sub-série.
2. **Despoluição e Redução de Ruído Cognitivo:** Eliminados cabeçalhos redundantes de sub-séries, sub-barras pesadas e o segundo relógio flutuante superior.
3. **Fluxo de Execução Sequencial Intuitivo:** Ciclo de treino passo a passo: Série Principal -> Micro-pausa de 15s no timer inferior -> Sub 1 -> Micro-pausa -> Sub 2 -> Descanso total.

### Testes & Validação:
- `npx tsc --noEmit`: 0 erros de compilação/tipagem.
- `npm test -- --run`: 4 suítes, 48 testes executados com 100% de aprovação.
