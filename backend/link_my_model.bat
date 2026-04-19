@echo off
REM Link your AI module to backend
echo ======================================================================
echo LINKING AI MODULE
echo ======================================================================
echo.

REM Set paths
set SOURCE_DIR=D:\VS-Code projects\GeoSafe\ai-module
set TARGET_DIR=%~dp0ml\models

echo Source: %SOURCE_DIR%
echo Target: %TARGET_DIR%
echo.

REM Create target directory if it doesn't exist
if not exist "%TARGET_DIR%" mkdir "%TARGET_DIR%"

REM Copy all model files
echo Copying model files...
xcopy "%SOURCE_DIR%\*.pkl" "%TARGET_DIR%\" /Y /I
xcopy "%SOURCE_DIR%\*.pickle" "%TARGET_DIR%\" /Y /I
xcopy "%SOURCE_DIR%\*.joblib" "%TARGET_DIR%\" /Y /I
xcopy "%SOURCE_DIR%\*.h5" "%TARGET_DIR%\" /Y /I
xcopy "%SOURCE_DIR%\*.pt" "%TARGET_DIR%\" /Y /I
xcopy "%SOURCE_DIR%\*.pth" "%TARGET_DIR%\" /Y /I

REM Copy feature files
xcopy "%SOURCE_DIR%\*feature*.txt" "%TARGET_DIR%\" /Y /I
xcopy "%SOURCE_DIR%\*feature*.json" "%TARGET_DIR%\" /Y /I
xcopy "%SOURCE_DIR%\*feature*.csv" "%TARGET_DIR%\" /Y /I

echo.
echo ======================================================================
echo DONE! Files copied to: %TARGET_DIR%
echo ======================================================================
echo.
echo Next steps:
echo 1. Run: python ml\analyze_model.py ml\models\your_model.pkl
echo 2. Check required features
echo 3. Update GEE service
echo.
pause
