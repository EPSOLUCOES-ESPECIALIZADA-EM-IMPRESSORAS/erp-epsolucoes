# Publicacao Web

## 1. GitHub

Repositorio oficial criado e conectado ao projeto local:

- Repository: `EPSOLUCOES-ESPECIALIZADA-EM-IMPRESSORAS/erp-epsolucoes`
- URL: https://github.com/EPSOLUCOES-ESPECIALIZADA-EM-IMPRESSORAS/erp-epsolucoes
- Branch principal: `main`
- Remote local: `origin`

O commit local de preparacao para deploy ja foi publicado na branch `main`.

## 2. Firebase de producao

Status atual:

- Projeto Firebase criado: `erp-epsolucoes-prod`
- App web criado: `ERP EPSOLUCOES Web`
- App ID: `1:211181489925:web:38a616262132b53f38716c`
- Firestore criado em `southamerica-east1`
- Regras do Firestore publicadas com sucesso
- Variaveis `VITE_FIREBASE_*` configuradas no Cloudflare Pages
- Auth Google pendente de ativacao no Console Firebase
- Storage substituido por Cloudflare R2 para evitar dependencia de billing/Blaze no Firebase Storage

Configuracao Firebase usada pelo frontend:

- `VITE_FIREBASE_API_KEY`: configurado no Cloudflare Pages
- `VITE_FIREBASE_AUTH_DOMAIN`: `erp-epsolucoes-prod.firebaseapp.com`
- `VITE_FIREBASE_PROJECT_ID`: `erp-epsolucoes-prod`
- `VITE_FIREBASE_STORAGE_BUCKET`: nao e mais usado para anexos; uploads usam Cloudflare R2
- `VITE_FIREBASE_MESSAGING_SENDER_ID`: `211181489925`
- `VITE_FIREBASE_APP_ID`: `1:211181489925:web:38a616262132b53f38716c`
- `VITE_FIREBASE_DATABASE_ID`: `(default)`

Comandos ja executados:

```bash
firebase projects:create erp-epsolucoes-prod --display-name "ERP EPSOLUCOES"
firebase apps:create WEB "ERP EPSOLUCOES Web" --project erp-epsolucoes-prod
firebase firestore:databases:create "(default)" --location southamerica-east1 --edition standard --project erp-epsolucoes-prod
firebase deploy --only firestore:rules --project erp-epsolucoes-prod
```

Pendencias no Console Firebase:

1. Em Authentication, clicar em "Get started" e ativar o provedor Google.
2. Em Authentication > Settings > Authorized domains, confirmar/adicionar:
   - `erp-epsolucoes.pages.dev`
   - `erp-epsolucoes-prod.firebaseapp.com`
3. Firebase Storage nao sera usado nesta etapa. Os anexos de OS serao armazenados no Cloudflare R2.

## 3. Cloudflare Pages

Projeto Pages criado na conta Cloudflare:

- Project name: `erp-epsolucoes`
- Project ID: `0e0ae990-dc1d-432f-b00d-c10fdb9a34c4`
- URL: https://erp-epsolucoes.pages.dev
- Production branch: `main`
- Current production deployment: `76a4b94e-c32e-4592-ac60-66baf3ed851e`

Uma primeira versao foi publicada por Direct Upload para validacao do sistema no ar. Ela ainda usa o fallback `firebase-applet-config.json` enquanto o Firebase proprio da EPSOLUCOES nao for configurado nas variaveis `VITE_FIREBASE_*`.

Importante: a Cloudflare nao permite converter um projeto Pages criado como Direct Upload para GitHub source pela API. Uma tentativa de criar um novo Pages conectado diretamente ao GitHub tambem retornou erro interno na instalacao GitHub do Cloudflare Pages.

Decisao atual: manter o projeto Pages existente e automatizar o deploy por GitHub Actions usando Direct Upload. Assim o endereco `https://erp-epsolucoes.pages.dev` permanece igual e cada push no `main` pode publicar automaticamente.

Workflow criado:

- `.github/workflows/deploy-cloudflare-pages.yml`
- Instala dependencias com `npm ci`
- Roda `npm run lint`
- Roda `npm run build`
- Publica `dist` no projeto Cloudflare Pages `erp-epsolucoes`

## 4. Cloudflare R2 para anexos

Decisao atual: usar Cloudflare R2 em vez de Firebase Storage para anexos e fotos de OS. Isso evita habilitar billing/Blaze apenas para armazenamento de arquivos.

Arquivos adicionados:

- `cloudflare/attachments-worker/worker.js`
- `cloudflare/attachments-worker/wrangler.toml`
- `src/lib/uploads.ts`

Arquitetura:

```text
React/Vite no Cloudflare Pages
  -> Firebase Auth + Firestore
  -> Cloudflare Worker /uploads
  -> Cloudflare R2 bucket erp-epsolucoes-attachments
```

Comandos para publicar quando o Wrangler estiver autenticado:

```bash
wrangler r2 bucket create erp-epsolucoes-attachments
cd cloudflare/attachments-worker
wrangler deploy
```

Depois do deploy do Worker, configurar:

- Cloudflare Pages variable `VITE_UPLOADS_API_URL=https://erp-epsolucoes-attachments.epsolucoesemimpressoras.workers.dev`
- GitHub Actions variable `VITE_UPLOADS_API_URL=https://erp-epsolucoes-attachments.epsolucoesemimpressoras.workers.dev`

Status: o codigo esta preparado, mas o Wrangler local ainda nao esta autenticado. Execute `wrangler login` e autorize a conta Cloudflare para criar o bucket e publicar o Worker.

Atualizacao:

- Wrangler autenticado como `epsolucoesemimpressoras@gmail.com`
- Bucket R2 criado: `erp-epsolucoes-attachments`
- Worker publicado: `erp-epsolucoes-attachments`
- Worker URL: `https://erp-epsolucoes-attachments.epsolucoesemimpressoras.workers.dev`
- Cloudflare Pages variable `VITE_UPLOADS_API_URL` configurada em production e preview
- Site publicado novamente no Pages com a API de anexos R2
- Verificado:
  - `https://erp-epsolucoes.pages.dev` retorna 200
  - `https://erp-epsolucoes.pages.dev/orders` retorna 200
  - Worker responde corretamente para rota `/files/...`

Segredos/variaveis necessarios no GitHub Actions:

- Secret `CLOUDFLARE_API_TOKEN`: token Cloudflare com permissao para publicar Pages no account `fe38d89d9663215f3453085d49c80f37`.
- Secret `VITE_FIREBASE_API_KEY`
- Secret `VITE_GEMINI_API_KEY`, opcional
- Variable `VITE_FIREBASE_AUTH_DOMAIN`
- Variable `VITE_FIREBASE_PROJECT_ID`
- Variable `VITE_FIREBASE_STORAGE_BUCKET`
- Variable `VITE_FIREBASE_MESSAGING_SENDER_ID`
- Variable `VITE_FIREBASE_APP_ID`
- Variable `VITE_FIREBASE_MEASUREMENT_ID`
- Variable `VITE_FIREBASE_DATABASE_ID`
- Variable `VITE_UPLOADS_API_URL`

Configuracao usada pelo workflow:

- Build command: `npm run build`
- Output directory: `dist`
- Node.js: versao 20 ou superior

Variaveis de ambiente:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_MEASUREMENT_ID`
- `VITE_FIREBASE_DATABASE_ID`
- `VITE_APP_URL`
- `VITE_GEMINI_API_KEY`, opcional

## 5. Checklist pos-deploy

- Adicionar o dominio final do Pages nos dominios autorizados do Firebase Authentication.
- Entrar com Google.
- Cadastrar cliente, equipamento e OS.
- Fazer upload de anexo em uma OS.
- Abrir uma rota publica `/track/:token`.
- Recarregar paginas internas e confirmar que nao ha 404.
