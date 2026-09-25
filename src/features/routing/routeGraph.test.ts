import { describe, expect, it } from "vitest";

import { RoutingDevice, RoutingDevicesAndTieLines, TieLine } from "../../store/apiSlice";
import {
  buildRouteIndex,
  describeNoCandidates,
  findCandidateSources,
  findReachableUpstreamDevices,
  isMidpoint,
  isPureSource,
  isRouteDestination,
} from "./routeGraph";

// ─── Fixture helpers ─────────────────────────────────────────────────────────

type Role = "source" | "sink" | "midpoint" | "multiview" | "passthrough";

/**
 * Builds a RoutingDevice with the flag combination the backend actually emits for each role.
 *
 * "multiview" is the important one: GetRoutingDevicesAndTieLinesHandler forces HasInputs = true on
 * an IRoutingSinkWithLayouts (which is itself an IRoutingSource), while NOT setting
 * HasInputsAndOutputs, since it is not an IRoutingMidpoint.
 *
 * "passthrough" has both inputs and outputs but is not an IRoutingMidpoint - a device the backend
 * refuses to recurse through.
 */
function device(key: string, role: Role, ports: { in?: string[]; out?: string[] } = {}): RoutingDevice {
  const flags = {
    source: { hasInputs: false, hasOutputs: true, hasInputsAndOutputs: false },
    sink: { hasInputs: true, hasOutputs: false, hasInputsAndOutputs: false },
    midpoint: { hasInputs: true, hasOutputs: true, hasInputsAndOutputs: true },
    multiview: { hasInputs: true, hasOutputs: true, hasInputsAndOutputs: false },
    passthrough: { hasInputs: true, hasOutputs: true, hasInputsAndOutputs: false },
  }[role];

  return {
    key,
    name: key,
    ...flags,
    inputPorts: (ports.in ?? []).map((k) => ({
      key: k,
      signalType: "AudioVideo",
      connectionType: "Hdmi",
      isInternal: false,
    })),
    outputPorts: (ports.out ?? []).map((k) => ({
      key: k,
      signalType: "AudioVideo",
      connectionType: "Hdmi",
      isInternal: false,
    })),
  };
}

function tie(
  sourceDeviceKey: string,
  sourcePortKey: string,
  destinationDeviceKey: string,
  destinationPortKey: string,
  signalType = "AudioVideo",
): TieLine {
  return {
    sourceDeviceKey,
    sourcePortKey,
    destinationDeviceKey,
    destinationPortKey,
    signalType,
    isInternal: false,
  };
}

function system(devices: RoutingDevice[], tieLines: TieLine[]): RoutingDevicesAndTieLines {
  return { devices, tieLines, currentRoutes: [], sinkCurrentSources: [] };
}

const keysOf = (candidates: { deviceKey: string }[]) => candidates.map((c) => c.deviceKey).sort();

// ─── Role inference ──────────────────────────────────────────────────────────

describe("device roles", () => {
  it("treats a multiview parent as a route destination, not a midpoint", () => {
    const mv = device("nvx-decoder", "multiview");
    expect(isMidpoint(mv)).toBe(false);
    expect(isRouteDestination(mv)).toBe(true);
    expect(isPureSource(mv)).toBe(false);
  });

  it("classifies pure sources, sinks and midpoints", () => {
    expect(isPureSource(device("laptop", "source"))).toBe(true);
    expect(isRouteDestination(device("display", "sink"))).toBe(true);
    expect(isMidpoint(device("matrix", "midpoint"))).toBe(true);
    expect(isRouteDestination(device("matrix", "midpoint"))).toBe(false);
  });
});

// ─── Traversal ───────────────────────────────────────────────────────────────

describe("findCandidateSources", () => {
  it("finds a directly tied source", () => {
    const index = buildRouteIndex(
      system(
        [device("laptop", "source", { out: ["out1"] }), device("display", "sink", { in: ["hdmi1"] })],
        [tie("laptop", "out1", "display", "hdmi1")],
      ),
    );
    expect(keysOf(findCandidateSources(index, "display", "hdmi1", "AudioVideo"))).toEqual([
      "laptop",
    ]);
  });

  it("walks back through a midpoint to the source behind it", () => {
    const index = buildRouteIndex(
      system(
        [
          device("laptop", "source", { out: ["out1"] }),
          device("matrix", "midpoint", { in: ["in1"], out: ["out1"] }),
          device("display", "sink", { in: ["hdmi1"] }),
        ],
        [tie("laptop", "out1", "matrix", "in1"), tie("matrix", "out1", "display", "hdmi1")],
      ),
    );
    // Both the matrix (direct tie) and the laptop (through the matrix) are offerable.
    expect(keysOf(findCandidateSources(index, "display", "hdmi1", "AudioVideo"))).toEqual([
      "laptop",
      "matrix",
    ]);
  });

  it("stops at a non-midpoint passthrough, hiding what feeds it", () => {
    // Mirrors Extensions.cs:653 - the backend only recurses through IRoutingMidpoint.
    const index = buildRouteIndex(
      system(
        [
          device("laptop", "source", { out: ["out1"] }),
          device("scaler", "passthrough", { in: ["in1"], out: ["out1"] }),
          device("display", "sink", { in: ["hdmi1"] }),
        ],
        [tie("laptop", "out1", "scaler", "in1"), tie("scaler", "out1", "display", "hdmi1")],
      ),
    );
    expect(keysOf(findCandidateSources(index, "display", "hdmi1", "AudioVideo"))).toEqual([
      "scaler",
    ]);
  });

  it("gates on signal type, with AudioVideo satisfying both halves", () => {
    const index = buildRouteIndex(
      system(
        [
          device("cam", "source", { out: ["out1"] }),
          device("mic", "source", { out: ["out1"] }),
          device("av-src", "source", { out: ["out1"] }),
          device("display", "sink", { in: ["hdmi1"] }),
        ],
        [
          tie("cam", "out1", "display", "hdmi1", "Video"),
          tie("mic", "out1", "display", "hdmi1", "Audio"),
          tie("av-src", "out1", "display", "hdmi1", "AudioVideo"),
        ],
      ),
    );

    expect(keysOf(findCandidateSources(index, "display", "hdmi1", "Video"))).toEqual([
      "av-src",
      "cam",
    ]);
    expect(keysOf(findCandidateSources(index, "display", "hdmi1", "Audio"))).toEqual([
      "av-src",
      "mic",
    ]);
    // An AudioVideo request matches anything carrying either half.
    expect(keysOf(findCandidateSources(index, "display", "hdmi1", "AudioVideo"))).toEqual([
      "av-src",
      "cam",
      "mic",
    ]);
  });

  it("reports partial matches so the UI can badge them", () => {
    const index = buildRouteIndex(
      system(
        [
          device("cam", "source", { out: ["out1"] }),
          device("av-src", "source", { out: ["out1"] }),
          device("display", "sink", { in: ["hdmi1"] }),
        ],
        [
          tie("cam", "out1", "display", "hdmi1", "Video"),
          tie("av-src", "out1", "display", "hdmi1", "AudioVideo"),
        ],
      ),
    );

    const byKey = new Map(
      findCandidateSources(index, "display", "hdmi1", "AudioVideo").map((c) => [
        c.deviceKey,
        c.matchedFlags,
      ]),
    );
    expect(byKey.get("cam")).toEqual(["Video"]);
    expect(byKey.get("av-src")).toEqual(["Audio", "Video"]);
  });

  it("constrains on the destination port", () => {
    const index = buildRouteIndex(
      system(
        [
          device("laptop", "source", { out: ["out1"] }),
          device("bluray", "source", { out: ["out1"] }),
          device("display", "sink", { in: ["hdmi1", "hdmi2"] }),
        ],
        [tie("laptop", "out1", "display", "hdmi1"), tie("bluray", "out1", "display", "hdmi2")],
      ),
    );
    expect(keysOf(findCandidateSources(index, "display", "hdmi1", "AudioVideo"))).toEqual([
      "laptop",
    ]);
    expect(keysOf(findCandidateSources(index, "display", "hdmi2", "AudioVideo"))).toEqual([
      "bluray",
    ]);
  });

  it("is not port-constrained past the first hop", () => {
    // Extensions.cs:677-678 recurses with destinationPort = null, so a source on ANY input of an
    // upstream matrix reaches a destination tied to one specific matrix output.
    const index = buildRouteIndex(
      system(
        [
          device("laptop", "source", { out: ["out1"] }),
          device("bluray", "source", { out: ["out1"] }),
          device("matrix", "midpoint", { in: ["in1", "in2"], out: ["out1"] }),
          device("display", "sink", { in: ["hdmi1"] }),
        ],
        [
          tie("laptop", "out1", "matrix", "in1"),
          tie("bluray", "out1", "matrix", "in2"),
          tie("matrix", "out1", "display", "hdmi1"),
        ],
      ),
    );
    expect(keysOf(findCandidateSources(index, "display", "hdmi1", "AudioVideo"))).toEqual([
      "bluray",
      "laptop",
      "matrix",
    ]);
  });

  it("terminates on a cycle between two matrices", () => {
    const index = buildRouteIndex(
      system(
        [
          device("laptop", "source", { out: ["out1"] }),
          device("mtx-a", "midpoint", { in: ["in1", "in2"], out: ["out1", "out2"] }),
          device("mtx-b", "midpoint", { in: ["in1"], out: ["out1", "out2"] }),
          device("display", "sink", { in: ["hdmi1"] }),
        ],
        [
          tie("laptop", "out1", "mtx-a", "in1"),
          tie("mtx-a", "out1", "mtx-b", "in1"),
          tie("mtx-b", "out1", "mtx-a", "in2"), // back edge
          tie("mtx-b", "out2", "display", "hdmi1"),
        ],
      ),
    );
    expect(keysOf(findCandidateSources(index, "display", "hdmi1", "AudioVideo"))).toEqual([
      "laptop",
      "mtx-a",
      "mtx-b",
    ]);
  });

  it("never offers the destination device as its own source", () => {
    const index = buildRouteIndex(
      system(
        [
          device("mtx", "midpoint", { in: ["in1"], out: ["out1"] }),
          device("display", "sink", { in: ["hdmi1"] }),
        ],
        // A loop back onto the destination itself.
        [tie("display", "hdmi1", "mtx", "in1"), tie("mtx", "out1", "display", "hdmi1")],
      ),
    );
    expect(keysOf(findCandidateSources(index, "display", "hdmi1", "AudioVideo"))).toEqual(["mtx"]);
  });

  it("sorts pure sources first, then by name", () => {
    const index = buildRouteIndex(
      system(
        [
          device("zebra", "source", { out: ["out1"] }),
          device("apple", "source", { out: ["out1"] }),
          device("matrix", "midpoint", { in: ["in1", "in2"], out: ["out1"] }),
          device("display", "sink", { in: ["hdmi1"] }),
        ],
        [
          tie("zebra", "out1", "matrix", "in1"),
          tie("apple", "out1", "matrix", "in2"),
          tie("matrix", "out1", "display", "hdmi1"),
        ],
      ),
    );
    expect(
      findCandidateSources(index, "display", "hdmi1", "AudioVideo").map((c) => c.deviceKey),
    ).toEqual(["apple", "zebra", "matrix"]);
  });

  it("ignores tie lines naming a device the read API filtered out", () => {
    const index = buildRouteIndex(
      system(
        [device("display", "sink", { in: ["hdmi1"] })],
        [tie("ghost", "out1", "display", "hdmi1")],
      ),
    );
    expect(findCandidateSources(index, "display", "hdmi1", "AudioVideo")).toEqual([]);
  });

  it("returns nothing for an empty signal type", () => {
    const index = buildRouteIndex(
      system(
        [device("laptop", "source", { out: ["out1"] }), device("display", "sink", { in: ["hdmi1"] })],
        [tie("laptop", "out1", "display", "hdmi1")],
      ),
    );
    expect(findCandidateSources(index, "display", "hdmi1", "")).toEqual([]);
  });
});

// ─── Multiview ───────────────────────────────────────────────────────────────

describe("multiview tiles", () => {
  // Tie lines targeting a tile child are remapped onto the parent with a "tile{N}:" qualified port
  // key by RoutingGraphHelpers.QualifyTilePortKey, so tiles need no special-casing here - the
  // port-specific BFS seed does the work.
  const index = buildRouteIndex(
    system(
      [
        device("cam-1", "source", { out: ["out1"] }),
        device("cam-2", "source", { out: ["out1"] }),
        device("nvx-decoder", "multiview", { in: ["tile1:tileInput", "tile2:tileInput"] }),
      ],
      [
        tie("cam-1", "out1", "nvx-decoder", "tile1:tileInput"),
        tie("cam-2", "out1", "nvx-decoder", "tile2:tileInput"),
      ],
    ),
  );

  it("resolves different candidates per tile", () => {
    expect(
      keysOf(findCandidateSources(index, "nvx-decoder", "tile1:tileInput", "AudioVideo")),
    ).toEqual(["cam-1"]);
    expect(
      keysOf(findCandidateSources(index, "nvx-decoder", "tile2:tileInput", "AudioVideo")),
    ).toEqual(["cam-2"]);
  });

  it("returns every tile's sources when no port is specified", () => {
    expect(keysOf(findCandidateSources(index, "nvx-decoder", null, "AudioVideo"))).toEqual([
      "cam-1",
      "cam-2",
    ]);
  });
});

// ─── Performance ─────────────────────────────────────────────────────────────

describe("performance", () => {
  it("sweeps a 400-device / ~2000-tie-line system quickly", () => {
    const devices: RoutingDevice[] = [];
    const tieLines: TieLine[] = [];

    // 4 chained matrices, 300 sources fanning into the first, 96 sinks off the last.
    for (let m = 0; m < 4; m++) {
      devices.push(
        device(`mtx-${m}`, "midpoint", {
          in: Array.from({ length: 300 }, (_, i) => `in${i}`),
          out: Array.from({ length: 300 }, (_, i) => `out${i}`),
        }),
      );
      if (m > 0) {
        for (let i = 0; i < 300; i++) {
          tieLines.push(tie(`mtx-${m - 1}`, `out${i}`, `mtx-${m}`, `in${i}`));
        }
      }
    }
    for (let s = 0; s < 300; s++) {
      devices.push(device(`src-${s}`, "source", { out: ["out1"] }));
      tieLines.push(tie(`src-${s}`, "out1", "mtx-0", `in${s}`));
    }
    for (let d = 0; d < 96; d++) {
      devices.push(device(`sink-${d}`, "sink", { in: ["hdmi1"] }));
      tieLines.push(tie("mtx-3", `out${d}`, `sink-${d}`, "hdmi1"));
    }

    const start = performance.now();
    const index = buildRouteIndex(system(devices, tieLines));
    const candidates = findCandidateSources(index, "sink-0", "hdmi1", "AudioVideo");
    const elapsed = performance.now() - start;

    expect(candidates).toHaveLength(300 + 4); // every source, plus all four matrices
    // Generous bound - this is a smoke test against accidental O(n^2), not a benchmark.
    expect(elapsed).toBeLessThan(1000);
  });
});

// ─── Raw traversal ───────────────────────────────────────────────────────────

describe("findReachableUpstreamDevices", () => {
  it("returns a set containing only upstream devices for the requested atom", () => {
    const index = buildRouteIndex(
      system(
        [
          device("cam", "source", { out: ["out1"] }),
          device("mic", "source", { out: ["out1"] }),
          device("display", "sink", { in: ["hdmi1"] }),
        ],
        [
          tie("cam", "out1", "display", "hdmi1", "Video"),
          tie("mic", "out1", "display", "hdmi1", "Audio"),
        ],
      ),
    );
    expect(Array.from(findReachableUpstreamDevices(index, "display", "hdmi1", "Video"))).toEqual([
      "cam",
    ]);
    expect(Array.from(findReachableUpstreamDevices(index, "display", "hdmi1", "Audio"))).toEqual([
      "mic",
    ]);
    expect(findReachableUpstreamDevices(index, "display", "hdmi1", "Usb").size).toBe(0);
  });
});

// ─── Empty-state diagnosis ───────────────────────────────────────────────────

describe("describeNoCandidates", () => {
  const index = buildRouteIndex(
    system(
      [
        device("cam", "source", { out: ["out1"] }),
        device("display", "sink", { in: ["hdmi1", "hdmi2"] }),
      ],
      [tie("cam", "out1", "display", "hdmi1", "Video")],
    ),
  );

  it("reports an unwired port as a configuration gap", () => {
    expect(describeNoCandidates(index, "display", "hdmi2", "AudioVideo")).toMatch(
      /Nothing is wired to this input/,
    );
  });

  it("reports a wired port carrying a disjoint type, naming what it does carry", () => {
    const message = describeNoCandidates(index, "display", "hdmi1", "Audio");
    expect(message).toMatch(/wired for Video/);
    expect(message).toMatch(/carries no part of Audio/);
  });

  // A candidate qualifies on ANY matching atom, so a Video tie line still answers an AudioVideo
  // request - badged "video only". Only a genuinely disjoint request empties the list, which is
  // what the wording above has to reflect.
  it("does not claim a narrower overlap is empty, because it is not", () => {
    expect(findCandidateSources(index, "display", "hdmi1", "AudioVideo")).toHaveLength(1);
    expect(findCandidateSources(index, "display", "hdmi1", "Video")).toHaveLength(1);
  });

  // The two cases are exhaustive: a tie line sharing any atom with the request always contributes
  // at least its own source, so the list could not have been empty.
  it("only ever explains a genuinely empty list", () => {
    expect(findCandidateSources(index, "display", "hdmi1", "Audio")).toHaveLength(0);
    expect(findCandidateSources(index, "display", "hdmi2", "Video")).toHaveLength(0);
  });
});
