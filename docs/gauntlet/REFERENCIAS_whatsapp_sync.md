# Inteligência de Referência e Arquitetura Técnica — Integração WhatsApp Web + Gemini Audio nos Dossiês (`weekly-workout-adjuster`)

- **Projeto / Domínio:** Fitcoach (`weekly-workout-adjuster` — Automação de Revisão Semanal, CRM de Alunos e Dossiês Clínicos/Biomecânicos)
- **Perfil Detectado:** `data-pipeline` (Scripts ESM Node.js `.mjs` + Automação CDP/Puppeteer/Browser-Harness + Integração Postgres Dual-DB + Transcrição Multimodal Gemini API)
- **Data da Pesquisa:** `2026-10-17T03:22:30Z`

---

## 1. Diagnóstico do Estado Atual & Variáveis de Ambiente

### 1.1. Sincronia entre Repositório Local e Espelho Global
Foi realizada a verificação de hash SHA-256 de todos os arquivos entre:
- **Local (`Fitcoach`):** `C:\Users\Gustavo\Desktop\Fitcoach\.agents\skills\weekly-workout-adjuster\`
- **Global (`~/.gemini`):** `C:\Users\Gustavo\.gemini\config\skills\weekly-workout-adjuster\`

| Arquivo Relativo | Status Atual | Diretriz para o Builder (Stage 2) |
|---|---|---|
| `SKILL.md` | 100% Idêntico | Atualizar em ambos os caminhos mantendo paridade de bytes |
| `references/dossier-template.md` | 100% Idêntico | Atualizar com a nova Seção 6 (WhatsApp) e Seção 7 (Diretrizes) |
| `references/progression-heuristics.md` | 100% Idêntico | Incluir cruzamento de sinais de áudio/texto do WhatsApp |
| `references/report-template.md` | 100% Idêntico | Incluir bloco de contexto do WhatsApp no relatório semanal |
| `scripts/sync_whatsapp_Context.mjs` *(Novo)* | Não existe | Criar em ambos os diretórios (`scripts/sync_whatsapp_context.mjs`) |
| `scripts/generate_all_student_dossiers.mjs` | 100% Idêntico | Integrar leitura de `.whatsapp_cache/{slug}.json` e renderizar Seção 6 |
| `scripts/fetch_weekly_review.mjs` | 100% Idêntico | Anexar `whatsappHistory` (últimos 7-14 dias + transcrições) no JSON de saída |
| `scripts/apply_approved_adjustments.mjs` | 100% Idêntico | Preservar seção do WhatsApp ao atualizar dossiês `.md` |

### 1.2. Inspeção de Chaves e Dependências Instaladas
- **Chave da API Gemini (`GEMINI_API_KEY`):**
  - Verificada a presença da variável `GEMINI_API_KEY` em `C:\Users\Gustavo\Desktop\Questionários\.env.local`.
  - Como os scripts `generate_all_student_dossiers.mjs` e `fetch_weekly_review.mjs` já carregam `questionariosEnv = parseEnv(join(QUESTIONARIOS_DIR, '.env.local'))` e `fitcoachEnv = parseEnv(join(FITCOACH_DIR, '.env.local'))`, a resolução da chave deve seguir a cascata:
    ```javascript
    const GEMINI_API_KEY =
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      fitcoachEnv.GEMINI_API_KEY ||
      fitcoachEnv.GOOGLE_API_KEY ||
      questionariosEnv.GEMINI_API_KEY ||
      questionariosEnv.GOOGLE_API_KEY;
    ```
- **Pacotes Nativos no `Fitcoach/package.json`:**
  - `"puppeteer": "^24.34.0"` já está instalado em `Fitcoach/node_modules/puppeteer` (suporta `puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' })` sobre o Chrome aberto ou `puppeteer.launch({ userDataDir })` com sessão persistente do WhatsApp Web).
  - `"pg": "^8.23.0"` já instalado e em uso nos scripts `.mjs`.
  - Node.js v22+ nativo com `fetch` global, `crypto.createHash` e suporte ESM.

---

## 2. Arquitetura de Extração no WhatsApp Web via CDP / Browser Automation (Regras W1, W2, W3)

### 2.1. Conexão Resiliente em Camadas à Sessão Ativa do WhatsApp Web (W1)
O extrator (`scripts/sync_whatsapp_context.mjs`) deve suportar três modos de conexão sem fechar o navegador do treinador:
1. **Modo 1 — CDP Attach na Sessão Aberta do Chrome (`--cdp-url` ou portas padrão `9222` / daemon do `browser-harness`):**
   - Tenta conectar via `puppeteer.connect({ browserURL: cdpUrl, defaultViewport: null })`.
   - Procura uma aba existente cujo `page.url()` contenha `web.whatsapp.com`. Se encontrar, reutiliza a aba sem recarregar a página; se não encontrar, abre `https://web.whatsapp.com` em nova aba.
2. **Modo 2 — Sessão Persistente Dedicada (`userDataDir`):**
   - Caso nenhuma porta CDP esteja aberta, inicia `puppeteer.launch({ headless: false, defaultViewport: null, userDataDir: join(FITCOACH_DIR, '.whatsapp_session') })` mantendo o login QR Code salvo entre execuções.
3. **Modo 3 — Importação / Injeção via Bridge MCP (`chrome-devtools` / `browser-harness`):**
   - O script expõe funções modulares puras (`normalizeStudentPhoneVariants`, `mergeWhatsappMessages`, `transcribeAudioWithGemini`, `formatWhatsappSectionMarkdown`) e aceita payload JSON extraído via `evaluate_script` do Chrome DevTools MCP (`--from-json=<arquivo>`), garantindo 100% de operabilidade mesmo quando o agente opera diretamente via MCP `chrome-devtools`.

### 2.2. Estratégia Híbrida de Localização do Aluno no WhatsApp Web (Regra W2)

#### Passo A: Varredura na Lista / Filtro `"Consultoria"`
No WhatsApp Web moderno, os filtros de etiquetas/listas no topo da `#side` são botões dentro de `div[role="tablist"]` ou elementos com texto `"Consultoria"`:
```javascript
// Seletores resilientes para ativar o filtro "Consultoria"
const CONSULTORIA_FILTER_SELECTORS = [
  'button[role="tab"]',
  'div[role="tab"]',
  '#side button',
  '[data-testid="chat-list-filter-tab"]'
];
```
- O script localiza o botão cujo `innerText.trim().toLowerCase() === 'consultoria'` e clica nele se ainda não estiver selecionado (`aria-selected="true"`).
- Em seguida, percorre a lista virtualizada (`#pane-side` -> `[role="listitem"]` / `[role="row"]`), fazendo scroll incremental (`paneSide.scrollTop += 600`) e indexando os títulos visíveis (`span[title]`).
- Se o nome do aluno (match exato, primeiro + último nome ou telefone formatado) estiver na lista `"Consultoria"`, clica diretamente no item correspondente.

#### Passo B: Fallback via Barra de Pesquisa (Telefone Normalizado -> Nome do Aluno)
Para alunos de personal ou não encontrados na varredura direta da etiqueta `"Consultoria"`:
1. **Desativar filtro restritivo:** Volta para a aba `"Tudo"` / `"All"` ou limpa a caixa de pesquisa.
2. **Focar na Caixa de Pesquisa (`#side`):**
   ```javascript
   const SEARCH_INPUT_SELECTORS = [
     '[data-testid="chat-list-search"]',
     '#side div[contenteditable="true"][data-tab="3"]',
     '#side div[contenteditable="true"][role="textbox"]',
     'div[aria-label*="pesquisa" i][contenteditable="true"]',
     'div[aria-label*="search" i][contenteditable="true"]'
   ];
   ```
3. **Variações Canônicas de Telefone Brasileiro (`normalizeStudentPhoneVariants`):**
   O WhatsApp armazena contas brasileiras às vezes com o 9º dígito e às vezes sem o 9º dígito (especialmente DDDs fora de SP/RJ ou contas antigas). Dado um telefone do banco `Questionários` (ex: `(51) 99876-5432` ou `5551998765432`):
   - **Variante 1 (Últimos 8 dígitos — Match Universal):** `9876-5432` e `98765432` (ignora diferenças de DDI +55 e do 9º dígito na busca do WhatsApp Web!).
   - **Variante 2 (DDD + 9 dígitos):** `51 99876-5432` / `51998765432`.
   - **Variante 3 (DDD + 8 dígitos sem o 9):** `51 9876-5432` / `5198765432`.
4. **Fallback por Nome:**
   - Se nenhuma variante de telefone retornar conversa em `#pane-side`, pesquisa por `PrimeiroNome Sobrenome` e `PrimeiroNome`.

### 2.3. Janela Temporal Incremental: Cold Start (60–90 dias) vs. Semanal (7–14 dias) (Regra W3)
- O script verifica se já existe o arquivo `C:\Users\Gustavo\Desktop\Fitcoach\docs\students\.whatsapp_cache\{slug}.json` com mensagens válidas (`messages.length > 0` e `lastSyncAt`).
- **Cold Start (1ª Sincronização ou `--full-sync`):**
  - Define `cutoffDate = now - 75 days` (janela configurável `--days-cold=90`, padrão 75–90 dias).
  - Realiza scroll reverso no container de mensagens (`#main div[role="application"]` ou ancestral scrollável de `[data-id]`) até que a mensagem mais antiga visível no topo tenha data anterior ao `cutoffDate` ou que o topo da conversa/limite de scrolls (`MAX_SCROLL_ATTEMPTS = 25`) seja atingido.
- **Sincronização Incremental Semanal (Execuções Subsequentes):**
  - Define `cutoffDate = now - 10 days` (janela de 7 a 14 dias, configurável via `--days=10`).
  - Faz apenas 3 a 5 scrolls curtos no final da conversa, coleta as mensagens recentes e faz **merge determinístico sem duplicação** por `msgId` no `.whatsapp_cache/{slug}.json`.

---

## 3. Extração de Mensagens DOM, Captura de Blobs de Áudio (PTT) e Transcrição Gemini (Regra W4)

### 3.1. Seletores DOM Resilientes de Mensagens na `#main`
Cada mensagem no WhatsApp Web reside dentro de `#main` em um container com atributo `data-id` (ex: `true_555199999999@c.us_3EB0...` ou `false_555199999999@c.us_...`):
- **Direção (`sender`):**
  - `data-id` começando com `true_` ou classe `.message-out` → `sender: "coach"` (Treinador).
  - `data-id` começando com `false_` ou classe `.message-in` → `sender: "student"` (Aluno).
- **Timestamp e Metadados (`data-pre-plain-text`):**
  - O elemento `div.copyable-text[data-pre-plain-text]` contém string no formato `"[14:32, 15/10/2026] Nome: "` ou `"[14:32, 10/15/2026] Nome: "`.
  - Fallback de horário: último `span` de horário dentro da bolha (`HH:MM`) combinado com os divisores de data da timeline (`div[role="row"] span` com `"HOJE"`, `"ONTEM"`, `"DD/MM/YYYY"` ou dias da semana).
- **Texto da Mensagem:**
  - Extraído de `.selectable-text.copyable-text span` (concatenando emojis `img[alt]` caso existam).

### 3.2. Extração de Áudios / PTT (`audio/ogg; codecs=opus`) no Contexto do WhatsApp Web
Mensagens de voz (PTT) no WhatsApp Web são identificadas por:
- Presença de `button[aria-label*="Reproduzir" i]`, `button[aria-label*="Play" i]`, `span[data-icon="audio-play"]`, `span[data-icon="ptt-status"]`, ou elemento `<audio>` dentro do nó `[data-id]`.

**Fluxo em 3 Níveis para Extrair os Bytes do Áudio em Base64 (dentro de `page.evaluate`):**
1. **Nível 1 (Elemento `<audio src="blob:...">` já hidratado):**
   - Se a bolha já possui `<audio src="blob:https://web.whatsapp.com/...">`, executa `fetch(audioEl.src)` dentro do contexto da página (`web.whatsapp.com`), converte o `Blob` via `FileReader.readAsDataURL` para `base64` (`audio/ogg`).
2. **Nível 2 (Hidratação Silenciosa via Clique Interceptado no Botão Play):**
   - O WhatsApp Web só cria o `blob:` URL quando o usuário clica em Play ou quando o media manager baixa o PTT.
   - Antes de clicar no botão Play da bolha de áudio, injetamos um hook temporário no `window` que silencia `HTMLMediaElement.prototype.play` (define `this.muted = true; this.volume = 0;`) e captura imediatamente qualquer `this.src` (`blob:https://web.whatsapp.com/...`) atribuído ao `<audio>` global ou `URL.createObjectURL(blob)`:
     ```javascript
     // Hook de interceptação silenciosa de Blob no contexto da página
     if (!window.__fitcoachAudioHookInstalled) {
       window.__fitcoachCapturedBlobs = new Map();
       const origCreateObjectURL = URL.createObjectURL;
       URL.createObjectURL = function(obj) {
         const url = origCreateObjectURL.call(this, obj);
         if (obj instanceof Blob && (obj.type.includes('audio') || obj.type.includes('ogg'))) {
           window.__fitcoachLastAudioBlob = { url, blob: obj, ts: Date.now() };
         }
         return url;
       };
       const origPlay = HTMLMediaElement.prototype.play;
       HTMLMediaElement.prototype.play = function() {
         this.muted = true;
         this.volume = 0;
         if (this.src && this.src.startsWith('blob:')) {
           window.__fitcoachLastPlayedSrc = this.src;
         }
         return origPlay.apply(this, arguments).then(() => {
           this.pause();
         }).catch(() => {});
       };
       window.__fitcoachAudioHookInstalled = true;
     }
     ```
   - Ao clicar no botão Play do PTT, o WhatsApp descriptografa o áudio, chama `URL.createObjectURL(blob)` / define `audio.src`, o hook pausa imediatamente sem emitir som e converte o `Blob` para Base64!
3. **Nível 3 (Fallback Seguro):**
   - Caso um áudio antigo não esteja mais disponível no servidor do WhatsApp (expirado/não baixável), registra `type: "audio"`, `transcriptionStatus: "unavailable"`, `text: "[Áudio do WhatsApp indisponível para download automático]"` sem interromper o pipeline.

### 3.3. Transcrição e Extração de Contexto via Gemini API com Cache Perpétuo por Hash/ID
- **Prevenção de Re-transcrição (Cache Obrigatório):**
  - Antes de chamar a API do Gemini, o script verifica se `cache.audioTranscriptions[msgId]` ou `cache.audioTranscriptions[audioSha256]` já existe no arquivo `.whatsapp_cache/{slug}.json`.
  - Se já existir, reutiliza a transcrição instantaneamente a custo zero.
- **Chamada Multimodal à API Gemini:**
  - Utiliza a REST API oficial `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}` (com cascata automática de modelos: tenta `gemini-2.5-flash` / `gemini-3.8-flash` / `gemini-2.0-flash` para máxima compatibilidade com a chave ativa em `.env.local`).
  - Payload enviado:
    ```json
    {
      "contents": [
        {
          "role": "user",
          "parts": [
            {
              "inlineData": {
                "mimeType": "audio/ogg",
                "data": "<BASE64_OGG_OPUS>"
              }
            },
            {
              "text": "Transcreva fielmente este áudio em português do Brasil (enviado em conversa de consultoria de musculação entre aluno e treinador). Em seguida, se houver menção a dores, desconfortos articulares, cargas, equipamentos da academia, sono, rotina ou dúvidas de execução, adicione uma linha final começando por 'Resumo Clínico/Treino: ' sintetizando os pontos-chave em até 150 caracteres."
            }
          ]
        }
      ],
      "generationConfig": {
        "temperature": 0.1
      }
    }
    ```

---

## 4. Schemas de Dados & Contratos JSON (Regra W3 & W5)

### 4.1. Contrato do Cache Local (`Fitcoach/docs/students/.whatsapp_cache/{slug}.json`)
```json
{
  "studentSlug": "diandra-santos",
  "studentName": "Diandra Santos",
  "phoneRaw": "5551999999999",
  "whatsappChatTitle": "Diandra Santos",
  "matchedBy": "consultoria_filter | phone_search | name_search",
  "firstSyncAt": "2026-10-17T03:30:00.000Z",
  "lastSyncAt": "2026-10-17T03:30:00.000Z",
  "syncMode": "cold_start_90d | incremental_14d",
  "audioTranscriptions": {
    "false_5551999999999@c.us_3EB0123456": {
      "sha256": "a1b2c3...",
      "transcribedAt": "2026-10-17T03:30:05.000Z",
      "model": "gemini-2.5-flash",
      "transcript": "Gustavo, hoje no treino B senti um pouco o ombro direito fazendo o desenvolvimento com halteres, acho que porque o banco da academia nova não trava em 85 graus.",
      "clinicalSummary": "Desconforto no ombro direito no Desenvolvimento c/ Halteres; banco da academia nova sem ajuste de 85°."
    }
  },
  "messages": [
    {
      "id": "false_5551999999999@c.us_3EB0123456",
      "timestamp": "2026-10-15T18:42:00.000Z",
      "dateFormatted": "15/10/2026 18:42",
      "sender": "student",
      "senderLabel": "Aluno",
      "type": "audio",
      "durationSeconds": 18,
      "text": "Gustavo, hoje no treino B senti um pouco o ombro direito fazendo o desenvolvimento com halteres, acho que porque o banco da academia nova não trava em 85 graus.",
      "clinicalSummary": "Desconforto no ombro direito no Desenvolvimento c/ Halteres; banco da academia nova sem ajuste de 85°."
    },
    {
      "id": "true_5551999999999@c.us_3EB0654321",
      "timestamp": "2026-10-15T19:10:00.000Z",
      "dateFormatted": "15/10/2026 19:10",
      "sender": "coach",
      "senderLabel": "Treinador",
      "type": "text",
      "text": "Boa Diandra! Na revisão de domingo já vou ajustar essa angulação ou colocar na máquina convergente pra proteger teu ombro."
    }
  ]
}
```

### 4.2. Estrutura da Nova Seção 6 no Dossiê (`Fitcoach/docs/students/{slug}.md`)
Em `generate_all_student_dossiers.mjs` e `references/dossier-template.md`, a seção 6 passa a ser:
```markdown
## 6. Histórico de Conversas & Áudios (WhatsApp)
- **Status da Sincronização:** Sincronizado em `DD/MM/AAAA` (Via: Etiqueta Consultoria / Busca por Telefone) | **Total de Mensagens Mapeadas:** `N` (`M` áudios transcritos)
- **Destaques Clínicos, Biomecânicos & Rotina Extraídos de Áudios/Textos:**
  - 🎙️ *[15/10/2026 - Áudio Aluno]:* Desconforto no ombro direito no Desenvolvimento c/ Halteres; banco da academia nova sem ajuste de 85°.
- **Registro Cronológico Recente (WhatsApp):**
  - **[15/10/2026 18:42] 🎙️ Aluno (Áudio transcrito):** *"Gustavo, hoje no treino B senti um pouco o ombro direito..."*
  - **[15/10/2026 19:10] 💬 Treinador:** *"Boa Diandra! Na revisão de domingo já vou ajustar..."*
```
*(Nota: A antiga seção `6. Diretrizes para Revisões Semanais da Skill` passa a ser `## 7. Diretrizes para Revisões Semanais da Skill`).*

### 4.3. Enriquecimento do Payload de `fetch_weekly_review.mjs`
Cada objeto `student` retornado por `fetch_weekly_review.mjs` passa a incluir o campo `whatsappHistory`:
```json
"whatsappHistory": {
  "hasCache": true,
  "lastSyncAt": "2026-10-17T03:30:00.000Z",
  "MatchedBy": "consultoria_filter",
  "recentMessages": [...],
  "recentAudioSummaries": [...]
}
```
Se a flag `--sync-whatsapp` for passada para `fetch_weekly_review.mjs` (ou `generate_all_student_dossiers.mjs`), ele invoca automaticamente a sincronização incremental do WhatsApp antes de consolidar o relatório.

---

## 5. Pitfalls Técnicos Mapeados (Armadilhas a Evitar)

- ⚠️ **Pitfall 1 — Descarte de DOM Virtualizado no WhatsApp Web (`#pane-side` e `#main`):**
  - O WhatsApp Web usa lista virtualizada: à medida que o scroll sobe ou desce, nós DOM fora da viewport são destruídos.
  - **Mitigação:** Coletar e acumular as mensagens em um `Map(msgId -> messageObj)` **a cada passo de scroll** antes de rolar novamente, nunca esperando chegar ao topo para ler o DOM inteiro de uma vez.
- ⚠️ **Pitfall 2 — Variação do 9º Dígito em Telefones Brasileiros no WhatsApp:**
  - Muitos números de DDDs fora de `11–28` (como DDDs `31+`, `41+`, `51+`, `61+`, `71+`, `81+`, `91+`) foram cadastrados no WhatsApp sem o nono dígito (`9`), enquanto no banco `Questionários` estão salvos com 9 dígitos.
  - **Mitigação:** Pesquisar pelos **últimos 8 dígitos** (`XXXX-XXXX` ou `XXXXXXXX`) na barra de busca do WhatsApp Web encontra o contato independentemente da presença ou ausência do 9º dígito e do código de país `+55`.
- ⚠️ **Pitfall 3 — Reprodução Sonora Acidental ao Hidratar Blobs de Áudio:**
  - Clicar em Play em 30 áudios seguidos tocaria som alto no computador do treinador.
  - **Mitigação:** Instalar o interceptador de `HTMLMediaElement.prototype.play` com `this.muted = true; this.volume = 0;` e `this.pause()` imediato assim que o `blob:` URL for capturado.
- ⚠️ **Pitfall 4 — Sobrescrita Acidental do Cache ao Rodar Sem Navegador Aberto:**
  - Se `generate_all_student_dossiers.mjs` for executado offline (sem WhatsApp Web conectado), ele **NUNCA** deve apagar o `.whatsapp_cache/{slug}.json` existente; deve ler o cache salvo em disco e renderizar a Seção 6 normalmente.

---

## 6. Verificação de Skills Especializadas & Plano de Fatias Verticais para o Stage 2

### 6.1. Skills Disponíveis no Ambiente
- `weekly-workout-adjuster` (Local & Global) — pronta para atualização.
- `browser-harness` & `chrome-devtools` — disponíveis para automação CDP.
- `gemini-api-dev` — diretrizes de áudio e modelos mapeadas.
- Nenhuma skill extra separada precisa ser criada, pois o módulo pertence nativamente à skill `weekly-workout-adjuster`.

### 6.2. Plano de Execução em Fatias Verticais para o `gauntlet-builder` (Stage 2)
- **Slice 1 — Motor Core de Sincronização WhatsApp + Transcrição Gemini (`scripts/whatsapp_sync_core.mjs` & `scripts/sync_whatsapp_context.mjs`):**
  - Normalizador de telefones BR (com/sem 9º dígito, últimos 8 dígitos), parser de `data-pre-plain-text`, gerenciador de cache incremental/cold-start em `docs/students/.whatsapp_cache/{slug}.json`, extrator CDP/Puppeteer (`Consultoria` filter + fallback busca por telefone/nome + extração de mensagens e blobs PTT mutados) e cliente de transcrição Gemini API com cache por ID/SHA-256.
- **Slice 2 — Integração nos Geradores de Dossiês, Revisão Semanal e Documentação da Skill:**
  - Atualização de `generate_all_student_dossiers.mjs`, `fetch_weekly_review.mjs`, `SKILL.md`, `references/dossier-template.md`, `references/progression-heuristics.md` e `references/report-template.md` com sincronização espelhada 100% idêntica em `C:\Users\Gustavo\.gemini\config\skills\weekly-workout-adjuster\`.
- **Slice 3 — Testes Automatizados (`tests/whatsappSyncDossier.test.ts`) e Regeneração Real dos Dossiês:**
  - Criação de suíte Vitest cobrindo normalização de telefones, parsing de mensagens/datas do WhatsApp Web, merge incremental sem duplicatas (Cold Start 90d vs Semanal 14d), cache de transcrição de áudio Gemini e renderização Markdown da Seção 6 nos dossiês.
