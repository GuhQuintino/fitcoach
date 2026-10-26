# Relatório de Execução de Testes Automatizados - Auditoria e Blindagem de Regressões (Full-Stack)

- **Status Geral:** PASS
- **Framework de Testes:** Vitest 5.0.3
- **Data da Execução:** 2026-10-25T20:51:42Z

---

### Resumo Quantitativo:
- **Total de Suítes Executadas:** 19
- **Suítes Aprovadas:** 19 (100%)
- **Total de Testes:** 179
- **Testes Aprovados:** 179 (100%)
- **Testes Falhos:** 0
- **Testes Ignorados/Skipped:** 0
- **Tempo Total de Execução:** 4.05s – 4.47s

---

### Auditoria das Novas Suítes de Regressão:

1. **`utils/__tests__/metabolicCalculator.regression.test.ts` (11 testes aprovados — 21ms)**
   - **`sanitizeWeightKg` (4 testes):** Normalização de pesos digitados sem separador decimal (`750` -> `75.0 kg`, `825` -> `82.5 kg`, `1105` -> `110.5 kg`), valores em gramas (`75000` -> `75.0 kg`, `68400` -> `68.4 kg`), aceitação da faixa biológica `[25, 250] kg` e rejeição segura (`null`) de valores absurdos/negativos.
   - **`sanitizeHeightCm` (3 testes):** Conversão de alturas informadas em metros (`1.75` -> `175 cm`) e milímetros (`1750` -> `175 cm`) e rejeição fora da faixa `[100, 250] cm`.
   - **`calculateAgeFromBirthDate` (2 testes):** Cálculo de idade exata por data de nascimento (`birth_date`) considerando mês/dia e fallback seguro (`30` anos ou `fallbackAge`).
   - **`resolveActivityMultiplier & calculateMetabolicProfile` (2 testes):** Multiplicadores explícitos e inferidos por frequência semanal da rotina, além da validação exata da equação de Mifflin-St Jeor para homens (`1699 kcal` TMB / `2633 kcal` Manutenção) e mulheres (`1330 kcal` TMB / `1829 kcal` Manutenção), impedindo explosões irreais (> 8.000 kcal).

2. **`utils/__tests__/smartNotificationDispatcher.regression.test.ts` (2 testes aprovados — 26ms)**
   - **Prevenção de Erro HTTP 400 PostgREST:** Comprova por inspeção das queries enviadas ao Supabase que `students_data` seleciona exclusivamente `weight_kg, birth_date, height_cm` (sem `age`) e `workout_logs` seleciona `id, started_at, finished_at` (sem `completed_at`).
   - **Normalização de Preferências:** Valida o mapeamento das chaves `coach_feedback` e `system_updates` nas preferências de notificação do perfil.

3. **`utils/__tests__/selectionAndTemplates.regression.test.ts` (6 testes aprovados — 18ms)**
   - **`parseRoutineMeta & formatRoutineInfoToast` (3 testes):** Formatação amigável de descrições JSON de rotina (`Duração média: 50-60 min • Nível: Iniciante • Frequência: 3x/sem`) sem vazar chaves JSON brutas no toast, preservação de texto livre e hierarquia de duração (`workout.duration_minutes` > `routineMeta.duration` > `~60 min`).
   - **`serializeSetForTemplate & deserializeTemplateSet` (1 teste):** Preservação integral (100%) de todos os campos das Camadas 2, 3, 4 e Cardio/HIIT (`set_method`, `drop_count`, `sub_sets`, `micro_rest_seconds`, `activation_reps`, `execution_mode`, `tempo`, `timer_mode`, `time_target`, `distance_target`, `speed_target`, `incline_target`, `is_hiit`, `hiit_work_seconds`, `hiit_rest_seconds`, `hiit_rounds`, `hiit_cycles`, `hiit_work_speed`, `hiit_rest_speed`).
   - **`extractStoragePath` (2 testes):** Extração precisa do caminho interno no bucket `evolution-photos` a partir da URL pública do Supabase Storage para exclusão transacional completa (Storage + Banco).

---

### Detalhamento Completo por Suíte Executada (19 Suítes / 179 Testes):

| # | Arquivo de Suíte | Testes | Status | Tempo |
|---|---|---|---|---|
| 1 | `utils/__tests__/metabolicCalculator.regression.test.ts` | 11 | PASS | 21ms |
| 2 | `utils/__tests__/smartNotificationDispatcher.regression.test.ts` | 2 | PASS | 26ms |
| 3 | `utils/__tests__/selectionAndTemplates.regression.test.ts` | 6 | PASS | 18ms |
| 4 | `tests/regression/activeWorkoutAndAuthSafety.regression.test.ts` | 7 | PASS | 22ms |
| 5 | `tests/regression/profileCompletionBanner.regression.test.tsx` | 5 | PASS | 51ms |
| 6 | `tests/regression/workoutFinalizationEnum.regression.test.ts` | 6 | PASS | 20ms |
| 7 | `tests/background-lifecycle-timer.regression.test.ts` | 10 | PASS | 1000ms |
| 8 | `tests/whatsappDossierSync.test.ts` | 22 | PASS | 146ms |
| 9 | `utils/studentStatus.test.ts` | 20 | PASS | 29ms |
| 10 | `tests/unit/workoutHabitAnalyzer.test.ts` | 19 | PASS | 33ms |
| 11 | `utils/specialSetTokens.test.ts` | 14 | PASS | 23ms |
| 12 | `utils/sessionComparison.test.ts` | 13 | PASS | 23ms |
| 13 | `tests/unit/muscleUtils.test.ts` | 9 | PASS | 17ms |
| 14 | `tests/unit/phoneAndTextUtils.test.ts` | 8 | PASS | 16ms |
| 15 | `tests/unit/staleWorkoutService.test.ts` | 8 | PASS | 17ms |
| 16 | `tests/unit/offlineCacheService.test.ts` | 5 | PASS | 21ms |
| 17 | `tests/unit/smartNotificationDispatcher.test.ts` | 5 | PASS | 38ms |
| 18 | `utils/workoutHistoryGrouper.test.ts` | 5 | PASS | 20ms |
| 19 | `tests/unit/pushNotificationService.test.ts` | 4 | PASS | 15ms |

---

### Detalhamento de Falhas:
- Nenhuma falha registrada (`tests_failed == 0`, `tests_skipped == 0`).

---

### Avaliação de Regressão:
- **Nenhuma regressão detectada.** Todas as 16 suítes legadas (160 testes) e as 3 novas suítes de regressão dedicadas (19 testes) passaram com 100% de aproveitamento (total: 19 suítes / 179 testes verdes), sem testes ignorados (`.skip`) e com asserções determinísticas de domínio.
