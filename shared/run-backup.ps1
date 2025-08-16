param(
    [switch]$Upload,
    [switch]$Cleanup,
    [switch]$Full,
    [string]$LogFile = "backup.log"
)

# Set execution policy for current session
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process -Force

# Function to write to log file
function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "[$timestamp] [$Level] $Message"
    Write-Host $logMessage
    Add-Content -Path $LogFile -Value $logMessage
}

# Function to check if Node.js is installed
function Test-NodeJS {
    try {
        $nodeVersion = node --version 2>$null
        if ($nodeVersion) {
            Write-Log "Node.js version: $nodeVersion"
            return $true
        }
    } catch {
        return $false
    }
    return $false
}

# Function to install dependencies
function Install-Dependencies {
    if (-not (Test-Path "node_modules")) {
        Write-Log "Installing dependencies..." "INFO"
        try {
            npm install
            if ($LASTEXITCODE -eq 0) {
                Write-Log "Dependencies installed successfully" "INFO"
            } else {
                throw "npm install failed with exit code $LASTEXITCODE"
            }
        } catch {
            Write-Log "Failed to install dependencies: $_" "ERROR"
            exit 1
        }
    } else {
        Write-Log "Dependencies already installed" "INFO"
    }
}

# Function to run backup
function Run-Backup {
    param([string]$BackupType)
    
    Write-Log "Starting $BackupType backup..." "INFO"
    
    try {
        switch ($BackupType) {
            "upload" { npm run backup:upload }
            "cleanup" { npm run backup:cleanup }
            "full" { npm run backup:full }
            default { npm run backup }
        }
        
        if ($LASTEXITCODE -eq 0) {
            Write-Log "$BackupType backup completed successfully" "INFO"
        } else {
            throw "Backup failed with exit code $LASTEXITCODE"
        }
    } catch {
        Write-Log "Backup failed: $_" "ERROR"
        exit 1
    }
}

# Main execution
try {
    Write-Log "========================================" "INFO"
    Write-Log "    Firebase Backup Script (PowerShell)" "INFO"
    Write-Log "========================================" "INFO"
    Write-Log ""
    
    # Check if Node.js is installed
    if (-not (Test-NodeJS)) {
        Write-Log "ERROR: Node.js is not installed or not in PATH" "ERROR"
        Write-Log "Please install Node.js from https://nodejs.org/" "ERROR"
        exit 1
    }
    
    # Change to script directory
    Set-Location $PSScriptRoot
    
    # Install dependencies
    Install-Dependencies
    
    # Determine backup type
    $backupType = "standard"
    if ($Full) {
        $backupType = "full"
    } elseif ($Upload) {
        $backupType = "upload"
    } elseif ($Cleanup) {
        $backupType = "cleanup"
    }
    
    # Run backup
    Run-Backup -BackupType $backupType
    
    Write-Log "Backup process completed successfully!" "INFO"
    
} catch {
    Write-Log "Unexpected error: $_" "ERROR"
    exit 1
}
