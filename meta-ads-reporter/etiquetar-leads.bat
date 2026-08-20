@echo off
chcp 65001 >nul
cd /d "C:\Users\Matheus\Desktop\CLAUDE CODE PROJETO\meta-ads-reporter"
set PYTHONUTF8=1
set PYTHON="C:\Users\Matheus\AppData\Local\Programs\Python\Python312\python.exe"

if "%1"=="" (
    echo.
    echo  ETIQUETAGEM DE LEADS NO WHATSAPP
    echo.
    echo  Antes de rodar, o WhatsApp precisa estar conectado:
    echo    iniciar-whatsapp.bat
    echo.
    echo  Uso:
    echo    etiquetar-leads.bat etiquetas    - confere o mapeamento das listas
    echo    etiquetar-leads.bat tudo         - analisa as 40 conversas ^(so previa^)
    echo    etiquetar-leads.bat aplicar --confirmar   - grava as etiquetas
    echo.
    echo  Rodando a conferencia das listas...
    echo.
    %PYTHON% etiquetar_leads.py etiquetas
) else (
    %PYTHON% etiquetar_leads.py %*
)

echo.
pause
