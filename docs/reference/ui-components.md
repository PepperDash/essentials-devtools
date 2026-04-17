# UI Components Reference

**Complete technical reference for all user interface components in the PepperDash Essentials Web Config App.**

This document provides detailed information about every UI element, its purpose, behavior, and usage patterns.

## Navigation Components

### Top Navigation Bar

**Component**: `TopNav`
**Location**: Top of every page
**Purpose**: Primary navigation between application sections

**Elements**:
- **Brand**: "Essentials Debugger" - Always visible, non-clickable
- **Navigation Links**: Six main sections accessible via top menu

**Navigation Links**:
| Link | Route | Purpose |
|------|-------|---------|
| Home | `/home` | Welcome page and application starting point |
| Debug Console | `/console` | Real-time system monitoring and debugging |
| Versions | `/versions` | View loaded assemblies and version information |
| Config File | `/config` | View complete merged configuration |
| Devices | `/devices` | Browse and inspect configured devices |
| Types | `/types` | View available device types and descriptions |

**Visual States**:
- **Active**: Link text shows in secondary color when on that page
- **Inactive**: Standard link appearance
- **Hover**: Standard link hover effect

**Responsive Behavior**:
- Collapses to hamburger menu on mobile devices
- Maintains horizontal layout on desktop and tablet

---

## Debug Console Components

### Session Control Panel

**Location**: Top of Debug Console page
**Purpose**: Control debug session state and system operations

#### Start/Stop Session Buttons
- **Start Debug Session**: Initiates WebSocket connection for real-time messages
- **Stop Debug Session**: Closes WebSocket connection and stops message flow
- **Visual State**: Blue primary buttons, disabled when appropriate

#### System Control Buttons
- **Load Config**: Manually reload configuration (only available when "Do Not Load Config" is checked)
- **Restart Program**: Complete system restart with confirmation modal

#### Configuration Controls
- **Do Not Load Config on Next Boot**: Checkbox to control configuration loading behavior
- **State**: Checked = don't load config, Unchecked = load config normally

#### Minimum Log Level Dropdown
- **Purpose**: Set minimum severity level for captured messages
- **Options**: Verbose, Debug, Information, Warning, Error, Fatal
- **Default**: Information
- **Behavior**: Dropdown updates immediately, affects new messages only

#### Message Counter
- **Display**: "Message Count: [number]"
- **Purpose**: Shows total messages received in current session
- **Updates**: Real-time during active debug session

### Filtering Components

#### Search Box
**Component**: `FilterSearchText`
**Purpose**: Free-text search within debug messages

**Behavior**:
- **Debounce**: 1-second delay before applying search
- **Multiple terms**: Space-separated terms use AND logic
- **Case insensitive**: Searches are not case-sensitive
- **Partial matching**: Finds partial word matches

**Search targets**:
- Message template text
- Rendered message text
- Device keys and names

#### Device Filter Dropdown
**Component**: `DeviceFilterDropdown`
**Purpose**: Filter messages by source device and set a per-device minimum log level

**Options**:
- **Global**: System-wide messages not tied to specific devices
- **Device entries**: All configured devices, sorted alphabetically by name (or key when no name is set)
- **Multiple selection**: Checkbox interface allows multiple devices
- **Badge indicator**: Shows count of checked devices

**Per-Device Minimum Log Level**:
- When a device is checked, a level dropdown appears inline next to its name
- Default level when first checked: `Information`
- Available levels: Fatal, Error, Warning, Information, Debug, Verbose
- Only messages at or above the selected threshold for that device are shown
- Each device can have a different level independently
- Unchecking a device removes both the device filter and its level setting
- The level dropdown closes after a selection; the Devices dropdown stays open

**State**: Stored in Redux `debugConsole` slice (`checkedDevices` and `deviceLevels`); persists across route navigation

**Filter Combined With**:
- Text search (AND logic: both conditions must be satisfied)

#### Clear Filters Button
**Purpose**: Reset all debug console filters (checked devices, per-device levels, and search text) to their initial empty state

**Trigger**: "Clear Filters" button in the debug filters toolbar
**Effect**: Dispatches `clearAllFilters()` to the Redux `debugConsole` slice

---

## API Paths Components

### API Paths Table
**Location**: API Paths page (`/:appId/apiPaths`)
**Purpose**: Display all available REST API routes exposed by the processor

**Layout**:
- **Two columns**: Name and URL
- **Sortable**: Alphabetically sorted by route name
- **Striped rows**: Bootstrap `table-striped` styling

**Interaction**:
- **Click row**: Selects the route and opens the detail drawer
- **Selected row**: Highlighted with `table-primary`

### API Path Detail Drawer
**Component**: `ApiPathDetailDrawer`
**Purpose**: Show complete detail for a selected API route

**Location**: Slides in from right side of screen
**Trigger**: Click on any route row

**Content Sections**:
1. **Name**: Route name
2. **URL**: Full URL as a clickable link (opens in new tab)
3. **Data Token Name**: Shown only when present

**Behavior**:
- No backdrop (main content remains interactive)
- Close button dismisses the drawer

---

## Routing Components

### Routing Diagram
**Location**: Routing page (`/:appId/routing`)
**Purpose**: Visual signal routing diagram showing devices, ports, and tie lines

**Technology**: React Flow (@xyflow/react) with Dagre auto-layout

**Elements**:
- **Device Nodes**: Each routing device shown as a card with input and output ports
- **Tie Line Edges**: Connections between device ports, color-coded by signal type
- **MiniMap**: Overview map for orientation in large diagrams
- **Controls**: Zoom and pan controls

**Signal Type Colors**:
| Signal Type | Color |
|-------------|-------|
| AudioVideo | Purple (#6f42c1) |
| Video | Blue (#0d6efd) |
| Audio | Red (#dc3545) |
| UsbOutput / UsbInput | Orange (#fd7e14) |

**Filtering**:
- A signal type dropdown allows filtering visible tie lines by signal type

---

### Message Display Components

#### Message List Container
**Component**: `ConsoleWindow`
**Purpose**: Display filtered debug messages in tabular format

**Layout**:
- **Header row**: Fixed column headers (Timestamp, Key, Level, Message)
- **Message rows**: Scrollable list of debug messages
- **Responsive**: Columns adjust for different screen sizes

**Column Details**:
| Column | Width | Content | Behavior |
|--------|-------|---------|----------|
| Timestamp | 6 units | Full timestamp with milliseconds | Fixed width, truncated if needed |
| Key | 3 units | Device key or "global" | Fixed width |
| Level | 2 units | Log severity level | Fixed width |
| Message | 13 units | Rendered message text | Truncated with ellipsis, expandable on click |

#### Individual Message Rows
**Visual States**:
- **Default**: Standard row appearance
- **Hover**: Subtle background highlight
- **Selected**: Primary color background with white text
- **Clickable**: Cursor changes to pointer

**Interaction**:
- **Click**: Opens message detail drawer
- **Selection**: Only one message can be selected at a time
- **Keyboard**: Not currently supported

#### Scroll Container
**Component**: `ScrollToBottom`
**Purpose**: Auto-scroll to newest messages

**Features**:
- **Auto-follow**: Automatically scrolls to bottom for new messages
- **Manual control**: User can scroll up to view history  
- **Follow button**: Appears when user scrolls up, click to resume auto-follow
- **Performance**: Optimized for high message volumes

### Message Detail Components

#### Message Detail Drawer
**Component**: `LogMessageDetailDrawer`
**Purpose**: Show complete information for selected message

**Location**: Slides in from right side of screen
**Trigger**: Click on any message row

**Content Sections**:
1. **Timestamp**: Full timestamp with timezone information
2. **Rendered Message**: Complete formatted message text
3. **Message Template**: Raw message template with placeholders
4. **Properties**: JSON-formatted structured data

**Behavior**:
- **Overlay**: Appears over main content, does not push content aside
- **Backdrop**: No backdrop (can interact with main content)
- **Close methods**: Close button (X) or programmatic close
- **Responsive**: Adjusts width on mobile devices

**Properties Display**:
- **Format**: JSON with syntax highlighting and indentation
- **Content**: All structured data associated with the message
- **Common fields**: Key, SourceContext, CommandType, etc.

---

## Configuration Display Components

### Configuration Viewer
**Location**: Config File page
**Purpose**: Display complete merged configuration

**Display Format**:
- **JSON**: Pretty-printed with proper indentation
- **Monospace font**: Fixed-width font for code readability
- **Scrollable**: Full height scrolling for large configurations
- **Selectable**: Text can be selected and copied

**Loading States**:
- **Loading**: Shows "Loading..." text while fetching configuration
- **Loaded**: Full configuration display
- **Error**: Error message if configuration cannot be loaded

**Performance**:
- **Large files**: Handles configurations with thousands of lines
- **Memory efficient**: Uses browser's native text rendering
- **Search**: Browser's built-in search (Ctrl+F) works within configuration

---

## Device Management Components

### Device List
**Location**: Left side of Devices page
**Purpose**: Display all configured devices for selection

**Layout**:
- **Header row**: "Key" and "Name" column headers
- **Device rows**: All configured devices with Key and Name
- **Fixed width**: Consistent column widths

**Interaction**:
- **Click**: Select device to show details
- **Hover**: Visual feedback on hover
- **Selection**: Single selection only

**Content**:
- **Key**: Technical identifier used in configuration
- **Name**: Human-readable device name
- **Sorting**: Devices appear in configuration order

### Device Detail Panel
**Location**: Right side of Devices page
**Purpose**: Display detailed information about selected device

**Current State**: Placeholder implementation
**Planned Content**:
- Device status and connection state
- Real-time property values
- Available methods and commands
- Recent activity log
- Configuration details

---

## Information Display Components

### Versions List
**Location**: Versions page
**Purpose**: Display all loaded software assemblies and versions

**Layout**:
- **Sticky header**: Column headers remain visible during scroll
- **Sortable**: Alphabetically sorted by assembly name
- **Two columns**: Name and Version

**Content**:
- **Name**: Full assembly name including namespace
- **Version**: Complete version string with build information
- **Filtering**: No built-in filtering (use browser search)

### Types List  
**Location**: Types page
**Purpose**: Display all available device types and descriptions

**Layout**:
- **Three columns**: Type Name, Class Type, Description
- **Sticky header**: Headers remain visible during scroll
- **Sortable**: Alphabetically sorted by type name

**Content**:
- **Type Name**: Configuration identifier for device type
- **Class Type**: .NET class that implements the device
- **Description**: Human-readable description of device purpose

---

## Modal Components

### Restart Confirmation Modal
**Component**: `RestartConfirmModal`
**Trigger**: Click "Restart Program" button
**Purpose**: Confirm system restart action

**Content**:
- **Title**: "Restart Program"
- **Message**: "Are you sure you want to restart the program?"
- **Actions**: Cancel (light button) and Restart (danger button)

**Behavior**:
- **Modal backdrop**: Prevents interaction with background
- **Keyboard**: ESC key closes modal
- **Focus management**: Focus moves to modal when opened

---

## Form Components

### Checkboxes
**Usage**: Configuration options like "Do Not Load Config on Next Boot"
**Style**: Bootstrap form-check styling
**States**: Checked, unchecked, disabled (when appropriate)

### Dropdowns
**Usage**: Filters, log level selection, minimum log level
**Style**: Bootstrap dropdown with custom styling
**Features**: Badge indicators for active selections, scrollable menus

### Search Inputs
**Usage**: Message filtering and search
**Features**: Debounced input, placeholder text, clear functionality
**Styling**: Form control with border styling

---

## Layout Components

### Header-Scroller-Footer Pattern
**Component**: `HeaderScrollerFooter`
**Purpose**: Consistent layout with fixed header/footer and scrollable content

**Usage**:
- **Header**: Fixed elements like page titles and controls
- **Scroller**: Main content area that scrolls when content overflows
- **Footer**: Fixed elements like status bars or action buttons

**Responsive**: Adapts to different screen sizes and orientations

### Filter Headers
**Component**: `ListFiltersHeader`
**Purpose**: Consistent layout for filter controls across different sections

**Elements**:
- **Search box**: Text-based filtering
- **Filter dropdowns**: Categorical filtering
- **Clear button**: Reset all filters
- **Additional controls**: Context-specific buttons or options

---

## Visual Design System

### Color Scheme
**Primary Colors**:
- Primary: #4466a2 (Blue)
- Secondary: #7f7f7f (Gray)
- Success: #00b5aa (Teal)
- Warning: #ff9400 (Orange)
- Danger: #d90169 (Red)

**Background Colors**:
- Body: #e9edf3 (Light Gray)
- White: #ffffff
- Very Light: #f5f5f5

### Typography
**Base Font**: Roboto, 'Helvetica Neue', sans-serif
**Base Size**: 0.875rem (14px)
**Line Height**: Default browser settings
**Monospace**: For code/configuration display

### Spacing
**Grid System**: 24-column Bootstrap grid
**Standard Spacing**: Bootstrap spacing utilities (mb-2, p-2, etc.)
**Component Gaps**: Consistent spacing between related elements

### Interactive States
**Buttons**: Hover, focus, active, and disabled states
**Links**: Hover and active states with underline
**Form Controls**: Focus states with border color changes
**Clickable Elements**: Cursor pointer and hover effects

---

## Accessibility Features

### Keyboard Navigation
- **Tab order**: Logical tab sequence through interactive elements
- **Focus indicators**: Visible focus states on all interactive elements
- **Modal management**: Focus traps and restoration

### Screen Reader Support
- **Semantic HTML**: Proper use of headings, lists, and form labels
- **ARIA labels**: Where needed for complex interactions
- **Status announcements**: For dynamic content updates

### Visual Accessibility
- **Color contrast**: Meets WCAG guidelines for text and background contrast
- **Focus indicators**: High contrast focus outlines
- **Text scaling**: Responsive to browser zoom and text size preferences

---

## Performance Characteristics

### Rendering Performance
- **Virtual scrolling**: Not implemented (could benefit large message lists)
- **Debounced interactions**: Search and filter inputs use appropriate delays
- **Efficient updates**: React optimizations for frequent message updates

### Memory Management
- **Message accumulation**: Messages accumulate in browser memory during session
- **Clear mechanism**: Page refresh clears accumulated messages
- **Large datasets**: May require manual session management for very high message volumes

### Network Efficiency
- **WebSocket connection**: Single persistent connection for debug messages
- **API calls**: Minimal API calls for configuration and device data
- **Caching**: Browser caching for static resources

---

## Browser Compatibility

### Supported Browsers
- **Chrome**: Version 70+
- **Firefox**: Version 65+
- **Safari**: Version 12+
- **Edge**: Version 79+

### Required Features
- **WebSocket support**: For real-time debug messages
- **ES6 support**: Modern JavaScript features
- **CSS Grid/Flexbox**: For responsive layouts
- **JSON support**: For configuration display

### Mobile Support
- **Responsive design**: Adapts to mobile screen sizes
- **Touch interactions**: Touch-friendly button and link sizes
- **Mobile browsers**: Same browser version requirements as desktop

---

This reference provides the complete technical specification for all UI components. For usage examples and practical guidance, see the [How-to Guides](../how-to/) and [Tutorials](../tutorials/).
