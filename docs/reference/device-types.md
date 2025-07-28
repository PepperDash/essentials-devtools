# Device Types Reference

This document provides comprehensive reference information about all supported device types in PepperDash Essentials and their specific properties and capabilities.

## Device Type Categories

### Display Devices

#### Generic Display (`genericDisplay`)
**Purpose**: Universal display control for most display devices using standard protocols.

**Key Properties**:
- `supportsDiscretePower`: boolean - Whether device supports separate on/off commands
- `supportsVolumeControl`: boolean - Whether display has volume control
- `warmupTimeMs`: number - Time in milliseconds for display warmup
- `cooldownTimeMs`: number - Time in milliseconds for display cooldown

**Control Methods**: TCP/IP, RS-232, IR

**Example Configuration**:
```json
{
  "type": "genericDisplay",
  "properties": {
    "supportsDiscretePower": true,
    "supportsVolumeControl": false,
    "warmupTimeMs": 15000,
    "cooldownTimeMs": 10000
  }
}
```

#### Sony Professional Display (`sonyDisplay`)
**Purpose**: Enhanced control for Sony professional displays with advanced features.

**Key Properties**:
- `id`: string - Display ID for multi-display setups (01-99)
- `supportsAdvancedPicture`: boolean - Advanced picture control support
- `inputCount`: number - Number of available inputs

**Control Methods**: TCP/IP (port 20060), RS-232

**Example Configuration**:
```json
{
  "type": "sonyDisplay", 
  "properties": {
    "id": "01",
    "supportsAdvancedPicture": true,
    "inputCount": 4
  }
}
```

#### Samsung Commercial Display (`samsungDisplay`)
**Purpose**: Control for Samsung commercial display series with MDC protocol.

**Key Properties**:
- `displayId`: number - Display ID for daisy-chained displays (0-254)
- `supportsNetworkStandby`: boolean - Network wake-on-LAN support
- `maxVolumeLevel`: number - Maximum volume level (default: 100)

**Control Methods**: TCP/IP (port 1515), RS-232

### Audio DSP Devices

#### Generic Audio DSP (`genericAudioDsp`)
**Purpose**: Universal audio processor control with configurable level and routing blocks.

**Key Properties**:
- `levelControlBlocks`: object - Named level control configurations
- `presetCount`: number - Number of available presets
- `supportsAdvancedRouting`: boolean - Matrix routing capabilities

**Level Control Block Properties**:
- `enabled`: boolean - Whether this control is active
- `hasLevel`: boolean - Volume level control available
- `hasMute`: boolean - Mute control available
- `levelMax`: number - Maximum level value
- `levelMin`: number - Minimum level value
- `unmuteOnVolumeUp`: boolean - Auto-unmute on volume increase

**Control Methods**: TCP/IP, RS-232

**Example Configuration**:
```json
{
  "type": "genericAudioDsp",
  "properties": {
    "levelControlBlocks": {
      "programVolume": {
        "enabled": true,
        "hasLevel": true,
        "hasMute": true,
        "levelMax": 65535,
        "levelMin": 0,
        "unmuteOnVolumeUp": true
      },
      "micVolume": {
        "enabled": true,
        "hasLevel": true,
        "hasMute": true,
        "levelMax": 65535,
        "levelMin": 0
      }
    }
  }
}
```

#### Biamp Tesira DSP (`biampTesiraDsp`)
**Purpose**: Advanced control for Biamp Tesira series audio processors.

**Key Properties**:
- `instanceTag`: string - Tesira instance identifier
- `controlBlocks`: object - Named control block configurations
- `supportsSubscriptions`: boolean - Real-time property subscriptions

**Control Methods**: TCP/IP (port 23)

#### QSC Q-SYS Core (`qscQSysCore`)
**Purpose**: Control for QSC Q-SYS platform processors and components.

**Key Properties**:
- `coreId`: string - Q-SYS Core identifier
- `namedControls`: object - Named control configurations
- `supportsExternalControl`: boolean - External control script support

**Control Methods**: TCP/IP (port 1710)

### Video Switching Devices

#### Extron Video Switcher (`extronVideoSwitcher`)
**Purpose**: Control for Extron matrix switchers and presentation systems.

**Key Properties**:
- `inputCount`: number - Number of inputs available
- `outputCount`: number - Number of outputs available
- `supportsAudioSwitching`: boolean - Audio switching capabilities
- `model`: string - Specific Extron model identifier

**Control Methods**: TCP/IP (port 23), RS-232

**Example Configuration**:
```json
{
  "type": "extronVideoSwitcher",
  "properties": {
    "inputCount": 8,
    "outputCount": 4,
    "supportsAudioSwitching": true,
    "model": "DXP44HD"
  }
}
```

#### Crestron DmMd Series (`crestronDmMd`)
**Purpose**: Control for Crestron DigitalMedia switcher series.

**Key Properties**:
- `dmChassisId`: number - DM chassis ID for larger systems
- `inputSlots`: array - Available input slot configurations
- `outputSlots`: array - Available output slot configurations

**Control Methods**: CIP (Crestron over IP), CresNet

### Codec and Communication Devices

#### Cisco Video Codec (`ciscoCodec`)
**Purpose**: Control for Cisco video conferencing systems (SX, MX, Room series).

**Key Properties**:
- `sipPhoneLineKeys`: array - Available SIP line identifiers
- `supportsContacts`: boolean - Contact directory integration
- `maxCallCount`: number - Maximum simultaneous calls
- `supportsPresentation`: boolean - Content sharing support

**Control Methods**: SSH (port 22), HTTP API

**Example Configuration**:
```json
{
  "type": "ciscoCodec",
  "properties": {
    "sipPhoneLineKeys": ["line1", "line2"],
    "supportsContacts": true,
    "maxCallCount": 3,
    "supportsPresentation": true
  }
}
```

#### Polycom Group Series (`polycomGroupSeries`)
**Purpose**: Control for Polycom Group series video systems.

**Key Properties**:
- `apiVersion`: string - Polycom API version (v1, v2)
- `supportsDirectoryServices`: boolean - Directory integration
- `audioInputCount`: number - Number of audio inputs

**Control Methods**: HTTP API (port 80/443)

#### Generic VoIP Phone (`genericVoipPhone`)
**Purpose**: Basic control for SIP-based VoIP phones.

**Key Properties**:
- `lineCount`: number - Number of phone lines
- `supportsCallControl`: boolean - Call control capabilities
- `registrarAddress`: string - SIP registrar server

**Control Methods**: SIP, HTTP API

### Lighting Control Devices

#### Lutron Quantum (`lutronQuantum`)
**Purpose**: Integration with Lutron Quantum lighting systems.

**Key Properties**:
- `integrationId`: number - Quantum integration ID (1-100)
- `zoneCount`: number - Number of lighting zones
- `supportsShades`: boolean - Motorized shade control

**Control Methods**: TCP/IP (port 23)

#### Generic Lighting Controller (`genericLighting`)
**Purpose**: Universal lighting control for various protocols.

**Key Properties**:
- `channelCount`: number - Number of lighting channels
- `supportsScenes`: boolean - Lighting scene recall
- `dimmingCurve`: string - Dimming curve type (linear, logarithmic)

**Control Methods**: TCP/IP, RS-232, DMX512

### Environmental Control Devices

#### Generic Climate Control (`genericClimate`)
**Purpose**: HVAC and environmental control integration.

**Key Properties**:
- `supportsHeating`: boolean - Heating control available
- `supportsCooling`: boolean - Cooling control available
- `tempRange`: object - Temperature control range
- `supportsHumidity`: boolean - Humidity control available

**Control Methods**: TCP/IP, RS-232, BACnet

#### Generic Relay Controller (`genericRelay`)
**Purpose**: Control for relay-based switching systems.

**Key Properties**:
- `relayCount`: number - Number of available relays
- `relayType`: string - Relay type (NO, NC, SPDT)
- `pulseDurationMs`: number - Default pulse duration

**Control Methods**: TCP/IP, RS-232

### Control System Devices

#### Crestron 3-Series Processor (`crestron3Series`)
**Purpose**: Integration with Crestron 3-Series control processors.

**Key Properties**:
- `eiscp`: object - EISCP server configuration
- `cip`: object - CIP communication settings
- `roomId`: number - Room ID for multi-room systems

**Control Methods**: CresNet, Ethernet (CIP)

**Example Configuration**:
```json
{
  "type": "crestron3Series",
  "properties": {
    "eiscp": {
      "port": 4001
    },
    "roomId": 1
  }
}
```

#### Generic IR Controller (`genericIr`)
**Purpose**: Infrared control device integration.

**Key Properties**:
- `irPorts`: array - Available IR port configurations
- `supportsLearning`: boolean - IR learning capability
- `carrierFrequency`: number - IR carrier frequency (Hz)

**Control Methods**: TCP/IP, RS-232

### Camera and PTZ Devices

#### Generic PTZ Camera (`genericPtzCamera`)
**Purpose**: Pan-tilt-zoom camera control.

**Key Properties**:
- `presetCount`: number - Number of camera presets
- `supportsAutoFocus`: boolean - Auto-focus capability
- `zoomRange`: object - Optical zoom range
- `panTiltSpeed`: number - Default pan/tilt speed

**Control Methods**: TCP/IP, RS-232, VISCA

**Example Configuration**:
```json
{
  "type": "genericPtzCamera",
  "properties": {
    "presetCount": 16,
    "supportsAutoFocus": true,
    "zoomRange": {
      "min": 1,
      "max": 12
    },
    "panTiltSpeed": 5
  }
}
```

## Common Device Properties

### Communication Properties

All network-connected devices support these communication properties:

#### TCP/IP Properties (`tcpSshProperties`)
```json
{
  "address": "192.168.1.100",
  "port": 23,
  "username": "admin",
  "password": "password",
  "connectTimeoutMs": 5000,
  "heartbeatIntervalMs": 30000
}
```

#### Serial Properties (`comParams`)
```json
{
  "baudRate": 9600,
  "dataBits": 8,
  "stopBits": 1,
  "parity": "None",
  "hardwareHandshake": "None",
  "softwareHandshake": false
}
```

### Monitoring Properties

#### Communication Monitor (`communicationMonitorProperties`)
```json
{
  "pollString": "?",
  "pollTimeMs": 30000,
  "warningTimeoutMs": 180000,
  "errorTimeoutMs": 300000,
  "supportsPoll": true
}
```

### Device Status Properties

All devices provide these status indicators:
- **CommunicationMonitor**: Connection health (OK, Warning, Error)
- **PowerIsOn**: Device power state (when applicable)
- **IsOnline**: Network connectivity status
- **DeviceStatus**: Overall device health

## Device Factory Registration

### Device Type Registration

Each device type must be registered with a factory class:

```csharp
DeviceFactory.RegisterDeviceFactory("genericDisplay", 
    typeof(GenericDisplayFactory));
```

### Properties Schema Validation

Device factories define property schemas for validation:
- Required properties are enforced during configuration load
- Property types are validated against expected types
- Unknown properties generate warnings but don't prevent loading

### Device Capabilities

Devices expose capabilities through interfaces:
- `IBasicVolumeControls`: Volume and mute control
- `IPower`: Power control with discrete on/off
- `IRoutingInputsOutputs`: Signal routing capabilities
- `ICommunicationMonitor`: Connection health monitoring

## Extending Device Types

### Creating Custom Device Types

1. **Implement Base Classes**:
   - Inherit from `Device` or specialized base classes
   - Implement required interfaces for device capabilities

2. **Create Device Factory**:
   - Implement `IDeviceFactory` interface
   - Define property schema and validation rules

3. **Register Factory**:
   - Register factory class with unique type identifier
   - Ensure type name doesn't conflict with existing types

### Property Validation

Custom device types can implement property validation:
- Override `ValidateProperties()` method
- Return validation messages for invalid configurations
- Support both warnings and errors

### Device Communication

Implement communication patterns:
- Override communication methods for device-specific protocols
- Implement heartbeat and monitoring patterns
- Handle connection state changes appropriately

## Troubleshooting Device Types

### Common Issues

**Device Type Not Found**:
- Verify device type name matches factory registration exactly
- Check that required assemblies are loaded
- Review plugin loading and factory registration logs

**Property Validation Errors**:
- Compare device properties against schema requirements
- Check property data types and value ranges
- Verify required properties are present

**Communication Failures**:
- Verify network connectivity and device addresses
- Check protocol-specific settings (ports, credentials)
- Review device-specific communication requirements

### Debugging Device Behavior

Use the debug console to troubleshoot device issues:
1. Monitor device initialization messages
2. Check communication monitor status changes
3. Review property change notifications
4. Observe command and response patterns

---

*This reference provides complete information about all supported device types and their configuration requirements. Use it to understand device capabilities and configure devices properly in your system.*
