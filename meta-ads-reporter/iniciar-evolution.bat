@echo off
echo Iniciando Evolution API...

REM Aguarda Docker Desktop ficar pronto
:WAIT_DOCKER
"C:\Program Files\Docker\Docker\resources\bin\docker.exe" info >nul 2>&1
if errorlevel 1 (
    echo Aguardando Docker Desktop iniciar...
    timeout /t 5 /nobreak >nul
    goto WAIT_DOCKER
)

echo Docker pronto! Subindo Evolution API...
cd /d "%~dp0"
"C:\Program Files\Docker\Docker\resources\bin\docker-compose.exe" up -d

echo.
echo Evolution API rodando em http://localhost:8080
echo Agora acesse o script de configuracao do WhatsApp:
echo   python configurar-whatsapp.py
echo.
pause
