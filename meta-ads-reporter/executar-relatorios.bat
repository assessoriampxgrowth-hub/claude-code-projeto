@echo off
cd /d "C:\Users\Matheus\Desktop\CLAUDE CODE PROJETO\meta-ads-reporter"
set PYTHONUTF8=1
"C:\Users\Matheus\AppData\Local\Programs\Python\Python312\python.exe" gerar_todos.py >> logs\relatorio.log 2>&1
