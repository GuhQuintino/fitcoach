@echo off
cd /d "c:\Users\Gustavo\Desktop\Fitcoach\scripts\youtube-upload"

echo ========================================================
echo      FitPlayer - Upload Automatico para YouTube
echo ========================================================
echo.
echo Data: %date% - Hora: %time%
echo.
echo Iniciando script...
echo.

call npm start

echo.
echo ========================================================
echo   Processo finalizado!
echo   (Se aparecer "quotaExceeded", tente amanha)
echo ========================================================
echo.
pause
