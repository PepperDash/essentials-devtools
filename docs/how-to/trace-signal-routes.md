# How to Trace Signal Routes and Read the Routing Diagram

**Problem**: You need to find out what's actually feeding a display or output right now, verify a route change took effect, or make sense of a large, busy routing diagram.

**When to use this guide**: When you're troubleshooting "wrong source on screen" issues, verifying a route or multiview layout change, or trying to focus a large routing diagram down to just the devices and signals you care about.

## Quick Actions

**To find where a signal is coming from:**
1. Open the **Routing** page for the app
2. Click the tie line edge feeding the device you're investigating (or click the device node itself)
3. The full path highlights from source to destination; everything else dims

**To declutter a busy diagram:**
1. Use the **signal type buttons** in the toolbar to hide types you don't need
2. Open the **Devices** filter dropdown and search for/uncheck devices you don't need
3. Turn on **Hide unconnected devices** and/or **Hide unconnected ports**

## Understanding the Toolbar

| Control | What it does |
|---|---|
| Signal type buttons | Click to show/hide all tie lines of that type. Button color matches its edges. |
| Devices dropdown | Search devices, then check/uncheck individual devices, or use Select all / Deselect all |
| Hide unconnected devices | Removes any device with no visible tie line endpoint from the canvas |
| Hide unconnected ports | Shows only the ports on each device that currently have a visible tie line |
| Dark mode | Switches the canvas between dark and light styling |
| Live / Offline badge | Green "Live" means the routing feedback WebSocket is connected and route data is current |
| Refresh button | Reloads the device/tie-line snapshot and reconnects the feedback WebSocket |

**Note**: Signal path tracing and live route curves inside device cards require PepperDashEssentials.dll **3.0 or later**. On earlier versions (2.29–2.x) the diagram still shows devices and static tie lines, but there's no live feedback to trace — see [UI Components Reference](../reference/ui-components.md#routing-diagram) for the full version breakdown.

## Tracing a Signal Path

1. **Click a tie line edge** to trace that specific connection end-to-end, including through any midpoint switching devices (matrix switchers, DSPs, etc.) it passes through
2. **Click a device node** to trace every signal currently passing into or out of that device at once
3. **Click a tile inside an open Multiview Layout Panel** to trace the path feeding just that tile
4. In all three cases, the matched tie lines and the internal route curves inside each device card light up in the signal's color; everything not part of the path dims and thins
5. Click the same edge/node/tile again, or click empty canvas space, to clear the highlight

**Tip**: A **dashed** tie line means the route was made through a device-specific bulk API (for example, a dynamic multiview layout) rather than a normal tie line — it's real, live-only, and traces just like a solid one.

## Checking a Multiview Display's Layout

If a device shows the small tile icon in its card header, it currently has an active multiview/window layout:

1. Click the tile icon to open a floating **Multiview Layout Panel** for that device
2. The panel shows a scaled mock-up of the device's canvas, with each tile labeled by number and current source
3. Drag the panel's title bar to move it out of the way — its position doesn't change when the diagram re-lays-out
4. Click a tile to trace the signal path feeding it, exactly like clicking a tie line
5. Open as many panels as you need (one per device); click a panel's `×` to close it

## Troubleshooting the Live Feedback Connection

### Badge stuck on "Offline"
**Cause**: The feedback WebSocket hasn't connected, isn't supported on this Essentials version, or the connection dropped.
**Solution**: Confirm PepperDashEssentials.dll is 3.0+ on the app's **Versions** page, then click the **Refresh** button to reconnect.

### Yellow certificate warning banner
**Cause**: The routing feedback server is using a certificate your browser doesn't trust (common with self-signed certificates on internal networks).
**Solution**: Click the link in the banner to open that URL directly in a new tab, accept/proceed past the certificate warning there, then reload the Routing page.

### Route curves or live data never appear
**Cause**: Either the Essentials version is below 3.0 (no live feedback exists), or the WebSocket never connected.
**Solution**: Check the Live/Offline badge — if it's stuck Offline, use Refresh; if the version is below 3.0, live tracing isn't available and only the static diagram applies.

## Quick Reference

- **Declutter**: signal type buttons + Devices dropdown + Hide unconnected switches
- **Trace a path**: click an edge, a device, or a multiview tile
- **Clear a trace**: click it again, or click empty canvas
- **Dashed edge**: live-only route (no static tie line behind it)
- **Live badge Offline**: click Refresh; confirm Essentials 3.0+ for live tracing

See also: [UI Components Reference — Routing Diagram](../reference/ui-components.md#routing-diagram) for the complete technical reference of every element and control.
