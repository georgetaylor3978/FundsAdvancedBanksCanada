@echo off

echo ===================================================
echo   Updating Auto-Mortgage Dashboard Data
echo ===================================================

echo.
echo Parsing the latest CSV data into JSON...
cmd /c "node convert_csv.js"

if %errorlevel% neq 0 (
    echo [ERROR] Data conversion failed! Please check the CSV format or Node script.
    pause
    exit /b %errorlevel%
)

echo.
echo [SUCCESS] data.json generated.

echo.
echo Pushing updates to GitHub...
"C:\Program Files\Git\cmd\git.exe" add .
"C:\Program Files\Git\cmd\git.exe" commit -m "Auto-update dashboard data"
"C:\Program Files\Git\cmd\git.exe" push origin main

if %errorlevel% neq 0 (
    echo [ERROR] Git push failed. Please check your internet connection or git status.
    pause
    exit /b %errorlevel%
)

echo.
echo [SUCCESS] Dashboard updated and published!
echo The live site will reflect the changes in a few minutes.
pause
