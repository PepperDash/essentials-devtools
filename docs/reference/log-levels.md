# Log Levels and Filters Reference

**Complete technical reference for log levels, filtering mechanisms, and message classification in the PepperDash Essentials Web Config App.**

## Log Level Hierarchy

### Severity Levels (Most to Least Critical)

| Level | Numeric Value | Purpose | Usage Guidelines |
|-------|---------------|---------|------------------|
| Fatal | 5 | System cannot continue | Application crashes, critical failures |
| Error | 4 | Error conditions | Device failures, communication errors |
| Warning | 3 | Warning conditions | Potential issues, deprecated usage |
| Information | 2 | General information | Normal operations, status changes |
| Debug | 1 | Detailed debug info | Technical details for developers |
| Verbose | 0 | Trace information | Extremely detailed execution traces |

### Level Selection Impact

**When setting minimum log level to "Warning":**
- **Captured**: Fatal, Error, Warning messages
- **Filtered out**: Information, Debug, Verbose messages
- **Use case**: Problem identification, production monitoring

**When setting minimum log level to "Information":**
- **Captured**: Fatal, Error, Warning, Information messages  
- **Filtered out**: Debug, Verbose messages
- **Use case**: Normal system monitoring, general troubleshooting

**When setting minimum log level to "Debug":**
- **Captured**: All messages except Verbose
- **Filtered out**: Only Verbose messages
- **Use case**: Detailed troubleshooting, development

**When setting minimum log level to "Verbose":**
- **Captured**: All messages
- **Filtered out**: None
- **Use case**: Deep debugging, code-level analysis

## Client-Side Filtering

### Per-Device Minimum Log Level Filter

Each device checked in the Debug Console Devices dropdown has its own minimum log level threshold. Messages from that device are only shown if they meet or exceed that device's threshold.

**Default**: `Information` when a device is first checked

**Severity comparison**: `LOG_LEVEL_ORDER[message.Level] >= LOG_LEVEL_ORDER[deviceMinLevel]`

where `LOG_LEVEL_ORDER` is:

| Level | Order Value |
|-------|-------------|
| Verbose | 0 |
| Debug | 1 |
| Information | 2 |
| Warning | 3 |
| Error | 4 |
| Fatal | 5 |

**Example**: Device set to `Warning` — shows Warning, Error, Fatal; hides Information, Debug, Verbose

**State**: Stored in Redux `debugConsole.deviceLevels` as `Record<deviceId, levelName>`; persists across navigation within the session

### Filter Combination Logic

All client-side filters use AND logic:
- **Device filter**: Message key must match a checked device (or `Global`)
- **Per-device minimum level**: Message severity must meet the device's threshold
- **Text search**: All search terms must appear somewhere in the message fields

### Server-Side Minimum Log Level

The **Minimum Log Level** dropdown in the Debug Console session panel sets the server-side floor for all messages the processor sends to the client. Messages below this level are never transmitted, regardless of the client-side per-device settings. This controls what the processor captures and streams, while per-device levels control what the client displays after receipt.

### System-Level Messages

**Global Messages** (Key: "global" or empty):
- System startup and shutdown events
- Framework-level operations
- Cross-device operations
- Resource allocation and management

**Example Global Messages**:
```
Information: System startup complete
Warning: High memory usage detected
Error: Configuration file syntax error
Information: Device initialization sequence started
```

### Device-Specific Messages

**Device Messages** (Key: Device identifier):
- Individual device operations
- Communication events
- Status changes
- Error conditions

**Example Device Messages**:
```
Information: Device [Display-Room1] connection established
Warning: Device [Display-Room1] response timeout
Error: Device [Display-Room1] communication failed
Debug: Device [Display-Room1] sending command: Power On
```

## Message Structure Reference

### Standard Message Format

**Core Fields** (Present in all messages):
```json
{
  "Timestamp": "ISO 8601 formatted timestamp",
  "MessageTemplate": "Template with placeholders",
  "RenderedMessage": "Final formatted message",
  "Level": "Log level string",
  "Properties": "Structured data object"
}
```

**Field Descriptions**:

**Timestamp**:
- Format: ISO 8601 with milliseconds
- Example: `"2024-01-15T10:30:45.123Z"`
- Timezone: UTC
- Precision: Millisecond accuracy

**MessageTemplate**:
- Format: String with placeholder syntax
- Example: `"Device {Key} power state changed to {State}"`
- Placeholders: Use curly brace syntax `{PropertyName}`
- Purpose: Allows structured logging and analysis

**RenderedMessage**:
- Format: Final human-readable message
- Example: `"Device Display-Room1 power state changed to On"`
- Content: Template with placeholders replaced by actual values
- Purpose: Direct display to users

**Level**:
- Values: One of the defined log levels (Fatal, Error, Warning, Information, Debug, Verbose)
- Case: Exact case as defined in hierarchy
- Purpose: Message classification and filtering

**Properties**:
- Format: JSON object with key-value pairs
- Content: Structured data related to the message
- Optional: May be null or empty for simple messages
- Usage: Advanced filtering, analysis, and debugging

### Common Property Fields

**Device-Related Properties**:
```json
{
  "Key": "Display-Room1",
  "DeviceType": "samsungMDC", 
  "DeviceName": "Conference Room Display"
}
```

**Command-Related Properties**:
```json
{
  "CommandType": "PowerOn",
  "Parameters": ["true"],
  "ResponseTime": 234
}
```

**Error-Related Properties**:
```json
{
  "ErrorCode": "ConnectionTimeout",
  "ErrorMessage": "Device did not respond within 5 seconds",
  "RetryCount": 3
}
```

**System-Related Properties**:
```json
{
  "SourceContext": "PepperDash.Essentials.Core.DeviceManager",
  "ThreadId": 12,
  "ProcessId": 1234
}
```

## Filtering Mechanisms

### Device Filtering

**Global Filter**:
- **Matches**: Messages with no Key property or Key = null
- **Content**: System-wide events, framework operations
- **Usage**: System health monitoring, startup/shutdown events

**Device-Specific Filters**:
- **Matches**: Messages where Properties.Key matches selected device key
- **Content**: All messages from that specific device
- **Usage**: Device-specific troubleshooting

**Multiple Device Filters**:
- **Logic**: OR operation (matches any selected device)
- **Behavior**: Shows messages from any of the selected devices
- **Usage**: Comparing behavior between related devices

### Log Level Filtering

**Single Level Selection**:
- Shows only messages at the selected severity level
- Example: Selecting only "Error" shows error messages only

**Multiple Level Selection**:
- **Logic**: OR operation (matches any selected level)
- **Common combinations**:
  - Error + Warning: Problem identification
  - Information + Warning + Error: Normal monitoring with issues
  - All levels: Complete system visibility

### Text Search Filtering

**Search Behavior**:
- **Case insensitive**: "ERROR" matches "error" and "Error"
- **Partial matching**: "conn" matches "connection", "connected", "disconnect"
- **Multiple terms**: Space-separated terms use AND logic
- **Target fields**: MessageTemplate and RenderedMessage

**Search Targets**:
- **MessageTemplate**: Raw template text with placeholders
- **RenderedMessage**: Final formatted message text
- **Not searched**: Properties object, Timestamp, Level

**Search Examples**:
| Search Term | Matches | Usage |
|-------------|---------|-------|
| `power` | Any message containing "power" | Power-related events |
| `timeout` | Any message containing "timeout" | Communication timeouts |
| `display power` | Messages containing both "display" AND "power" | Display power events |
| `button press` | Messages containing both "button" AND "press" | Button interactions |

### Filter Combination Logic

**Multiple Filters Applied**:
- **Logic**: AND operation (all conditions must match)
- **Example**: Device="Display-Room1" AND Level="Error" AND Search="power"
- **Result**: Only error-level power-related messages from Display-Room1

**Filter Priority**:
1. **Minimum log level**: Applied first (server-side)
2. **Device filter**: Applied to client-side message list
3. **Log level filter**: Applied to remaining messages
4. **Text search**: Applied last to remaining messages

## Message Volume Analysis

### Normal Message Rates by Level

**Production System** (per minute):
- **Fatal**: 0 (should never occur in normal operation)
- **Error**: 0-2 (occasional errors acceptable)
- **Warning**: 1-10 (depends on system configuration)
- **Information**: 10-100 (normal operational messages)
- **Debug**: 50-500 (if enabled, high volume)
- **Verbose**: 100-1000+ (if enabled, very high volume)

**Development/Testing System** (per minute):
- Higher rates acceptable across all levels
- Debug and Verbose levels commonly used
- Error rates may be higher during testing

### Volume Impact on Performance

**Browser Performance**:
- **<100 messages/minute**: No noticeable impact
- **100-500 messages/minute**: Slight impact on scrolling
- **500+ messages/minute**: May cause browser lag
- **1000+ messages/minute**: Significant performance impact

**Network Impact**:
- **Average message size**: 200-500 bytes
- **High volume impact**: Can consume significant bandwidth
- **Multiple sessions**: Multiplies network load on processor

**Processor Impact**:
- **Debug sessions**: Consume processor resources
- **Multiple sessions**: Significant impact on system performance
- **High log levels**: Verbose/Debug logging impacts all operations

## Advanced Filtering Patterns

### Common Filter Combinations

**Problem Identification**:
```
Log Levels: Error + Warning
Device: All or problematic area
Search: (none initially, add specific terms as needed)
```

**Device Troubleshooting**:
```
Log Levels: Information + Warning + Error
Device: Specific device only
Search: Terms related to suspected issue
```

**System Health Monitoring**:
```
Log Levels: Warning + Error + Fatal
Device: Global + critical devices
Search: "timeout", "failed", "error"
```

**User Interaction Tracing**:
```
Log Levels: Information + Warning + Error
Device: Control panels + target devices
Search: "button", "press", "command"
```

**Network Issue Investigation**:  
```
Log Levels: Warning + Error
Device: All network-connected devices
Search: "connection", "timeout", "network"
```

### Performance Optimization Filters

**High-Traffic Monitoring**:
```
Minimum Log Level: Warning (server-side)
Log Levels: Warning + Error (client-side)
Device: Filter to problem area
Search: Specific error terms
```

**Baseline Performance Monitoring**:
```
Minimum Log Level: Information (server-side)
Log Levels: Information + Warning + Error (client-side)  
Device: Global only
Search: (none)
```

## Message Pattern Recognition

### Healthy System Patterns

**Startup Sequence**:
```
Information: System initializing
Information: Loading configuration
Information: Device [DeviceKey] initializing
Information: Device [DeviceKey] connection established
Information: Device [DeviceKey] ready
Information: System startup complete
```

**Normal Operation**:
```
Information: Button [ButtonName] pressed
Information: Command sent to [DeviceKey]: [Command]  
Information: Device [DeviceKey] acknowledged command
Information: Device [DeviceKey] status updated
```

**Clean Shutdown**:
```
Information: System shutdown initiated
Information: Device [DeviceKey] disconnecting
Information: Device [DeviceKey] connection closed
Information: System shutdown complete
```

### Problem Patterns

**Connection Issues**:
```
Warning: Device [DeviceKey] connection timeout
Warning: Device [DeviceKey] attempting reconnection
Error: Device [DeviceKey] connection failed
Warning: Device [DeviceKey] attempting reconnection
```

**Command Failures**:
```
Information: Command sent to [DeviceKey]: [Command]
Warning: Device [DeviceKey] no response to command
Error: Device [DeviceKey] command failed
Warning: Device [DeviceKey] retrying command
```

**System Resource Issues**:
```
Warning: High memory usage detected
Warning: Thread pool exhaustion
Error: Out of memory exception
Fatal: System cannot continue
```

## Configuration Examples

### RTK Query Integration

**Log Level Filter Hook**:
```typescript
const { data: logLevels } = useGetMinimumLogLevelQuery();
const [setLogLevel] = useSetMinimumLogLevelMutation();
```

**Filter State Management**:
```typescript
const [searchParams, setSearchParams] = useSearchParams();
const deviceFilters = searchParams.getAll('device');
const logLevelFilters = searchParams.getAll('logLevel');
const searchTerms = searchParams.getAll('searchText');
```

**Message Filtering Logic**:
```typescript
const filteredMessages = useMemo(() => {
  return messages.filter(message => {
    // Device filter
    const deviceMatch = !deviceFilters.length || 
      deviceFilters.includes(message.Properties?.Key || 'global');
    
    // Log level filter  
    const levelMatch = !logLevelFilters.length ||
      logLevelFilters.includes(message.Level);
      
    // Text search
    const textMatch = !searchTerms.length ||
      searchTerms.every(term => 
        message.RenderedMessage.toLowerCase().includes(term.toLowerCase())
      );
      
    return deviceMatch && levelMatch && textMatch;
  });
}, [messages, deviceFilters, logLevelFilters, searchTerms]);
```

This reference provides complete technical details for understanding and working with log levels and filtering. For practical usage examples, see the [How-to Guides](../how-to/) and [Tutorials](../tutorials/).
