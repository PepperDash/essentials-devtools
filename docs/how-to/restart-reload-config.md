# How to Restart and Reload Configuration

**Problem**: You need to restart the PepperDash Essentials program or reload the configuration after making changes.

**When to use this guide**: When configuration changes require a restart, when the system is unresponsive, or when troubleshooting requires a clean restart.

## Quick Actions

**For immediate restart:**
1. Go to **Debug Console**
2. Click **"Restart Program"** button
3. Confirm the restart in the modal dialog
4. Wait 2-3 minutes for system to fully restart

**For configuration reload only:**
1. Ensure **"Do Not Load Config on Next Boot"** is unchecked
2. Click **"Load Config"** button (if enabled)
3. Monitor debug messages for configuration loading progress

## Understanding the Options

### 1. Configuration Loading Control

**"Do Not Load Config on Next Boot" Checkbox:**
- **Checked**: System will start without loading configuration file
- **Unchecked**: System will load configuration on startup (normal operation)
- **Use case**: Useful when configuration file has errors that prevent startup

**When to use "Do Not Load Config":**
- Configuration file contains errors preventing startup
- Testing system behavior without configuration
- Troubleshooting startup issues
- Preparing to load a different configuration

### 2. Load Config Button

**Purpose**: Manually trigger configuration loading without full restart
**When available**: Only when "Do Not Load Config on Next Boot" is checked
**What it does**: Loads and applies the current configuration file

**Benefits of "Load Config" vs. full restart:**
- Faster than complete system restart
- Preserves current system state where possible
- Allows testing configuration changes quickly
- Maintains network connections and sessions

### 3. Restart Program Button

**Purpose**: Complete restart of the PepperDash Essentials framework
**What happens**: 
1. All current operations stop
2. All device connections close
3. System reinitializes completely
4. Configuration loads (unless disabled)
5. All devices reconnect

**When to use full restart:**
- Major configuration changes that require complete reload
- System becomes unresponsive
- Memory leaks or resource issues
- After software updates
- When troubleshooting requires clean state

## Step-by-Step Procedures

### 4. Safe Configuration Reload Process

**When you've made configuration changes:**

1. **Prepare for reload**:
   - Ensure all users are notified of pending restart
   - Document current system state if needed
   - Have configuration backup available

2. **Choose reload method**:
   - **Minor changes**: Use "Load Config" if available
   - **Major changes**: Use "Restart Program"
   - **When unsure**: Use "Restart Program" for safety

3. **Execute reload**:
   - Navigate to Debug Console
   - Choose appropriate method
   - Confirm action when prompted
   - Monitor progress in debug messages

4. **Verify reload success**:
   - Check debug messages for configuration loading confirmation
   - Verify devices reconnect properly
   - Test affected functionality
   - Monitor for error messages

### 5. Troubleshooting Restart Process

**When restart seems necessary:**

1. **Assess system state**:
   - Check debug console for active errors
   - Note which devices are non-responsive
   - Document current issues before restart

2. **Prepare for restart**:
   ```
   Before restart checklist:
   - [ ] Users notified of downtime
   - [ ] Critical operations completed/paused
   - [ ] Configuration backup confirmed
   - [ ] Problem symptoms documented
   ```

3. **Execute restart**:
   - Click "Restart Program"
   - Click "Restart" in confirmation dialog
   - **Do not refresh browser page** during restart
   - Wait patiently (2-5 minutes typical)

4. **Monitor restart progress**:
   - Debug session will automatically disconnect
   - Wait for system to become responsive
   - Start new debug session to monitor startup
   - Watch for device initialization messages

### 6. Emergency Restart Procedures

**When system is completely unresponsive:**

1. **Try web interface restart first**:
   - If web interface is still accessible
   - Use "Restart Program" button
   - Wait up to 5 minutes for response

2. **If web interface is unresponsive**:
   - Physical restart may be necessary
   - Contact system administrator
   - Power cycle only as last resort

3. **After emergency restart**:
   - Start debug session immediately
   - Monitor startup sequence carefully
   - Document any errors during initialization
   - Test all critical functionality

## Configuration Management During Restarts

### 7. Managing Configuration Loading

**Normal configuration loading:**
1. System starts with "Do Not Load Config on Next Boot" unchecked
2. Configuration file loads automatically during startup
3. All devices initialize based on configuration
4. System becomes fully operational

**Controlled configuration loading:**
1. Check "Do Not Load Config on Next Boot"
2. Restart system (starts without configuration)
3. System runs in minimal state
4. Use "Load Config" button when ready
5. Configuration loads without full restart

**Use cases for controlled loading:**
- Testing new configurations safely
- Troubleshooting configuration-related startup issues
- Loading configuration after making changes
- Recovering from configuration errors

### 8. Configuration Error Recovery

**When configuration prevents startup:**

1. **Enable "Do Not Load Config on Next Boot"**:
   - Check the checkbox in Debug Console
   - Click "Restart Program"
   - System will start without loading configuration

2. **Fix configuration issues**:
   - Access configuration file externally
   - Correct syntax errors or invalid settings
   - Validate configuration before reloading

3. **Test configuration loading**:
   - Uncheck "Do Not Load Config on Next Boot"
   - Click "Load Config" to test
   - Monitor debug messages for errors
   - If successful, configuration is now active

4. **If configuration still has issues**:
   - Keep "Do Not Load Config" checked
   - Restart again to return to safe state
   - Continue troubleshooting configuration file

## Monitoring Restart and Reload Progress

### 9. Normal Startup Sequence

**Expected startup messages:**
```
Information: System initializing
Information: Loading configuration file
Information: Device [DeviceName] initializing  
Information: Device [DeviceName] connection established
Information: Device [DeviceName] ready
Information: System startup complete
```

**Startup timing expectations:**
- **System initialization**: 30-60 seconds
- **Configuration loading**: 10-30 seconds
- **Device connections**: 1-5 minutes (depends on device count)
- **Total startup time**: 2-6 minutes typical

### 10. Identifying Startup Problems

**Warning signs during startup:**
- Devices failing to initialize
- Repeated connection timeout errors
- Configuration loading errors
- System taking longer than usual

**Common startup error patterns:**
```
Error: Failed to load configuration file
Warning: Device [Name] connection timeout
Error: Device [Name] initialization failed
Warning: Network unreachable for device [Name]
```

**Troubleshooting startup issues:**
1. **Configuration errors**: Use "Do Not Load Config" mode
2. **Network issues**: Check device connectivity
3. **Device failures**: Investigate specific device problems
4. **System issues**: May require technical support

## Best Practices

### 11. Restart Planning

**Before performing restarts:**
- ✅ Notify users of planned downtime
- ✅ Complete or pause critical operations
- ✅ Document current system state
- ✅ Have configuration backup available
- ✅ Plan restart during low-usage periods

**During restarts:**
- ✅ Monitor progress through debug console
- ✅ Be patient - don't interrupt restart process
- ✅ Document any errors that occur
- ✅ Don't perform other system operations during restart

**After restarts:**
- ✅ Verify all devices reconnected properly
- ✅ Test critical functionality
- ✅ Monitor system for a few minutes
- ✅ Document any issues that persist
- ✅ Notify users when system is fully operational

### 12. Configuration Change Workflow

**Safe configuration update process:**
1. **Backup current configuration**
2. **Make configuration changes** (externally)
3. **Test configuration** (validation tools if available)
4. **Choose appropriate reload method**:
   - Load Config: For minor changes
   - Restart Program: For major changes or when unsure
5. **Monitor reload process** carefully
6. **Verify functionality** after reload
7. **Document changes** and results

## Troubleshooting Common Issues

### Restart Button Not Responding
**Cause**: System may be completely unresponsive
**Solution**: Wait 5 minutes, try browser refresh, contact administrator if needed

### Configuration Won't Load
**Cause**: Syntax errors or invalid configuration
**Solution**: Use "Do Not Load Config" mode, fix configuration externally, test reload

### Devices Not Reconnecting After Restart
**Cause**: Network issues, device problems, or configuration errors
**Solution**: Check debug messages for specific device errors, verify network connectivity

### System Takes Too Long to Restart
**Cause**: Large number of devices, network delays, or system issues
**Solution**: Wait up to 10 minutes for large systems, check for specific error messages

### "Load Config" Button Not Available
**Cause**: "Do Not Load Config on Next Boot" is not checked
**Solution**: Check the checkbox first, or use full restart instead

## Quick Reference

### Restart Options Quick Guide
- **Load Config**: Quick configuration reload (when checkbox is checked)
- **Restart Program**: Complete system restart
- **Do Not Load Config**: Start system without configuration (troubleshooting mode)

### When to Use Each Option

| Situation | Recommended Action |
|-----------|-------------------|
| Minor configuration changes | Load Config |
| Major configuration changes | Restart Program |
| System unresponsive | Restart Program |
| Configuration has errors | Check "Do Not Load Config", then Restart |
| Testing new configuration | Use "Do Not Load Config" mode |
| After software updates | Restart Program |

### Normal Timing Expectations
- **Load Config**: 30 seconds - 2 minutes
- **Restart Program**: 2-6 minutes total
- **Device reconnection**: 1-5 minutes after restart
- **System fully operational**: 3-8 minutes after restart initiated

### Emergency Contacts
If restart procedures don't resolve issues:
1. Check system documentation for emergency procedures
2. Contact system administrator
3. Contact PepperDash support if needed
4. As last resort: Physical power cycle (with appropriate authorization)

Remember: Restarts and configuration reloads are powerful tools but should be used thoughtfully. Always consider the impact on users and operations, and monitor the process carefully to ensure successful completion.
