@echo off
title Prometheus Elegance - Servidor Local
echo Iniciando o servidor local da Prometheus Elegance...
where node >nul 2>nul
if "%ERRORLEVEL%" NEQ "0" (
    echo Node.js nao encontrado no sistema.
    echo Instale o Node.js em https://nodejs.org/ e tente novamente.
    pause
    exit /b 1
)

node "%~dp0server.js"
if "%ERRORLEVEL%" NEQ "0" (
    echo.
    echo Falha ao iniciar o servidor local.
    echo Verifique se o Node.js esta instalado corretamente.
    pause
)
