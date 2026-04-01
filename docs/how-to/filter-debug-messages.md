# How to Filter and Search Debug Messages

**Problem**: You need to find specific information in a large volume of debug messages.

**When to use this guide**: When the debug console is showing too many messages and you need to focus on specific devices, events, or issues.

## Quick Filtering

**For immediate results:**
1. **Device filter**: Click "Devices" dropdown → Select specific devices
2. **Log level filter**: Click "Log Level" dropdown → Select "Warning" and "Error" only  
3. **Search box**: Type keywords related to your issue
4. **Clear all**: Click "Clear" button to reset

## Effective Search Strategies

### 1. Search by Keywords

**Single keywords** (finds messages containing the word):
```
error          - All error-related messages
connection     - Connection events and issues  
power         - Power-related events
button        - Button press events
display       - Display-related messages
```

**Multiple keywords** (finds messages containing ALL words):
```
display power     - Display power events specifically
button press      - Button press events only
connection timeout - Connection timeout issues
error device      - Device-specific errors
```

**Technical terms** (use exact terminology from error messages):
```
"connection refused"     - Exact phrase matching
"device not responding"  - Specific error conditions
"timeout expired"        - Timeout-related issues
```

### 2. Filter by Device

**Global system messages:**
- Select "Global" to see system-wide events
- Includes startup, shutdown, and system status messages
- Use for overall system health monitoring

**Specific device focus:**
- Select one device to trace its complete activity
- Useful for device-specific troubleshooting
- Shows all messages from that device only

**Multiple device comparison:**
- Select 2-3 related devices
- Compare behavior between similar devices
- Identify which device is behaving differently

### 3. Filter by Log Level

**Error and Warning only** (recommended for problem identification):
- Focus on actual problems
- Reduces noise from normal operations
- Best for quick issue identification

**Information level** (recommended for normal monitoring):
- Shows normal operations plus issues
- Good balance of detail vs. noise
- Default setting for most use cases

**Debug and Verbose** (use sparingly):
- Extremely detailed technical information
- Only use when specifically debugging code issues
- Can overwhelm the interface with messages

## Advanced Filtering Techniques

### 4. Combine Multiple Filters

**Example: Find display power errors**
1. Device filter: Select display devices only
2. Log level: Select "Error" and "Warning"
3. Search: Type "power"
4. Result: Only power-related issues from displays

**Example: Trace button press handling**
1. Device filter: Select "Global" and control panel devices
2. Log level: Select "Information" and above
3. Search: Type "button press"
4. Result: Complete button press event chain

**Example: Monitor system startup**
1. Device filter: Select "Global"
2. Log level: Select "Information" and above  
3. Search: Type "startup" or "initializing"
4. Result: System startup sequence

### 5. Time-Based Analysis

**Clear and restart** for fresh analysis:
1. Stop the debug session
2. Clear the browser page (refresh)
3. Start a new debug session
4. Apply filters before activity occurs

**Historical analysis** (within current session):
- Scroll up to see earlier messages
- Use browser's find function (Ctrl+F) for additional searching
- Look for patterns in timestamps

## Troubleshooting Scenarios

### Scenario 1: Device Not Responding

**Goal**: Find why a specific device isn't working

**Filtering approach:**
1. **Device filter**: Select the problematic device only
2. **Log level**: Start with "Warning" and "Error"
3. **Search terms**: Try these in order:
   - `error`
   - `connection`
   - `timeout`
   - `failed`

**What to look for:**
- Connection establishment messages (or lack thereof)
- Repeated error patterns
- Timeout messages
- Command acknowledgments (or missing ones)

### Scenario 2: System Performance Issues

**Goal**: Identify what's causing system slowdowns

**Filtering approach:**
1. **Device filter**: Start with "Global" messages
2. **Log level**: "Warning" and "Error" to see problems
3. **Search terms**:
   - `timeout`
   - `delay`
   - `slow`
   - `performance`

**What to look for:**
- High frequency of messages from one device
- Timeout errors from multiple devices
- Resource allocation warnings
- Performance degradation messages

### Scenario 3: User Interaction Tracing

**Goal**: Follow what happens when a user presses a button

**Filtering approach:**
1. **Device filter**: Include control panels and target devices
2. **Log level**: "Information" and above
3. **Search terms**:
   - `button`
   - `press`
   - `command`

**What to look for:**
- Button press detection
- Command routing messages
- Device response confirmations
- Any errors in the command chain

### Scenario 4: Network Connectivity Issues

**Goal**: Diagnose network-related problems

**Filtering approach:**
1. **Device filter**: All network-connected devices
2. **Log level**: "Warning" and "Error"
3. **Search terms**:
   - `network`
   - `connection`
   - `ping`
   - `unreachable`

**What to look for:**
- Connection retry attempts
- Network timeout messages
- IP address resolution issues
- Protocol-specific errors

## Search Tips and Tricks

### Effective Search Terms

**For connection issues:**
```
connection, connect, disconnect, timeout, unreachable, refused
```

**For device control:**
```
command, response, control, status, state, property
```

**For errors and problems:**
```
error, exception, failed, timeout, denied, invalid
```

**For user interactions:**
```
button, press, touch, input, selection, change
```

**For system events:**
```
startup, shutdown, restart, initialize, load, ready
```

### Search Patterns

**Negation** (use carefully):
- Most browsers support Ctrl+F with exclusion
- Better to use positive filters in the application

**Partial matching**:
- "conn" matches "connection", "connected", "disconnect"
- "disp" matches "display", "displayed", "displaying"

**Case insensitivity**:
- "ERROR" and "error" produce same results
- "Display" and "display" are equivalent

## Filter Management

### Efficient Filter Workflows

**Start broad, narrow down:**
1. Begin with no filters (see everything)
2. Add device filter to focus area
3. Add log level filter to reduce noise
4. Add search terms for specific issues
5. Clear and restart when changing focus

**Save mental notes** of effective filter combinations:
- Document filter combinations that work well
- Remember search terms that find specific issues
- Note which devices typically need monitoring together

### Clear Filters Strategically

**When to clear filters:**
- Switching between different troubleshooting tasks
- When filters are too restrictive (no results)
- Starting investigation of a new issue
- Periodically to see the "big picture"

**What gets cleared:**
- Device selections
- Log level selections  
- Search text
- Filter state resets to defaults

## Performance Considerations

### Managing Message Volume

**High message rates** (>50 messages/second):
- Use more restrictive log levels
- Filter to fewer devices
- Consider if system has problems causing excessive logging

**Browser performance:**
- Too many messages can slow browser
- Refresh page periodically to clear accumulation
- Use filters to reduce processing load

### Network Considerations

**Debug session impact:**
- Each active session uses network bandwidth
- Multiple users can impact processor performance
- Stop sessions when not actively debugging

## Best Practices Summary

### Do's:
- ✅ Start with broader filters, then narrow down
- ✅ Use device filters to focus on specific components
- ✅ Combine multiple filtering methods for precise results
- ✅ Clear filters between different troubleshooting sessions
- ✅ Use appropriate log levels for your investigation type

### Don'ts:
- ❌ Leave all filters active when switching tasks
- ❌ Use "Verbose" log level unless absolutely necessary
- ❌ Search for overly generic terms without other filters
- ❌ Ignore the clear button - filters accumulate
- ❌ Filter so restrictively that you miss related issues

## Quick Reference

### Filter Combinations for Common Tasks

**Problem identification:**
- Log Level: Warning + Error
- Device: All or problematic area
- Search: "error" or "failed"

**Device troubleshooting:**
- Device: Specific device only
- Log Level: Information and above
- Search: Related to suspected issue

**System monitoring:**
- Device: Global
- Log Level: Warning and above
- Search: "system" or "startup"

**User interaction tracing:**
- Device: Control panels + target devices
- Log Level: Information and above
- Search: "button" or "command"

### Quick Actions
- **Reset everything**: Click "Clear" button
- **Focus device**: Select one device in dropdown
- **Problem focus**: Set log level to "Warning" + "Error"
- **Find specific issue**: Use search box with relevant keywords

Remember: Effective filtering is about progressively narrowing your focus while maintaining enough context to understand what's happening. Start broad, then get specific as you understand the issue better.
