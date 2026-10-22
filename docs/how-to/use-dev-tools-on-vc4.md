# How to Use Dev Tools on Virtual Control (VC-4)

**Problem**: You want to use Dev Tools with an Essentials program running in a Crestron Virtual Control (VC-4) room.

**When to use this guide**: When you're setting up a VC-4 server for Dev Tools, or when Dev Tools on VC-4 loads but the Debug Console, live routing or the Mobile Control UI won't connect.

## Requirements

- An Essentials 3.0 build that places Dev Tools in the room's own `Html` folder ([PepperDash/Essentials#1532](https://github.com/PepperDash/Essentials/pull/1532)) and can start its secure WebSockets on VC-4 ([PepperDash/Essentials#1533](https://github.com/PepperDash/Essentials/pull/1533)). Earlier builds show a blank page, or fail to start Debug Console and routing sessions.
- `sudo` access on the VC-4 server, to open firewall ports.

## Open Dev Tools

Each VC-4 room has its own Dev Tools address:

```
https://[vc4-server]/VirtualControl/Rooms/[RoomId]/cws/debug/
```

`[RoomId]` is the room's ID from the **Program Instances** page of the VC-4 web interface, for example `DEMOV3`.

The browser shows a security warning for the server's certificate the first time. Accept it to continue.

**Signing in**: VC-4 already controls access to the room, so a room usually has Crestron authentication turned off. Dev Tools then accepts any username and password. The application selector in the top bar shows the room ID where a 4-series shows `app01` to `app10`.

## Open the Firewall Ports

The pages load over HTTPS on port 443, which VC-4 already allows. The Debug Console, live routing and the Mobile Control UI each connect to Essentials on a port of their own, and the VC-4 server's firewall blocks those until you open them:

| Port                                                    | Used by                    | Needed for                                      |
| ------------------------------------------------------- | -------------------------- | ----------------------------------------------- |
| 65435–65534/tcp                                         | Debug console WebSocket    | **Debug Console** page                          |
| 65335–65433/tcp                                         | Routing feedback WebSocket | Live updates on the **Routing** page            |
| The Mobile Control direct server port, 50002 by default | Mobile Control UI          | Opening the UI from the **Mobile Control** page |

The two WebSocket servers pick a random port in their range the first time a session starts, so open the whole range rather than a single port.

On a server that uses firewalld:

```bash
sudo firewall-cmd --permanent --add-port=65335-65534/tcp
sudo firewall-cmd --permanent --add-port=50002/tcp
sudo firewall-cmd --reload
sudo firewall-cmd --list-ports
```

The last command should list `65335-65534/tcp` and `50002/tcp`.

**More than one room on the server**: every room shares the WebSocket ranges, so the rule above covers all of them. Each room's Mobile Control direct server needs its own port, set in that room's `appServer` device under `directServer.port`, and its own firewall rule.

## Accept the WebSocket Certificate

The Debug Console and routing WebSockets use the room's self-signed certificate. Browsers ask you to trust a self-signed certificate separately for each port, so the first connection to a new port can fail even after you accepted the certificate for the page.

When that happens, Dev Tools shows a link to the WebSocket's address:

1. Open the link and accept the certificate warning.
2. Return to Dev Tools and start the session again.

The ports are chosen again when the program restarts, so you may need to do this again after a restart.

## Troubleshooting

### The page is blank

The browser loaded the page but not its scripts. The room is running an Essentials build, or a Dev Tools build, from before VC-4 support. Load a build that meets the [requirements](#requirements).

### "Failed to start WebSocket debug server" or "Failed to start routing feedback WebSocket server"

The room's Essentials build looks for its certificate in `/user`, which doesn't exist on VC-4. Load a build that meets the [requirements](#requirements).

### The Debug Console or routing never connects

Check the firewall first. On the VC-4 server:

```bash
sudo firewall-cmd --list-ports
sudo ss -ltnp | grep -E ':(653[3-9][0-9]|654[0-9][0-9]|655[0-3][0-9])\b'
```

- If the port range is missing from the firewall list, add it as shown [above](#open-the-firewall-ports).
- If `ss` shows the room listening and the range is open, [accept the WebSocket certificate](#accept-the-websocket-certificate).

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
