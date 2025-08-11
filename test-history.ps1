param(
    [string]$PatientId = "68923fc6d1aaa03bc7635f62",
    [string]$Token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4M2VlM2E0ODQ0YmNmZGNiNjViNWRhYSIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTc1NDY1MjI3OCwiZXhwIjoxNzU3MjQ0Mjc4fQ.R7XoZrmV8VwndapPez83s2mfkiHDyoIccT1gtc6T8hw"
)

Write-Host "🧪 Testando endpoint de histórico do paciente..." -ForegroundColor Cyan
Write-Host "📍 PatientID: $PatientId" -ForegroundColor Yellow
Write-Host "📍 URL: http://localhost:5000/api/prescriptions/patient/$PatientId" -ForegroundColor Yellow

try {
    $headers = @{
        'Authorization' = "Bearer $Token"
        'Content-Type' = 'application/json'
    }
    
    $response = Invoke-RestMethod -Uri "http://localhost:5000/api/prescriptions/patient/$PatientId" -Method GET -Headers $headers -ErrorAction Stop
    
    Write-Host "✅ Requisição bem-sucedida!" -ForegroundColor Green
    Write-Host "📋 Success: $($response.success)" -ForegroundColor Green
    
    if ($response.data) {
        Write-Host "📋 Data existe: Sim" -ForegroundColor Green
        Write-Host "📋 Prescriptions exist: $($response.data.prescriptions -ne $null)" -ForegroundColor Green
        
        if ($response.data.prescriptions) {
            Write-Host "📋 Número de prescrições: $($response.data.prescriptions.Count)" -ForegroundColor Green
            
            if ($response.data.prescriptions.Count -gt 0) {
                Write-Host "📋 Primeira prescrição:" -ForegroundColor Green
                Write-Host "   - ID: $($response.data.prescriptions[0]._id)" -ForegroundColor White
                Write-Host "   - Medicamento: $($response.data.prescriptions[0].medicationName)" -ForegroundColor White
                Write-Host "   - Status: $($response.data.prescriptions[0].status)" -ForegroundColor White
                Write-Host "   - Paciente: $($response.data.prescriptions[0].patientName)" -ForegroundColor White
            }
        } else {
            Write-Host "❌ data.prescriptions é null ou undefined" -ForegroundColor Red
        }
        
        if ($response.data.patient) {
            Write-Host "📋 Paciente: $($response.data.patient.name)" -ForegroundColor Green
        }
    } else {
        Write-Host "❌ Data não existe na resposta" -ForegroundColor Red
    }
    
    Write-Host "`n📄 Resposta completa:" -ForegroundColor Cyan
    $response | ConvertTo-Json -Depth 10 | Write-Host
    
}
catch {
    Write-Host "❌ Erro na requisição: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "❌ Status Code: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
    Write-Host "❌ Details: $($_.ErrorDetails.Message)" -ForegroundColor Red
}
