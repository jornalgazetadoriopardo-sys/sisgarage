# SisGarage

Plataforma para lojas de veículos. Cada loja cadastra o estoque, que aparece num site público para os compradores. Há um painel de gestão para cada loja e um painel de administração para o dono da plataforma.

**Para rodar no seu computador (Windows + XAMPP), siga o [COMO-RODAR.md](COMO-RODAR.md).**
**Para publicar na internet (Vercel, grátis para testes), siga o [PUBLICAR-VERCEL.md](PUBLICAR-VERCEL.md).**

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

**Gestão interna do veículo (fase 2)**: aba "Gestão" de cada veículo
- Compra: data, valor pago, origem, de quem comprou e forma de pagamento
- Gastos por categoria, com comprovante anexado (PDF ou foto)
- Documentação: lista de verificação (CRLV, ATPV-e, laudo cautelar, vistoria, chave reserva, manual...) com situação, validade e arquivo
- IPVA, licenciamento e multas: valor, vencimento e pagamento
- Tabela FIPE: vínculo com o modelo exato, consulta gratuita, atualização mensal automática e histórico
- Lucro previsto: custo total (compra + gastos + débitos), margem e preço em relação à FIPE
- Painel inicial com "Precisa de atenção" (débitos vencidos, contatos sem resposta, documentos pendentes ou vencendo, veículos sem foto ou parados)
- Vendedor vê documentação e FIPE, mas não vê compra, gastos, valores nem lucro
- Arquivos privados: só abrem com login da loja dona do veículo
- Histórico de alterações (quem fez o quê, inclusive o admin)

**Vendas e clientes (fase 3)**
- Clientes com CPF/CNPJ validado e endereço preenchido pelo CEP; contato do site vira cliente com um toque
- Venda direta ou reserva com sinal; várias formas de pagamento (PIX, dinheiro, cartão, financiamento, promissória, troca)
- Veículo da troca entra no estoque automaticamente, com o valor da troca como custo
- Parcelas a receber com vencimento, alerta de atraso e "marcar recebido"
- Lucro real da venda (custo + comissão) e resumo do mês, só para o dono
- Documentos em PDF com logo, razão social e CNPJ da loja: recibo de sinal, recibo de pagamento,
  contrato de compra e venda e termo de garantia, com valores por extenso. No celular, o botão de
  compartilhar envia direto pelo WhatsApp
- Cancelamento com motivo (o veículo volta ao estoque)

**Financeiro, agenda e CRM (fase 4)**
- Financeiro (só o dono): fluxo de caixa que junta sozinho vendas, compras, gastos, IPVA e comissões;
  despesas da loja com repetição mensal e comprovante; contas a pagar e a receber com "baixar";
  gráfico de 6 meses e resultado do mês (receita, custo dos vendidos, comissões, despesas)
- Agenda: test drive, visita, vistoria, despachante, oficina e entrega; semana em faixa de dias;
  confirmar pelo WhatsApp com mensagem pronta; botão "Google Agenda"; pedidos feitos pelo site
  (página do veículo) chegam para confirmação
- CRM: contatos em etapas (novo, em contato, negociando, ganho, perdido) em quadro; histórico de
  conversas; data de retorno e responsável; contatos manuais (WhatsApp, telefone, loja, Instagram)
- Início mostra a agenda do dia e alerta contas vencidas, pedidos de agendamento e retornos

**Painel master** (`/admin`)
- Aprovar, suspender e reativar lojas
- "Acessar painel" de qualquer loja, com faixa de aviso e registro no histórico

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
| Imagens | sharp (WebP, miniaturas, marca d'água); disco local ou Vercel Blob (automático) |
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

5. Consulta por placa e Renavam, WhatsApp, postagem no Facebook/Instagram e cobrança das lojas
