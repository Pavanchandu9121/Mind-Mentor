$services = @(
    @{ path = "api-gateway"; cmd = "npm run dev"; title = "Gateway (5000)" },
    @{ path = "auth-service"; cmd = "npm run dev"; title = "Auth (5002)" },
    @{ path = "assessment-service"; cmd = "npm run dev"; title = "Assessment (5003)" },
    @{ path = "recommendation-service"; cmd = "npm run dev"; title = "Recommendation (5004)" },
    @{ path = "tracking-service"; cmd = "npm run dev"; title = "Tracking (5005)" },
    @{ path = "notification-service"; cmd = "npm run dev"; title = "Notification (5006)" },
    @{ path = "healthcare-service"; cmd = "npm run dev"; title = "Healthcare (5007)" },
    @{ path = "admin-service"; cmd = "npm run dev"; title = "Admin (5010)" },
    @{ path = "analytics-service"; cmd = "npm run dev"; title = "Analytics (5009)" },
    @{ path = "screening-service"; cmd = "npm run dev"; title = "Screening (5011)" },
    @{ path = "client"; cmd = "npm run dev"; title = "React Frontend (5173)" },
    @{ path = "admin-client"; cmd = "npm run dev"; title = "Admin Frontend (5174)" },
    @{ path = "chat-service"; cmd = "npm run dev"; title = "Chat Service (5013)" }
)

$pythonServices = @(
    @{ path = "ai-prediction-service"; cmd = "py -m uvicorn app:app --port 5001 --reload"; title = "AI Prediction (5001)" },
    @{ path = "emotion-analysis-service"; cmd = "py -m uvicorn app:app --port 5008 --reload"; title = "Emotion Analysis (5008)" }
)

Write-Host "🚀 Starting Mind Mentor Microservices Suite..." -ForegroundColor Cyan

# Start Node.js Services
foreach ($svc in $services) {
    Write-Host "Starting $($svc.title)..." -ForegroundColor Yellow
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location .\$($svc.path); `$host.ui.RawUI.WindowTitle = '$($svc.title)'; $($svc.cmd)" -WindowStyle Normal
    Start-Sleep -Milliseconds 500
}

# Start Python ML Services
foreach ($svc in $pythonServices) {
    Write-Host "Starting $($svc.title)..." -ForegroundColor Yellow
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location .\$($svc.path); `$host.ui.RawUI.WindowTitle = '$($svc.title)'; $($svc.cmd)" -WindowStyle Normal
    Start-Sleep -Milliseconds 500
}

Write-Host "✅ All services launched in separate windows!" -ForegroundColor Green
Write-Host "👉 Client App: http://localhost:5173" -ForegroundColor Cyan
Write-Host "👉 Admin App:  http://localhost:5174" -ForegroundColor Cyan
