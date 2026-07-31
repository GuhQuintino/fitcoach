# Relatório de Auditoria RLS - Fitcoach

Este documento mapeia o status de Row Level Security (RLS) das tabelas do ecossistema Fitcoach.

## Legenda
- ✅ RLS Confirmado no Código (migrations)
- ⚠️ RLS Presumido (configurado via Dashboard do Supabase)
- ❌ RLS Ausente ou Desconhecido

## Tabelas e Status

### ✅ Tabelas com RLS Confirmado no Código

1. **`set_templates`**
   - **Status:** ✅ RLS Confirmado no Código
   - **Policies:** "Coaches can manage their own templates" (`USING (auth.uid() = coach_id)`)
   - **Risco/Gap:** Baixo. Regras bem definidas no repositório.

2. **`exercise_feedback_logs`**
   - **Status:** ✅ RLS Confirmado no Código
   - **Policies:** "Student manage exercise feedback logs", "Coach see exercise feedback logs"
   - **Risco/Gap:** Baixo. Complexidade tratada via joins na policy.

### ⚠️ Tabelas com RLS Presumido (Via Dashboard)

Abaixo estão as tabelas onde as policies não estão registradas nas migrations do projeto, mas possivelmente configuradas no Supabase Dashboard. É fortemente recomendado exportar estas políticas para o código fonte (migrations).

3. **`profiles`** - ⚠️ RLS Presumido
4. **`exercises`** - ⚠️ RLS Presumido (Pode ser público para leitura)
5. **`routines`** - ⚠️ RLS Presumido
6. **`student_assignments`** - ⚠️ RLS Presumido
7. **`students_data`** - ⚠️ RLS Presumido
8. **`coaches_data`** - ⚠️ RLS Presumido
9. **`workouts`** - ⚠️ RLS Presumido
10. **`workout_items`** - ⚠️ RLS Presumido
11. **`workout_sets`** - ⚠️ RLS Presumido
12. **`workout_logs`** - ⚠️ RLS Presumido
13. **`set_logs`** - ⚠️ RLS Presumido
14. **`weight_history`** - ⚠️ RLS Presumido
15. **`evolution_photos`** - ⚠️ RLS Presumido

## Recomendações

1. **Exportar Políticas do Dashboard para Code (Migrations):** Execute o comando de dump do Supabase para extrair todas as políticas RLS que foram criadas diretamente no painel e crie novas migrations para elas. Isso garante versionamento e auditoria.
2. **Executar Testes Automatizados RLS:** Rode o script `test_rls_regression.mjs` regularmente (e integre no CI/CD) para garantir que nenhuma tabela esteja vazando dados não autorizados (anônimos).
3. **Restringir Acesso Anônimo:** A maioria das tabelas deve bloquear leitura e escrita para chaves `anon` sem um token de sessão válido (`auth.uid()`), exceto tabelas de dados públicos como `exercises` (se aplicável).
