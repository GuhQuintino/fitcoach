# ROADMAP — Fitcoach Pro

## Visão do Produto
Fitcoach Pro é uma plataforma progressiva (PWA Mobile-First com suporte a fallback offline) de gestão e execução de treinos personalizados, conectando treinadores físicos (Coaches) e alunos (Students) com foco em alta performance, aderência, clareza pedagógica e design de padrão internacional.

---

## Fases do Projeto

### Fase 1: Arquitetura Base & Autenticação Supabase (Concluída)
- [x] Autenticação com e-mail/senha e controle de papéis (`admin`, `coach`, `student`).
- [x] RLS (Row Level Security) e tabelas relacionais no Postgres.
- [x] Telas de Login, Registro, Aguardando Aprovação e Assinatura Vencida.

### Fase 2: Gestão do Treinador (Coach Portal) (Concluída)
- [x] Dashboard de métricas, faturamento e resumo de alunos.
- [x] Biblioteca de Rotinas e Construtor de Treinos (Editor).
- [x] Gestão de Exercícios, Links de Vídeo (YouTube/MP4) e Prescrição de Séries (Reps, Tempo, Cardio, HIIT).
- [x] Gestão de Alunos, Atribuição de Planos e Vencimento de Consultoria.

### Fase 3: Execução do Treino & PWA Offline-First (Concluída)
- [x] Player de Execução de Treino interativo (`/student/workout/:id`).
- [x] Sincronização offline transparente com IndexedDB e LocalStorage.
- [x] Detecção de treinos abandonados (`useStaleWorkoutDetector`).
- [x] Cronômetro de descanso flutuante e modo HIIT intervalado.
- [x] Histórico de treinos com acordiões e gráficos de evolução.

### Fase 4: Auditoria Técnica & Refinamento Impeccable (Concluída — Grade A+ 20.0/20.0)
- [x] Acessibilidade WAI-ARIA integral em modais, acordeões e formulários.
- [x] Conformidade de contraste WCAG 2.1 AA em tema Claro e Escuro.
- [x] Touch targets seguros ($\ge 44 \times 44\text{px}$) em todos os botões e abas.
- [x] Correção de rotas e blindagem contra telas em branco (`/student/workout`).
- [x] Auditoria independente aprovada com 20.0/20.0 (PASS sem bloqueantes).

### Fase 5: Clareza Pedagógica & UX de Prescrição do Coach (Concluída)
- [x] Refatoração da apresentação de Metas vs Histórico na Execução do Treino.
- [x] Badges explicativos e legíveis para Carga (`100kg`), Faixa de Repetições (`3-7 reps`) e PSE (`PSE 9.5`).
- [x] Cabeçalho semântico `Alvo / Anterior` e botões com modais explicativos (`kg ?`, `Reps ?`, `PSE ?`).
- [x] Resolução dos 6 itens de acessibilidade e touch targets do editor e dashboards.
