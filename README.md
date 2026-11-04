# SisGarage

Plataforma para lojas de veículos: cada loja cadastra o estoque, que aparece em um site público para compradores. Cada loja tem um painel de gestão e o dono da plataforma tem um painel de administração.

## Fase 1 (atual)

**Site público**
- Página inicial com busca, destaques e últimos veículos
- Listagem `/veiculos` com filtros (marca, tipo, preço, ano, km, câmbio, combustível, cidade/UF), ordenação e paginação
- Página do veículo com galeria, ficha técnica, opcionais, botão de WhatsApp e formulário de contato
- Vitrine de cada loja em `/lojas/<slug>`
- Placa, Renavam e chassi nunca aparecem no site

**Painel da loja** (`/painel`)
- Cadastro de loja (fica "aguardando aprovação" até o admin aprovar)
- Cadastro e edição de veículos, com várias fotos, escolha da capa, reordenação e exclusão
- Situação do veículo (em preparação, à venda, reservado, vendido) e publicar/ocultar com um clique
- Botão "Buscar pela placa", já ligado ao ponto de integração (ativa quando houver provedor contratado)
- Contatos recebidos pelo site, com atalho para o WhatsApp
- Dados da loja (logo, endereço, WhatsApp) e usuários (dono e funcionários)

**Painel master** (`/admin`)
- Aprovar, suspender e reativar lojas

## Rodando localmente

Requisitos: Node.js 20+ e PostgreSQL 16 (ou Docker).

```bash
cp .env.example .env          # ajuste AUTH_SECRET e DATABASE_URL
docker compose up -d          # opcional: sobe o PostgreSQL
npm install
npm run db:deploy             # cria as tabelas
SEED_DEMO=1 npm run db:seed   # admin + loja de demonstração
npm run dev
```

Acessos criados pelo seed (em produção, defina `ADMIN_EMAIL` e `ADMIN_PASSWORD` e não use `SEED_DEMO`):

| Perfil | E-mail | Senha |
|---|---|---|
| Admin da plataforma | admin@sisgarage.local | admin12345 |
| Loja demo | loja@sisgarage.local | loja12345 |

## Tecnologia

- Next.js 15 (App Router, Server Actions) + React 19 + Tailwind CSS 4
- PostgreSQL + Prisma
- Sessão com JWT em cookie httpOnly (`jose`) e senhas com `bcryptjs`
- Fotos gravadas em `UPLOAD_DIR` e servidas por `/uploads/*`. Para hospedar em nuvem, troque `src/lib/storage.ts` por S3/Cloudflare R2.

## Estrutura

```
prisma/schema.prisma      modelo de dados
src/app/(site)/           site público
src/app/painel/           painel da loja
src/app/admin/            painel master
src/app/actions/          ações do servidor (cadastros, login, etc.)
src/lib/plate-lookup.ts   ponto de integração da consulta por placa
```

## Próximas fases

2. Custos do veículo, documentação, IPVA, FIPE e lucro por veículo
3. Clientes, vendas, recibos e contratos em PDF
4. Financeiro (contas a pagar/receber, fluxo de caixa), agendamentos e CRM
5. Consulta por placa/Renavam, WhatsApp e cobrança das lojas
