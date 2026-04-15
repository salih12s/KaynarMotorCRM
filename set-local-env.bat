@echo off
echo Gelistirme Ortami Ayarlaniyor...

REM Backend .env dosyasini local ayarlara cevir
(
echo # Environment
echo NODE_ENV=development
echo.
echo # Database Configuration - Local Development
echo DB_HOST=localhost
echo DB_PORT=5432
echo DB_NAME=KaynarMotor
echo DB_USER=postgres
echo DB_PASSWORD=12345
echo.
echo # Database Configuration - Production ^(Railway^)
echo # DB_HOST=shinkansen.proxy.rlwy.net
echo # DB_PORT=25251
echo # DB_NAME=railway
echo # DB_USER=postgres
echo # DB_PASSWORD=HpehMQWTQOiFrQGxjlQzJbZtaTtuamRn
echo.
echo # JWT Configuration
echo JWT_SECRET=9f3c8a1e7b4d2f6a9c8e1b3d5f7a2c4e6d8b1f3a5c7e9d2b4a6f8c1e3d5b7a9c
echo.
echo # Server Configuration
echo PORT=5000
) > backend\.env

REM Frontend .env dosyasini local ayarlara cevir
(
echo # API URL Configuration - Local Development
echo REACT_APP_API_URL=http://localhost:5000/api
echo.
echo # Production API URL - Railway Backend
echo # REACT_APP_API_URL=https://web-production-ac0ed.up.railway.app/api
) > frontend\.env

echo.
echo ================================================
echo GELISTIRME ORTAMI AYARLANDI!
echo ================================================
echo.
echo Backend API: http://localhost:5000
echo Frontend: http://localhost:3000
echo Database: localhost:5432/KaynarMotor
echo.
echo Calisma Adimlari:
echo 1. Backend: cd backend ^&^& npm start
echo 2. Frontend: cd frontend ^&^& npm start
echo.
echo ================================================
pause
