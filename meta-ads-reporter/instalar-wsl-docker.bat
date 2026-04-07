@echo off
echo =============================================
echo  Instalando WSL2 para o Docker Desktop
echo  Execute como ADMINISTRADOR
echo =============================================
echo.

:: Habilita WSL e Hyper-V
dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart
dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart

:: Instala WSL2
wsl --install --no-distribution

echo.
echo =============================================
echo  PRONTO! O computador precisa reiniciar.
echo  Apos reiniciar:
echo    1. Abra o Docker Desktop
echo    2. Execute: iniciar-evolution.bat
echo    3. Execute: configurar-whatsapp.py
echo =============================================
pause
shutdown /r /t 10 /c "Reiniciando para ativar WSL2..."
