# Ralph Loop Automated PowerShell Runner for Antigravity
param (
    [int]$MaxIterations = 20
)

Write-Host "🔄 Initializing Ralph Loop (Max Iterations: $MaxIterations)..." -ForegroundColor Cyan

if (-not (Test-Path "PRD.md")) {
    Write-Host "Creating template PRD.md..." -ForegroundColor Yellow
    @"
# Project Requirements Document (PRD)

- [ ] Task 1: Complete pending feature implementation
- [ ] Task 2: Verify test suite
"@ | Out-File -FilePath "PRD.md" -Encoding utf8
}

if (-not (Test-Path "progress.txt")) {
    "=== Ralph Loop Progress Journal ===" | Out-File -FilePath "progress.txt" -Encoding utf8
}

Write-Host "✅ Ralph Loop environment ready. Start tasks from PRD.md and track in progress.txt." -ForegroundColor Green

