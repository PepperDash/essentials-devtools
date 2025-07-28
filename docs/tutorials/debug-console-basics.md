# Debug Console Tutorial: Mastering Real-Time System Monitoring

**Learning objective**: Master the Debug Console to effectively monitor, filter, and analyze real-time system messages for troubleshooting and system understanding.

**Time required**: 25-30 minutes

**Prerequisites**: 
- Completed the [Getting Started Tutorial](./getting-started.md)
- Access to a running PepperDash Essentials system
- Basic familiarity with the web app interface

## What You'll Learn

- Advanced filtering and search techniques
- How to interpret different log levels and message types
- Using the minimum log level setting
- Managing debug sessions effectively
- Best practices for troubleshooting with the console

## Part 1: Understanding Log Levels and Their Importance

### Step 1: Explore Different Log Levels

1. **Start a debug session** in the Debug Console
2. **Observe the default log level** display in the interface
3. **Generate various activities** on your system to see different message types

**Log levels you'll encounter** (from most to least critical):
- **Error**: System failures, connection problems, critical issues
- **Warning**: Potential issues, deprecated features, recoverable problems  
- **Information**: Normal operations, status changes, confirmations
- **Debug**: Detailed technical information for developers
- **Verbose**: Extremely detailed trace information

### Step 2: Adjust Minimum Log Level

1. **Find the log level dropdown** (shows current minimum level)
2. **Click it** to see available options
3. **Try setting it to "Warning"**
   - Notice how fewer messages appear
   - Only warnings and errors are shown
4. **Set it back to "Information"** for normal operation

✅ **Success indicator**: You understand how log levels filter what messages are captured.

## Part 2: Advanced Filtering Techniques

### Step 3: Master Device Filtering

1. **Open the Devices filter dropdown**
2. **Notice the "Global" option** - this captures system-wide messages
3. **Select specific devices** to focus on particular components
4. **Try combining multiple devices** to monitor a subset of your system

**Practical example**: 
- If troubleshooting display issues, filter to just display devices
- For audio problems, focus on audio-related devices

### Step 4: Combine Multiple Filters

1. **Apply a device filter** (select 1-2 devices)
2. **Add a log level filter** (try "Warning" and "Error" only)
3. **Add search terms** in the search box
4. **Observe how filters work together** (AND logic - all conditions must match)

**Exercise**: Create a filter to show only error messages from display devices containing the word "power".

### Step 5: Use Search Effectively

The search function is powerful but has specific behavior:

1. **Single word searches**: Type "button" to find all button-related messages
2. **Multiple word searches**: Type "display power" to find messages containing both words
3. **Case insensitive**: "ERROR" and "error" work the same way
4. **Partial matches**: "conn" will match "connection", "connected", "disconnect"

**Try these search examples**:
- `error` - Find all error-related messages
- `display power` - Find display power-related messages  
- `button press` - Find button press events
- `connection timeout` - Find connection timeout issues

✅ **Success indicator**: You can create complex filter combinations to find exactly what you need.

## Part 3: Interpreting Messages and Troubleshooting

### Step 6: Read Message Patterns

Real systems generate patterns of messages. Learn to recognize them:

1. **Normal startup sequence**:
   ```
   Information: Device [DisplayRoom1] initializing
   Information: Device [DisplayRoom1] connection established
   Information: Device [DisplayRoom1] ready
   ```

2. **Error patterns**:
   ```
   Warning: Device [DisplayRoom1] connection timeout
   Error: Device [DisplayRoom1] failed to respond
   Warning: Device [DisplayRoom1] attempting reconnection
   ```

3. **User interaction patterns**:
   ```
   Information: Button [PowerOn] pressed
   Information: Command sent to [DisplayRoom1]: Power On
   Information: Device [DisplayRoom1] power state changed: On
   ```

### Step 7: Use Message Details for Deep Analysis

1. **Click on an interesting message** to open the detail panel
2. **Examine the Properties section** - this contains structured data
3. **Look for key information**:
   - Device identifiers
   - Command parameters
   - Error codes
   - Timing information

**Common properties you'll see**:
- `Key`: The device that generated the message
- `SourceContext`: Which part of the code generated the message
- `CommandType`: What type of command was executed
- `ResponseTime`: How long an operation took

✅ **Success indicator**: You can interpret message patterns and extract detailed information from individual messages.

## Part 4: Managing Debug Sessions

### Step 8: Session Management Best Practices

1. **Start sessions when needed**:
   - Don't leave debug sessions running constantly
   - They consume system resources and network bandwidth

2. **Stop sessions when done**:
   - Click "Stop Debug Session" when finished
   - The message count will stop increasing

3. **Clear accumulated messages**:
   - Refresh the page to clear old messages
   - Start fresh for new troubleshooting sessions

### Step 9: Monitor System Performance Impact

1. **Watch the "Message Count"** indicator
2. **High message rates** (>100 messages/second) may indicate:
   - A device in an error loop
   - Verbose logging that should be reduced
   - A system problem requiring attention

3. **Use filtering to reduce load**:
   - Set minimum log level to "Warning" for production monitoring
   - Filter to specific devices when troubleshooting

✅ **Success indicator**: You understand how to manage debug sessions efficiently.

## Part 5: Real-World Troubleshooting Scenarios

### Scenario 1: Display Not Responding

**Goal**: Find out why a display isn't turning on

1. **Filter to the display device**
2. **Look for error or warning messages**
3. **Search for "power" or "connection"**
4. **Check message timestamps** to see when problems started

**Expected findings**:
- Connection timeout errors
- Power command confirmations (or lack thereof)
- Network connectivity issues

### Scenario 2: System Running Slowly  

**Goal**: Identify performance bottlenecks

1. **Set log level to "Information"**
2. **Search for "timeout" or "delay"**
3. **Look for repeated error patterns**
4. **Check message frequency for problematic devices**

### Scenario 3: Button Presses Not Working

**Goal**: Trace button press handling

1. **Filter to "Global" messages**
2. **Search for "button" or "press"**
3. **Look for the complete command chain**:
   - Button press detected
   - Command sent to device
   - Device response/confirmation

✅ **Success indicator**: You can systematically troubleshoot common system issues using the debug console.

## Best Practices Summary

### Do's:
- ✅ Start with broad filters, then narrow down
- ✅ Use appropriate log levels for your task
- ✅ Stop sessions when not actively debugging
- ✅ Look for message patterns, not just individual messages
- ✅ Use search terms related to your specific problem

### Don'ts:
- ❌ Leave debug sessions running indefinitely
- ❌ Use "Verbose" level unless absolutely necessary
- ❌ Ignore the message count - it indicates system load
- ❌ Focus only on errors - informational messages provide context
- ❌ Forget to clear filters between different troubleshooting tasks

## Advanced Tips

1. **Timing analysis**: Use message timestamps to measure response times
2. **Device correlation**: Filter multiple related devices to see interactions
3. **Search operators**: Use specific technical terms from error messages
4. **Session planning**: Know what you're looking for before starting a session

## What You've Accomplished

You now have advanced skills in using the Debug Console:

- ✅ Understand all log levels and when to use each
- ✅ Can create sophisticated filter combinations
- ✅ Know how to interpret message patterns and details
- ✅ Can manage debug sessions efficiently
- ✅ Have practical troubleshooting experience

## Next Steps

- **Advanced device management**: Try the [Device Management Tutorial](./device-management-basics.md)
- **Solve specific problems**: Check the [How-to Guides](../how-to/) for common issues
- **Deep technical understanding**: Read the [Debug Console Design](../explanation/debug-console-design.md) explanation

## Troubleshooting This Tutorial

**Not seeing expected message types?**
- Your system may be configured with a higher minimum log level
- Try generating more system activity
- Check if your devices are actually connected and functioning

**Too many messages to follow?**
- Use more restrictive filtering
- Increase the minimum log level temporarily
- Focus on one device or message type at a time

**Messages seem delayed?**
- This can indicate network latency or system load
- Check your network connection
- Consider if other users are also connected

The Debug Console is your primary tool for understanding system behavior. Master it, and you'll be able to diagnose and resolve most system issues efficiently!
