# Printer Service Architecture

This directory contains the refactored printer service modules, broken down from the original monolithic `printerService.js` file for better maintainability and separation of concerns.

## File Structure

### Core Files
- **`printerService.js`** - Main PrinterService class that orchestrates all operations
- **`index.js`** - Barrel export file for clean imports

### Manager Classes
- **`printQueueManager.js`** - Handles print queue operations and job management
- **`paperStatusMonitor.js`** - Manages paper status monitoring and notifications
- **`receiptRenderer.js`** - Handles all receipt formatting and rendering logic

## Architecture Overview

```
PrinterService (Main Controller)
├── PrintQueueManager (Queue Operations)
├── PaperStatusMonitor (Status Monitoring)
└── ReceiptRenderer (Receipt Formatting)
```

## Responsibilities

### PrinterService
- Connection management (COM6 serial port)
- Print job orchestration
- Main interface for external consumers

### PrintQueueManager
- Print queue processing
- Job retry logic
- Pending queue management
- Job cancellation and cleanup

### PaperStatusMonitor
- Paper status checking
- Continuous monitoring
- Status change notifications
- Automatic job resumption

### ReceiptRenderer
- Receipt header formatting
- Item rendering (regular and combo items)
- Customization display
- Price formatting and alignment
- Special receipt types (modifications, etc.)

## Benefits of Refactoring

1. **Maintainability** - Each class has a single responsibility
2. **Testability** - Individual components can be tested in isolation
3. **Readability** - Smaller, focused files are easier to understand
4. **Reusability** - Components can be reused or extended independently
5. **Debugging** - Issues can be isolated to specific modules

## Usage

```javascript
import { PrinterService } from './services/index.js';

const printer = new PrinterService();
await printer.printReceipt(order, 'receipt');
```

## Migration Notes

The refactoring maintains the same public API as the original `PrinterService` class. All existing functionality has been preserved while improving the internal structure.
