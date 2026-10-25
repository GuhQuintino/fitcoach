# Inteligência de Referência e Arquitetura Técnica: Notificações Inteligentes & Anti-Spam

- **Projeto / Domínio:** Fitcoach (Plataforma PWA de Prescrição e Acompanhamento de Treinos Coach ↔ Aluno)
- **Perfil Detectado:** `full-stack` (React 19 + TypeScript + Tailwind CSS + Supabase Postgres/Auth + Service Worker próprio)
- **Feature Alvo:** Notificações Inteligentes Baseadas no Padrão do Aluno + Anti-Spam & Onboarding de Perfil
- **Data da Pesquisa:** 2026-10-25
- **Status da Pesquisa:** Concluído / Padrão Ouro Estabelecido

---

## 1. Diagnóstico do Estado Atual do Código

### 1.1 `pages/student/Dashboard.tsx` (Linhas 333-340)
- **Problema:** O ícone de notificações (sino) possui uma bolinha vermelha fixa hardcoded:
  ```tsx
  <Link to="/student/settings/notifications" className="...">
      <span className="material-symbols-rounded">notifications</span>
      <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border border-white dark:border-slate-800"></span>
  </Link>
  ```
  Isso causa fadiga de alerta no aluno, pois o badge nunca se apaga mesmo que não haja novas mensagens.
- **Solução Canônica:** Criar um hook/query reativo (`useUnreadNotificationsCount`) que consulta `public.notification_logs` filtrando por `user_id = auth.uid()` e `read_at IS NULL`. O badge só renderiza se `unreadCount > 0` (exibindo a contagem numérica ou o ponto indicador).

### 1.2 `pages/settings/Notifications.tsx`
- **Problema:** A tela atual é puramente decorativa:
  - Estado inicial estático em `useState`.
  - Tópicos utilizam `defaultChecked` sem `checked` nem `onChange`.
  - Não há integração com a Web Push API nem com a chave pública VAPID.
  - Não há salvamento das opções no Supabase (`profiles.preferences`).
  - Não há feedback sobre compatibilidade PWA (ex: instrução para iOS Safari instalar na tela inicial).
- **Solução Canônica:** Transformar a tela em um centro de controle bidirecional sincronizado com `useAuth().updatePreferences`, suportando solicitação de permissão Web Push com um clique, exibição do padrão de treino inferido e central de alertas recentes.

### 1.3 `public/sw.js` (Linhas 143-212)
- **Problema:** O Service Worker atual suporta apenas mensagens internas da janela do app (`'SCHEDULE_REST_TIMER'` e `'CANCEL_REST_TIMER'`). Ele **NÃO** possui listener para o evento `push` da Web Push API, impedindo o recebimento de notificações em segundo plano quando o navegador/PWA está fechado.
- **Atenção Crítica:** O suporte ao timer de descanso em segundo plano (`'SCHEDULE_REST_TIMER'`) é um ativo crítico de estabilidade (validado na regressão `tests/background-lifecycle-timer.regression.test.ts`) e **NÃO PODE SER REMOVIDO NEM DANIFICADO**. A nova lógica de `push` e `notificationclick` deve ser integrada de forma harmônica e aditiva.

---

## 2. Web Push API & Service Worker Architecture

### 2.1 Arquitetura de Comunicação PWA Push
```
┌────────────────────────────────────────────────────────────────────────┐
│                        Dispositivo do Aluno / Coach                   │
│                                                                        │
│  [PWA Frontend: React 19]                                             │
│       │                                                                │
│       ├─► Notification.requestPermission() (Gesto do Usuário)          │
│       ├─► PushManager.subscribe({ applicationServerKey: VAPID })       │
│       └─► Salva { endpoint, p256dh, auth } em Supabase push_subs       │
│                                                                        │
│  [Service Worker: public/sw.js]                                        │
│       │                                                                │
│       ├─► self.addEventListener('push') ──► showNotification()         │
│       ├─► self.addEventListener('notificationclick') ──► navigate()    │
│       └─► self.addEventListener('message') ──► SCHEDULE_REST_TIMER    │
└────────────────────────────────────────────────────────────────────────┘
                                    ▲
                                    │ Web Push Protocol (RFC 8030 / 8292)
                                    │ Payload Criptografado (aes128gcm)
┌───────────────────────────────────┴────────────────────────────────────┐
│                    Serviço de Push (Push Service)                      │
│            (Apple WebPush / Google FCM / Mozilla Autopush)             │
└───────────────────────────────────▲────────────────────────────────────┘
                                    │
                                    │ POST com VAPID Header & JWT
┌───────────────────────────────────┴────────────────────────────────────┐
│                   Fitcoach Backend / Supabase Edge                     │
│  - Dispatcher / Cron de Notificações Inteligentes                     │
│  - webpush.sendNotification(subscription, payload, vapidKeys)          │
└────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Implementação Segura em `public/sw.js`
A integração deve preservar integralmente as mensagens do timer de descanso e tratar eventos `push` e `notificationclick` com deep linking seguro:

```javascript
// --- Web Push Notification Handler ---
self.addEventListener('push', (event) => {
    let payload = {
        title: 'FitCoach Pro 💪',
        body: 'Você tem uma nova notificação de treino.',
        action_url: '/student/dashboard',
        topic: 'general'
    };

    if (event.data) {
        try {
            payload = Object.assign(payload, event.data.json());
        } catch (e) {
            payload.body = event.data.text();
        }
    }

    const title = payload.title || 'FitCoach Pro 💪';
    const notificationOptions = {
        body: payload.body,
        icon: payload.icon || '/icon-192.png',
        badge: payload.badge || '/icon-192.png',
        tag: payload.tag || `fitcoach-notif-${payload.topic || 'general'}`,
        renotify: payload.renotify ?? true,
        requireInteraction: false,
        vibrate: payload.vibrate || [250, 100, 250],
        data: {
            url: payload.action_url || payload.url || '/student/dashboard',
            notificationId: payload.id || null,
            topic: payload.topic || 'general'
        }
    };

    event.waitUntil(
        self.registration.showNotification(title, notificationOptions)
    );
});

// --- Unificação do Evento de Clique em Notificações ---
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    const notifData = event.notification.data || {};
    const targetUrl = notifData.url || '/student/dashboard';

    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            // Se já houver aba ou janela do Fitcoach aberta no mesmo domínio
            for (const client of clientList) {
                const clientUrl = new URL(client.url, self.location.origin);
                if (clientUrl.origin === self.location.origin) {
                    if ('focus' in client) {
                        client.focus();
                    }
                    if ('navigate' in client && targetUrl) {
                        return client.navigate(targetUrl);
                    }
                    return;
                }
            }
            // Se não houver janela aberta, abre uma nova diretamente no destino
            if (self.clients.openWindow) {
                return self.clients.openWindow(targetUrl);
            }
        })
    );
});
```

### 2.3 Conversão de Chave Pública VAPID (`urlBase64ToUint8Array`)
O `pushManager.subscribe` exige que a `applicationServerKey` seja passada como um `Uint8Array`. No cliente TypeScript:

```typescript
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
        .replace(/-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}
```

### 2.4 Matriz de Compatibilidade PWA & Condições de Execução

| Plataforma / Navegador | Suporte Web Push | Requisitos Mandatórios |
|---|---|---|
| **iOS Safari (>= 16.4)** | Sim (Nativo) | **Obrigatório Modo Standalone:** O usuário DEVE instalar o Fitcoach na Tela de Início (`Compartilhar > Adicionar à Tela de Início`). Em abas comuns do Safari, a Push API é desabilitada pela Apple. A solicitação de permissão exige gesto direto do usuário (clique). |
| **Android Chrome** | Sim (Nativo) | Funciona tanto na aba do navegador quanto no PWA instalado (WebAPK). |
| **Desktop Chrome / Edge** | Sim (Nativo) | Funciona em abas e como app instalado. |
| **macOS Safari (>= 16.0)** | Sim (Nativo) | Funciona mesmo sem instalar. |

**Detector de PWA Standalone (iOS):**
```typescript
export function isStandalonePWA(): boolean {
    if (typeof window === 'undefined') return false;
    const isStandaloneWindow = window.matchMedia('(display-mode: standalone)').matches;
    const isIOSStandalone = (navigator as any).standalone === true;
    return Boolean(isStandaloneWindow || isIOSStandalone);
}

export function isIOS(): boolean {
    if (typeof navigator === 'undefined') return false;
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
}
```

---

## 3. Schema Supabase para Notificações & Assinaturas Push

### 3.1 DDL SQL Completo & Relacional

```sql
-- =============================================================================
-- Migração: Push Subscriptions & Smart Notifications Engine
-- =============================================================================

-- 1. Tabela de Inscrições Push (Dispositivos dos Usuários)
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT uq_push_subscriptions_endpoint UNIQUE (endpoint)
);

-- Índices para busca rápida de inscrições por usuário
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id 
    ON public.push_subscriptions(user_id);

-- 2. Tabela de Histórico e Central de Notificações
CREATE TABLE IF NOT EXISTS public.notification_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    topic TEXT NOT NULL, -- 'training_reminder', 'onboarding_profile', 'evolution_photos', 'plan_expiration', 'coach_feedback', 'system'
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    action_url TEXT DEFAULT '/student/dashboard' NOT NULL,
    read_at TIMESTAMPTZ,
    clicked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Índices de Alta Performance:
-- A) Índice Parcial para contagem instantânea de não lidas e exibição do sino
CREATE INDEX IF NOT EXISTS idx_notification_logs_user_unread 
    ON public.notification_logs (user_id, created_at DESC) 
    WHERE read_at IS NULL;

-- B) Índice Composto para Frequency Capping, Backoff e verificação de envio recente
CREATE INDEX IF NOT EXISTS idx_notification_logs_user_topic_created 
    ON public.notification_logs (user_id, topic, created_at DESC);

-- C) Índice para listagem geral paginada da central de notificações
CREATE INDEX IF NOT EXISTS idx_notification_logs_user_created 
    ON public.notification_logs (user_id, created_at DESC);

-- 3. Assegurar coluna 'preferences' em public.profiles com valores padrão
ALTER TABLE public.profiles 
    ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{
        "focusMode": false,
        "notifications": {
            "push": true,
            "email": false,
            "reminders": true,
            "evolution_photos": true,
            "plan_expiration": true,
            "quiet_hours_start": "21:30",
            "quiet_hours_end": "07:30",
            "preferred_training_time": null
        }
    }'::jsonb;

-- 4. Habilitar RLS em ambas as tabelas
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

-- 5. Políticas RLS para public.push_subscriptions
CREATE POLICY "Users can manage their own push subscriptions"
    ON public.push_subscriptions
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 6. Políticas RLS para public.notification_logs
CREATE POLICY "Users can view their own notifications"
    ON public.notification_logs
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications read and clicked status"
    ON public.notification_logs
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notifications"
    ON public.notification_logs
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);
```

### 3.2 Estrutura do Objeto de Preferências (`profiles.preferences`)
```typescript
export interface NotificationPreferences {
    push: boolean;
    email: boolean;
    reminders: boolean;           // Lembretes de treino
    evolution_photos: boolean;    // Fotos de evolução
    plan_expiration: boolean;     // Aviso de renovação de plano
    quiet_hours_start: string;    // Padrão: "21:30"
    quiet_hours_end: string;      // Padrão: "07:30"
    preferred_training_time: string | null; // Se aluno fixar manualmente (ex: "18:00")
}

export interface UserPreferences {
    focusMode: boolean;
    notifications: NotificationPreferences;
    [key: string]: any;
}
```

---

## 4. Algoritmo de Inferência de Hábito de Treino (Habit Inference Engine)

### 4.1 Fundamentação Matemática & Robustez a Outliers
Para evitar lembretes inconvenientes, o motor analisa o padrão histórico do aluno:
1. **Janela Temporal:** Considera treinos realizados nos últimos 28 a 56 dias (4 a 8 semanas).
2. **Dias Habituais da Semana:**
   - Calcula a frequência de treinos por dia da semana (Domingo=0 a Sábado=6).
   - Um dia é classificado como habitual se a frequência relativa for $\ge 35\%$ das semanas ativas em que o aluno treinou.
3. **Cálculo do Horário Mediano (Median Start Time):**
   - **Por que Mediana em vez de Média?** Se um aluno treina quase sempre às 18:30 (1110 minutos após meia-noite), mas em um feriado treinou às 08:00 (480 minutos), a média aritmética seria distorcida para ~16:20 (gerando alertas prematuros). A mediana permanece exatamente em 18:30, imune a variações isoladas.
   - Converte cada `started_at` em minutos a partir de 00:00 daquele dia:
     $$M_i = \text{horas} \times 60 + \text{minutos}$$
   - Ordena os minutos $[M_{(1)}, M_{(2)}, \dots, M_{(n)}]$.
   - A mediana $\tilde{M}$ é o elemento central (ou a média dos dois centrais se par).
   - Converte $\tilde{M}$ de volta para string formatada `HH:mm`.

### 4.2 Regra de Cold Start (< 3 Treinos)
- Quando o aluno possui menos de 3 treinos concluídos em seu histórico:
  - Não há amostra estatística confiável.
  - **Horário Padrão Adotado:** **16:30** (início da tarde, permitindo que o aluno se organize antes do fim do expediente).
  - **Dias Sugeridos:** Extraídos da rotina prescrita pelo coach ou padrão Seg/Qua/Sex (1, 3, 5).
  - Status retornado: `{ confidence: 'cold_start', habitualDays: [...], medianTime: "16:30" }`.

### 4.3 Regra de Perfil Incompleto (Onboarding)
- O motor inspeciona `profiles` (`avatar_url`) e `students_data` (`weight_kg`, `birth_date`, `height_cm`).
- Identifica campos faltantes (`missingFields`).
- **Política de Disparo Sem Spam:**
  - Se faltar qualquer um dos campos essenciais:
    - 0 notificações prévias de onboarding $\rightarrow$ Enviar 1º Lembrete Gentil ("Complete seu perfil para seu treinador ajustar suas cargas").
    - 1 notificação prévia $\rightarrow$ Enviar 2º Lembrete **apenas se já se passaram $\ge 4$ dias** desde a primeira.
    - $\ge 2$ notificações prévias $\rightarrow$ **CESSAR ENVIO DEFINITIVAMENTE**. Nunca irritar o aluno.

### 4.4 Implementação Canônica da Função Pura (`inferTrainingHabits`)

```typescript
export interface WorkoutLogSample {
    started_at: string;
}

export interface HabitInferenceResult {
    habitualDays: number[]; // 0 = Domingo, 1 = Segunda, ..., 6 = Sábado
    medianTime: string;     // Formato "HH:mm" (ex: "18:30")
    confidence: 'high' | 'medium' | 'cold_start';
    totalWorkouts: number;
    isCustomOverride: boolean;
}

export function inferTrainingHabits(
    logs: WorkoutLogSample[],
    manualPreferredTime?: string | null
): HabitInferenceResult {
    // 1. Se o aluno fixou um horário personalizado nas configurações, respeitar imediatamente
    if (manualPreferredTime && /^\d{2}:\d{2}$/.test(manualPreferredTime)) {
        return {
            habitualDays: [1, 2, 3, 4, 5],
            medianTime: manualPreferredTime,
            confidence: 'high',
            totalWorkouts: logs.length,
            isCustomOverride: true
        };
    }

    // 2. Cold Start: menos de 3 treinos
    if (!logs || logs.length < 3) {
        return {
            habitualDays: [1, 3, 5], // Seg, Qua, Sex como baseline
            medianTime: '16:30',
            confidence: 'cold_start',
            totalWorkouts: logs?.length ?? 0,
            isCustomOverride: false
        };
    }

    // 3. Extrair minutos e contagem por dia da semana
    const dayCounts: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    const minutesList: number[] = [];

    for (const log of logs) {
        const date = new Date(log.started_at);
        if (isNaN(date.getTime())) continue;

        const dayOfWeek = date.getDay();
        dayCounts[dayOfWeek] = (dayCounts[dayOfWeek] || 0) + 1;

        const minutes = date.getHours() * 60 + date.getMinutes();
        minutesList.push(minutes);
    }

    if (minutesList.length === 0) {
        return {
            habitualDays: [1, 3, 5],
            medianTime: '16:30',
            confidence: 'cold_start',
            totalWorkouts: 0,
            isCustomOverride: false
        };
    }

    // 4. Calcular Dias Habituais (Frequência >= 20% do total de treinos ou >= 35% nas semanas ativas)
    const minDayThreshold = Math.max(1, Math.round(minutesList.length * 0.18));
    const habitualDays = Object.entries(dayCounts)
        .filter(([_, count]) => count >= minDayThreshold)
        .map(([day]) => Number(day))
        .sort((a, b) => a - b);

    // 5. Cálculo do Horário Mediano
    minutesList.sort((a, b) => a - b);
    const midIndex = Math.floor(minutesList.length / 2);
    const medianMinutes = minutesList.length % 2 !== 0
        ? minutesList[midIndex]
        : Math.round((minutesList[midIndex - 1] + minutesList[midIndex]) / 2);

    const hours = Math.floor(medianMinutes / 60);
    const mins = medianMinutes % 60;
    const formattedTime = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;

    return {
        habitualDays: habitualDays.length > 0 ? habitualDays : [1, 3, 5],
        medianTime: formattedTime,
        confidence: minutesList.length >= 8 ? 'high' : 'medium',
        totalWorkouts: minutesList.length,
        isCustomOverride: false
    };
}
```

---

## 5. Regras Anti-Spam & Frequency Capping (O Sistema dos 4 Escudos)

Para garantir que o Fitcoach seja um parceiro encorajador e nunca um invasor de privacidade ou gerador de ruído, todo disparo deve ser validado pelo pipeline dos **4 Escudos**:

```
                       [Novo Evento de Notificação Proposto]
                                        │
                                        ▼
                  ┌───────────────────────────────────────────┐
                  │ ESCUDO 1: Já treinou hoje?               │
                  │ (Há workout_log com started_at de hoje?) │
                  └─────────────────────┬─────────────────────┘
                                        │ NÃO (Ainda não treinou)
                                        ▼
                  ┌───────────────────────────────────────────┐
                  │ ESCUDO 2: Teto Diário & Semanal           │
                  │ - <= 1 notificação enviada hoje?          │
                  │ - <= 3 lembretes de treino nos últimos 7d?│
                  └─────────────────────┬─────────────────────┘
                                        │ SIM (Dentro do teto)
                                        ▼
                  ┌───────────────────────────────────────────┐
                  │ ESCUDO 3: Backoff de 5 Dias               │
                  │ Aluno ignorou 2 lembretes seguidos sem    │
                  │ treinar nem clicar?                       │
                  └─────────────────────┬─────────────────────┘
                                        │ NÃO (Aluno receptivo)
                                        ▼
                  ┌───────────────────────────────────────────┐
                  │ ESCUDO 4: Horário de Silêncio             │
                  │ Hora atual entre 21:30 e 07:30?           │
                  └─────────────────────┬─────────────────────┘
                                        │ NÃO (Horário diurno válido)
                                        ▼
                           [AUTORIZADO PARA ENVIO]
```

### 5.1 Implementação do Validador de Elegibilidade (`evaluateNotificationEligibility`)

```typescript
export interface EligibilityParams {
    userId: string;
    topic: 'training_reminder' | 'onboarding_profile' | 'evolution_photos' | 'plan_expiration';
    currentTime: Date;
    preferences: NotificationPreferences;
    hasTrainedToday: boolean;
    todayNotificationsCount: number;
    weeklyRemindersCount: number;
    consecutiveIgnoredCount: number;
    daysSinceLastIgnored: number;
}

export interface EligibilityResult {
    canSend: boolean;
    reason?: 'TRAINED_TODAY' | 'DAILY_CAP_REACHED' | 'WEEKLY_CAP_REACHED' | 'BACKOFF_PAUSED' | 'QUIET_HOURS' | 'TOPIC_DISABLED';
}

export function evaluateNotificationEligibility(params: EligibilityParams): EligibilityResult {
    const {
        topic,
        currentTime,
        preferences,
        hasTrainedToday,
        todayNotificationsCount,
        weeklyRemindersCount,
        consecutiveIgnoredCount,
        daysSinceLastIgnored
    } = params;

    // 0. Preferência do Usuário (Opt-out)
    if (!preferences.push) return { canSend: false, reason: 'TOPIC_DISABLED' };
    if (topic === 'training_reminder' && !preferences.reminders) return { canSend: false, reason: 'TOPIC_DISABLED' };
    if (topic === 'evolution_photos' && !preferences.evolution_photos) return { canSend: false, reason: 'TOPIC_DISABLED' };
    if (topic === 'plan_expiration' && !preferences.plan_expiration) return { canSend: false, reason: 'TOPIC_DISABLED' };

    // Escudo 1: Se já treinou hoje, silêncio absoluto para lembretes de treino
    if (topic === 'training_reminder' && hasTrainedToday) {
        return { canSend: false, reason: 'TRAINED_TODAY' };
    }

    // Escudo 2: Teto diário de 1 notificação por dia por aluno
    if (todayNotificationsCount >= 1) {
        return { canSend: false, reason: 'DAILY_CAP_REACHED' };
    }

    // Escudo 2b: Teto semanal de 3 lembretes de treino por semana
    if (topic === 'training_reminder' && weeklyRemindersCount >= 3) {
        return { canSend: false, reason: 'WEEKLY_CAP_REACHED' };
    }

    // Escudo 3: Backoff de 5 dias após 2 lembretes consecutivos ignorados
    if (consecutiveIgnoredCount >= 2 && daysSinceLastIgnored < 5) {
        return { canSend: false, reason: 'BACKOFF_PAUSED' };
    }

    // Escudo 4: Quiet Hours (Silêncio entre 21:30 e 07:30)
    const hours = currentTime.getHours();
    const minutes = currentTime.getMinutes();
    const currentMinutes = hours * 60 + minutes;

    const [qStartH, qStartM] = (preferences.quiet_hours_start || '21:30').split(':').map(Number);
    const [qEndH, qEndM] = (preferences.quiet_hours_end || '07:30').split(':').map(Number);
    const qStartMinutes = qStartH * 60 + qStartM;
    const qEndMinutes = qEndH * 60 + qEndM;

    // Quiet hours atravessam a meia-noite (21:30 -> 07:30)
    const isQuietTime = currentMinutes >= qStartMinutes || currentMinutes < qEndMinutes;
    if (isQuietTime) {
        return { canSend: false, reason: 'QUIET_HOURS' };
    }

    return { canSend: true };
}
```

---

## 6. Padrões de Interface (UI / UX Impeccable)

### 6.1 Badge Dinâmico no Sino da Dashboard
- **Componente:** `components/student/NotificationBell.tsx` (ou integrado em `Dashboard.tsx`).
- **Estado:**
  - Consulta `public.notification_logs` com contagem de `read_at IS NULL`.
  - Se `unreadCount === 0`: renderiza o sino limpo sem nenhuma bolinha.
  - Se `unreadCount > 0`: renderiza a badge vibrante com a contagem (ou indicador sutil) e animação suave `scale-in`.

### 6.2 Centro de Notificações (`pages/settings/Notifications.tsx`)
A interface deve ser dividida em 3 seções elegantes:
1. **Master Push Switch & Status do Dispositivo:**
   - Exibe se o navegador atual suporta Web Push.
   - No iOS Safari fora de standalone, exibe card instrutivo com ícone de compartilhamento: *"Para ativar notificações no iPhone, toque no botão de compartilhar do Safari e selecione 'Adicionar à Tela de Início'"*.
   - Botão para solicitar permissão nativa via `pushManager.subscribe`.
2. **Padrão de Treino Aprendido (Smart Habit Card):**
   - Exibe a síntese do hábito do aluno com visual tecnológico e esportivo:
     - *"Seu padrão detectado: Seg, Qua e Sex por volta das 18:30"*.
     - Chip de confiança: `Alta Precisão` (baseado em X treinos) ou `Em Aprendizado`.
     - Toggle para *"Fixar horário preferido manualmente"* permitindo que o aluno defina seu próprio horário se desejar.
3. **Tópicos de Notificação & Quiet Hours:**
   - Switches controlados para: Lembretes de Treino, Fotos de Evolução, Vencimento de Plano.
   - Seletor de Horário de Silêncio (21:30 às 07:30).
4. **Histórico de Notificações Recentes:**
   - Lista dos últimos alertas recebidos com indicador visual de lido/não-lido.
   - Botão *"Marcar todas como lidas"*.
   - Ao tocar em uma notificação, marca `read_at` e navega para `action_url`.

---

## 7. Skills Sintetizadas Sob Demanda

Em conformidade com o protocolo do Stage 1 e as diretrizes do `skill-auto-synthesizer`:

- **Skill Sintetizada:** `.agents/skills/web-push-pwa/SKILL.md`
  - **Propósito:** Guia normativo completo sobre Web Push API, compatibilidade iOS Standalone PWA, manipulação de chaves VAPID, Service Worker e persistência relacional.
  - **Localização:** `c:\Users\Gustavo\Desktop\Fitcoach\.agents\skills\web-push-pwa\SKILL.md`

---

## 8. Verificação e Critérios de Aceite para o Builder (Stage 2)

O `gauntlet-builder` deve considerar a feature implementada quando:
1. `public/sw.js` possuir listeners de `push` e `notificationclick` sem afetar o timer de descanso.
2. A migração SQL criar `push_subscriptions`, `notification_logs`, adicionar `preferences` em `profiles` e configurar índices/RLS com 100% de sucesso.
3. O módulo puro de inferência de hábitos (`inferTrainingHabits`) e de anti-spam (`evaluateNotificationEligibility`) for implementado e coberto por testes unitários e de regressão no Vitest.
4. O sino da Dashboard refletir fielmente o total de notificações não lidas (`read_at IS NULL`).
5. A tela `pages/settings/Notifications.tsx` sincronizar preferências com o Supabase e permitir ativação nativa do Web Push.
