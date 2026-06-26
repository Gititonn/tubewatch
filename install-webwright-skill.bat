@echo off
echo === Installing Webwright Claude Code Skill ===
echo.

REM Create skill directories
mkdir "%USERPROFILE%\.claude\skills\webwright\commands" 2>nul
mkdir "%USERPROFILE%\.claude\skills\webwright\reference" 2>nul
mkdir "%USERPROFILE%\.claude\commands\webwright" 2>nul

REM Clone Webwright to a temp location
set REPO_DIR=%TEMP%\webwright-install
if exist "%REPO_DIR%" rmdir /s /q "%REPO_DIR%"
git clone https://github.com/microsoft/Webwright.git "%REPO_DIR%"
if %ERRORLEVEL% NEQ 0 (
  echo ERROR: git clone failed.
  pause
  exit /b 1
)

REM Copy skill files
xcopy /y "%REPO_DIR%\skills\webwright\SKILL.md" "%USERPROFILE%\.claude\skills\webwright\"
xcopy /y "%REPO_DIR%\skills\webwright\commands\run.md" "%USERPROFILE%\.claude\skills\webwright\commands\"
xcopy /y "%REPO_DIR%\skills\webwright\commands\craft.md" "%USERPROFILE%\.claude\skills\webwright\commands\"
xcopy /y /s "%REPO_DIR%\skills\webwright\reference\*" "%USERPROFILE%\.claude\skills\webwright\reference\"

REM Copy commands shortcut
xcopy /y "%REPO_DIR%\skills\webwright\commands\run.md" "%USERPROFILE%\.claude\commands\webwright\"
xcopy /y "%REPO_DIR%\skills\webwright\commands\craft.md" "%USERPROFILE%\.claude\commands\webwright\"

REM Install Python package + Playwright
echo.
echo Installing Webwright Python package...
pip install -e "%REPO_DIR%" --break-system-packages 2>nul || pip install -e "%REPO_DIR%"

echo.
echo Installing Playwright Firefox browser...
playwright install firefox

echo.
echo === Done! ===
echo Restart Claude Code to load the new skill.
echo Then use: /webwright:run [your web task]
echo        or /webwright:craft [your web task]
pause
