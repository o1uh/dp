param (
    [Parameter(Mandatory=$true)]
    [ValidateSet("backend", "frontend", "e2e", "load", "all")]
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

function Test-Load {
    Write-Host "Running Load and Latency tests..." -ForegroundColor Yellow
    Set-Location backend
    if (-Not (Test-Path "venv")) {
        python -m venv venv
    }
    & .\venv\Scripts\Activate.ps1
    
    $env:PYTHONPATH="."

    Write-Host "Installing load testing dependencies..." -ForegroundColor Gray
    pip install -r requirements.load.txt -q

    Write-Host "Preparing database state and enabling Mock Mode..." -ForegroundColor Yellow
    python tests_load/db_setup.py

    try {
        Write-Host "Starting WebSocket Latency Test..." -ForegroundColor Cyan
        python tests_load/ws_latency_test.py

        Write-Host "Starting Locust HTTP Load Test..." -ForegroundColor Cyan
        locust -f tests_load/locustfile.py --headless -u 100 -r 10 --run-time 2m --html tests_load/report.html --host http://localhost
    }
    finally {
        Write-Host "Cleaning up test state and disabling Mock Mode..." -ForegroundColor Yellow
        python tests_load/db_teardown.py
        
        $env:PYTHONPATH=""
        Set-Location ..
    }
}

switch ($Target) {
    "backend"  { Test-Backend }
    "frontend" { Test-Frontend }
    "e2e"      { Test-E2E }
    "load"     { Test-Load }
    "all"      { 
        Test-Backend
        Test-Frontend
        Test-E2E
    }
}