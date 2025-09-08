@echo off
echo Cleaning Next.js build cache...

REM Remove .next directory
if exist .next (
    echo Removing .next directory...
    rmdir /s /q .next
    echo .next directory removed.
) else (
    echo .next directory not found.
)

REM Remove node_modules (optional, only if needed)
REM if exist node_modules (
REM     echo Removing node_modules...
REM     rmdir /s /q node_modules
REM     echo node_modules removed.
REM )

echo Clearing npm cache...
npm cache clean --force

echo Installing dependencies...
npm install

echo Starting build...
npm run build

echo Build process completed!
pause
