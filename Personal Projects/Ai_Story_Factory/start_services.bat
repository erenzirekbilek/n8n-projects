@echo off
echo ========================================
echo   AI Story Factory - Servis Baslangici
echo ========================================
echo.

echo [1/3] Bubble Renderer baslatiliyor...
start "Bubble Renderer :5001" cmd /k "venv\Scripts\python.exe bubble_service.py"

timeout /t 2 /nobreak >nul

echo [2/3] Edge TTS Service baslatiliyor...
start "Edge TTS :5002" cmd /k "venv\Scripts\python.exe edge_tts_service.py"

timeout /t 2 /nobreak >nul

echo [3/3] Video Render Service baslatiliyor...
start "Video Render :5003" cmd /k "venv\Scripts\python.exe video_render_service.py"

echo.
echo ========================================
echo  Servisler baslatildi!
echo  Bubble: http://localhost:5001
echo  TTS:    http://localhost:5002
echo  Video:  http://localhost:5003
echo ========================================
echo.
echo Devam etmek için bir tuşa bas...
pause >nul