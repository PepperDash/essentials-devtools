# How to Use Dev Tools on Virtual Control (VC-4)

**Problem**: You want to use Dev Tools with an Essentials program running in a Crestron Virtual Control (VC-4) room.

**When to use this guide**: When you're setting up a VC-4 server for Dev Tools, or when Dev Tools on VC-4 loads but the Debug Console, live routing or the Mobile Control UI won't connect.

## Requirements

- An Essentials 3.0 build that places Dev Tools in the room's own `Html` folder ([PepperDash/Essentials#1532](https://github.com/PepperDash/Essentials/pull/1532)) and serves the Debug Console and routing feedback over HTTP polling ([PepperDash/Essentials#1536](https://github.com/PepperDash/Essentials/pull/1536)). Earlier builds show a blank page, or the Debug Console and routing never connect.
- `sudo` access on the VC-4 server, to open the Mobile Control port.

## Open Dev Tools

Each VC-4 room has its own Dev Tools address:

```
https://[vc4-server]/VirtualControl/Rooms/[RoomId]/cws/debug/
```

`[RoomId]` is the room's ID from the **Program Instances** page of the VC-4 web interface, for example `DEMOV3`.

The browser shows a security warning for the server's certificate the first time. Accept it to continue.

**Signing in**: VC-4 already controls access to the room, so a room usually has Crestron authentication turned off. Dev Tools then accepts any username and password. The application selector in the top bar shows the room ID where a 4-series shows `app01` to `app10`.

## How the Debug Console and Routing Connect

On a 4-series processor, the Debug Console and live routing each use a WebSocket on a port of its own. A VC-4 server's firewall only opens 443, so on VC-4 Dev Tools reads both over HTTPS instead. It long-polls the `debugSession/messages` and `routingFeedbackSession/messages` routes on the same port as every other page. Nothing needs opening in the firewall, and there's no separate certificate to accept.

Log lines and route changes still show up within about a second. The difference from a processor is a request every few seconds while a page is open.

## Open the Mobile Control Port

The Mobile Control UI is served by the room's Mobile Control direct server, on a port of its own: 50002 by default. Open it in the VC-4 server's firewall before using the UI from the **Mobile Control** page.

On a server that uses firewalld:

```bash
sudo firewall-cmd --permanent --add-port=50002/tcp
sudo firewall-cmd --reload
sudo firewall-cmd --list-ports
```

The last command should list `50002/tcp`.

**More than one room on the server**: each room's Mobile Control direct server needs its own port, set in that room's `appServer` device under `directServer.port`, and its own firewall rule.

**Earlier setups**: an older version of this guide opened `65335-65534/tcp` for the WebSockets. Builds that poll don't use those ports, so you can remove the rule:

```bash
sudo firewall-cmd --permanent --remove-port=65335-65534/tcp
sudo firewall-cmd --reload
```

## Troubleshooting

### The page is blank

The browser loaded the page but not its scripts. The room is running an Essentials build, or a Dev Tools build, from before VC-4 support. Load a build that meets the [requirements](#requirements).

### The Debug Console or routing never connects

Check that the room's Essentials build has the polling routes. This should return JSON with a `next` field:

```bash
curl -sk https://[vc4-server]/VirtualControl/Rooms/[RoomId]/cws/api/debugSession/messages
```

A `404` means the build is from before HTTP polling. Load a build that meets the [requirements](#requirements). The browser's developer console logs `[poll]` warnings for any request that fails.

### The Mobile Control UI link won't open

Check that the room's direct server port is open in the firewall, and that the room is listening on it:

```bash
sudo ss -ltnp | grep 50002
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:50002/mc/app
```

A `200` from the server itself while the browser can't connect means the firewall is blocking the port.

## Related Guides

- [Troubleshooting Connection Issues](./troubleshoot-connection.md)
- [API Endpoints Reference](../reference/api-endpoints.md)
