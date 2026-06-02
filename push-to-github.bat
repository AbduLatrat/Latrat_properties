@echo off
cd "c:\Users\Abdu_Latrat\Desktop\Latrat Properties Webpage"
"C:\Program Files\Git\bin\git.exe" status
"C:\Program Files\Git\bin\git.exe" log --oneline -3
"C:\Program Files\Git\bin\git.exe" remote -v
echo.
echo Attempting to push to GitHub...
"C:\Program Files\Git\bin\git.exe" push -u origin HEAD:main
pause
