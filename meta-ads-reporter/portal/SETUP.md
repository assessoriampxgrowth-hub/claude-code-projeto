# Setup do Meta Ads Reporter v2.0

## Passo 1 — Criar o banco de dados Neon

1. Acesse **vercel.com** → seu projeto **portal** → aba **Storage**
2. Clique em **Create Database** → escolha **Neon Postgres** → Create
3. Após criar, clique em **Show secret** e copie:
   - `DATABASE_URL` (com `?pgbouncer=true` no final)
   - `DIRECT_URL` (sem pgbouncer)

## Passo 2 — Adicionar variáveis no .env.local

Abra o arquivo `portal/.env.local` e adicione:

```
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."
```

## Passo 3 — Instalar dependências e criar tabelas

Abra o **PowerShell** na pasta `portal/`:

```powershell
cd "C:\Users\Matheus\Desktop\CLAUDE CODE PROJETO\meta-ads-reporter\portal"
npm install
npx prisma db push
```

Você deve ver:
```
✔ Generated Prisma Client
✔ Your database is now in sync with your Prisma schema.
```

## Passo 4 — Rodar o servidor

```powershell
npm run dev
```

Acesse: http://localhost:3000
→ Vai redirecionar para http://localhost:3000/admin/login

**Senha:** `mpx2024admin`

## Passo 5 — Importar os 56 clientes

1. No admin, vá em **📥 Importar**
2. Cole o Access Token do Meta (o atual que termina em `...ZDZD`)
3. Clique em **🗂️ Ler automaticamente do arquivo clients.json**
4. Aguarde — todos os 56 clientes serão criados no banco

## Passo 6 — Sincronizar relatórios

1. No dashboard, clique em **🔄 Sincronizar Todos**
2. Aguarde alguns minutos (1 req/cliente)
3. Os relatórios aparecerão em cada cliente

## Passo 7 — Deploy no Vercel

```powershell
npx vercel --prod
```

Adicione as variáveis no painel do Vercel (Settings → Environment Variables):
- `DATABASE_URL`
- `DIRECT_URL`  
- `ADMIN_PASSWORD` = mpx2024admin
- `JWT_SECRET` = (do .env.local)
- `ENCRYPTION_KEY` = (do .env.local)
- `CRON_SECRET` = (do .env.local)
- `CLIENT_PORTAL_URL` = https://portal-alpha-weld.vercel.app
- `EVOLUTION_API_URL` = http://localhost:8080
- `EVOLUTION_API_KEY` = metaads-evolution-key-2024
- `EVOLUTION_INSTANCE` = meu-whatsapp
- `BLOB_READ_WRITE_TOKEN` = (já existe)

## Resumo de rotas

| URL | Descrição |
|-----|-----------|
| `/admin/login` | Login admin |
| `/admin` | Dashboard |
| `/admin/clientes` | Lista de clientes |
| `/admin/clientes/novo` | Cadastrar cliente |
| `/admin/clientes/[id]` | Editar cliente |
| `/admin/importar` | Importar clients.json |
| `/admin/logs` | Logs de execução |
| `/r/[token]` | Relatório do cliente |
| `/api/report/[token]/pdf` | Download PDF |

## Cron automático

O `vercel.json` já configura o cron:
- **Toda segunda-feira às 8h (UTC)** = 5h de Brasília
- Para horário de Brasília: 8h = UTC 11h → `"0 11 * * 1"` ✅

Para disparar manualmente:
```
POST /api/cron/weekly
Header: x-cron-secret: qaR96q0nFFK8xjvwNA0_v61iIFCNVZ7pb7o1kVLWhbo
```
