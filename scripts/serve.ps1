# Minimal local web server for testing the app (bound to 127.0.0.1 only).
#   powershell -ExecutionPolicy Bypass -File scripts/serve.ps1
# Then open http://127.0.0.1:8000/  (press Ctrl+C to stop)
param([int]$Port = 8000)

$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$types = @{ ".html" = "text/html; charset=utf-8"; ".js" = "text/javascript; charset=utf-8"; ".css" = "text/css; charset=utf-8" }

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://127.0.0.1:$Port/")
$listener.Start()
Write-Host "Serving $root at http://127.0.0.1:$Port/  (Ctrl+C to stop)"
try {
  while ($listener.IsListening) {
    $ctx = $listener.GetContext()
    $rel = [uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath).TrimStart("/")
    if ($rel -eq "") { $rel = "index.html" }
    $full = [System.IO.Path]::GetFullPath((Join-Path $root $rel))
    $ext = [System.IO.Path]::GetExtension($full).ToLower()
    # only serve the app's own html/js/css files from inside the project folder
    if ($full.StartsWith($root, [System.StringComparison]::OrdinalIgnoreCase) -and $types.ContainsKey($ext) -and (Test-Path $full -PathType Leaf)) {
      $bytes = [System.IO.File]::ReadAllBytes($full)
      $ctx.Response.ContentType = $types[$ext]
      $ctx.Response.ContentLength64 = $bytes.Length
      $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
    } else {
      $ctx.Response.StatusCode = 404
    }
    $ctx.Response.Close()
  }
} finally {
  $listener.Stop()
}
