# Como rodar o SisGarage no seu computador (Windows)

Você vai precisar de **3 programas**. Se já usa o XAMPP, falta só instalar o Node.js e o Git.

| Programa | Para quê | Onde baixar |
|---|---|---|
| **XAMPP** | Banco de dados MySQL/MariaDB | https://www.apachefriends.org |
| **Node.js 22 LTS** | Roda a plataforma | https://nodejs.org (botão "LTS") |
| **Git** (opcional) | Baixar e atualizar o código | https://git-scm.com/download/win |

> Não precisa do Apache do XAMPP. A plataforma tem servidor próprio (porta 3000), então pode rodar ao lado do A.R Motors sem conflito.

---

## 1. Banco de dados

1. Abra o **XAMPP Control Panel** e clique em **Start** no **MySQL**.
2. Clique em **Admin** (abre o phpMyAdmin) → aba **Banco de dados**.
3. Nome: `sisgarage` · Agrupamento: **`utf8mb4_unicode_ci`** → **Criar**.

## 2. Código

**Com Git** (recomendado: facilita atualizar depois). Abra o **Prompt de Comando** e rode:

```bat
cd C:\
git clone -b claude/vehicle-registration-system-kd97c4 https://github.com/jornalgazetadoriopardo-sys/sisgarage.git
cd sisgarage
```

**Sem Git:** extraia o `sisgarage.zip` em `C:\sisgarage` e, no Prompt de Comando, rode `cd C:\sisgarage`.

> Evite pastas com acento ou espaço no caminho (ex.: `F:\AR MOTORS - PIÃO`). Use algo como `C:\sisgarage`.

## 3. Configuração

Copie o arquivo de exemplo:

```bat
copy .env.example .env
```

Abra o `.env` no Bloco de Notas e confira:

- `DATABASE_URL`: no XAMPP padrão (root sem senha) já está certo: `mysql://root:@localhost:3306/sisgarage`
- `AUTH_SECRET`: troque por um texto longo qualquer (mínimo 32 caracteres)
- `ADMIN_EMAIL` / `ADMIN_PASSWORD`: o seu acesso de administrador da plataforma

## 4. Instalar e criar as tabelas

Dê dois cliques em **`instalar.bat`** ou rode:

```bat
npm install
npm run setup
```

O `setup` cria as tabelas, o administrador e uma **loja de demonstração** com 6 veículos.

## 5. Abrir

Dê dois cliques em **`iniciar.bat`** ou rode `npm run dev`. Depois acesse:

| Endereço | O quê |
|---|---|
| http://localhost:3000 | Site público |
| http://localhost:3000/entrar | Login |
| http://localhost:3000/painel | Painel da loja |
| http://localhost:3000/admin | Painel da plataforma |

Acessos de teste:

| Perfil | E-mail | Senha |
|---|---|---|
| Admin da plataforma | o do `.env` (padrão `admin@sisgarage.local`) | o do `.env` (padrão `admin12345`) |
| Dono da loja demo | `loja@sisgarage.local` | `loja12345` |
| Vendedor da loja demo | `vendedor@sisgarage.local` | `vendedor123` |

Para testar no **celular** (mesma rede Wi-Fi): rode `ipconfig`, pegue o "Endereço IPv4" (ex.: `192.168.0.15`) e abra `http://192.168.0.15:3000` no celular.

---

## Atualizar para uma versão nova

```bat
git pull
npm install
npx prisma migrate deploy
npm run dev
```

As alterações no banco vêm em `prisma/migrations` e são aplicadas pelo `migrate deploy`. Seus dados são mantidos.

## Problemas comuns

| Erro | Solução |
|---|---|
| `Can't reach database server at localhost:3306` | O MySQL do XAMPP não está ligado (passo 1) |
| `Access denied for user 'root'` | Seu root tem senha: `mysql://root:SUASENHA@localhost:3306/sisgarage` |
| `Unknown database 'sisgarage'` | Crie o banco no phpMyAdmin (passo 1) |
| `'npm' não é reconhecido` | Instale o Node.js e **abra um Prompt de Comando novo** |
| Porta 3000 ocupada | `npm run dev -- -p 3001` e acesse `http://localhost:3001` |
| Fotos não aparecem depois de mudar de pasta | As fotos ficam em `storage\uploads` e os originais em `storage\originals`; copie as duas pastas junto |

## Onde ficam os arquivos

| Pasta | Conteúdo |
|---|---|
| `storage\uploads` | Fotos públicas (WebP, grande + miniatura) e logos |
| `storage\originals` | Fotos originais, **privadas** (usadas para refazer a marca d'água) |
| `prisma\schema.prisma` | Estrutura do banco |
| `prisma\migrations` | Histórico de mudanças do banco |

Faça backup do banco (phpMyAdmin → Exportar) **e** da pasta `storage`.
