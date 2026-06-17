@echo off
title Detener Portal Sabaki
cd /d "C:\Proyectos\sabaki-portal"
set PATH=C:\tools\nodejs\node-v20.19.2-win-x64;%PATH%

echo.
echo  Deteniendo Portal Sabaki Technologies...
echo.

:: Detener con PM2 (preferido - solo detiene el proceso gestionado)
node node_modules/pm2/bin/pm2 stop sabaki-portal 2>nul
if %errorlevel%==0 (
    echo  [OK] Portal detenido via PM2.
    goto done
)

:: Fallback: matar solo el proceso en puerto 4000
echo  [INFO] PM2 no disponible. Deteniendo proceso en puerto 4000...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":4000 " ^| findstr "LISTENING"') do (
    echo  Terminando PID: %%a
    taskkill /PID %%a /F >nul 2>&1
)

:done
echo.
echo  [OK] Portal detenido.
echo  [OK] Para reiniciar: INICIAR.bat
echo.
timeout /t 2 >nul
