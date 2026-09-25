import { describe, expect, it } from "vitest";

import {
  clearMidpointOutputCommand,
  clearSinkCommand,
  describeRoutingError,
  midpointSwitchCommand,
  ROUTING_COMMAND_PATH,
  sinkRouteCommand,
} from "./routingCommands";

// These assertions are deliberately literal. They are the only thing standing between a rename on
// the C# side (RoutingCommandRequest in PepperDash.Essentials.Core/Web) and a silently broken
// endpoint, since the request is never type-checked across the wire.
describe("command builders emit the exact wire shape", () => {
  it("sinkRoute", () => {
    expect(sinkRouteCommand("display-1", "hdmiIn1", "laptop-1", "AudioVideo")).toEqual({
      command: "sinkRoute",
      deviceKey: "display-1",
      inputPortKey: "hdmiIn1",
      sourceDeviceKey: "laptop-1",
      signalType: "AudioVideo",
    });
  });

  it("sinkRoute omits sourcePortKey, letting the processor discover the path", () => {
    expect(sinkRouteCommand("display-1", "hdmiIn1", "laptop-1", "Video")).not.toHaveProperty(
      "sourcePortKey",
    );
  });

  it("sinkRoute carries a multiview-qualified port key verbatim", () => {
    expect(
      sinkRouteCommand("nvx-decoder-1", "tile2:tileInput", "cam-1", "Video").inputPortKey,
    ).toBe("tile2:tileInput");
  });

  it("midpointSwitch", () => {
    expect(midpointSwitchCommand("dm-chassis-1", "inputCard3", "outputCard5", "Video")).toEqual({
      command: "midpointSwitch",
      deviceKey: "dm-chassis-1",
      inputPortKey: "inputCard3",
      outputPortKey: "outputCard5",
      signalType: "Video",
    });
  });

  it("clearSink also deselects the sink's own input", () => {
    expect(clearSinkCommand("display-1", "hdmiIn1")).toEqual({
      command: "clearSink",
      deviceKey: "display-1",
      inputPortKey: "hdmiIn1",
      clearSinkInput: true,
    });
  });

  it("clearMidpointOutput", () => {
    expect(clearMidpointOutputCommand("dm-chassis-1", "outputCard5", "AudioVideo")).toEqual({
      command: "clearMidpointOutput",
      deviceKey: "dm-chassis-1",
      outputPortKey: "outputCard5",
      signalType: "AudioVideo",
    });
  });

  it("uses the agreed endpoint path", () => {
    expect(ROUTING_COMMAND_PATH).toBe("routingCommand");
  });
});

describe("describeRoutingError", () => {
  it("prefers the endpoint's structured message", () => {
    const error = {
      status: 409,
      data: {
        status: "error",
        error: { code: "noRouteFound", message: "No path from laptop-1 to display-1 for Video." },
      },
    };
    expect(describeRoutingError(error)).toBe("No path from laptop-1 to display-1 for Video.");
  });

  it("falls back to the status code when there is no body", () => {
    expect(describeRoutingError({ status: 500 })).toBe("Routing command failed (500).");
  });

  it("reports a transport failure plainly", () => {
    expect(describeRoutingError({ status: "FETCH_ERROR" })).toBe(
      "Could not reach the processor.",
    );
    expect(describeRoutingError(undefined)).toBe("Could not reach the processor.");
  });
});
