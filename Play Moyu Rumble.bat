@echo off
title Moyu Rumble
cd /d "%~dp0"
echo Starting Moyu Rumble... (keep this window open while you play, close it to stop)
if not exist node_modules (
  echo First run: installing, this takes a minute...
  call npm install
)
call npm run build
call npx vite preview --port 4173 --open
