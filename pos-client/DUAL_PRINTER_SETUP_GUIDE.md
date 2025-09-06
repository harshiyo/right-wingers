# Dual Printer Setup Guide 🖨️

## Overview

Your POS system now supports dual printers for enhanced kitchen operations:

- **Front Printer (Thermal)**: Fast, quiet customer receipts
- **Kitchen Printer (Impact + NCR)**: Multi-copy kitchen order tickets (white + yellow)

## Hardware Requirements

### Front Printer (Customer Receipts)
- **Type**: Thermal receipt printer
- **Paper**: Standard thermal paper (58mm or 80mm)
- **Connection**: USB-to-Serial or Serial
- **Characteristics**: Fast, quiet, single-copy
- **Examples**: Epson TM-T88, Star TSP100, etc.

### Kitchen Printer (Order Tickets)
- **Type**: Impact/Dot Matrix printer
- **Paper**: NCR multi-part paper (white + yellow copies)
- **Connection**: USB-to-Serial or Serial
- **Characteristics**: Slower, louder, multi-copy capable
- **Examples**: Epson TM-U220, Star SP700, Citizen CT-S310A

## Setup Process

### 1. Physical Connection

1. **Connect both printers** to your computer via USB
2. **Install drivers** for both printers
3. **Power on both printers**
4. **Load appropriate paper**:
   - Front printer: Thermal paper
   - Kitchen printer: NCR multi-part paper (white + yellow)

### 2. Printer Detection

Run the enhanced printer detection script:

```bash
cd pos-client
node test.js
```

This will:
- Scan all available serial ports
- Identify printer types (thermal vs impact)
- Provide setup recommendations
- Show detected COM ports

### 3. Test Dual Printer Setup

Run the comprehensive test script:

```bash
cd pos-client
node test-dual-printers.js
```

Or with actual printing:

```bash
node test-dual-printers.js --print
```

This will:
- Test connections to both printers
- Send test prints if requested
- Verify dual printer functionality
- Test different receipt types

### 4. Configure in POS Settings

1. **Open POS Application**
2. **Go to Settings** (⚙️ icon)
3. **Select "Dual Printer Setup" tab**
4. **Enable Dual Printer Mode**
5. **Configure Front Printer**:
   - Set COM port (e.g., COM6)
   - Set baud rate (typically 38400)
   - Set type to "Thermal"
6. **Configure Kitchen Printer**:
   - Set COM port (e.g., COM7)
   - Set baud rate (typically 38400)
   - Set type to "Impact"
7. **Test Connections**
8. **Save Settings**

## Configuration Options

### Printer Behavior Settings

- **Auto Cut Paper**: Automatically cut paper after each receipt
- **Customer Receipts**: Enable/disable customer receipt printing
- **Kitchen Orders**: Enable/disable kitchen order printing
- **Print Delay**: Delay between consecutive prints (recommended: 500ms)

### Print Routing

When dual mode is **ENABLED**:
- Customer receipts → Front printer (thermal)
- Kitchen orders → Kitchen printer (impact)

When dual mode is **DISABLED**:
- Both receipts → Front printer only (legacy mode)

## Troubleshooting

### Common Issues

#### 1. "Port Access Denied"
**Solution**: 
- Close any other applications using the printer
- Restart the POS application
- Check Windows Device Manager for port conflicts

#### 2. "Printer Not Responding"
**Solution**:
- Verify printer is powered on
- Check USB/serial connections
- Ensure correct COM port is selected
- Try different baud rates (9600, 19200, 38400)

#### 3. "Kitchen Printer Not Printing"
**Solution**:
- Verify NCR paper is loaded correctly
- Check that impact printer supports multi-part paper
- Ensure printer ribbon is installed and working
- Try printing from another application to test hardware

#### 4. "Wrong Receipt Goes to Wrong Printer"
**Solution**:
- Verify dual mode is enabled in settings
- Check printer type configuration (thermal vs impact)
- Test individual printers to confirm correct assignment

### Testing Steps

1. **Individual Printer Tests**:
   ```bash
   # Test front printer only
   node test-dual-printers.js --front-only
   
   # Test kitchen printer only  
   node test-dual-printers.js --kitchen-only
   ```

2. **Connection Verification**:
   - Use POS settings "Test Connection" buttons
   - Send test prints to verify paper output
   - Check both printers respond correctly

3. **Full Order Test**:
   - Place a test order in POS
   - Verify customer receipt prints on front printer
   - Verify kitchen order prints on kitchen printer
   - Check multi-copy output on kitchen printer

## Best Practices

### Paper Management
- **Front Printer**: Keep extra thermal paper rolls nearby
- **Kitchen Printer**: Monitor NCR paper supply (white + yellow)
- **Paper Sensors**: Enable paper-out monitoring for proactive alerts

### Operational Workflow
1. **Order Placed**: Both receipts print simultaneously
2. **Customer Copy**: Hand to customer (thermal, clean print)
3. **Kitchen Copy**: Send to kitchen (impact, duplicate for prep/expedite)
4. **Order Completion**: Kitchen retains yellow copy for records

### Maintenance
- **Clean print heads** regularly for optimal quality
- **Replace ribbons** in impact printer as needed
- **Monitor paper levels** and replace proactively
- **Test both printers** weekly during slow periods

## File Structure

```
pos-client/
├── test.js                          # Enhanced printer detection
├── test-dual-printers.js           # Comprehensive dual printer test
├── electron/services/
│   ├── dualPrinterService.js       # Main dual printer service
│   ├── printerService.js           # Legacy single printer service
│   └── ...
├── src/
│   ├── services/storeSettings.ts    # Dual printer configuration
│   └── components/layout/
│       └── DualPrinterSettingsDialog.tsx  # Settings UI
└── DUAL_PRINTER_SETUP_GUIDE.md     # This guide
```

## Migration from Single Printer

If you're upgrading from single printer setup:

1. **Your existing settings are preserved** for backward compatibility
2. **Legacy mode continues to work** with single printer
3. **Enable dual mode when ready** by toggling the setting
4. **Both systems can coexist** - switch anytime in settings

## Support & Advanced Configuration

### Environment Variables
```bash
# For testing multiple POS instances
USER_DATA_DIR=instance1 npm run electron:dev
USER_DATA_DIR=instance2 npm run electron:dev
```

### Custom Printer Types
Modify printer detection patterns in:
- `test.js` (PRINTER_PATTERNS)
- `electron/main.js` (scan-printers handler)

### Integration with Kitchen Display
- Kitchen receipts can supplement digital kitchen displays
- Use yellow copy for physical backup/expediting
- White copy for prep station reference

---

## Quick Start Checklist ✅

- [ ] Connect both printers (thermal + impact)
- [ ] Install printer drivers
- [ ] Run `node test.js` to detect printers
- [ ] Run `node test-dual-printers.js --print` to test
- [ ] Configure printers in POS settings
- [ ] Enable dual printer mode
- [ ] Test with sample order
- [ ] Load appropriate paper types
- [ ] Train staff on new workflow

**Need Help?** Check the troubleshooting section or test individual components using the provided scripts.
