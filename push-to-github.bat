@echo off
cd "c:\Users\Abdu_Latrat\Desktop\Latrat Properties Webpage"
"C:\Program Files\Git\bin\git.exe" status
"C:\Program Files\Git\bin\git.exe" log --oneline -3
"C:\Program Files\Git\bin\git.exe" remote -v
echo.
echo Attempting to push to GitHub...
:: allow optional commit message as first arg
if "%~1"=="" (
	set MSG=site: update
) else (
	set MSG=%~1
)
"C:\Program Files\Git\bin\git.exe" add -A
"C:\Program Files\Git\bin\git.exe" commit -m "%MSG%" || echo Nothing to commit
"C:\Program Files\Git\bin\git.exe" push -u origin HEAD:main
pause
