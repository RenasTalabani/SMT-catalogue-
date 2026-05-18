@echo off
echo =============================================
echo  SMT Catalogue — Firewall Fix
echo  Run this as Administrator
echo =============================================
echo.

echo Adding firewall rules...

netsh advfirewall firewall delete rule name="SMT Backend 3000" >nul 2>&1
netsh advfirewall firewall delete rule name="SMT Web App 4040"  >nul 2>&1

netsh advfirewall firewall add rule name="SMT Backend 3000" dir=in action=allow protocol=TCP localport=3000 profile=any
netsh advfirewall firewall add rule name="SMT Web App 4040"  dir=in action=allow protocol=TCP localport=4040 profile=any

echo.
echo Done! Both ports are now open.
echo.
echo  Backend API : http://192.168.1.73:3000
echo  Web App     : http://192.168.1.73:4040
echo.
echo Open the Web App URL on your mobile browser.
echo Make sure your phone is on the same WiFi.
echo.
pause
