@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo Abrindo o SisGarage em http://localhost:3000 ...
start "" http://localhost:3000
call npm run dev
pause
