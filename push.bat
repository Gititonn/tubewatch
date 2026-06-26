@echo off
cd /d "%~dp0"
echo === TubeWatch Deploy ===
echo.

REM Clear any stale git lock files (PowerShell handles Linux-created locks too)
powershell -Command "Remove-Item -Force -ErrorAction SilentlyContinue '.git\HEAD.lock','.git\index.lock'" 2>nul

REM Stage and commit any new/changed files
git add -A
git diff --cached --quiet
if %ERRORLEVEL% NEQ 0 (
  git commit -m "feat: update from Cowork session"
  echo Committed changes.
) else (
  echo Nothing new to commit.
)

echo.
echo Pushing to GitHub...
git config credential.helper manager 2>nul
git push origin main
if %ERRORLEVEL% EQU 0 goto :success

git config credential.helper manager-core 2>nul
git push origin main
if %ERRORLEVEL% EQU 0 goto :success

echo.
echo Push failed. Trying token auth...
set /p TOKEN="Paste your GitHub token: "
if not "%TOKEN%"=="" (
  git remote set-url origin https://%TOKEN%@github.com/Gititonn/tubewatch.git
  git push origin main
  git remote set-url origin https://github.com/Gititonn/tubewatch.git
)

:success
echo.
echo Done! Vercel will deploy in ~90 seconds.
pause
