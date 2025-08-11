Write-Host "🧪 Testando endpoint de histórico do paciente..." -ForegroundColor Cyan

$headers = @{
    'Authorization' = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4M2VlM2E0ODQ0YmNmZGNiNjViNWRhYSIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTc1NDY1MjI3OCwiZXhwIjoxNzU3MjQ0Mjc4fQ.R7XoZrmV8VwndapPez83s2mfkiHDyoIccT1gtc6T8hw'
    'Content-Type' = 'application/json'
}

try {
    $response = Invoke-RestMethod -Uri "http://localhost:5000/api/prescriptions/patient/68923fc6d1aaa03bc7635f62" -Method GET -Headers $headers
    
    Write-Host "✅ Requisição bem-sucedida!" -ForegroundColor Green
    Write-Host "📋 Success: $($response.success)" -ForegroundColor Green
    
    if ($response.data.prescriptions) {
        Write-Host "📋 Prescrições encontradas: $($response.data.prescriptions.Count)" -ForegroundColor Green
        Write-Host "📋 Primeira prescrição: $($response.data.prescriptions[0].medicationName)" -ForegroundColor Green
    } else {
        Write-Host "❌ Nenhuma prescrição encontrada" -ForegroundColor Red
    }
    
    Write-Host "`n📄 Resposta:" -ForegroundColor Cyan
    $response | ConvertTo-Json -Depth 5
} 
catch {
    Write-Host "❌ Erro: $($_.Exception.Message)" -ForegroundColor Red
}
