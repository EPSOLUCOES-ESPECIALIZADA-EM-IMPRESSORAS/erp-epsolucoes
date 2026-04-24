# ERP EPSOLUÇÕES

Sistema web para gestão de assistência técnica de impressoras: clientes, equipamentos, ordens de serviço, anexos, dashboard operacional e rastreio público de OS.

## Stack

- React + Vite + TypeScript
- Tailwind CSS v4
- shadcn/ui e lucide-react
- Firebase Authentication, Firestore e Storage
- Cloudflare Pages para hospedagem do frontend

## Rodar Localmente

1. Instale o Node.js 20+.
2. Instale as dependências:
   ```bash
   npm install
   ```
3. Copie `.env.example` para `.env.local` e preencha as variáveis `VITE_FIREBASE_*` do projeto Firebase da EPSOLUÇÕES.
4. Inicie o app:
   ```bash
   npm run dev
   ```

## Build

```bash
npm run lint
npm run build
```

O build de produção é gerado em `dist`.

## Deploy no Cloudflare Pages

- Framework preset: `Vite`
- Build command: `npm run build`
- Build output directory: `dist`
- Variáveis de ambiente: todas as chaves `VITE_FIREBASE_*`, além de `VITE_GEMINI_API_KEY` se a sugestão de diagnóstico por IA for usada.

O arquivo `public/_redirects` já inclui o fallback necessário para rotas SPA como `/orders`, `/clients` e `/track/:token`.

## Firebase

Crie um projeto Firebase próprio para produção, habilite Google Authentication, Firestore e Storage, depois publique:

```bash
firebase deploy --only firestore:rules,storage
```

Antes do login em produção, adicione o domínio do Cloudflare Pages em Authentication > Settings > Authorized domains.
