@echo off
title Portal Sabaki - Puerto 4000
cd /d "C:\Proyectos\sabaki-portal"
set PATH=C:\tools\nodejs\node-v20.19.2-win-x64;%PATH%

echo.
echo  ============================================
echo   Portal Sabaki Technologies
echo   http://localhost:4000
echo   admin@sabaki.com / admin123
echo  ============================================
echo.

:: Verificar si ya hay una instancia corriendo
node node_modules/pm2/bin/pm2 status sabaki-portal 2>nul | findstr "online" >nul
if %errorlevel%==0 (
    echo  [INFO] El portal ya esta corriendo. Reiniciando...
    node node_modules/pm2/bin/pm2 restart sabaki-portal
    goto done
)

:: Construir la aplicacion si no existe build previo
if not exist ".next\BUILD_ID" (
    echo  [BUILD] Construyendo aplicacion para produccion...
    echo  [BUILD] Esto puede demorar 1-3 minutos la primera vez.
    echo.
    set NODE_OPTIONS=--max-old-space-size=2048
    node node_modules/next/dist/bin/next build
    if %errorlevel% neq 0 (
        echo  [ERROR] Fallo el build. Iniciando en modo desarrollo...
        goto devmode
    )
)

:: Iniciar con PM2 en modo produccion
echo  [INFO] Iniciando con PM2 en modo produccion...
set NEXTAUTH_SECRET=sabaki-super-secret-key-change-in-production
:: ANTHROPIC_API_KEY se lee desde el archivo .env
node node_modules/pm2/bin/pm2 start ecosystem.config.js
node node_modules/pm2/bin/pm2 save
goto done

:devmode
echo  [DEV] Iniciando en modo desarrollo (mayor consumo de memoria)...
goto done

:done
echo.
echo  [OK] Verificar estado: abrir http://localhost:4000/api/health
echo  [OK] Ver logs:         logs\pm2-out.log  /  logs\pm2-error.log
echo  [OK] Detener:          DETENER.bat
echo.
timeout /t 3 >nul
:: Mostrar estado PM2
node node_modules/pm2/bin/pm2 status
pause
