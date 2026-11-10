@echo off
chcp 65001 >nul
setlocal
set "GAME_DIR=%~dp0"
set "DESKTOP_DIR=%USERPROFILE%\Desktop"
set "SHORTCUT_PATH=%DESKTOP_DIR%\MA GIAO ONLINE.lnk"

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ws = New-Object -ComObject WScript.Shell; ^
   $s = $ws.CreateShortcut('%SHORTCUT_PATH%'); ^
   $s.TargetPath = '%GAME_DIR%MA_GIAO_ONLINE.exe'; ^
   $s.WorkingDirectory = '%GAME_DIR%'; ^
   $s.Description = 'MA GIAO ONLINE - THIEN HA DE NHAT TA PHAI'; ^
   $s.Save()"

echo Da tao bieu tuong MA GIAO ONLINE tren Desktop!
pause
