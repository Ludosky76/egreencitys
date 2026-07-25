@echo off
chcp 65001 >nul
cd /d "%~dp0"
color 0A
echo ============================================================
echo    EGREENCITY'S - Mise a jour des prix de la boutique
echo ============================================================
echo.
echo Ce programme va :
echo   1. Lire les prix depuis assets\js\catalog.js
echo   2. Desactiver les anciens liens de paiement Stripe
echo   3. Creer les nouveaux liens (nouveaux prix)
echo   4. Mettre le site a jour et le publier en ligne
echo.
echo Astuce : pour changer un prix, modifiez d'abord le nombre
echo          "ht:" du produit (ou COEF_MARGE) dans catalog.js.
echo.
pause
echo.

set PYTHONIOENCODING=utf-8
python _tools\create_stripe_payment_links.py
if errorlevel 1 (
  echo.
  echo [ERREUR] La generation a echoue. Rien n'a ete publie.
  echo Verifiez le message ci-dessus, ou contactez votre developpeur.
  pause
  exit /b 1
)

echo.
echo --- Publication en ligne (git) ---
git add assets/js/stripe-config.js pages/boutique-wallbox.html
git commit -m "prix: mise a jour des tarifs boutique"
git push
if errorlevel 1 (
  echo.
  echo [ATTENTION] Les liens Stripe sont crees et le fichier est a jour,
  echo mais la publication en ligne (git push) a echoue.
  echo Relancez plus tard ou demandez de l'aide pour "git push".
  pause
  exit /b 1
)

echo.
echo ============================================================
echo    TERMINE ! Les nouveaux prix seront en ligne dans 1-2 min.
echo    Verifiez sur egreencitys.com/pages/boutique-wallbox.html
echo ============================================================
pause
