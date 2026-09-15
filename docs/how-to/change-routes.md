# How to Change Routes from the Routing Diagram

**Problem**: You need to send a source to a display, switch a matrix output, or tear down a route — and you'd rather do it from the routing diagram you're already looking at than from a touch panel or a console command.

**When to use this guide**: When commissioning or troubleshooting, and you want to verify a path actually works by making the route and watching the diagram update.

## Before You Start

Route editing requires a processor whose Essentials version exposes the routing command endpoint. The app checks for it automatically:

- **If editing is available**, port names become clickable buttons that highlight blue on hover.
- **If it isn't**, the diagram looks and behaves exactly as it always has — read-only, no clickable ports. There's no error and nothing to turn on; the processor simply doesn't support it.

Check the **Live** badge in the toolbar before making changes. If it shows "Offline", commands may still execute, but the diagram can't confirm them and every change will show a timeout warning. See [Trace Signal Routes](./trace-signal-routes.md#troubleshooting-live-feedback) for fixing the feedback connection.

## Quick Actions

**To route a source to a display:**
1. Click the **input port name** on the destination device
2. Pick a signal type (skipped if the port only carries one)
3. Pick a source from the list

**To switch a single matrix output:**
1. Click the **output port name** on the matrix
2. Pick a signal type
3. Pick an input port on that same device

**To clear a route:** open either popover and choose **None — clear route**.

## Routing a Source to a Destination

Click an input port on any destination device — a display, a DSP, or a multiview decoder.

The popover asks for two things:

1. **Signal type.** An `AudioVideo` port offers `AudioVideo`, `Audio`, and `Video`, so you can break audio and video away onto separate paths. A port that carries only one type skips this step.
2. **Source.** This list contains only the sources that actually have a physical path to that specific port for that signal type, traced through every tie line and intermediate switcher. If a source isn't listed, no wiring path exists — picking a different signal type may reveal more.

Choosing a source routes it through every midpoint along the way and switches the destination's own input.

**Badges you may see:** a source marked `video only` (or `audio only`) has a path for just half of an `AudioVideo` request. It's still routable — the half with a path gets routed, the other half doesn't.

**A check mark** marks the source currently feeding that port.

## Switching a Midpoint

Click an **output port** on a matrix switcher, DSP, or any other midpoint device. Pick a signal type, then pick one of that device's own input ports.

This switches that one device only. Nothing upstream or downstream is touched, and no path is traced — which is exactly what you want when you're testing a single switcher in isolation. Input ports that can't carry the chosen signal type aren't listed.

## Routing Multiview Tiles

Multiview decoder tiles can be routed two ways:

- **From the device node** — tiles appear as input ports labeled `Tile 1`, `Tile 2`, and so on. Click one like any other input port.
- **From the layout panel** — open the device's layout panel with the grid button in its node header, then hover a tile and click the pencil badge in its corner.

Both open the same popover and behave identically. The candidate list is specific to the tile you picked, not to the decoder as a whole.

## Clearing a Route

Choose **None — clear route** at the top of either popover.

On a destination, this tears down the route through every midpoint feeding it *and* deselects the destination's own input, so the display stops showing its last source rather than freezing on it. On a midpoint output, it clears just that output.

## Confirming a Change Took Effect

Routes don't complete instantly. The processor validates the request, then runs it through a serialized routing queue — and a display that's still cooling down can hold its request until the cooldown finishes.

So after you commit a change, the port shows a **pulsing blue dot** while it waits for the processor to confirm. When confirmation arrives over the live feedback connection, the dot disappears and the diagram redraws with the new route.

An **amber `!`** means no confirmation arrived within about ten seconds. That doesn't necessarily mean the route failed — check whether the Live badge went offline, and use the **Refresh** button to reload the current state.

## When a Route Is Refused

If the processor rejects the command, the popover stays open with the reason:

| Message | What it means |
|---|---|
| No path exists… | The tie-line graph has no wiring path for that signal type. Nothing to retry. |
| …does not implement… | The device can't perform the requested kind of switch. |
| …has no input/output port… | The port key no longer exists — hit **Refresh** to reload the diagram. |
| …carries *X*, which cannot serve a *Y* request… | The port can't carry that signal type. Pick a narrower type. |
| Could not reach the processor. | Network or session problem — see [Troubleshoot Connection](./troubleshoot-connection.md). |

An empty source list is not an error. It means exactly what it says: nothing is wired to reach that port with that signal type.

## Notes and Gotchas

- **Clicking a port name opens the popover; clicking anywhere else on a device still traces its signal path.** The two interactions don't interfere.
- **Panning or zooming the canvas closes the popover**, since it's anchored to a fixed screen position rather than to the canvas.
- **Audio-only requests may execute as AudioVideo** when every port along the path is declared `AudioVideo`. The processor routes what the ports support; it can't break away signals the hardware doesn't separate.
- **Source ports are never clickable** — routing is always driven from the destination or midpoint end.
- **Filters don't limit what you can route.** Hiding a device or signal type changes only the view; the source list always reflects the real wiring.

## Related

- [Trace Signal Routes and Read the Routing Diagram](./trace-signal-routes.md) — reading the diagram, filtering, and tracing existing paths
- [UI Components Reference](../reference/ui-components.md#routing-diagram) — version requirements and component details
- [API Endpoints Reference](../reference/api-endpoints.md) — the underlying routing command endpoint
