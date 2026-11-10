@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo 🐉 Dang khoi dong MA GIAO ONLINE - THIEN HA DE NHAT TA PHAI...
node "%~dp0tools\ma-giao-launcher\launcher.cjs" --game "%~dp0"
pause
