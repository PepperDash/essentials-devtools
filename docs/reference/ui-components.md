# UI Components Reference

**Complete technical reference for all user interface components in the PepperDash Essentials Web Config App.**

This document provides detailed information about every UI element, its purpose, behavior, and usage patterns.

## Navigation Components

### Top Bar

**Components**: `TopNav`, `NavMenu`, `ThemeToggle`
**Location**: Top of every page
**Purpose**: Switch between program slots and pages, and show connection state

**Elements, left to right**:

- **Brand**: "Essentials Dev Tools" - Always visible, non-clickable
- **App selector** (for example `app01`): Switches between the Essentials program slots found on the processor. Styled like the page menu; its panel is sized to its widest entry, and the current app is highlighted with the accent color
- **Page menu**: A button showing the current page's icon and name. It opens a grouped panel of every page, so no page can be pushed out of view by a narrow window
- **Version and connection state**: The Dev Tools version, and a status dot showing whether the Debug Console is connected
- **Help**: Opens the built-in help (these documents)
- **Theme switch**: Toggles between light and dark (see [Theme](#theme))

**Page menu groups**:

| Group        | Page                      | Route                       | Purpose                                                          |
| ------------ | ------------------------- | --------------------------- | ---------------------------------------------------------------- |
| Diagnostics  | Versions                  | `/versions`                 | View loaded assemblies and version information                   |
| Diagnostics  | API Paths                 | `/apiPaths`                 | Browse the processor's REST routes and try them                  |
| Diagnostics  | Initialization Exceptions | `/initializationExceptions` | Errors raised while the program started (Essentials 3.0+)        |
| Diagnostics  | Plugin Issues             | `/pluginLoadIssues`         | Plugins that failed to load, with a count badge (when supported) |
| Runtime      | Debug Console             | `/console`                  | Real-time system monitoring and debugging                        |
| Runtime      | Config File               | `/config`                   | View the complete merged configuration                           |
| Runtime      | Devices                   | `/devices`                  | Browse, inspect and run methods on configured devices            |
| Runtime      | Types                     | `/types`                    | View available device types and descriptions                     |
| Runtime      | Routing                   | `/routing`                  | Routing diagram and route control                                |
| Integrations | Mobile Control            | `/mobileControl`            | Mobile Control connection and action paths                       |
| Integrations | Secrets                   | `/secrets`                  | View and manage stored credentials (capability-gated)            |

Initialization Exceptions, Plugin Issues and Secrets appear only on processors whose Essentials version or API supports them. Plugin Issues shows a badge with the issue count, red when any are errors and amber otherwise.

**Visual States**:

- **Current page**: Highlighted row with the accent color and icon in the menu; the button shows the current page
- **Hover**: Row highlight

**Responsive Behavior**:

- The page menu replaces the old row of links, so narrow windows never clip a page

### Theme

**Components**: `ThemeToggle`, `useTheme`
**Purpose**: Let users choose a light or dark appearance

- **Default**: Follows the operating system until a choice is made
- **Persistence**: The choice is remembered in the browser (`essentials-devtools-theme`) and applied before first paint, so there is no flash of the wrong theme
- **Scope**: Applies to every page, including the routing diagram. The routing diagram no longer has its own dark-mode switch
- **Fonts**: Inter is bundled with the app, so it displays correctly without internet access

### Empty States

**Component**: `EmptyState`
**Purpose**: Replace bare "nothing here" text with a clear card

Used by Plugin Issues and Initialization Exceptions ("nothing to report"), the Devices page ("Select a device") and filtered lists with no matches.

---

---

## Debug Console Components

### Console Toolbar

**Location**: Top of Debug Console page
**Purpose**: Control the debug session and program, and filter messages. One toolbar card groups controls by what each acts on: session, log, program

**Top row**:

- **Start/Stop Debug Session**: Opens or closes the WebSocket connection for real-time messages
- **Level dropdown**: Minimum severity captured (Verbose, Debug, Information, Warning, Error, Fatal). Updates immediately and affects new messages only
- **Program controls (far right)**: The **Do Not Load Config on Next Boot** switch, **Load Config** (available only while that switch is on) and **Restart Program** (asks for confirmation) sit together

**Second row (filters)**:

- **Search** box, **Devices** filter dropdown and **Clear Filters**
- **Message Count**, **Clear Console Trace** and **Export Log** sit at the right of this row

**Message table**: The header is a proper bar and stays visible while rows scroll. Log levels are colored, and the Level column no longer truncates.

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

- **Heading with count**: For example "40 paths"
- **Search box**: Filters by route name or URL, with a result count
- **Two columns**: Name and URL, with a sticky header
- **Grouped rows**: Routes are grouped by their leading word (Debug, Dev, Execute, Get...), each group with a count

**Interaction**:

- **Click row**: Selects the route and opens the detail drawer; the selected row stays readable in both themes
- **Layout**: The table keeps room beside the open drawer so URLs stay visible

### API Path Detail Drawer

**Component**: `ApiPathDetailDrawer`
**Purpose**: Show complete detail for a selected API route and build its URL

**Location**: Slides in from right side of screen
**Trigger**: Click on any route row

**Content Sections**:

1. **Name**: Route name
2. **URL**: Full URL in a code box, with **Copy URL** and **Open in new tab** buttons
3. **Parameters**: A field for each `{parameter}` in the route; the URL above updates live as you type. Device, bridge and type parameters offer a list to pick from (`SuggestInput`) but accept any text
4. **Data Token Name**: Shown only when present

**Behavior**:

- No backdrop (main content remains interactive)
- Up and down arrow keys step through the paths while the drawer is open
- Close button dismisses the drawer

---

## Routing Components

### Routing Diagram

**Component**: `Routing`
**Location**: Routing page (`/:appId/routing`)
**Purpose**: Interactive, auto-laid-out signal routing diagram showing devices, ports, tie lines, and (on supported systems) live current-source feedback

**Technology**: React Flow (`@xyflow/react`) canvas with Dagre auto-layout (left-to-right column layout, recomputed whenever the device/filter set changes; manually dragged node positions are preserved across live feedback updates)

**Version requirements**:

| PepperDashEssentials.dll version        | Behavior                                                                                                                                                                                                                   |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| < 2.29                                  | Routing page shows "Routing feature is not available for this version."                                                                                                                                                    |
| 2.29 – 2.x                              | Static diagram only: devices, ports, and tie lines render, but there is no live current-source feedback, no internal route curves, no Live/Offline badge activity, and no multiview layout panels                          |
| 3.0+                                    | Full functionality: live WebSocket feedback, signal path tracing, and multiview layout panels (all described below)                                                                                                        |
| 3.0+ with the `routingCommand` endpoint | Adds route editing (see **Route Popover** below). Detected by probing the processor's live CWS route table via `apiPaths` rather than by version number, so the affordances appear only where the endpoint actually exists |

**Elements**:

- **Device Nodes**: Each routing device shown as a card with input ports listed on the left and output ports on the right (see **Device Node Card** below)
- **Tie Line Edges**: Connections between device ports, color-coded by signal type (see **Tie Line Edges** below)
- **MiniMap**: Overview map (bottom-right) for orientation in large diagrams
- **Controls**: Zoom and pan controls (bottom-left)
- **Multiview Layout Panels**: Optional floating windows showing a device's current tile layout (see below)

**Signal Type Colors**:

| Signal Type                                | Color                   |
| ------------------------------------------ | ----------------------- |
| AudioVideo                                 | Purple (#6f42c1)        |
| Video                                      | Blue (#0d6efd)          |
| Audio / Audio, SecondaryAudio              | Red (#dc3545)           |
| UsbOutput / UsbInput / UsbOutput, UsbInput | Orange (#fd7e14)        |
| Any other signal type                      | Gray (#adb5bd) fallback |

### Toolbar

A single toolbar strip above the diagram canvas holds all filtering and connection controls:

- **Signal type toggle buttons**: One button per signal type present in the system, color-coded to match its edges. Click a button to hide every tie line of that type; click again to show it. This replaces the "signal type dropdown" of earlier versions.
- **Devices filter dropdown**: Shows "Devices (visible/total)". Opens a menu with:
  - A search box to filter the device list by name or key
  - **Select all** / **Deselect all** links
  - A checkbox per device (checked = visible); unchecking hides that device and its edges from the canvas
  - The dropdown button turns amber/warning-colored whenever at least one device is hidden
- **Hide unconnected devices** switch: When on, devices with no visible tie line endpoint (after other filters are applied) are removed from the canvas entirely
- **Hide unconnected ports** switch: When on, each remaining device card only shows the input/output ports that currently have a visible tie line attached, instead of every port the device exposes
- **Theme**: The diagram follows the app-wide light/dark theme; there is no separate dark-mode switch here (use the theme switch in the top bar)
- **Live/Offline badge**: Green "Live" when the routing feedback WebSocket is connected, gray "Offline" otherwise. Only relevant on PepperDashEssentials.dll 3.0+; earlier versions always show "Offline" since there is no live feedback to connect to
- **Refresh button** (circular-arrow icon): Re-fetches the routing devices/tie-lines snapshot over HTTP and forces the feedback WebSocket to disconnect and reconnect. Use this if the "Live" badge appears stuck on "Offline" or after the routing feedback server has restarted

**Certificate warning**: If the feedback WebSocket fails to connect because its host uses an untrusted/self-signed certificate, a warning banner appears above the toolbar with a link to open that host's URL directly (to accept the certificate) before reloading the page.

### Device Node Card

Each device is drawn as a card with:

- **Header**: The device's display name (falls back to its key if unnamed), with the key shown as a smaller subtitle when a name is present. Hovering shows the key as a tooltip.
- **Layout toggle button** (small tile icon, header, only shown for devices with an active multiview canvas): Opens/closes a floating **Multiview Layout Panel** for that device (see below)
- **Hide button** (`×`, header): Hides just this one device from the canvas (equivalent to unchecking it in the Devices filter dropdown)
- **Port rows**: Input ports listed on the left edge, output ports on the right edge, one row per port. Hovering a port label shows its signal type as a tooltip. Multiview tile ports (keyed `tile{N}:...` on the parent device) are labeled `Tile N`, with the full qualified key in the tooltip
- **Clickable port rows** (route editing only): Where route editing is available, input ports on route destinations and output ports on midpoints render as buttons that outline blue on hover and open the **Route Popover**. Clicking a port does not also trigger signal path tracing, drag the node, or pan the canvas. Source ports and midpoint _input_ ports are never clickable — routing is always driven from the destination or midpoint-output end
- **Port status indicators** (route editing only): A pulsing blue dot marks a port whose route command has been accepted by the processor but not yet confirmed over the feedback WebSocket. An amber `!` replaces it if no confirmation arrives within ~10 seconds, and clears itself a few seconds later
- **Internal route curves**: On PepperDashEssentials.dll 3.0+, an SVG overlay draws a curve from each currently-active input port to its routed output port inside the card, color-coded by signal type. When a signal path is selected elsewhere in the diagram (see **Signal Path Tracing**), curves that are part of the selected path stay highlighted while all others dim

### Tie Line Edges

- Edges are color-coded by signal type using the palette above
- **Dashed edges** represent "live-only" routes: connections reported by live feedback (e.g. a route made through a device-specific bulk API such as a dynamic multiview layout) that have no corresponding static tie line in the configuration. Solid edges are real configured tie lines
- **Hover** an edge to show a tooltip with its signal type, source device/port, and destination device/port
- **Click** an edge to select it (see **Signal Path Tracing**); click it again, or click empty canvas space, to clear the selection

### Signal Path Tracing

Clicking a tie line edge, a device node, or a tile inside a Multiview Layout Panel highlights the complete signal path and dims everything else, using the live `currentRoutes`/`sinkCurrentSources` feedback (3.0+ only — tracing has no effect on older versions since there is no live route data to trace):

- **Click a tie line edge**: Traces upstream and downstream from that edge through every switching (midpoint) device in the path, highlighting every tie line and internal route curve that carries the same signal end-to-end
- **Click a device node**: Traces every signal path currently passing into or out of that device
- **Click a tile in a Multiview Layout Panel**: Traces the path feeding that specific tile
- Clicking the same selection again, or clicking empty canvas space, clears the highlight
- While a path is selected, non-path edges and internal route curves are dimmed and thinned so the active path stands out

### Multiview Layout Panels

For devices that implement a multiview/window layout (e.g. a multiview decoder), the layout toggle button on the device card opens a **floating, freely-draggable panel** showing a scaled mock-up of what that device is actually displaying:

- The panel renders the canvas at its real aspect ratio, with one rectangle per tile positioned and sized to match the live layout, labeled with the tile number and the name of the source currently routed to it
- **Drag** the panel's title bar to reposition it anywhere on screen; its position is independent of the graph layout, so it doesn't move when the diagram re-lays-out
- **Click a tile** to highlight the full signal path feeding it (see **Signal Path Tracing**) — the tile itself is also highlighted while its path is selected
- **Tile edit badge** (small pencil icon, tile corner, route editing only): Appears on hover and opens the **Route Popover** for that tile. This is equivalent to clicking the tile's `Tile N` port row on the device node; both resolve to the same qualified port
- Multiple panels (one per device) can be open and positioned independently at the same time
- Click the panel's `×` to close it; closed panels stay closed until the layout toggle button is clicked again

### Route Popover

**Component**: `RoutePopover`
**Purpose**: Make or clear a route from the diagram. Opened by clicking a clickable port row on a device node, or a tile's edit badge in a Multiview Layout Panel.

Rendered through a portal into `document.body` and positioned against the clicked element's viewport rect, so it is never clipped by a device card and never scales with the canvas zoom. It closes on outside click, `Escape`, its own `×`, a successful commit, and any canvas pan, zoom, or node drag.

**Two flows**, determined by what was clicked:

| Clicked                           | Step 1      | Step 2                        | Effect                                                                                               |
| --------------------------------- | ----------- | ----------------------------- | ---------------------------------------------------------------------------------------------------- |
| Input port on a route destination | Signal type | Source device                 | Routes the source through every midpoint in the discovered path and switches the destination's input |
| Output port on a midpoint         | Signal type | Input port on the same device | Switches that one device only                                                                        |

**Behavior**:

- **Signal type step**: Offers the port's declared type plus each individual flag as a breakaway option (`AudioVideo` → `AudioVideo`, `Audio`, `Video`). Collapses to a static label when the port carries a single type. Buttons use the same color coding as the toolbar's signal type toggles
- **Source list**: Computed client-side by walking the tie-line graph backwards from the clicked port, mirroring the processor's own path-finding rules — so only sources with a real physical path for that signal type are listed. Pure sources sort first, then by name. This uses the complete, unfiltered tie-line set: toolbar filters change the view, never what is routable
- **Partial-match badge**: A source with a path for only one half of an `AudioVideo` request is badged `video only` / `audio only`. It remains selectable, since the processor routes whichever half has a path
- **Current selection**: The source (or input port) currently routed to that port is marked with a check. For a destination this is derived by tracing back over the tie lines using each midpoint's live route feedback, not by reading the sink's own current-source bookkeeping — the processor only updates that bookkeeping on a graph-level route, so switching a midpoint directly would otherwise leave it stale. The bookkeeping is used as a fallback only where there are no tie lines to trace
- **None — clear route**: Always the first option. On a destination this tears down the path _and_ deselects the destination's own input; on a midpoint output it clears just that output
- **Filter box**: Appears once the option list exceeds 12 entries
- **Errors**: A failed command keeps the popover open with the processor's reason inline, so a different option can be chosen without reopening

**Route roles**: which ports are clickable is derived from the device flags in the routing graph API — midpoints (`hasInputsAndOutputs`) expose clickable outputs; route destinations (`hasInputs` and _not_ `hasInputsAndOutputs`, which covers both pure sinks and multiview parents) expose clickable inputs.

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

| Column    | Width    | Content                          | Behavior                                     |
| --------- | -------- | -------------------------------- | -------------------------------------------- |
| Timestamp | 6 units  | Full timestamp with milliseconds | Fixed width, truncated if needed             |
| Key       | 3 units  | Device key or "global"           | Fixed width                                  |
| Level     | 2 units  | Log severity level               | Fixed width                                  |
| Message   | 13 units | Rendered message text            | Truncated with ellipsis, expandable on click |

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

## Secrets Components

### Secrets Page

**Component**: `Secrets`
**Location**: Secrets page (`/:appId/secrets`)
**Purpose**: View which credentials the processor has stored, add/replace/delete them, and apply or export a bulk file

**Availability**: The page and its nav entry are gated on capability detection — `supportsSecretsApi`
matches a whole `secrets` path segment in the processor's live CWS route table (`apiPaths`), rather
than on a version number. On a processor without the API the nav entry is absent and a direct link
renders an explanation. The whole-segment match is deliberately stricter than the routing feature's
substring check, because `secrets` collides far more easily than `routingCommand`.

**Values are never displayed.** No endpoint returns a stored value, so the page can show that a
secret exists and replace it, but never reveal it. A persistent notice states this.

**Elements**:

- **Provider selector**: `default` (this program slot) or `CrestronGlobalSecrets` (shared across
  slots), populated from the providers endpoint
- **Filter**: matches key and description
- **Download template** / **Apply file…**: the bulk workflow
- **Managed secrets table**: Key · Description · Updated · actions, with `Add +` in the last header
  cell (matching the Mobile Control convention). Per row: **Replace value** and **Delete**
- **Other data store records table**: records that exist but were not created here, each badged
  _Not managed here_, shown with Owner and Modified. **No Replace button**, and deletion requires
  typing the key
- **Index-health banner**: shown when `indexStatus` is not `ok`, stating that classification is
  unavailable but the secrets themselves are unaffected
- **Incomplete-listing banner**: shown when `enumerationComplete` is false

### Secret Edit Modal

**Component**: `SecretEditModal`

Add or replace one secret. Provider and key are locked when replacing. The value field reuses the
existing `EyeIcon` show/hide toggle from the login form, with `autoComplete="off"` throughout so the
browser never offers to save the credential. Key and value length limits (32 / 1600) are enforced
inline against the Crestron Data Store caps.

Collision handling is driven by the already-loaded list: a key matching an existing **managed** entry
shows a warning and sends `overwrite`; one matching an **unmanaged** entry blocks the submit behind a
separate acknowledgement checkbox.

### Secret Delete Modal

**Component**: `SecretDeleteModal`

Confirms deletion. For an **unmanaged** record it switches to a strict mode requiring the exact key
to be typed — Mobile Control stores its paired-client tokens in the same flat Data Store, and
deleting that record silently un-pairs every touchpanel.

### Bulk Apply Modal

**Component**: `BulkApplyModal`

A four-stage flow: choose → preview → confirm → done.

- The drop zone wraps a real `<input type="file" accept=".json">`, so keyboard and screen-reader
  users get the same affordance; dragging is layered on top
- While open, window-level `dragover`/`drop` handlers call `preventDefault()`. Without them a drop
  that misses the zone makes the browser navigate to the file — destroying the page and putting a
  credential file in the address bar and history
- Files are validated **client-side first** (extension, 256 KB size cap, JSON shape, per-entry rules)
  before any request. `JSON.parse` error text is never surfaced, because V8 embeds a snippet of the
  offending source in it — which for a secrets file is a live credential
- The processor is then asked for a **preview**, which writes nothing
- Parsed entries live in local component state and never enter Redux, keeping plaintext values out
  of the store and out of Redux DevTools
- The backdrop becomes static once a file is loaded, so a stray click cannot discard a reviewed batch
- On commit the parsed values and the file input are cleared immediately

### Bulk Preview Table

**Component**: `BulkPreviewTable`

Presentational only — no store access — which is what lets it be tested directly. One row per entry
with an action badge:

| Action    | Badge | Meaning                                   |
| --------- | ----- | ----------------------------------------- |
| Create    | green | Key does not exist yet                    |
| Overwrite | amber | Exists and will be replaced               |
| Skip      | grey  | Exists and will be left alone             |
| Invalid   | red   | Rejected; will not be written             |
| Failed    | red   | The store refused the write (commit only) |

An entry that would overwrite a record the tool does not manage gets an additional _not managed here_
badge, and the Apply button then requires an explicit acknowledgement.

The **Replace secrets that already exist** switch re-runs the preview, so what is shown always matches
the flag that would actually be sent.

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

### Devices Panel

**Component**: `DeviceList`, `DeviceDetail`
**Location**: Devices page (`/:appId/devices`)
**Purpose**: Browse devices and inspect or operate the selected one in a single master-detail panel

**Device list (left rail)**:

- **Heading with count**: "Devices 22", or "2 of 22" while filtered
- **Filter box**: Narrows the list as you type
- **Rows**: Name with the device key beneath it in monospace; the selected row is highlighted with the accent color
- **Selection in the URL**: The selected device is kept as `?device=<key>`, so a link or reload returns to the same device
- **Empty state**: "Select a device" until one is chosen

**Detail pane (right)**:

- **Header**: The device name with its key beneath; **Live updates (every 2s)** switch and **Refresh** button
- **Tabs**: **Methods & Feedbacks** and **Properties**, each with a count badge

#### Methods & Feedbacks tab

- **Methods table**: One row per method with a fixed, right-aligned **Run** column so rows line up
  - No parameters: just **Execute**
  - One simple parameter (text, number, true/false): entered inline, attached to **Execute**. A field shows an error outline until a valid value is entered, and Execute stays disabled
  - Several parameters, or any object/action parameter: **Execute** opens a dialog
  - Single Boolean parameter (for example VolumeUp): a **Press & Release** control with a delay field (0.5-30 s) sends `true`, then `false` after the delay. A true/false dropdown with **Execute** sends one value
- **Feedbacks table**: Key, Type and Value, with values shown in code style and updated live. All feedback tables share one column layout

#### Properties tab

- Property names and types stay on one line, values are shown in monospace, and an **R/W** badge shows read and write access

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
- **Sticky header**: Every table header in the app stays in view while its rows scroll

### Types List

**Location**: Types page
**Purpose**: Display all available device types and descriptions

**Layout**:

- **Three columns**: Type Name, Class Type, Description
- **Sticky header**: Headers remain visible during scroll
- **Sortable**: Alphabetically sorted by type name
- **Search**: Filters by type name, class or description, with a result count and an empty state when nothing matches

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
**Features**: Search icon, debounced input (delay set per page), placeholder text, clear functionality, result count where a list is filtered
**Styling**: Visible border in dark mode as well as light

Also on: Devices, Types, API Paths and the Mobile Control action paths (filter by messenger key or path).

### Suggest Inputs

**Component**: `SuggestInput`
**Purpose**: A text field with a filterable suggestion list
**Features**: Keyboard selection, clear button, accepts any text even when it is not in the list. Used for the API Paths drawer parameters.

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

The app uses design tokens in `styles.scss` with a light theme and a dark theme (Bootstrap's `data-bs-theme`).

**Brand and status colors (both themes)**:

- Primary: #005294 (Essentials brand blue)
- Secondary / muted: #64748b (Slate)
- Success: #00a39a (Teal)
- Warning: #f59e0b (Amber)
- Danger: #d90169 (Red)

**Light theme**: page background #f1f4f9, body text #334155, white panels
**Dark theme**: page background #0b1220, body text #cbd5e1, panels #162033

Panels use soft shadows, rounded corners and a translucent "glass" surface.

### Typography

**Base Font**: Inter (bundled with the app), with system sans-serif fallbacks
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
