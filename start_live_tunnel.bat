@echo off
title BiteShare Cloudflare Live Tunnel
color 0B
cls
echo ============================================================================
echo         BITESHARE: CLOUDFLARE LIVE HTTPS TUNNEL FOR MOBILE / VERCEL
echo ============================================================================
echo.
echo   This connects your live laptop FastAPI server (port 8000) to the internet!
echo   Vercel URL: https://biteshare-web.vercel.app/
echo.
echo ============================================================================
cd /d "%~dp0backend"
if exist cloudflared.exe (
    cloudflared.exe tunnel --url http://127.0.0.1:8000
) else (
    echo [ERROR] cloudflared.exe not found in backend folder.
    pause
)
