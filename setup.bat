@echo off
setlocal

echo [setup] Instalando dependencias do SERVER...
cd /d "%~dp0server"
call npm install
if errorlevel 1 goto :err

echo [setup] Instalando dependencias do CLIENT...
cd /d "%~dp0client"
call npm install
if errorlevel 1 goto :err

echo [setup] Pronto!
echo - Para iniciar o servidor:  cd server ^&^& npm start
echo - Para iniciar o client:    cd client ^&^& npm run dev
endlocal
exit /b 0

:err
echo.
echo [setup] Falhou. Verifique se o Node/NPM estao instalados e no PATH.
endlocal
exit /b 1
