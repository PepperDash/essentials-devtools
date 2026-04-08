# How to Export and Analyze Configuration

**Problem**: You need to examine, document, or analyze your system's configuration for troubleshooting, documentation, or planning purposes.

**When to use this guide**: When you need to understand configuration structure, compare settings, backup configuration, or analyze system setup.

## Quick Export

**For immediate configuration access:**
1. Navigate to **Config File** in the top menu
2. Wait for the configuration to load (shows "Loading..." initially)
3. Use browser's copy/paste to capture the displayed JSON
4. Save to a text file with `.json` extension

## Step-by-Step Configuration Export

### 1. Access the Configuration View

1. **Navigate to Config File** section in the web app
2. **Wait for loading** - Large configurations may take several seconds
3. **Verify completeness** - Scroll to ensure the entire configuration loaded

**What you'll see:**
- JSON-formatted configuration data
- Hierarchical structure with devices, settings, and properties
- Properly formatted and indented for readability

### 2. Copy Configuration Data

**Method 1: Select All and Copy**
1. Click in the configuration display area
2. Use `Ctrl+A` (Windows/Linux) or `Cmd+A` (Mac) to select all
3. Use `Ctrl+C` (Windows/Linux) or `Cmd+C` (Mac) to copy
4. Paste into your preferred text editor

**Method 2: Browser Save Function**
1. Right-click in the configuration area
2. Select "Save As" or "Save Page As"
3. Choose location and filename
4. Save as `.json` file type

### 3. Save and Organize

**Recommended file naming:**
```
[SystemName]_config_[YYYY-MM-DD].json
Examples:
- ConferenceRoom_config_2024-01-15.json
- MainBuilding_config_2024-01-15.json
- Backup_config_2024-01-15.json
```

**Storage recommendations:**
- Create a dedicated folder for configuration backups
- Include date and system identification in filenames
- Store in version control system if available
- Keep multiple versions for comparison

## Configuration Analysis Techniques

### 4. Understanding Configuration Structure

**Top-level sections** (common elements):
```json
{
  "devices": { ... },           // All configured devices
  "routing": { ... },           // Signal routing configuration  
  "rooms": { ... },             // Room/space definitions
  "controlSystem": { ... },     // Control processor settings
  "applicationSettings": { ... } // Application-specific settings
}
```

**Device structure example:**
```json
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
```

### 5. Common Analysis Tasks

**Find all devices of a specific type:**
1. Search for `"type": "samsungMDC"` (or other device type)
2. Note the device keys and names
3. Document IP addresses and settings

**Identify network settings:**
1. Search for `"address":` to find all IP addresses
2. Look for `"port":` to find communication ports
3. Check for `"username"` and authentication settings

**Locate routing configuration:**
1. Find the `"routing"` section
2. Examine input/output mappings
3. Check for audio/video route definitions

**Review room definitions:**
1. Look for `"rooms"` or similar sections
2. Check device assignments to rooms
3. Verify user interface configurations

## Advanced Analysis Methods

### 6. Using External Tools

**JSON viewers and editors:**
- **Online**: JSONLint, JSONFormatter, JSON Editor Online
- **Desktop**: Visual Studio Code with JSON extensions
- **Command line**: `jq` tool for JSON processing

**Example using jq to extract device information:**
```bash
# Extract all device names
jq '.devices | keys[]' config.json

# Find all Samsung displays
jq '.devices | to_entries[] | select(.value.type == "samsungMDC") | .key' config.json

# Get all IP addresses
jq -r '.. | .address? // empty' config.json
```

### 7. Configuration Comparison

**Compare configurations between systems:**
1. Export configurations from multiple systems
2. Use diff tools (WinMerge, Beyond Compare, or `diff` command)
3. Identify differences in device settings
4. Document configuration variations

**Version comparison workflow:**
1. Export current configuration
2. Compare with previous backups
3. Identify what changed
4. Verify changes are intentional

### 8. Documentation Generation

**Create device inventory:**
1. Extract device information from configuration
2. Create spreadsheet with: Key, Name, Type, IP Address, Location
3. Add columns for maintenance notes and status

**Network documentation:**
1. List all IP addresses and ports used
2. Document network requirements
3. Create network diagram based on configuration

## Troubleshooting with Configuration

### 9. Configuration-Based Problem Solving

**Device not responding:**
1. Find the device in configuration
2. Verify IP address and port settings
3. Check if device type matches physical device
4. Confirm required properties are configured

**Missing functionality:**
1. Check if feature is configured in the device properties
2. Verify room assignments include necessary devices
3. Look for routing configurations that might be missing

**Performance issues:**
1. Count total number of devices
2. Check for excessive polling intervals
3. Look for redundant or unused device configurations

### 10. Configuration Validation

**Common configuration errors to check:**
- Duplicate device keys
- Invalid IP addresses or ports
- Missing required properties for device types
- Inconsistent naming conventions
- Unused or orphaned device references

**Validation checklist:**
- [ ] All devices have unique keys
- [ ] IP addresses are valid and reachable
- [ ] Device types match physical hardware
- [ ] Required properties are present for each device type
- [ ] Room assignments reference existing devices
- [ ] No circular references in routing

## Security and Best Practices

### 11. Configuration Security

**Before sharing configuration files:**
- Remove or redact IP addresses if sharing externally
- Remove authentication credentials (usernames/passwords)
- Be cautious with network topology information
- Consider what information reveals about your infrastructure

**Sanitized configuration example:**
```json
{
  "Display-Room1": {
    "type": "samsungMDC",
    "properties": {
      "control": {
        "tcpSshProperties": {
          "address": "[REDACTED]",
          "port": 1515
        }
      }
    }
  }
}
```

### 12. Backup and Version Control

**Regular backup schedule:**
- Export configurations before making changes
- Schedule automatic exports if possible
- Store backups in multiple locations
- Test restore procedures periodically

**Change management:**
1. Export configuration before changes
2. Document what changes are being made
3. Export configuration after changes
4. Compare before/after configurations
5. Keep change log with backup files

## Integration with Other Features

### 13. Cross-Reference with Device List

**Verify configuration completeness:**
1. Compare devices shown in **Devices** section
2. Cross-reference with configuration file
3. Identify devices configured but not active
4. Find active devices not in configuration

### 14. Use with Debug Console

**Configuration-guided troubleshooting:**
1. Find device configuration details
2. Use device key to filter debug messages
3. Verify actual behavior matches configuration
4. Identify configuration vs. runtime discrepancies

## Common Use Cases

### System Documentation
- Create comprehensive system documentation
- Generate device inventories and network maps
- Document configuration standards and conventions

### Troubleshooting Support
- Provide configuration context to support teams
- Compare working vs. non-working system configurations
- Identify recent configuration changes

### System Planning
- Analyze current configuration before expansions
- Plan IP address allocations and network requirements
- Understand system complexity and dependencies

### Compliance and Auditing
- Document system configurations for compliance
- Track configuration changes over time
- Verify systems match approved standards

## Quick Reference

### Export Checklist
- [ ] Navigate to Config File section
- [ ] Wait for complete loading
- [ ] Select and copy all content
- [ ] Save with descriptive filename
- [ ] Include date in filename
- [ ] Store in organized backup location

### Analysis Tools
- **Built-in browser**: Search functionality (Ctrl+F)
- **Text editors**: Syntax highlighting for JSON
- **Online tools**: JSON formatters and validators
- **Command line**: `jq` for advanced JSON processing
- **Diff tools**: For comparing configurations

### Key Sections to Examine
- `devices`: All device configurations
- `routing`: Signal routing settings
- `rooms`: Room and space definitions
- Network settings: IP addresses and ports
- Authentication: Usernames and security settings

### Security Reminders
- Remove sensitive information before sharing
- Redact IP addresses and credentials
- Store backups securely
- Control access to configuration files

Remember: Configuration analysis is most effective when combined with real-time system monitoring. Use the configuration to understand the intended system behavior, then use the debug console to verify actual behavior matches the configuration.
