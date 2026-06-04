# mpesa-ngrok-test.ps1
# Usage: .\scripts\mpesa-ngrok-test.ps1 -Phone 0791083304

param(
    [string]$Phone = "0791083304",
    [int]$Port = 3000
)

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Batteriq M-Pesa Local Test Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1 — Check ngrok is installed
Write-Host "[1/4] Checking ngrok..." -ForegroundColor Yellow
$ngrokPath = Get-Command ngrok -ErrorAction SilentlyContinue
if (-not $ngrokPath) {
    Write-Host "ERROR: ngrok not found. Please:" -ForegroundColor Red
    Write-Host "  1. Go to https://ngrok.com and sign up" -ForegroundColor White
    Write-Host "  2. Download Windows ZIP and extract ngrok.exe to C:\Windows\System32" -ForegroundColor White
    Write-Host "  3. Run: ngrok config add-authtoken YOUR_TOKEN" -ForegroundColor White
    exit 1
}
Write-Host "  ngrok found at: $($ngrokPath.Source)" -ForegroundColor Green

# Step 2 — Start ngrok in background
Write-Host ""
Write-Host "[2/4] Starting ngrok on port $Port..." -ForegroundColor Yellow
$ngrokProcess = Start-Process -FilePath "ngrok" -ArgumentList "http $Port" -PassThru -WindowStyle Minimized
Start-Sleep -Seconds 3

# Step 3 — Get ngrok public URL
Write-Host "[3/4] Getting public ngrok URL..." -ForegroundColor Yellow
try {
    $ngrokApi = Invoke-RestMethod -Uri "http://localhost:4040/api/tunnels" -ErrorAction Stop
    $publicUrl = ($ngrokApi.tunnels | Where-Object { $_.proto -eq "https" }).public_url
    if (-not $publicUrl) {
        $publicUrl = ($ngrokApi.tunnels | Select-Object -First 1).public_url
    }
} catch {
    Write-Host "ERROR: Could not reach ngrok API at localhost:4040" -ForegroundColor Red
    Write-Host "Make sure ngrok started correctly." -ForegroundColor White
    exit 1
}

$callbackUrl = "$publicUrl/api/mpesa/callback"
Write-Host "  Public URL: $publicUrl" -ForegroundColor Green
Write-Host "  Callback URL: $callbackUrl" -ForegroundColor Green

# Step 4 — Update .env.local
Write-Host ""
Write-Host "[4/4] Updating .env.local with ngrok callback URL..." -ForegroundColor Yellow

$envFile = ".env.local"

# Create .env.local if it doesn't exist
if (-not (Test-Path $envFile)) {
    Write-Host "  Creating .env.local..." -ForegroundColor White
    @"
NEXT_PUBLIC_SUPABASE_URL=https://ueagjjdbbukdkktviyrv.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVlYWdqamRiYnVrZGtrdHZpeXJ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxNzU1MjksImV4cCI6MjA5NDc1MTUyOX0._0PSkr-LIby74xi_AO03SwlgkI0CDsZyFjF-2crr818
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVlYWdqamRiYnVrZGtrdHZpeXJ2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTE3NTUyOSwiZXhwIjoyMDk0NzUxNTI5fQ.qWz3gqOLyDV1Zvz_d1ZjFSiUx2z6SOQ0a11Wqcuqjfg
MPESA_CONSUMER_KEY=ZSHGN57vFtU8miOj7p5UmqGRj75nSLC1WCh8UqJqaOl8g5em
MPESA_CONSUMER_SECRET=QYdsmMS2toBbNnkprskM9NwXAGvq0okktgVrE6bpEqDyt3yJVreAZIHYAGatPYEK
MPESA_BUSINESS_SHORTCODE=5286334
MPESA_PASSKEY=f937f5801de1b42555ff74537987b919883fbad581c187472feabba71b5d0813
MPESA_ENVIRONMENT=production
MPESA_CALLBACK_URL=PLACEHOLDER
"@ | Set-Content $envFile
}

# Update or add MPESA_CALLBACK_URL
$envContent = Get-Content $envFile -Raw
if ($envContent -match "MPESA_CALLBACK_URL=") {
    $envContent = $envContent -replace "MPESA_CALLBACK_URL=.*", "MPESA_CALLBACK_URL=$callbackUrl"
} else {
    $envContent += "`nMPESA_CALLBACK_URL=$callbackUrl"
}
$envContent | Set-Content $envFile
Write-Host "  .env.local updated with: $callbackUrl" -ForegroundColor Green

# Done — print instructions
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  SETUP COMPLETE" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor White
Write-Host ""
Write-Host "  1. Restart your dev server:" -ForegroundColor Yellow
Write-Host "     Ctrl+C then: npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "  2. Trigger STK push to $Phone :" -ForegroundColor Yellow
Write-Host "     Open: http://localhost:$Port/api/mpesa/diagnose" -ForegroundColor Cyan
Write-Host ""
Write-Host "  3. Watch the callback arrive:" -ForegroundColor Yellow
Write-Host "     Open: http://localhost:4040 (ngrok dashboard)" -ForegroundColor Cyan
Write-Host ""
Write-Host "  4. Your terminal will log:" -ForegroundColor Yellow
Write-Host "     [Callback] Payment successful — receipt: XXXXXXXXX" -ForegroundColor Green
Write-Host "     OR" -ForegroundColor White
Write-Host "     [Callback] Payment failed — Code: XXXX" -ForegroundColor Red
Write-Host ""
Write-Host "  Phone being tested: $Phone" -ForegroundColor Cyan
Write-Host "  Callback URL: $callbackUrl" -ForegroundColor Cyan
Write-Host ""
