# Publicacao Web

## 1. GitHub

Repositorio oficial criado e conectado ao projeto local:

- Repository: `EPSOLUCOES-ESPECIALIZADA-EM-IMPRESSORAS/erp-epsolucoes`
- URL: https://github.com/EPSOLUCOES-ESPECIALIZADA-EM-IMPRESSORAS/erp-epsolucoes
- Branch principal: `main`
- Remote local: `origin`

O commit local de preparacao para deploy ja foi publicado na branch `main`.

## 2. Firebase de producao

1. Criar um projeto Firebase proprio da EPSOLUCOES.
2. Ativar Authentication com provedor Google.
3. Criar Firestore. Use o banco padrao `(default)`, salvo se houver motivo para usar um database id customizado.
4. Ativar Firebase Storage.
5. Copiar as credenciais do app web para `.env.local` e para as variaveis de ambiente do Cloudflare Pages.
6. Publicar `firestore.rules` e `storage.rules`.

## 3. Cloudflare Pages

Projeto Pages criado na conta Cloudflare:

- Project name: `erp-epsolucoes`
- Project ID: `0e0ae990-dc1d-432f-b00d-c10fdb9a34c4`
- URL: https://erp-epsolucoes.pages.dev
- Production branch: `main`
- Current production deployment: `76a4b94e-c32e-4592-ac60-66baf3ed851e`

Uma primeira versao foi publicada por Direct Upload para validacao do sistema no ar. Ela ainda usa o fallback `firebase-applet-config.json` enquanto o Firebase proprio da EPSOLUCOES nao for configurado nas variaveis `VITE_FIREBASE_*`.

Importante: a Cloudflare nao permite converter um projeto Pages criado como Direct Upload para GitHub source pela API. Para deploy continuo automatico via GitHub, existem duas opcoes:

1. Manter este projeto como Direct Upload e publicar manualmente quando necessario.
2. Recriar o projeto Pages conectado ao GitHub, usando o mesmo repositorio e as mesmas configuracoes.

Configuracao recomendada para o Pages conectado ao GitHub:

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

## 4. Checklist pos-deploy

- Adicionar o dominio final do Pages nos dominios autorizados do Firebase Authentication.
- Entrar com Google.
- Cadastrar cliente, equipamento e OS.
- Fazer upload de anexo em uma OS.
- Abrir uma rota publica `/track/:token`.
- Recarregar paginas internas e confirmar que nao ha 404.
