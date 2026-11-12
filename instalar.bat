@echo off
chcp 65001 >nul
cd /d "%~dp0"
if not exist .env (
  copy .env.example .env >nul
  echo Arquivo .env criado. Confira o DATABASE_URL e o AUTH_SECRET e rode de novo.
  notepad .env
  pause
  exit /b
)
echo Instalando dependencias...
call npm install || goto erro
echo Criando tabelas e dados de demonstracao...
call npm run setup || goto erro
echo.
echo Pronto! Agora rode o iniciar.bat
pause
exit /b
:erro
echo.
echo Algo deu errado. Veja a mensagem acima e o COMO-RODAR.md
pause
