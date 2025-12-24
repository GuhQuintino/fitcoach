# Automação de Upload para YouTube

Este script automatiza o processo de:
1. Encontrar vídeos na pasta `public/exercises/hevy`.
2. Fazer upload deles para o YouTube como **Não Listado**.
3. Atualizar o banco de dados Supabase para apontar para o novo link do YouTube.

## Configuração Necessária

Antes de rodar, você precisa de credenciais do Google para acessar a API do YouTube.

### 1. Criar Credenciais no Google Cloud
1. Acesse [Google Cloud Console](https://console.cloud.google.com/).
2. Crie um novo projeto (ou use um existente).
3. No menu, vá em **APIs e Serviços** > **Biblioteca**.
4. Pesquise por **YouTube Data API v3** e ative-a.
5. Vá em **APIs e Serviços** > **Tela de permissão OAuth**.
   - Tipo de usuário: **Externo**.
   - Preencha os campos obrigatórios.
   - Adicione você mesmo como **Usuário de Teste** (seu email).
6. Vá em **APIs e Serviços** > **Credenciais**.
   - Clique em **Criar Credenciais** > **ID do cliente OAuth**.
   - Tipo de aplicativo: **App para computador** (Desktop App).
   - Nome: "Upload Script" (ou o que preferir).
7. Faça o download do arquivo JSON das credenciais.
8. **Renomeie** o arquivo para `client_secrets.json` e coloque-o DENTRO DESTA PASTA (`scripts/youtube-upload/`).

### 2. Variáveis de Ambiente
O script tenta ler as variáveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` (ou `SUPABASE_SERVICE_KEY`) do arquivo `.env` na raiz do projeto (`../../.env`). Certifique-se de que elas existem.

## Como Rodar

1. Abra o terminal nesta pasta (`scripts/youtube-upload`).
2. Instale as dependências (já deve ter sido feito pelo agente, mas se não):
   ```bash
   npm install
   ```
3. Execute o script:
   ```bash
   npm start
   ```

## Primeiro Acesso
Na primeira vez que você rodar, o script pedirá autorização:
1. Ele mostrará um link no terminal.
2. Abra o link no navegador e faça login com sua conta do Google (onde os vídeos serão postados).
3. O Google pode avisar que o app não foi verificado (pois você acabou de criar). Clique em "Avançado" -> "Acessar (nome do projeto) (não seguro)".
4. Copie o código gerado e cole no terminal quando solicitado.

O script salvará um arquivo `token.json` para não pedir login novamente.
Ele também cria um arquivo `processed.json` para lembrar quais vídeos já foram enviados, caso o script pare no meio.
