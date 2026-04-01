# API Endpoints Reference

**Complete technical reference for all REST API endpoints used by the PepperDash Essentials Web Config App.**

All API endpoints are accessed through the base path `/cws/app01/api` on the processor's HTTPS port (443).

## Base Configuration

**Base URL**: `https://[processor-ip]/cws/app01/api`
**Protocol**: HTTPS only
**Authentication**: None (uses processor's built-in web authentication)
**Content-Type**: `application/json` for POST requests
**Response Format**: JSON

## System Information Endpoints

### Get Versions
**Purpose**: Retrieve all loaded assemblies and their versions

```http
GET /versions
```

**Response**:
```json
[
  {
    "Name": "PepperDash-Essentials",
    "Version": "1.8.0.0"
  },
  {
    "Name": "System.Core",
    "Version": "4.2.1.0"
  }
]
```

**Response Fields**:
- `Name` (string): Full assembly name
- `Version` (string): Version number in dotted format

**Usage**: Displayed on Versions page for system documentation and troubleshooting

**Error Conditions**:
- `500`: Server error if version information cannot be retrieved

---

### Get Device Types
**Purpose**: Retrieve all available device types supported by current plugins

```http
GET /types
```

**Response**:
```json
[
  {
    "Type": "samsungMDC",
    "Description": "Samsung displays using MDC protocol",
    "CType": "PepperDash.Essentials.Devices.Displays.SamsungMDCDisplay"
  },
  {
    "Type": "basicTriList",
    "Description": "Basic TriList device for control systems",
    "CType": "PepperDash.Essentials.Core.Devices.BasicTriList"
  }
]
```

**Response Fields**:
- `Type` (string): Configuration identifier used in device configuration
- `Description` (string): Human-readable description of device purpose
- `CType` (string): Full .NET class name that implements the device

**Usage**: Displayed on Types page for configuration reference and development

**Error Conditions**:
- `500`: Server error if type information cannot be retrieved

---

## Device Management Endpoints

### Get Devices
**Purpose**: Retrieve all configured devices in the system

```http
GET /devices
```

**Response**:
```json
[
  {
    "Key": "Display-Room1",
    "Name": "Conference Room Display"
  },
  {
    "Key": "Codec-Main", 
    "Name": "Main Video Codec"
  }
]
```

**Response Fields**:
- `Key` (string): Unique device identifier used in configuration and debug messages
- `Name` (string): Human-readable device name for user interfaces

**Usage**: Device list display and debug message filtering

**Error Conditions**:
- `500`: Server error if device information cannot be retrieved

---

### Get Device Properties
**Purpose**: Retrieve current properties and values for a specific device

```http
GET /deviceProperties/{deviceKey}
```

**Path Parameters**:
- `deviceKey` (string): The unique Key of the device

**Response**:
```json
[
  {
    "Name": "PowerIsOn",
    "Type": "Boolean",
    "Value": "true",
    "CanRead": true,
    "CanWrite": true
  },
  {
    "Name": "CurrentInput",
    "Type": "String", 
    "Value": "HDMI1",
    "CanRead": true,
    "CanWrite": false
  }
]
```

**Response Fields**:
- `Name` (string): Property name
- `Type` (string): Data type of the property value
- `Value` (string): Current property value (always string representation)
- `CanRead` (boolean): Whether property value can be read
- `CanWrite` (boolean): Whether property value can be modified

**Usage**: Device detail inspection and monitoring

**Error Conditions**:
- `404`: Device with specified key not found
- `500`: Server error retrieving device properties

---

### Get Device Methods
**Purpose**: Retrieve available methods (commands) for a specific device  

```http
GET /deviceMethods/{deviceKey}
```

**Path Parameters**:
- `deviceKey` (string): The unique Key of the device

**Response**:
```json
[
  {
    "Name": "PowerOn",
    "Params": []
  },
  {
    "Name": "SetInput",
    "Params": [
      {
        "Name": "input",
        "Type": "String"
      }
    ]
  }
]
```

**Response Fields**:
- `Name` (string): Method name
- `Params` (array): Array of parameter definitions
  - `Name` (string): Parameter name
  - `Type` (string): Parameter data type

**Usage**: Device control interface and method execution

**Error Conditions**:
- `404`: Device with specified key not found
- `500`: Server error retrieving device methods

---

## Configuration Endpoints

### Get Configuration
**Purpose**: Retrieve the complete merged system configuration

```http
GET /config
```

**Response**: Complete JSON configuration object (structure varies by system)

**Example Response Structure**:
```json
{
  "devices": {
    "Display-Room1": {
      "key": "Display-Room1",
      "name": "Conference Room Display",
      "type": "samsungMDC",
      "properties": {
        "control": {
          "tcpSshProperties": {
            "address": "192.168.1.100",
            "port": 1515
          }
        }
      }
    }
  },
  "rooms": {
    "ConferenceRoom": {
      "name": "Conference Room",
      "devices": ["Display-Room1"]
    }
  }
}
```

**Usage**: Configuration analysis, backup, and documentation

**Response Size**: Can be very large (10KB - 1MB+) depending on system complexity

**Error Conditions**:
- `500`: Server error if configuration cannot be retrieved or merged

---

## Debug and Monitoring Endpoints

### Start Debug Session
**Purpose**: Initiate a WebSocket debug session for real-time message monitoring

```http
GET /debugSession
```

**Response**:
```json
{
  "url": "wss://192.168.1.100/cws/app01/api/debug-websocket"
}
```

**Response Fields**:
- `url` (string): WebSocket URL for establishing debug connection

**Usage**: Real-time debug message monitoring in Debug Console

**WebSocket Protocol**:
- **Connection**: Use returned URL to establish WebSocket connection
- **Messages**: Server sends JSON-formatted log messages
- **Client**: Client receives messages, no need to send data to server

**WebSocket Message Format**:
```json
{
  "Timestamp": "2024-01-15T10:30:45.123Z",
  "MessageTemplate": "Device {Key} power state changed to {State}",
  "RenderedMessage": "Device Display-Room1 power state changed to On",
  "Level": "Information",
  "Properties": {
    "Key": "Display-Room1",
    "State": "On"
  }
}
```

**Error Conditions**:
- `500`: Server error if debug session cannot be started
- WebSocket connection errors handled by client WebSocket implementation

---

### Stop Debug Session
**Purpose**: Stop an active debug session and close WebSocket connections

```http
POST /debugSession
```

**Request Body**: None required

**Response**: Empty (204 No Content on success)

**Usage**: Clean termination of debug sessions

**Error Conditions**:
- `500`: Server error stopping debug session

---

## System Control Endpoints

### Get Minimum Log Level
**Purpose**: Retrieve the current minimum log level for debug output

```http
GET /appdebug
```

**Response**:
```json
{
  "minimumLevel": "Information"
}
```

**Response Fields**:
- `minimumLevel` (string): Current minimum log level setting

**Valid Log Levels** (in order of severity):
- `Verbose`: Most detailed logging
- `Debug`: Detailed technical information
- `Information`: General informational messages
- `Warning`: Warning conditions
- `Error`: Error conditions
- `Fatal`: Fatal error conditions

**Usage**: Display current log level setting and provide options for changes

**Error Conditions**:
- `500`: Server error retrieving log level setting

---

### Set Minimum Log Level
**Purpose**: Change the minimum log level for debug output

```http
POST /appdebug
```

**Request Body**:
```json
{
  "minimumLevel": "Warning"
}
```

**Request Fields**:
- `minimumLevel` (string): New minimum log level (must be valid level)

**Response**: Empty (204 No Content on success)

**Usage**: Adjust debug verbosity from Debug Console interface

**Error Conditions**:
- `400`: Invalid log level specified
- `500`: Server error setting log level

---

### Get Configuration Loading Setting
**Purpose**: Check if configuration loading on boot is disabled

```http
GET /doNotLoadConfigOnNextBoot
```

**Response**:
```json
{
  "doNotLoadConfigOnNextBoot": false
}
```

**Response Fields**:
- `doNotLoadConfigOnNextBoot` (boolean): Whether config loading is disabled

**Usage**: Display current setting and allow user control

**Error Conditions**:
- `500`: Server error retrieving setting

---

### Set Configuration Loading Setting
**Purpose**: Enable or disable configuration loading on next boot

```http
POST /doNotLoadConfigOnNextBoot
```

**Request Body**:
```json
{
  "doNotLoadConfigOnNextBoot": true
}
```

**Request Fields**:
- `doNotLoadConfigOnNextBoot` (boolean): New setting value

**Response**: Empty (204 No Content on success)

**Usage**: Control configuration loading behavior for troubleshooting

**Error Conditions**:
- `400`: Invalid boolean value specified
- `500`: Server error setting configuration

---

### Restart Program
**Purpose**: Restart the entire PepperDash Essentials framework

```http
POST /restartProgram
```

**Request Body**: None required

**Response**: Empty (may not receive response due to restart)

**Usage**: Complete system restart from web interface

**Behavior**:
- System begins restart immediately
- All connections will be closed
- Response may not be received due to restart timing
- System will be unavailable for 2-5 minutes during restart

**Error Conditions**:
- `500`: Server error initiating restart (system may still restart)

---

### Load Configuration
**Purpose**: Manually reload system configuration without full restart

```http
POST /loadConfig
```

**Request Body**: None required

**Response**: Empty (204 No Content on success)

**Usage**: Apply configuration changes without full system restart

**Prerequisites**: Usually used when "doNotLoadConfigOnNextBoot" is true

**Error Conditions**:
- `400`: Configuration cannot be loaded (syntax errors, etc.)
- `500`: Server error during configuration loading

---

## Error Response Format

All endpoints return errors in consistent format:

**HTTP Status Codes**:
- `400`: Bad Request - Invalid parameters or request format
- `404`: Not Found - Requested resource does not exist
- `500`: Internal Server Error - Server-side processing error

**Error Response Body**:
```json
{
  "error": "Description of the error condition",
  "details": "Additional technical details (optional)"
}
```

## Rate Limiting and Performance

**Rate Limits**: No explicit rate limiting implemented

**Performance Considerations**:
- `/config` endpoint may take several seconds for large configurations
- `/debugSession` WebSocket can generate high message volumes
- Multiple simultaneous debug sessions impact processor performance

**Best Practices**:
- Cache version and type information (changes infrequently)
- Close debug sessions when not actively monitoring
- Use appropriate minimum log levels to reduce debug message volume

## Security Considerations

**Authentication**: Uses processor's built-in web authentication (if configured)

**Authorization**: No granular permissions - full access if authenticated

**HTTPS**: All communication must use HTTPS (HTTP not supported)

**CORS**: Configured to allow requests from the web application origin

**Sensitive Data**:
- Configuration may contain IP addresses, usernames, and network topology
- Debug messages may contain sensitive operational information
- No automatic filtering of sensitive information in responses

## WebSocket Debug Protocol

### Connection Establishment
1. Call `GET /debugSession` to get WebSocket URL
2. Establish WebSocket connection using returned URL
3. Connection remains open until explicitly closed or system restart

### Message Flow
- **Server to Client**: Continuous stream of debug messages in JSON format
- **Client to Server**: No messages required (read-only protocol)

### Connection Management
- **Keep-alive**: WebSocket handles connection keep-alive automatically
- **Reconnection**: Client must handle reconnection logic if connection drops
- **Cleanup**: Call `POST /debugSession` to cleanly stop session

### Message Volume Management
- **High Volume**: Systems may generate >100 messages per second
- **Filtering**: Use minimum log level to reduce message volume
- **Browser Limits**: Very high message rates may impact browser performance

## Integration Examples

### Basic Configuration Retrieval
```javascript
fetch('https://192.168.1.100/cws/app01/api/config')
  .then(response => response.json())
  .then(config => {
    console.log('System configuration:', config);
  });
```

### Starting Debug Session
```javascript
// Get WebSocket URL
fetch('https://192.168.1.100/cws/app01/api/debugSession')
  .then(response => response.json())
  .then(data => {
    // Connect to WebSocket
    const ws = new WebSocket(data.url);
    
    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      console.log('Debug message:', message);
    };
    
    ws.onclose = () => {
      console.log('Debug session closed');
    };
  });
```

### Setting Log Level
```javascript
fetch('https://192.168.1.100/cws/app01/api/appdebug', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    minimumLevel: 'Warning'
  })
});
```

This reference provides complete technical details for all API interactions. For practical usage examples, see the [How-to Guides](../how-to/) and [Tutorials](../tutorials/).
