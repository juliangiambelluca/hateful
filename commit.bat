@echo off


set repoDirectory="C:\Users\julia\Desktop\hateful"

cd %repoDirectory%

color 0b
echo Path set to: %repoDirectory%
echo.
echo.
echo   *************************
echo   *  What have you done?  *
echo   *************************
echo.
set /p msg="> "

color 0e

git add .

git commit -m "%msg%"

git push origin master

color 0A

echo.
echo.
echo   *************************
echo   *         Done!         *
echo   *************************
echo.
echo.
pause