# Projeto Fitcoach - Overview

Documento centralizador de informações técnicas e arquiteturais do projeto Fitcoach Pro.

## Overview
Fitcoach Pro é uma plataforma premium de coaching fitness que conecta treinadores e alunos. O sistema gerencia treinos, avaliações, planos de assinatura e feedbacks, com foco em uma experiência visual refinada e alta performance.

## User Preferences
- **Interface**: Suporte total a Dark/Light Mode.
- **Design**: Estética premium baseada em Glassmorphism, bordas arredondadas generosas e micro-animações.
- **Padrões Visuais**:
  - Gradientes ambientais sutis no background (sky/indigo/emerald)
  - Cards com `backdrop-blur` e bordas semi-transparentes
  - Hover states com `scale`, `shadow` e `translate` suaves
  - Indicadores de urgência visuais (barras pulsantes, cores semafóricas)
  - **Video Previews**: Geração de thumbnails estáticos via Client-Side Capture (Canvas) para evitar sobrecarga de memória do navegador.
- **Idiomas**: Foco inicial em Português (Brasil).


## System Architecture
A aplicação segue uma arquitetura baseada em **Frontend as a Service**, utilizando Supabase para toda a lógica de backend, banco de dados e autenticação.

## Frontend Architecture
- **Framework & Build System**: React 19 + Vite 6 + TypeScript.
- **UI Component Library**: Componentes customizados baseados em Tailwind CSS (sem biblioteca de componentes externa como Shadcn para manter controle total).
- **Design System Decisions**: 
  - Fontes: `Outfit` (Display) e `DM Sans` (Corpo).
  - Cores: Paleta baseada em `Sky` (Primary) e `Slate` (Neutrals).
  - Estilização: Tailwind CSS v4 utilizando a nova sintaxe `@theme` no `index.css`.
- **State Management Strategy**: React Context API (`AuthContext`, `ThemeContext`).
- **Form Handling**: Formulários React controlados com estilização via `@tailwindcss/forms`.
- **Navegação**: React Router Dom v7 utilizando `HashRouter`.
- **PWA (Progressive Web App)**: 
  - Suporte total a "Adicionar à Tela de Início" (Manifest configurado).
  - Banner customizado de instalação (`PWAInstallPrompt`) com detecção automática de sistema (Android/iOS).
  - Execução em modo `standalone` para experiência de "App Nativo".
  - Otimização de ciclo de vida para evitar travamentos ao retomar o app (Auth Throttling).

## Backend Architecture
- **Server Framework**: Serverless (Supabase).
- **Development vs Production**: 
  - Dev: `npm run dev` (Vite).
  - Prod: Build estático otimizado com Rollup.
- **API Design**: Comunicação direta com Supabase via `supabase-js`.
- **Authentication & Authorization**: 
  - Gerenciado pelo Supabase Auth.
  - Roles: `admin`, `coach`, `student`.
  - Fluxo de Aprovação: Usuários novos começam como `pending` e precisam de aprovação (Admin para Coaches, Coaches para Alunos).
  - **Cascading Lock**: Se a assinatura do Coach expira, seus alunos também perdem acesso (verificado em `components/Auth/RequireAuth.tsx`).
- **Route Organization**: Rotas protegidas via `RequireAuth` no `App.tsx`, filtrando acesso por role.
- **Email Notifications**: Atualmente delegadas ao Supabase Auth (emails de confirmação/reset).

## Project Structure & Navigation
### Directory Structure
- `/components`: Componentes reutilizáveis (UI Kit, Layouts).
- `/pages`: Telas da aplicação divididas por domínio (`coach`, `student`, `admin`).
- `/contexts`: Gerenciamento de estado global (`AuthContext`, `ThemeContext`).
- `/lib`: Configurações de serviços externos (Supabase Client).
- `/types`: Definições de tipos TypeScript compartilhados (Banco de dados).

### Route Tree
#### Public
- `/login`: Tela de acesso.
- `/register`: Cadastro de novos usuários (Coach ou Student via link de convite).
- `/`: Redirecionamento inteligente baseado no status de autenticação.

#### Coach Area (`/coach/*`)
- `/dashboard`: Visão geral (Alunos ativos, vencimentos).
- `/students`: Lista completa de alunos e status.
- `/student/:id`: Perfil detalhado do aluno (evolução, treino atual).
- `/invite`: Geração de Convite (Link/QR Code) para novos alunos. 
- `/library`: Banco de exercícios pessoal do coach.
- `/editor`: Ferramenta de criação de treinos.
- `/plans`: Gestão de assinatura do próprio coach.
- `/profile`: Configurações de perfil profissional.

#### Student Area (`/student/*`)
- `/dashboard`: Treino do dia e progresso semanal.
- `/workout/:id`: Interface de execução de treino (Player de vídeo, Cronômetro).
- `/history`: Histórico de treinos realizados.
- `/profile`: Dados corporais e fotos de evolução.
- `/selection`: (Se aplicável) Seleção de plano/treino.

#### Admin Area (`/admin/*`)
- `/dashboard`: Gestão global da plataforma (Aprovação de Coaches).

## Database Layer
- **Database**: PostgreSQL (Supabase).
- **Database Schema**:
  - `profiles`: Dados base de todos os usuários.
  - `coaches_data`: Informações específicas de treinadores (CREF, bio, assinaturas).
  - `students_data`: Informações de alunos (objetivos, medidas, coach vinculado).
  - `exercises`: Biblioteca de exercícios (global e customizada por coach).
  - `routines`: Treinos/Rotinas criadas por coaches.
  - `student_assignments`: Vinculação de treinos a alunos.
  - `workout_logs` & `set_logs`: Histórico de execução de treinos.
  - `evolution_photos`: Galeria de progresso.
  - `weight_history`: Acompanhamento de peso.
- **Data Validation**: Row Level Security (RLS) no Supabase garante que usuários só acessem seus próprios dados ou dados de seus subordinados.

## Business Rules & Flows (Current State)
### User Onboarding
- **Coach**: Cadastro livre via `/register`. Inicia com status `pending`. Requer preenchimento de CREF (com máscara automática `000000-G/UF`) e aprovação manual de um Admin.
- **Admin**: Promoção realizada via SQL direto no banco de dados por segurança.
- **Student**: O cadastro é **restrito**. O aluno só consegue se cadastrar através de um link de convite gerado pelo Coach (`/register?coach=UUID`). O aluno inicia como `pending` e exige aprovação do Coach.
- **Landing Page**: Não existe página pública. A rota raiz `/` redireciona para Login ou Dashboard dependendo da sessão.

### Subscription Lifecycle
- **Bloqueio Total**: Quando a assinatura expira (Coach ou Aluno vinculado a Coach expirado), o acesso é totalmente revogado.
- **Tela de Bloqueio**: O usuário é redirecionado para `/subscription-expired`, que exibe uma mensagem informativa e um botão de WhatsApp para contatar o suporte/admin para renovação manual. Não há checkout ou pagamento automático no app.
- **Cascata**: Se a assinatura do Coach vence, todos os seus alunos são automaticamente bloqueados de acessar o app.

## External Dependencies
- **Supabase**: Auth, Database e Storage.
- **Recharts**: Visualização de gráficos de evolução.
- **React Hot Toast**: Notificações in-app.
- **QRCode.react**: Geração de convites via QR Code.
- **ExerciseDB (Futuro)**: Integração para banco de exercícios global.

## Automation & Tools
### YouTube Video Automation
Localizado em `/scripts/youtube-upload`, este script automatiza o envio de vídeos para o YouTube como "Não listados" e atualiza o Supabase.
- **Input**: Pasta `public/exercises/hevy/`.
- **Output**: Links do YouTube injetados no banco de dados.
- **Tags**: Aplicação automática de `#Shorts` para melhor exibição mobile.
- **Persistence**: Controle de arquivos já processados via `processed.json`.
- **Trigger**: Script de execução diária para evitar limites de cota da API.

## Meta Tags & SEO
- **Title**: FitCoach Pro
- **Description**: "A plataforma de coaching fitness mais elegante e intuitiva."
- **Config**: Mobile-first, otimizado para `viewport-fit=cover` (PWA feel).
