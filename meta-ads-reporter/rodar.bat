@echo off
chcp 65001 >nul
cd /d "C:\Users\Matheus\Desktop\CLAUDE CODE PROJETO\meta-ads-reporter"
set PYTHONUTF8=1
set PYTHON="C:\Users\Matheus\AppData\Local\Programs\Python\Python312\python.exe"

if "%1"=="" (
    echo Uso:
    echo   rodar.bat run                        - todos os clientes
    echo   rodar.bat run --client cliente-id    - cliente especifico
    echo   rodar.bat list                       - listar clientes
    echo   rodar.bat schedule                   - iniciar agendador
    echo.
    %PYTHON% main.py list
) else (
    %PYTHON% main.py %*
)
