param (
    [Parameter(Mandatory=$true)]
    [ValidateSet("backend", "frontend", "e2e", "all")]
    [string]$Target
)

function Test-Backend {
    Write-Host "Running Backend tests..." -ForegroundColor Cyan
    Set-Location backend
    if (-Not (Test-Path "venv")) {
        python -m venv venv
    }
    & .\venv\Scripts\Activate.ps1
    pip install -r requirements.api.txt -q
    pytest tests/ -v
    Set-Location ..
}

function Test-Frontend {
    Write-Host "Running Frontend tests..." -ForegroundColor Cyan
    Set-Location frontend
    npm run test
    Set-Location ..
}

function Test-E2E {
    Write-Host "Running E2E tests..." -ForegroundColor Cyan
    Set-Location frontend
    npm run test:e2e
    Set-Location ..
}

switch ($Target) {
    "backend" { Test-Backend }
    "frontend" { Test-Frontend }
    "e2e" { Test-E2E }
    "all" { 
        Test-Backend
        Test-Frontend
        Test-E2E
    }
}