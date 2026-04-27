@echo off
REM ===================================================================
REM  EGREENCITY'S — Publication automatique posts FB + LinkedIn
REM ===================================================================
REM  Double-cliquer pour publier tous les posts dus dans
REM  _dossiers/posts-calendar.json
REM ===================================================================
cd /d "%~dp0"
echo.
echo === EGREENCITY'S Social Publisher ===
echo.
python _tools\_social_publisher.py %*
echo.
pause
