@echo off
title L'Ardoise Digitale - Démarrage
color 0A

echo.
echo  ====================================================
echo   L'ARDOISE DIGITALE - Gestion Stock + Credits
echo   Pour les boutiquiers de quartier au Senegal
echo  ====================================================
echo.

set "NODE_PATH=C:\Users\DIA\AppData\Local\Programs\nodejs\node-v20.18.0-win-x64"
set "PATH=%NODE_PATH%;%PATH%"

cd /d "C:\gravity\ardoise-digitale"

echo  Demarrage de l'application sur le port 3001...
echo  (Port 3000 reserve pour Koom-Koom Voice)
echo.

start "" "http://localhost:3001"

npm run dev -- -p 3001

pause
