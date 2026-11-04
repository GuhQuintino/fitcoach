# Correção: aviso de atualização do aplicativo

Data: 2026-11-04. Origem: aluno não recebeu tutorial publicado no app instalado.

## Causa
O aviso antigo dependia de updatefound do service worker. public/sw.js continuava byte a byte igual entre publicações do frontend, com cache fixo fitcoach-v12; não havia verificação de versão ao retomar o app. O worker também ativava sem aguardar aceite e o cliente recarregava sem coordenar controllerchange.

## Implementação
- Cada build emite version.json e um sw.js com identificador único, igual ao identificador compilado no cliente.
- Verificação ao iniciar, voltar ao primeiro plano, reconectar e a cada minuto enquanto visível. Registro com updateViaCache none.
- Aviso acessível Nova versão disponível, Atualizar agora e Mais tarde; nenhuma recarga sem aceite. Aceite testa rede, envia SKIP_WAITING e aguarda controllerchange antes de recarregar; erro mantém app aberto.
- Worker não intercepta version.json/sw.js/API; cache de HTML canônico atualizado; expurgo restrito a caches fitcoach. Headers impedem cache HTTP de manifest de versão e worker.
- Sem alteração de autenticação, dados de aluno, sessão de treino ou banco.

## Evidências
- 246 testes aprovados em 26 arquivos, incluindo cinco regressões de atualização: publicação sem worker modificado, retomada/reconexão, aceite/ativação, offline e limpeza de listeners.
- TypeScript e build aprovados; build emite version.json e sw.js versionado.
- Navegador Chromium 375x667, service worker e caches reais, duas publicações simuladas: 8/8 verificações aprovadas. .qatest/app-update-results.json e app-update-mobile.png.
- Sessão ativa e rota preservadas; zero gravações remotas. ERR_INTERNET_DISCONNECTED esperado apenas na etapa offline provocada.
- Inspeção visual do aviso no celular aprovada. Sem promessa de teste físico em iOS/Android.

## Transição
Uma instância já aberta com o JavaScript antigo não pode receber retroativamente a lógica nova. Fechar totalmente e abrir o app novamente permite baixar esta correção; depois a detecção em primeiro plano passa a oferecer novas versões. O tutorial fica no Perfil, seção Configurações, botão Tutorial; não inicia automaticamente.

Publicado em origin/main no commit 3d15a7781f342a2845d50601b3dd4ec58b154cd6. Vercel confirmou Production com status success (Deployment has completed): https://vercel.com/gustavos-projects-2f647c1d/fitcoach/BygPWcDggXrvrAh8TxSYfCJSNf1p.
