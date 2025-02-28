@echo off
echo OEKS Team Tracker - Packaging script

echo Installing required Python packages...
pip install pyinstaller mss pillow websockets

echo Packaging staff application...
pyinstaller --onefile --noconsole staff_app.py

echo Packaging admin server...
pyinstaller --onefile admin_server.py

echo Packaging API server...
pyinstaller --onefile api_server.py

echo Packaging cleanup script...
pyinstaller --onefile cleanup_script.py

echo Creating distribution folders...
mkdir dist\admin
mkdir dist\staff

echo Moving files to appropriate folders...
move dist\staff_app.exe dist\staff\
copy config.json dist\staff\

move dist\admin_server.exe dist\admin\
move dist\api_server.exe dist\admin\
move dist\cleanup_script.exe dist\admin\
copy admin_config.json dist\admin\
copy index.html dist\admin\

echo Creating screenshots directory...
mkdir dist\admin\screenshots

echo Done! Deployment packages ready in 'dist' folder.
echo - Admin package is in 'dist\admin'
echo - Staff package is in 'dist\staff' 