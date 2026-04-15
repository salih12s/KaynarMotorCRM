@echo off
echo Production Ortami Ayarlaniyor...

REM Backend .env dosyasini production ayarlara cevir
(
echo # Environment
echo NODE_ENV=production
echo.
echo # Database Configuration - Local Development
echo # DB_HOST=localhost
echo # DB_PORT=5432
echo # DB_NAME=KaynarMotor
echo # DB_USER=postgres
echo # DB_PASSWORD=12345
echo.
echo # Database Configuration - Production ^(Railway^)
echo DB_HOST=shinkansen.proxy.rlwy.net
echo DB_PORT=25251
echo DB_NAME=railway
echo DB_USER=postgres
echo DB_PASSWORD=HpehMQWTQOiFrQGxjlQzJbZtaTtuamRn
echo.
echo # JWT Configuration
echo JWT_SECRET=9f3c8a1e7b4d2f6a9c8e1b3d5f7a2c4e6d8b1f3a5c7e9d2b4a6f8c1e3d5b7a9c
echo.
echo # Server Configuration
echo PORT=5000
) > backend\.env

REM Frontend .env dosyasini production ayarlara cevir
(
echo # API URL Configuration - Local Development
echo # REACT_APP_API_URL=http://localhost:5000/api
echo.
echo # Production API URL - Railway Backend
echo REACT_APP_API_URL=https://web-production-ac0ed.up.railway.app/api
) > frontend\.env

echo.
echo ================================================
echo PRODUCTION ORTAMI AYARLANDI!
echo ================================================
echo.
echo Backend API: https://web-production-ac0ed.up.railway.app
echo Database: Railway PostgreSQL (shinkansen.proxy.rlwy.net:25251)
echo.
echo Deployment Adimlari:
echo 1. Railway: Backend otomatik deploy olur (git push)
echo 2. Frontend: npm run build ile build al
echo 3. Build klasorunu hosting'e yukle
echo.
echo ================================================
pause
