@echo off
echo Lokal ortam .env dosyalari olusturuluyor...

echo NODE_ENV=development> .env
echo DB_HOST=localhost>> .env
echo DB_PORT=5432>> .env
echo DB_NAME=KaynarMotor>> .env
echo DB_USER=postgres>> .env
echo DB_PASSWORD=12345>> .env
echo JWT_SECRET=kaynar_motor_secret_key_2026>> .env
echo PORT=5000>> .env

copy .env backend\.env

echo REACT_APP_API_URL=http://localhost:5000/api> frontend\.env

echo .env dosyalari olusturuldu!
pause
