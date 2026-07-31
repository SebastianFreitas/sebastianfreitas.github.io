@echo off
REM ===========================================================
REM  Portfolio local server
REM  Double-click this file. It serves the folder it sits in
REM  and opens the homepage. Close the window to stop it.
REM ===========================================================

cd /d "%~dp0"

set PORT=8000

echo.
echo   Serving: %CD%
echo   Address: http://localhost:%PORT%/
echo.
echo   Leave this window open while you work.
echo   Close it (or press Ctrl+C) to stop the server.
echo.

REM Open the browser after a short delay, so the server is up first.
start "" /b cmd /c "timeout /t 2 /nobreak >nul & start http://localhost:%PORT%/"

REM --- Try the Python launcher first (standard on Windows) ---
where py >nul 2>nul
if %ERRORLEVEL%==0 (
    py -3 -m http.server %PORT%
    goto :end
)

REM --- Then plain python ---
where python >nul 2>nul
if %ERRORLEVEL%==0 (
    python -m http.server %PORT%
    goto :end
)

REM --- Fall back to Node ---
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
