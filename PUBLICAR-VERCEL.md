# Publicar o SisGarage na Vercel (grátis, para testes)

A publicação usa três serviços com plano grátis:

| Serviço | Para quê |
|---|---|
| **Vercel** | Roda o site e os painéis |
| **TiDB Cloud Starter** | Banco MySQL na nuvem |
| **Vercel Blob** | Guarda as fotos (a Vercel não guarda arquivos em disco) |

São uns 20 minutos, sem instalar nada no computador.

> ⚠️ **O plano grátis (Hobby) da Vercel é para uso não comercial.** Serve bem para testes e demonstrações. Para operar com lojas pagantes, passe para o plano Pro ou para um servidor próprio.

---

## Passo 0: deixar o código no branch principal

O código está no branch `claude/vehicle-registration-system-kd97c4`, e a Vercel publica o `main`, que hoje só tem o README.

1. Abra https://github.com/jornalgazetadoriopardo-sys/sisgarage
2. **Pull requests** → **New pull request**
3. base: `main` ← compare: `claude/vehicle-registration-system-kd97c4`
4. **Create pull request** → **Merge pull request** → **Confirm merge**

## Passo 1: banco de dados (TiDB Cloud)

1. Crie uma conta em https://tidbcloud.com (dá para entrar com o GitHub ou o Google).
2. Crie um cluster **Starter** (gratuito).
   - **Região:** escolha **AWS – US East (N. Virginia)**. Os servidores da Vercel ficam lá por padrão, e banco perto do servidor deixa o site mais rápido.
3. Na página do cluster, clique em **Connect**:
   - **Connect With:** `Prisma`
   - Clique em **Generate Password** e **guarde a senha**.
   - Em **Database**, use `sisgarage` (se não existir, crie em **SQL Editor** com `CREATE DATABASE sisgarage;`).
4. Copie o endereço que aparece. Ele tem este formato:
   ```
   mysql://XXXXXXXX.root:SENHA@gateway01.us-east-1.prod.aws.tidbcloud.com:4000/sisgarage?sslaccept=strict
   ```
   Esse é o seu **DATABASE_URL**.

## Passo 2: projeto na Vercel

1. Crie uma conta em https://vercel.com com **Continue with GitHub**.
2. **Add New… → Project** → importe o repositório **sisgarage**. Se ele não aparecer, clique em *Adjust GitHub App Permissions* e libere o repositório.
3. Antes de clicar em Deploy, abra **Environment Variables** e cadastre:

| Nome | Valor |
|---|---|
| `DATABASE_URL` | o endereço do passo 1 |
| `AUTH_SECRET` | um texto aleatório de 32+ caracteres (gere em https://generate-secret.vercel.app/32) |
| `ADMIN_EMAIL` | seu e-mail de administrador da plataforma |
| `ADMIN_PASSWORD` | uma senha forte (é com ela que você entra no `/admin`) |
| `SEED_DEMO` | `1` para criar a loja de demonstração (opcional) |
| `CRON_SECRET` | outro texto aleatório de 32+ caracteres: liga a atualização mensal automática da FIPE |

4. Clique em **Deploy**.

> A primeira publicação **cria as tabelas e o administrador** sozinha. Ela pode terminar com o site no ar mas **sem conseguir enviar fotos**: isso se resolve no passo 3.

## Passo 3: armazenamento das fotos (Vercel Blob)

1. No projeto da Vercel, abra a aba **Storage** → **Create Database** → **Blob**.
2. Dê um nome (ex.: `sisgarage-fotos`) e conecte ao projeto, marcando todos os ambientes.
   - A Vercel cria sozinha a variável `BLOB_READ_WRITE_TOKEN`.
3. Volte em **Deployments** → no último deploy, clique em **⋯ → Redeploy**.

## Passo 4: endereço do site

1. Copie o endereço que a Vercel deu (ex.: `https://sisgarage-abc.vercel.app`).
2. Em **Settings → Environment Variables**, crie `NEXT_PUBLIC_SITE_URL` com esse endereço.
3. Faça **Redeploy** de novo. Assim os links do sitemap e a prévia no WhatsApp ficam certos.

## Pronto: testar

| Endereço | Acesso |
|---|---|
| `/entrar` com `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Painel da plataforma (`/admin`) |
| `/entrar` com `loja@sisgarage.local` / `loja12345` | Loja demo (só se `SEED_DEMO=1`) |

🔒 **Se criou a loja demo, troque as senhas dela** (Minha senha, no painel) ou exclua-a: o site está público.

---

## Atualizações

> Publicações de **pull request (Preview)** só compilam o código: não alteram o banco. As tabelas são atualizadas apenas na publicação de **produção** (branch `main`).

Cada vez que o código for atualizado no `main` do GitHub, a Vercel publica sozinha. As mudanças no banco (migrações) são aplicadas automaticamente nesse processo.

## Limites do plano grátis (confira os valores atuais nos sites)

- **Vercel Hobby:** uso não comercial; cada ação tem limite de tempo. Por isso o "Aplicar marca d'água em todas as fotos" pode precisar de mais de um clique em lojas com muitas fotos.
- **Envio de fotos:** a Vercel aceita até ~4,5 MB por envio. O navegador já reduz as fotos para 2560px antes de enviar, então fotos de celular funcionam. Fotos HEIC no Chrome podem não ser reduzidas: prefira JPG.
- **Logo e marca d'água:** use arquivos menores que 4 MB.
- **Vercel Blob e TiDB:** cotas grátis de armazenamento e uso. Para testes sobra bastante.

## Problemas comuns

| Sintoma | Causa provável |
|---|---|
| Log mostra "Faltam variáveis de ambiente" | Cadastre as variáveis listadas no ambiente **Production** e faça Redeploy |
| Deploy falha em `prisma migrate deploy` | `DATABASE_URL` errado, sem `?sslaccept=strict` ou banco `sisgarage` inexistente |
| "Armazenamento de fotos não configurado" ao enviar fotos | Passo 3 não feito, ou faltou o Redeploy depois dele |
| Login não funciona | `AUTH_SECRET` ausente ou curto (mínimo 16; use 32+) |
| Site lento no primeiro acesso | Normal no plano grátis: as funções "acordam" depois de um tempo parado |

## Alternativa ao TiDB

O **Aiven** (https://aiven.io) também tem MySQL grátis. Crie um serviço MySQL no plano *Free*, crie o banco `sisgarage` e use o endereço no formato `mysql://avnadmin:SENHA@HOST:PORTA/sisgarage?sslaccept=accept_invalid_certs`.
