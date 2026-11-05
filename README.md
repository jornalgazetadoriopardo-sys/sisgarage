# SisGarage

Plataforma para lojas de veículos. Cada loja cadastra o estoque, que aparece num site público para os compradores. Há um painel de gestão para cada loja e um painel de administração para o dono da plataforma.

**Para rodar no seu computador (Windows + XAMPP), siga o [COMO-RODAR.md](COMO-RODAR.md).**

## Recursos (fase 1)

**Site público**
- Página inicial com busca, destaques e últimos veículos
- Listagem `/veiculos` com filtros (marca, tipo, preço, ano, km, câmbio, combustível, opcional, cidade/UF), ordenação e paginação no servidor
- Busca que ignora maiúsculas e acentos ("volks" encontra "Volkswagen")
- Página do veículo com URL amigável (`/veiculos/<id>-volkswagen-nivus-highline-2023`) e:
  - galeria com miniaturas, deslizar com o dedo e tela cheia (teclado ← → Esc)
  - preço "De/Por", selo de destaque com texto livre ("Único dono")
  - ficha técnica só com os campos preenchidos e final da placa
  - botões "Tenho interesse" (WhatsApp com mensagem pronta) e "Ligar", com barra fixa no celular
  - formulário de contato e "Veja também" (mesmo tipo e preço parecido)
- Vitrine de cada loja em `/lojas/<slug>`, na ordem escolhida pela loja, com horário e Instagram
- SEO: `sitemap.xml`, `robots.txt`, dados estruturados schema.org (`Car`, `Motorcycle`, `AutoDealer`) e Open Graph para o WhatsApp

**Painel da loja** (`/painel`)
- Cadastro de loja, que fica "aguardando aprovação" até o admin aprovar
- Cadastro de veículos com campos que mudam conforme o tipo (carro, moto, caminhão)
- Opcionais sugeridos por tipo, mais os que a loja já usou, mais os livres
- Fotos com arrastar e soltar (ou câmera do celular), fila de envio com progresso, reordenação por arrastar e "tornar capa"
- Fotos processadas no servidor: corrige a rotação do celular e gera WebP de 1600px + miniatura de 600px
- Marca d'água da loja: posição, tamanho, opacidade e conversão do logo para branco. O original é guardado, então dá para refazer, trocar ou remover a marca em todas as fotos
- Lista do estoque com ordem da vitrine por arrastar e mudança rápida de situação, destaque e publicação
- Aviso ao sair com alterações não salvas
- Contatos recebidos pelo site, com atalho para o WhatsApp
- Dados da loja, usuários (dono e vendedores) e troca de senha
- Botão "Buscar pela placa", já ligado ao ponto de integração (ativa quando houver provedor contratado)

**Painel master** (`/admin`)
- Aprovar, suspender e reativar lojas

**Segurança**
- Senhas com bcrypt e sessão em cookie httpOnly assinado
- Limite de tentativas de login gravado no banco, por e-mail e por IP
- Proteção contra CSRF nas ações do servidor (Next.js) e logout via POST
- Tipo das imagens conferido pelo conteúdo (não pela extensão), com nomes aleatórios
- Originais das fotos fora da pasta pública
- Placa, Renavam e chassi nunca vão para o site
- Painel com `noindex`

## Tecnologia

| Camada | Escolha |
|---|---|
| Aplicação | Next.js 15 (App Router, Server Actions) + React 19 + TypeScript |
| Visual | Tailwind CSS 4 |
| Banco | **MySQL 8 / MariaDB 10.6+** (XAMPP local, cPanel ou servidor próprio) via Prisma |
| Migrações | `prisma/migrations` (versionadas no git, aplicadas com `prisma migrate deploy`) |
| Imagens | sharp (WebP, miniaturas, marca d'água) |
| Arrastar e soltar | SortableJS (funciona no toque) |

## Comandos

| Comando | O que faz |
|---|---|
| `npm run dev` | Roda em modo desenvolvimento (http://localhost:3000) |
| `npm run setup` | Cria as tabelas, o admin e a loja de demonstração |
| `npm run db:seed` | Cria só o administrador (usa `ADMIN_EMAIL`/`ADMIN_PASSWORD` do `.env`) |
| `npx prisma migrate deploy` | Aplica migrações pendentes |
| `npx prisma migrate dev --name x` | Cria uma migração nova após mudar o `schema.prisma` |
| `npm run build` e `npm start` | Versão de produção |
| `npm run typecheck` | Verifica os tipos |

## Estrutura

```
prisma/schema.prisma      modelo de dados
prisma/migrations/        histórico de mudanças do banco
src/app/(site)/           site público
src/app/painel/           painel da loja
src/app/admin/            painel master
src/app/actions/          ações do servidor (cadastros, login, fotos...)
src/lib/storage.ts        fotos: processamento, marca d'água, gravação
src/lib/plate-lookup.ts   ponto de integração da consulta por placa
storage/uploads/          fotos públicas (não vai para o git)
storage/originals/        originais privados (não vai para o git)
```

## Próximas fases

2. Custos do veículo, documentação, IPVA, FIPE e lucro por veículo
3. Clientes, vendas, recibos e contratos em PDF
4. Financeiro (contas a pagar e a receber, fluxo de caixa), agendamentos e CRM
5. Consulta por placa e Renavam, WhatsApp, postagem no Facebook/Instagram e cobrança das lojas
