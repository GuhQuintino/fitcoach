# Inteligência de Referência e Padrão de Mercado — Fitcoach

- **Projeto / Domínio:** Fitcoach (Plataforma PWA de Prescrição e Acompanhamento de Treinos Coach ↔ Aluno)
- **Perfil Detectado:** `full-stack` / PWA (Vite + React 19 + TypeScript + Tailwind CSS + Supabase + Service Worker próprio)
- **Data da Pesquisa:** `2026-10-25T07:30:00-03:00`

---

## 1. Feature Atual: Notificações Inteligentes Baseadas no Padrão do Aluno + Anti-Spam & Onboarding
Documento de Referência Principal: [REFERENCIAS_smart_notifications.md](file:///c:/Users/Gustavo/Desktop/Fitcoach/docs/gauntlet/REFERENCIAS_smart_notifications.md)

### Resumo Executivo da Arquitetura:
1. **Web Push & Service Worker:**
   - Adição de listeners `push` e unificação de `notificationclick` em `public/sw.js` preservando o suporte a `'SCHEDULE_REST_TIMER'`.
   - Conversão de chaves públicas VAPID (`urlBase64ToUint8Array`) para `pushManager.subscribe`.
   - Compatibilidade iOS Standalone PWA (detecção de modo standalone para Safari >= 16.4) e Android/Desktop.
2. **Schema Supabase & RLS:**
   - `public.push_subscriptions`: armazenamento das credenciais dos navegadores vinculadas a `auth.users(id)` com RLS estrita.
   - `public.notification_logs`: histórico de alertas, controle de leitura (`read_at`), cliques (`clicked_at`) e telemetria.
   - Índices parciais de altíssima performance para o badge do sino (`WHERE read_at IS NULL`) e frequency capping.
   - Coluna `preferences` em `public.profiles` (`notifications: { push, reminders, quiet_hours_start, ... }`).
3. **Habit Inference Engine (Inferência de Hábito de Treino):**
   - Extração dos dias da semana habituais e cálculo do **horário mediano** dos treinos em minutos a partir de `workout_logs.started_at` (imune a outliers).
   - Regra de Cold Start (< 3 treinos): fallback suave para **16:30**.
   - Regra de Onboarding / Perfil Incompleto: detecção de foto, peso, nascimento e altura com política de máximo 2 avisos espaçados por 4 dias.
4. **Sistema dos 4 Escudos Anti-Spam:**
   - Escudo 1: Silêncio absoluto se já treinou hoje.
   - Escudo 2: Teto diário de 1 notificação e semanal de 3 lembretes de treino.
   - Escudo 3: Backoff automático de 5 dias após 2 lembretes consecutivos ignorados.
   - Escudo 4: Quiet Hours (21:30 - 07:30).

---

## 2. Skills Especializadas Sintetizadas
- **`web-push-pwa`:** Sintetizada sob demanda em `.agents/skills/web-push-pwa/SKILL.md` contendo padrões de Push API, Service Workers, conversão VAPID e matriz de compatibilidade iOS/Android.

---

## 3. Features Anteriores Registradas
- **Retorno Instantâneo de Segundo Plano & Blindagem de Cronômetro:** Registrado em `docs/gauntlet/QA_REPORT_background_timer.md`.
- **Séries Especiais & Métodos de Intensificação:** Registrado em `docs/gauntlet/QA_REPORT_special_sets.md`.
- **Sincronização de Dossiês WhatsApp:** Registrado em `docs/gauntlet/REFERENCIAS_whatsapp_sync.md`.
- **Gestão de Alunos & Dashboard:** Registrado em `docs/gauntlet/REFERENCIAS_students.md`.
