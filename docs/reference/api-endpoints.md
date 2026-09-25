# API Endpoints Reference

**Complete technical reference for all REST API endpoints used by the PepperDash Essentials Web Config App.**

All API endpoints are accessed through the base path `/cws/:appId/api` where `:appId` is the program slot identifier (e.g. `app01` through `app10`).

## Base Configuration

**Base URL**: `https://[processor-ip]/cws/:appId/api`
**Protocol**: HTTPS only
**Authentication**: Credential-based via `POST /loginCredentials` (see below)
**Content-Type**: `application/json` for POST requests
**Response Format**: JSON

## Authentication Endpoints

### Set Login Credentials

**Purpose**: Authenticate with the processor. The backend uses a single shared authentication mechanism for all program slots.

```http
POST /loginCredentials
```

**Request Body**:

```json
{
  "username": "admin",
  "password": "yourpassword"
}
```

**Response**: `200 OK` (empty body) on success

**Notes**:

- A successful response with any `appId` authenticates the session for all running slots
- The app probes all 10 slots in parallel after initial auth to discover which are running
- A `4xx` or network error indicates invalid credentials or that the slot is not running

---

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

### Get API Paths

**Purpose**: Retrieve all available REST API routes registered on the processor

```http
GET /apiPaths
```

**Response**:

```json
{
  "url": "https://192.168.1.100/cws/app01",
  "routes": [
    {
      "Name": "getDevices",
      "Url": "app01/api/devices",
      "DataTokens": { "Name": "getDevices" },
      "RouteHandler": null
    }
  ]
}
```

**Response Fields**:

- `url` (string): Base URL of the processor web server for this app slot
- `routes` (array): List of route objects
  - `Name` (string): Route name
  - `Url` (string): Route URL relative to the base
  - `DataTokens.Name` (string): Data token name when present

**Usage**: Displayed on the API Paths page; routes are sorted alphabetically and shown with clickable URLs

**Error Conditions**:

- `500`: Server error if route information cannot be retrieved

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

## Routing Endpoints

Requires PepperDashEssentials.dll 3.0 or later.

### Get Routing Devices and Tie Lines

**Purpose**: Retrieve the complete routing graph — devices, ports, tie lines, and current route state

```http
GET /routingDevicesAndTieLines
```

**Response**:

```json
{
  "devices": [
    {
      "key": "display-1",
      "name": "Main Display",
      "hasInputs": true,
      "hasOutputs": false,
      "hasInputsAndOutputs": false,
      "inputPorts": [
        {
          "key": "hdmiIn1",
          "signalType": "AudioVideo",
          "connectionType": "Hdmi",
          "isInternal": false
        }
      ]
    }
  ],
  "tieLines": [
    {
      "sourceDeviceKey": "laptop-1",
      "sourcePortKey": "out1",
      "destinationDeviceKey": "display-1",
      "destinationPortKey": "hdmiIn1",
      "signalType": "AudioVideo",
      "isInternal": false
    }
  ],
  "currentRoutes": [],
  "sinkCurrentSources": [],
  "multiviewLayouts": {}
}
```

**Device role flags**: `hasInputsAndOutputs` is the literal "is a midpoint" flag. Note that a multiview decoder reports `hasInputs` **and** `hasOutputs` while **not** being a midpoint, so "sink = has inputs and no outputs" is not a safe test — see [UI Components Reference](./ui-components.md#route-popover).

**Multiview tiles**: A multiview decoder's tile child devices are not returned as top-level devices. Each tile is synthesized as an input port on the parent, keyed `tile{N}:{portKey}`, and any tie line or route targeting a tile is remapped onto the parent.

---

### Start Routing Feedback Session

**Purpose**: Start the routing feedback WebSocket server and obtain its URL

```http
GET /routingFeedbackSession
```

**Response**:

```json
{
  "url": "wss://192.168.1.164:65401/routing/join/",
  "fallbackUrl": "wss://10.0.0.5:65401/routing/join/"
}
```

**Usage**: Connect to `url` to receive live route changes. Messages are a discriminated union on `type`: `snapshot`, `midpointRouteChanged`, `sinkInputChanged`, and `layoutChanged`. A `sinkInputChanged` with an empty `sourceDeviceKey` means the route feeding that input was cleared.

---

### Execute Routing Command

**Purpose**: Make or clear a route, addressed entirely by device and port keys

```http
POST /routingCommand
```

Ports are addressed by **key**, never by selector: a routing port's selector is a driver-defined object that cannot be expressed in JSON, so the processor resolves key → port → selector itself.

**Request Body** — one of four commands:

```json
{ "command": "sinkRoute", "deviceKey": "display-1", "inputPortKey": "hdmiIn1",
  "sourceDeviceKey": "laptop-1", "signalType": "AudioVideo" }

{ "command": "midpointSwitch", "deviceKey": "dm-chassis-1",
  "inputPortKey": "inputCard3", "outputPortKey": "outputCard5", "signalType": "Video" }

{ "command": "clearSink", "deviceKey": "display-1", "inputPortKey": "hdmiIn1",
  "clearSinkInput": true }

{ "command": "clearMidpointOutput", "deviceKey": "dm-chassis-1",
  "outputPortKey": "outputCard5", "signalType": "AudioVideo" }
```

**Request Fields**:

- `command` (string): `sinkRoute`, `midpointSwitch`, `clearSink` or `clearMidpointOutput`. Case-insensitive
- `deviceKey` (string): Target device. For sink commands this is the destination — or the multiview parent when addressing a tile
- `inputPortKey` (string, optional): May be multiview-qualified (`tile2:tileInput`); the processor de-qualifies it to the child tile sink. Optional for `clearSink`, where omitting it clears whatever route the sink has
- `outputPortKey` (string): Required for the midpoint commands
- `sourceDeviceKey` (string): Required for `sinkRoute`
- `sourcePortKey` (string, optional): Omit to let the processor's path discovery choose
- `signalType` (string): `Audio`, `Video`, `AudioVideo` or `Usb`. Defaults to `AudioVideo`. Numeric values are rejected
- `releaseOnly` (bool): `clearSink` only — stop usage tracking but leave the signal flowing
- `clearSinkInput` (bool): `clearSink` only — also deselect the destination's own input. Off by default, because clearing a route otherwise never touches the destination
- `dryRun` (bool): Validate and compute the path, execute nothing

**Response**:

```json
{
  "status": "accepted",
  "command": "sinkRoute",
  "deviceKey": "nvx-decoder-1",
  "resolvedDeviceKey": "nvx-decoder-1-tile2",
  "resolvedInputPortKey": "tileInput",
  "signalType": "AudioVideo",
  "effectiveSignalType": "AudioVideo",
  "partial": false,
  "steps": [
    {
      "signalType": "Video",
      "switchingDeviceKey": "dm-chassis-1",
      "inputPortKey": "inputCard3",
      "outputPortKey": "outputCard5"
    }
  ]
}
```

**Response Fields**:

- `status`: `executed` (done before the response was written), `accepted` (validated and queued), `validated` (dry run), or `error`
- `resolvedDeviceKey` / `resolvedInputPortKey`: The real device and port the command ran against. These differ from the requested values only when a `tile{N}:` port was de-qualified
- `effectiveSignalType`: What was actually handed to the devices. May be **wider** than `signalType` — a pre-mapped route descriptor takes its type from the port's declared type, so an Audio-only request across all-`AudioVideo` ports executes as `AudioVideo` rather than breaking away
- `steps`: The switch steps that will run, in order. `sinkRoute` only; an `AudioVideo` route is discovered as two independent paths, so each step names its own signal type
- `partial`: An `AudioVideo` request that found a path for only one half. The half that was found is still routed

**Status Codes**:

| Status | Meaning                                                                                                                                           |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `200`  | `midpointSwitch` / `clearMidpointOutput` executed inline, or a dry run validated                                                                  |
| `202`  | `sinkRoute` / `clearSink` validated and queued. Confirmation arrives over the feedback WebSocket, not here                                        |
| `400`  | Malformed request: `invalidJson`, `missingField`, `unknownCommand`, `invalidSignalType`                                                           |
| `404`  | `deviceNotFound` — the key is wrong                                                                                                               |
| `409`  | `noRouteFound` — the keys are valid but no wiring path exists                                                                                     |
| `422`  | `deviceNotRoutable`, `tileNotFound`, `portNotFound`, `signalTypeNotSupportedByPort` — the keys exist but the request is impossible on that device |
| `500`  | `executionError` — the device threw while switching                                                                                               |

**Error Response Body**:

```json
{
  "status": "error",
  "error": {
    "code": "noRouteFound",
    "message": "No Video path exists from 'laptop-1' to 'display-1' input 'hdmiIn1'.",
    "field": "signalType"
  }
}
```

**Why sink commands return 202**: making a route enqueues onto the processor's single-worker routing queue, and completion is conditional — a destination that is warming or cooling parks its request until the cooldown finishes. The 202 is still meaningful because all validation, including full path discovery, happens synchronously first: a request that provably cannot work returns `409` before anything is queued.

**Capability detection**: this endpoint does not exist on older processors. Probe [Get API Paths](#get-api-paths) for a `routingCommand` route rather than gating on a version number.

---

## Secrets Endpoints

Credential storage. **No endpoint here ever returns a stored secret value** — the processor is
write-only for values by design.

Mutations are POST rather than DELETE: the Crestron web server advertises only `POST, GET, OPTIONS`,
so a DELETE would fail CORS preflight.

### Get Secret Providers

```http
GET /secrets/providers
```

```json
{
  "providers": [
    {
      "key": "default",
      "description": "Default secret provider serving Essentials Application 1",
      "scope": "local",
      "enumerationSupported": true,
      "maxKeyLength": 32,
      "maxValueLength": 1600
    },
    {
      "key": "CrestronGlobalSecrets",
      "description": "Default secret provider serving all local applications",
      "scope": "global",
      "enumerationSupported": true,
      "maxKeyLength": 32,
      "maxValueLength": 1600
    }
  ]
}
```

`scope` is `local` (this program slot) or `global` (shared across slots). The limits are Crestron
Data Store caps, not application choices.

---

### List Secrets

```http
GET /secrets?provider=default
```

Optional: `includeReserved=true` to show the API's own bookkeeping records, `includeSizes=true` to
include each value's character count.

```json
{
  "provider": "default",
  "scope": "local",
  "indexStatus": "ok",
  "enumerationComplete": true,
  "counts": { "total": 3, "managed": 1, "unmanaged": 2, "stale": 0 },
  "secrets": [
    {
      "key": "displayPassword",
      "managed": true,
      "description": "Display admin",
      "createdUtc": "2026-09-10T14:00:00Z",
      "updatedUtc": "2026-09-16T18:22:05Z",
      "lastModifiedUtc": "2026-09-16T18:22:05Z",
      "owner": "app01",
      "type": "String"
    }
  ],
  "staleIndexEntries": [],
  "warnings": []
}
```

**Response Fields**:

- `managed` — whether the key was written through this API. Unmanaged records exist in the same flat
  Data Store but were created elsewhere; Mobile Control's paired-client tokens are one
- `indexStatus` — `ok`, `missing`, or `corrupt:<reason>`. Anything but `ok` means classification is
  unavailable and every key reports as unmanaged. **The secrets themselves are unaffected**
- `enumerationComplete` — `false` means the Data Store walk was cut short and the list is partial.
  Index pruning is refused in that state
- `staleIndexEntries` — keys the index lists that no longer exist in the store

Status: `200` · `400 missingField` · `404 providerNotFound` · `500`

---

### Execute Secrets Command

```http
POST /secrets/command
```

```json
{
  "action": "set",
  "provider": "default",
  "key": "displayPassword",
  "value": "…",
  "description": "Display admin",
  "overwrite": false
}
```

| Action         | Semantics                                                                                                        |
| -------------- | ---------------------------------------------------------------------------------------------------------------- |
| `set`          | Creates. Existing key + `overwrite:false` → `409 alreadyExists`                                                  |
| `update`       | Must already exist, else `404 notFound`                                                                          |
| `delete`       | Removes the secret and its index entry                                                                           |
| `test`         | Existence probe → `{"exists": true}`. Never a value                                                              |
| `pruneIndex`   | Drops index entries with no matching record. `409` if the walk was incomplete                                    |
| `rebuildIndex` | Repairs a damaged index. `adoptKeys` marks existing keys as managed **without reading or changing their values** |

```json
{
  "status": "ok",
  "action": "set",
  "provider": "default",
  "key": "displayPassword",
  "existedBefore": false,
  "indexUpdated": true
}
```

`indexUpdated: false` with a `warning` means the secret was written but its metadata was not. That is
reported as **success**, because the secret is authoritative and the index is advisory — returning an
error would invite retrying a write that already happened.

**Validation** (all before any store access):

| Rule                                                     | Code                        | Status |
| -------------------------------------------------------- | --------------------------- | ------ |
| Key empty or whitespace                                  | `emptyKey`                  | 400    |
| Key over 32 characters, or containing control characters | `keyTooLong` / `invalidKey` | 400    |
| Key starts with `__essSecretsIdx`                        | `reservedKey`               | 400    |
| Value empty (empty means _delete_ in the store)          | `emptyValue`                | 400    |
| Value over 1600 characters                               | `valueTooLong`              | 400    |

The empty-key rule is not cosmetic: an empty key reaches a Data Store call that deletes **every
record belonging to the application**.

Status: `200` · `400` · `403 accessDenied` · `404 notFound` · `409 alreadyExists` /
`enumerationIncomplete` · `507 storeFull` · `503 storeUnavailable` · `500`

---

### Apply Secrets In Bulk

```http
POST /secrets/bulk
```

```json
{
  "mode": "preview",
  "provider": "default",
  "overwrite": false,
  "secrets": { "displayPassword": "…", "codecPassword": "…" }
}
```

`secrets` accepts either the flat map above — which is what the template endpoint emits — or an
array of `{key, value, provider?, description?}`.

```json
{
  "mode": "preview",
  "provider": "default",
  "overwrite": false,
  "summary": {
    "total": 3,
    "create": 1,
    "overwrite": 1,
    "skip": 1,
    "invalid": 0,
    "failed": 0
  },
  "entries": [
    {
      "index": 0,
      "key": "displayPassword",
      "provider": "default",
      "action": "create",
      "applied": false
    }
  ],
  "indexUpdated": false
}
```

Rules worth knowing:

- **Preview writes nothing.** `applied` is always `false`, and the response is `200` even when
  entries are invalid — a successful preview of a bad file is not a failed request
- **A commit with any invalid entry returns `422` and writes nothing**
- `overwrite` defaults to `false`
- An entry targeting an existing **unmanaged** key is skipped as `unmanagedTarget` unless
  `allowUnmanagedOverwrite` is set. This is what stops a round-tripped template destroying another
  subsystem's records
- **Bulk never deletes.** A key absent from the file is left alone
- Duplicate keys within one batch are `invalid`, not last-write-wins
- Over 200 entries → `400 batchTooLarge`

---

### Get Secrets Template

```http
GET /secrets/template?provider=default
```

```json
{
  "provider": "default",
  "generatedUtc": "2026-09-16T18:30:00Z",
  "note": "Values are intentionally blank. Fill them in, then apply this file.",
  "secrets": { "displayPassword": "", "codecPassword": "" },
  "metadata": [
    {
      "key": "displayPassword",
      "provider": "default",
      "description": "Display admin",
      "managed": true
    }
  ]
}
```

`secrets` is byte-for-byte what the bulk endpoint accepts, so the file round-trips: download, fill
in, apply elsewhere. `includeUnmanaged` defaults to `false`, so other subsystems' records are not
offered as blanks to fill in.

**Capability detection**: these endpoints do not exist on older processors. Probe
[Get API Paths](#get-api-paths) for a `secrets` route rather than gating on a version number.

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
  .then((response) => response.json())
  .then((config) => {
    console.log('System configuration:', config);
  });
```

### Starting Debug Session

```javascript
// Get WebSocket URL
fetch('https://192.168.1.100/cws/app01/api/debugSession')
  .then((response) => response.json())
  .then((data) => {
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
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    minimumLevel: 'Warning',
  }),
});
```

This reference provides complete technical details for all API interactions. For practical usage examples, see the [How-to Guides](../how-to/) and [Tutorials](../tutorials/).
