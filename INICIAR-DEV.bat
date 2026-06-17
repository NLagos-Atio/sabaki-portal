@echo off
title Portal Sabaki - DESARROLLO - Puerto 4000
cd /d "C:\Proyectos\sabaki-portal"
set PATH=C:\tools\nodejs\node-v20.19.2-win-x64;%PATH%
set DATABASE_URL=file:./dev.db
set NEXTAUTH_SECRET=sabaki-super-secret-key-change-in-production
set NEXTAUTH_URL=http://localhost:4000
:: ANTHROPIC_API_KEY se lee desde el archivo .env
set NODE_OPTIONS=--max-old-space-size=2048

echo.
echo  ============================================
echo   Portal Sabaki - MODO DESARROLLO
echo   http://localhost:4000
echo   ADVERTENCIA: Consume mas memoria que produccion
echo  ============================================
echo.
echo  Para uso en produccion, usar INICIAR.bat
echo.
echo  Iniciando servidor de desarrollo...
echo.

node node_modules/next/dist/bin/next dev --port 4000
pause
