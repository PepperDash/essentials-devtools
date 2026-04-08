# Configuration Schema Reference

This document provides complete reference information about the configuration data structure used by PepperDash Essentials and how it's displayed in the web config app.

## Configuration File Structure

### Root Configuration Object

```json
{
  "info": {
    "description": "string",
    "version": "string",
    "createdDate": "ISO8601 datetime",
    "author": "string"
  },
  "devices": {
    "deviceKey": {
      "key": "string",
      "name": "string", 
      "type": "string",
      "group": "string",
      "properties": {},
      "enabled": "boolean"
    }
  },
  "tieLines": [
    {
      "sourceDevice": "string",
      "destinationDevice": "string", 
      "type": "string"
    }
  ],
  "rooms": {
    "roomKey": {
      "key": "string",
      "name": "string",
      "description": "string",
      "sourceListKey": "string",
      "defaultSourceItem": "string",
      "devices": ["deviceKey1", "deviceKey2"]
    }
  }
}
```

## Device Configuration Schema

### Common Device Properties

All devices share these common configuration properties:

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `key` | string | Yes | Unique identifier for the device |
| `name` | string | Yes | Human-readable display name |
| `type` | string | Yes | Device type identifier |
| `group` | string | No | Logical grouping for organization |
| `enabled` | boolean | No | Whether device is active (default: true) |
| `description` | string | No | Additional device description |

### Device-Specific Properties

Device properties vary by type. Common property categories include:

#### Connection Properties
```json
{
  "control": {
    "method": "tcpip|com|crestronCom|ssh|ir",
    "tcpSshProperties": {
      "address": "192.168.1.100",
      "port": 23,
      "username": "admin",
      "password": "password"
    }
  }
}
```

#### Communication Properties
```json
{
  "communicationMonitorProperties": {
    "pollString": "string",
    "pollTimeMs": 30000,
    "warningTimeoutMs": 180000,
    "errorTimeoutMs": 300000
  }
}
```

## Device Types Reference

### Display Devices

#### Generic Display
```json
{
  "type": "genericDisplay",
  "properties": {
    "control": {
      "method": "tcpip",
      "tcpSshProperties": {
        "address": "192.168.1.100",
        "port": 23
      }
    },
    "supportsDiscretePower": true,
    "supportsVolumeControl": false
  }
}
```

#### Sony Display
```json
{
  "type": "sonyDisplay",
  "properties": {
    "control": {
      "method": "tcpip",
      "tcpSshProperties": {
        "address": "192.168.1.100",
        "port": 20060
      }
    },
    "id": "01"
  }
}
```

### Audio Devices

#### Generic Audio DSP  
```json
{
  "type": "genericAudioDsp",
  "properties": {
    "control": {
      "method": "tcpip",
      "tcpSshProperties": {
        "address": "192.168.1.200",
        "port": 1024
      }
    },
    "levelControlBlocks": {
      "programVolume": {
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

#### Cisco Codec
```json
{
  "type": "ciscoCodec",
  "properties": {
    "control": {
      "method": "ssh",
      "tcpSshProperties": {
        "address": "192.168.1.50",
        "port": 22,
        "username": "admin",
        "password": "admin"
      }
    },
    "sipPhoneLineKeys": ["line1", "line2"]
  }
}
```

### Control System Devices

#### Crestron Processor
```json
{
  "type": "crestron3Series",  
  "properties": {
    "control": {
      "method": "crestronCom",
      "comParams": {
        "hardwareHandshake": "None",
        "parity": "None", 
        "baudRate": 38400,
        "dataBits": 8,
        "stopBits": 1
      }
    },
    "eiscp": {
      "port": 4001
    }
  }
}
```

## Room Configuration Schema

### Basic Room Structure
```json
{
  "roomKey": {
    "key": "roomKey",
    "name": "Conference Room A",
    "description": "Main conference room with video conferencing",
    "sourceListKey": "defaultSources",
    "defaultSourceItem": "laptop",
    "devices": ["display1", "codec1", "dsp1"],
    "propertiesConfig": {
      "environment": {
        "touchpanels": {
          "tp1": {
            "sgdFile": "ConferenceRoom.sgd"
          }
        }
      }
    }
  }
}
```

### Room Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `key` | string | Yes | Unique room identifier |
| `name` | string | Yes | Display name for the room |
| `description` | string | No | Additional room information |
| `sourceListKey` | string | No | Reference to source list configuration |
| `defaultSourceItem` | string | No | Default active source |
| `devices` | array | No | List of device keys in this room |

## Source List Configuration

### Source List Structure
```json
{
  "sourceListKey": {
    "items": {
      "laptop": {
        "key": "laptop",
        "name": "Laptop",
        "icon": "laptop",
        "includeInSourceList": true,
        "sourceListOrder": 1,
        "routingInputs": {
          "videoInputs": ["input1"],
          "audioInputs": ["input1"]
        },
        "routingOutputs": {
          "videoOutputs": ["output1"],
          "audioOutputs": ["output1"] 
        }
      }
    }
  }
}
```

## Tie Line Configuration

### Tie Line Types

#### Audio Tie Lines
```json
{
  "sourceDevice": "dsp1",
  "destinationDevice": "codec1", 
  "type": "audio",
  "sourceOutput": "programOut",
  "destinationInput": "micIn"
}
```

#### Video Tie Lines  
```json
{
  "sourceDevice": "switcher1",
  "destinationDevice": "display1",
  "type": "video", 
  "sourceOutput": "output1",
  "destinationInput": "hdmi1"
}
```

## Configuration Validation

### Required Fields Validation

The system validates that all required fields are present:
- Device `key` and `type` are mandatory
- Room `key` and `name` are mandatory  
- Tie line `sourceDevice` and `destinationDevice` must reference existing devices

### Type Validation

Device types must match registered factory types:
- Unknown device types will generate warnings
- Missing required properties for device types will cause errors
- Invalid property values will be flagged during validation

### Reference Validation

Cross-references between configuration objects are validated:
- Device keys referenced in rooms must exist
- Source list references must point to valid source lists
- Tie line device references must point to existing devices

## Configuration Merging

### Merge Priority Order

When multiple configuration files are present, they are merged in this order:
1. Base system configuration
2. Template configurations  
3. User configuration files
4. Environment-specific overrides

### Merge Rules

- **Objects**: Deep merged, with later values overriding earlier ones
- **Arrays**: Later arrays completely replace earlier ones
- **Primitives**: Later values override earlier ones
- **Null/Undefined**: Explicit null values remove properties

### Example Merge Behavior
```json
// Base config
{
  "devices": {
    "display1": {
      "name": "Display",
      "properties": {
        "volume": 50,
        "power": true
      }
    }
  }
}

// Override config  
{
  "devices": {
    "display1": {
      "name": "Main Display", 
      "properties": {
        "volume": 75
      }
    }
  }
}

// Result after merge
{
  "devices": {
    "display1": {
      "name": "Main Display",
      "properties": {
        "volume": 75,
        "power": true
      }
    }
  }
}
```

## Configuration Access Patterns

### Read-Only Access

The web config app provides read-only access to merged configuration:
- Cannot modify configuration through the web interface
- Configuration changes require file system access to the processor
- Changes take effect after configuration reload

### Configuration Refresh

Configuration can be refreshed without restarting:
- Use the "Reload Configuration" function in the web app
- Configuration is re-read and merged from files
- Active devices maintain state where possible
- Some changes may require full system restart

## Common Configuration Patterns

### Multi-Room Systems
```json
{
  "devices": {
    "mainDsp": {
      "type": "genericAudioDsp",
      "properties": {
        "levelControlBlocks": {
          "room1Volume": {},
          "room2Volume": {},
          "room3Volume": {}
        }
      }
    }
  },
  "rooms": {
    "room1": {
      "devices": ["mainDsp"],
      "volumeControlKey": "room1Volume"
    },
    "room2": {
      "devices": ["mainDsp"], 
      "volumeControlKey": "room2Volume"
    }
  }
}
```

### Video Switching Systems
```json
{
  "devices": {
    "videoSwitcher": {
      "type": "extronVideoSwitcher",
      "properties": {
        "inputCount": 8,
        "outputCount": 4
      }
    }
  },
  "tieLines": [
    {
      "sourceDevice": "videoSwitcher",
      "destinationDevice": "display1",
      "type": "video",
      "sourceOutput": "output1"
    }
  ]
}
```

## Troubleshooting Configuration Issues

### Common Problems

**Missing Device References**:
- Symptoms: Warnings in debug console about unknown devices
- Solution: Verify device keys match exactly between references

**Invalid Device Types**:
- Symptoms: Errors during system startup
- Solution: Check device type names against factory registrations

**Circular References**:
- Symptoms: System fails to start or infinite loops
- Solution: Review tie line configurations for circular routing

**Property Type Mismatches**:
- Symptoms: Device properties not working as expected
- Solution: Verify property types match device expectations

### Configuration Debugging

Use the debug console to identify configuration issues:
1. Look for configuration validation messages during startup
2. Check device initialization messages for failures
3. Monitor property change messages to verify configuration application
4. Use device status messages to verify proper device communication

---

*This reference provides complete information about configuration structure and validation. Use it to understand how configuration files are structured and how to interpret configuration data displayed in the web app.*
