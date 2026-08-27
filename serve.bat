@echo off
REM ===========================================================
REM  Portfolio local server
REM  Double-click this file. It serves the folder it sits in
REM  and opens the homepage. Close the window to stop it.
REM
REM  Port 8765 on purpose: browsers often keep a Service Worker
REM  and disk cache glued to http://127.0.0.1:8000 from other
REM  projects. file:// always looked fine; :8000 served ghosts.
REM ===========================================================

cd /d "%~dp0"

set PORT=8765

echo.
echo   *** Portfolio no-cache server ***
echo   Serving: %CD%
echo   Address: http://127.0.0.1:%PORT%/
echo.
echo   Leave this window open while you work.
echo   Close it (or press Ctrl+C) to stop the server.
echo.
echo   In the server log you should see EVERY script:
echo     xp.js  surge.js  lamp.js  world.js  bridge.js
echo   If you only see index + bridge.js, the browser is still
echo   not hitting this server — close old :8000 tabs.
echo.

REM Open the browser after a short delay, so the server is up first.
start "" /b cmd /c "timeout /t 2 /nobreak >nul & start http://127.0.0.1:%PORT%/?reset=1"

REM Prefer the no-cache server
where py >nul 2>nul
if %ERRORLEVEL%==0 (
    py -3 serve.py %PORT%
    goto :end
)

where python >nul 2>nul
if %ERRORLEVEL%==0 (
    python serve.py %PORT%
    goto :end
)

REM --- Fall back to Node (also cache-light via serve) ---
where npx >nul 2>nul
if %ERRORLEVEL%==0 (
    echo   Python not found, using npx serve instead.
    npx --yes serve -l %PORT% .
    goto :end
)

echo.
echo   ERROR: no Python and no Node found on this machine.
echo.
echo   Install either one, then run this file again:
echo     Python  ^>  winget install Python.Python.3.12
echo     Node    ^>  winget install OpenJS.NodeJS.LTS
echo.
pause

:end
echo.
echo   Server stopped.
pause
