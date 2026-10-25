@echo off
title Prometheus Elegance - Servidor Local
echo Iniciando o servidor local da Prometheus Elegance...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0server.ps1"
pause
