# PowerShell script to set up Windows Task Scheduler for Firebase backups
# Run this script as Administrator

param(
    [string]$BackupScriptPath = "$PSScriptRoot\run-backup.ps1",
    [string]$TaskName = "Firebase Weekend Backup",
    [string]$Description = "Automated Firebase backup every Saturday at 2:00 AM",
    [string]$Username = $env:USERNAME
)

# Check if running as Administrator
if (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Host "This script must be run as Administrator!" -ForegroundColor Red
    Write-Host "Please right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Red
    exit 1
}

Write-Host "========================================" -ForegroundColor Green
Write-Host "    Firebase Backup Task Scheduler Setup" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

# Verify backup script exists
if (-not (Test-Path $BackupScriptPath)) {
    Write-Host "ERROR: Backup script not found at: $BackupScriptPath" -ForegroundColor Red
    exit 1
}

Write-Host "Backup script found: $BackupScriptPath" -ForegroundColor Green

# Create the scheduled task
try {
    Write-Host "Creating scheduled task..." -ForegroundColor Yellow
    
    # Define the action (what to run)
    $action = New-ScheduledTaskAction -Execute "PowerShell.exe" -Argument "-ExecutionPolicy Bypass -File `"$BackupScriptPath`" --full"
    
    # Define the trigger (when to run - every Saturday at 2:00 AM)
    $trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Saturday -At 2:00AM
    
    # Define the settings
    $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -RunOnlyIfNetworkAvailable
    
    # Define the principal (who can run it)
    $principal = New-ScheduledTaskPrincipal -UserId $Username -LogonType Interactive -RunLevel Highest
    
    # Create the task
    $task = New-ScheduledTask -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Description $Description
    
    # Register the task
    Register-ScheduledTask -TaskName $TaskName -InputObject $task -Force
    
    Write-Host "✓ Scheduled task created successfully!" -ForegroundColor Green
    Write-Host "Task Name: $TaskName" -ForegroundColor Green
    Write-Host "Schedule: Every Saturday at 2:00 AM" -ForegroundColor Green
    Write-Host "Script: $BackupScriptPath" -ForegroundColor Green
    
} catch {
    Write-Host "ERROR: Failed to create scheduled task: $_" -ForegroundColor Red
    exit 1
}

# Test the task creation
try {
    $createdTask = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
    if ($createdTask) {
        Write-Host ""
        Write-Host "Task details:" -ForegroundColor Cyan
        Write-Host "  Name: $($createdTask.TaskName)" -ForegroundColor Cyan
        Write-Host "  State: $($createdTask.State)" -ForegroundColor Cyan
        Write-Host "  Next Run: $($createdTask.NextRunTime)" -ForegroundColor Cyan
        Write-Host "  Last Run: $($createdTask.LastRunTime)" -ForegroundColor Cyan
        
        Write-Host ""
        Write-Host "To manually run the task:" -ForegroundColor Yellow
        Write-Host "  Start-ScheduledTask -TaskName `"$TaskName`"" -ForegroundColor White
        
        Write-Host ""
        Write-Host "To view task details:" -ForegroundColor Yellow
        Write-Host "  Get-ScheduledTask -TaskName `"$TaskName`"" -ForegroundColor White
        
        Write-Host ""
        Write-Host "To delete the task:" -ForegroundColor Yellow
        Write-Host "  Unregister-ScheduledTask -TaskName `"$TaskName`" -Confirm:$false" -ForegroundColor White
        
    } else {
        Write-Host "Warning: Task was created but could not be retrieved for verification" -ForegroundColor Yellow
    }
} catch {
    Write-Host "Warning: Could not verify task creation: $_" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Setup completed! The backup will run automatically every Saturday at 2:00 AM." -ForegroundColor Green
Write-Host "You can also run it manually using the commands above." -ForegroundColor Green
