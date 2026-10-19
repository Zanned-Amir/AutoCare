@echo off
rem Windows entry point for scripts\dev.ps1 (no need to change the execution policy).
rem   scripts\dev.cmd start ^| stop ^| restart ^| status ^| logs [api^|web]
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0dev.ps1" %*
