<#
.SYNOPSIS
  Prometheus Elegance - Servidor Local Nativo Windows (PowerShell)
  Permite rodar a loja e o painel de admin localmente sem precisar instalar nada!
#>

$port = 3000
$rootPath = $PSScriptRoot
$dataFile = Join-Path $rootPath "data\products.json"

$mimeTypes = @{
    ".html" = "text/html; charset=utf-8"
    ".css"  = "text/css; charset=utf-8"
    ".js"   = "application/javascript; charset=utf-8"
    ".json" = "application/json; charset=utf-8"
    ".png"  = "image/png"
    ".jpg"  = "image/jpeg"
    ".jpeg" = "image/jpeg"
    ".svg"  = "image/svg+xml"
    ".ico"  = "image/x-icon"
    ".woff2"= "font/woff2"
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")

try {
    $listener.Start()
} catch {
    Write-Host "Erro ao iniciar na porta $port. Verifique se ja nao ha outro servidor aberto." -ForegroundColor Red
    Exit
}

Write-Host ""
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host " Prometheus Elegance - Servidor Local Ativo!" -ForegroundColor Yellow
Write-Host " Loja:       http://localhost:$port" -ForegroundColor Green
Write-Host " Admin:      http://localhost:$port/admin.html" -ForegroundColor Green
Write-Host " Para parar: Pressione Ctrl + C neste terminal" -ForegroundColor Gray
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host ""

Start-Process "http://localhost:$port/admin.html"

while ($listener.IsListening) {
    try {
        $context = $listener.GetContext()
    } catch {
        break
    }

    $req = $context.Request
    $res = $context.Response

    $res.Headers.Add("Access-Control-Allow-Origin", "*")
    $res.Headers.Add("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
    $res.Headers.Add("Access-Control-Allow-Headers", "Content-Type")

    if ($req.HttpMethod -eq "OPTIONS") {
        $res.StatusCode = 204
        $res.ContentLength64 = 0
        $res.Close()
        continue
    }

    $rawPath = $req.Url.AbsolutePath
    if ($rawPath -eq "/" -or $rawPath -eq "") {
        $rawPath = "/index.html"
    }

    # API: Obter produtos
    if ($rawPath -eq "/api/products" -and $req.HttpMethod -eq "GET") {
        if (Test-Path $dataFile) {
            $bytes = [System.IO.File]::ReadAllBytes($dataFile)
            $res.ContentType = "application/json; charset=utf-8"
            $res.StatusCode = 200
            $res.ContentLength64 = $bytes.Length
            $res.OutputStream.Write($bytes, 0, $bytes.Length)
        } else {
            $notFoundMsg = '{"error":"Arquivo de produtos nao encontrado"}'
            $bytes = [System.Text.Encoding]::UTF8.GetBytes($notFoundMsg)
            $res.ContentType = "application/json; charset=utf-8"
            $res.StatusCode = 404
            $res.ContentLength64 = $bytes.Length
            $res.OutputStream.Write($bytes, 0, $bytes.Length)
        }
        $res.Close()
        continue
    }

    # API: Salvar produtos (atualizacao pelo admin)
    if ($rawPath -eq "/api/products" -and $req.HttpMethod -eq "POST") {
        try {
            $reader = New-Object System.IO.StreamReader($req.InputStream, [System.Text.Encoding]::UTF8)
            $body = $reader.ReadToEnd()

            if (-not [string]::IsNullOrWhiteSpace($body)) {
                $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
                [System.IO.File]::WriteAllText($dataFile, $body, $utf8NoBom)

                Write-Host "[ADMIN] Catalogo atualizado com sucesso no disco: $(Get-Date -Format 'HH:mm:ss')" -ForegroundColor Green

                $resMsg = '{"success":true}'
                $bytes = [System.Text.Encoding]::UTF8.GetBytes($resMsg)
                $res.ContentType = "application/json; charset=utf-8"
                $res.StatusCode = 200
                $res.ContentLength64 = $bytes.Length
                $res.OutputStream.Write($bytes, 0, $bytes.Length)
            } else {
                $res.StatusCode = 400
                $res.ContentLength64 = 0
            }
        } catch {
            Write-Host "[ERRO] Falha ao salvar catalogo: $($_.Exception.Message)" -ForegroundColor Red
            $res.StatusCode = 500
            $res.ContentLength64 = 0
        }
        $res.Close()
        continue
    }

    # Arquivos estaticos
    $relPath = $rawPath.TrimStart('/').Replace('/', '\')
    $filePath = Join-Path $rootPath $relPath

    if (Test-Path $filePath -PathType Leaf) {
        $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
        $contentType = $mimeTypes[$ext]
        if (-not $contentType) { $contentType = "application/octet-stream" }

        $res.ContentType = $contentType
        $bytes = [System.IO.File]::ReadAllBytes($filePath)
        $res.StatusCode = 200
        $res.ContentLength64 = $bytes.Length
        $res.OutputStream.Write($bytes, 0, $bytes.Length)
    } else {
        $res.StatusCode = 404
        $res.ContentLength64 = 0
    }

    $res.Close()
}
