@echo off
REM ===================================================================
REM  EGREENCITY'S — Conversion Markdown vers PDF
REM ===================================================================
REM  Double-cliquer pour convertir tous les .md du dossier ADVENIR.
REM  Pour convertir un autre dossier ou fichier :
REM      CONVERTIR_MD_EN_PDF.bat chemin\du\dossier
REM      CONVERTIR_MD_EN_PDF.bat chemin\fichier.md
REM ===================================================================
cd /d "%~dp0"
echo.
echo === Conversion .md vers .pdf ===
echo.
python _tools\_md_to_pdf.py %*
echo.
pause
