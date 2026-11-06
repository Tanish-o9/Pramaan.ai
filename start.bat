@echo off
echo ===================================================
echo   Starting Presence.ai (Pramaan 2.0) Ecosystem
echo ===================================================
start "Presence.ai Backend (FastAPI)" cmd /k "python server.py"
start "Presence.ai Frontend (Vite)" cmd /k "cd frontend && npm run dev"
echo Servers are launching in separate windows!
echo Backend:  http://127.0.0.1:8000
echo Frontend: http://127.0.0.1:5173
