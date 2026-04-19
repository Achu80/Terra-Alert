@echo off
REM Copy the scaler file
echo Copying scaler.pkl...
copy "D:\VS-Code projects\GeoSafe\ai-module\scaler.pkl" "%~dp0models\scaler.pkl"
echo Done!
pause
