import "@xyflow/react/dist/style.css";

import { skipToken } from "@reduxjs/toolkit/query";
import {
  Background,
  Controls,
  Edge,
  EdgeTypes,
  MiniMap,
  Node,
  NodeTypes,
  ReactFlow,
  useEdgesState,
  useNodesState,
} from "@xyflow/react";
import dagre from "dagre";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Dropdown } from "react-bootstrap";

import { meetsMinVersion } from "../shared/functions/meetsMinimumVersion";
import useAppParams from "../shared/hooks/useAppParams";
import {
  RoutingDevice,
  RoutingDevicesAndTieLines,
  TieLine,
  useGetRoutingDevicesAndTieLinesQuery,
  useGetVersionsQuery,
} from "../store/apiSlice";
import styles from "./Routing.module.scss";
import RoutingDeviceNode, {
  HEADER_PX,
  PORT_ROW_PX,
  RoutingDeviceNodeData,
} from "./RoutingDeviceNode";
import TieLineEdge from "./TieLineEdge";

// ─── Constants ──────────────────────────────────────────────────────────────

const NODE_WIDTH = 280;
const NODE_SEP = 60;
const RANK_SEP = 350;

const SIGNAL_COLORS: Record<string, string> = {
  AudioVideo: "#6f42c1",
  Video: "#0d6efd",
  Audio: "#dc3545",
  "Audio, SecondaryAudio": "#dc3545",
  "UsbOutput, UsbInput": "#fd7e14",
  UsbOutput: "#fd7e14",
  UsbInput: "#fd7e14",
};

const FALLBACK_COLOR = "#adb5bd";

function signalColor(signalType: string): string {
  return SIGNAL_COLORS[signalType] ?? FALLBACK_COLOR;
}

// ─── Dagre layout ────────────────────────────────────────────────────────────

function nodeHeight(device: RoutingDevice): number {
  const rows = Math.max(
    (device.inputPorts ?? []).length,
    (device.outputPorts ?? []).length,
    1,
  );
  return HEADER_PX + rows * PORT_ROW_PX;
}

function makeGraph() {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "LR", nodesep: NODE_SEP, ranksep: RANK_SEP });
  return g;
}

function buildGraph(
  data: RoutingDevicesAndTieLines,
  hiddenTypes: Set<string>,
  hideUnconnected: boolean,
  hiddenDevices: Set<string>,
  hideUnconnectedPorts: boolean,
): { nodes: Node[]; edges: Edge[] } {
  // Devices that appear in at least one *visible* tie line endpoint
  const connectedKeys = new Set<string>(
    data.tieLines
      .filter((tl) => !hiddenTypes.has(tl.signalType))
      .flatMap((tl) => [tl.sourceDeviceKey, tl.destinationDeviceKey]),
  );

  // Tie lines that pass all active filters (used for port-level filtering)
  const visibleTieLines = data.tieLines.filter(
    (tl) =>
      !hiddenTypes.has(tl.signalType) &&
      !hiddenDevices.has(tl.sourceDeviceKey) &&
      !hiddenDevices.has(tl.destinationDeviceKey),
  );
  const connectedPortKeys = hideUnconnectedPorts
    ? new Set<string>(
        visibleTieLines.flatMap((tl) => [
          `${tl.sourceDeviceKey}:${tl.sourcePortKey}`,
          `${tl.destinationDeviceKey}:${tl.destinationPortKey}`,
        ]),
      )
    : null;

  const devices = data.devices.filter((d) => {
    if (hiddenDevices.has(d.key)) return false;
    if (hideUnconnected && !connectedKeys.has(d.key)) return false;
    return true;
  });

  // Filter each device's ports down to only those with active tie lines
  const effectiveDevices = devices.map((d) =>
    connectedPortKeys
      ? {
          ...d,
          inputPorts: (d.inputPorts ?? []).filter((p) =>
            connectedPortKeys.has(`${d.key}:${p.key}`),
          ),
          outputPorts: (d.outputPorts ?? []).filter((p) =>
            connectedPortKeys.has(`${d.key}:${p.key}`),
          ),
        }
      : d,
  );

  const effectiveDeviceKeys = new Set(effectiveDevices.map((d) => d.key));
  // Collect one unique device-pair edge per source→destination (dagre only
  // needs connectivity, not multiplicity, for rank assignment). Only use
  // visible tie lines whose endpoints are present in the visible device set
  // so hidden devices cannot be implicitly added to the layout graph.
  const uniquePairs = [
    ...new Set(
      visibleTieLines
        .filter(
          (tl) =>
            effectiveDeviceKeys.has(tl.sourceDeviceKey) &&
            effectiveDeviceKeys.has(tl.destinationDeviceKey),
        )
        .map((tl) => `${tl.sourceDeviceKey}|${tl.destinationDeviceKey}`),
    ),
  ];

  // ── Pass 1: layout with all edges to detect cross-level (backwards) edges ──
  const g1 = makeGraph();
  for (const device of effectiveDevices) {
    g1.setNode(device.key, { width: NODE_WIDTH, height: nodeHeight(device) });
  }
  for (const pair of uniquePairs) {
    const [src, dst] = pair.split("|");
    g1.setEdge(src, dst);
  }
  dagre.layout(g1);

  // Any edge where the source's computed x is greater than the destination's x
  // (with a small tolerance) is a "backwards" cross-level edge that would pull
  // a midpoint node into a later column. Exclude these from the second pass.
  const backwardPairs = new Set<string>(
    uniquePairs.filter((pair) => {
      const [src, dst] = pair.split("|");
      const sx = g1.node(src)?.x ?? 0;
      const dx = g1.node(dst)?.x ?? 0;
      return sx > dx + 10;
    }),
  );

  // ── Pass 2: layout without backwards edges → correct column alignment ──────
  const g = makeGraph();
  for (const device of effectiveDevices) {
    g.setNode(device.key, { width: NODE_WIDTH, height: nodeHeight(device) });
  }
  for (const pair of uniquePairs) {
    if (!backwardPairs.has(pair)) {
      const [src, dst] = pair.split("|");
      g.setEdge(src, dst);
    }
  }
  dagre.layout(g);

  // Map dagre positions → React Flow nodes
  const nodes: Node<RoutingDeviceNodeData>[] = effectiveDevices.map(
    (device) => {
      const pos = g.node(device.key);
      return {
        id: device.key,
        type: "routingDevice",
        position: {
          x: pos.x - NODE_WIDTH / 2,
          y: pos.y - nodeHeight(device) / 2,
        },
        data: { device },
      };
    },
  );

  // Map tieLines → React Flow edges, filtering by hidden signal types and hidden devices.
  // All tie lines are rendered regardless of whether they were excluded from
  // the layout pass — backwards edges still appear as connections on the canvas.
  const edges: Edge[] = data.tieLines
    .filter(
      (tl) =>
        !hiddenTypes.has(tl.signalType) &&
        !hiddenDevices.has(tl.sourceDeviceKey) &&
        !hiddenDevices.has(tl.destinationDeviceKey),
    )
    .map((tl, idx) => ({
      id: `tl-${idx}-${tl.sourceDeviceKey}-${tl.sourcePortKey}-${tl.destinationDeviceKey}-${tl.destinationPortKey}`,
      source: tl.sourceDeviceKey,
      sourceHandle: tl.sourcePortKey,
      target: tl.destinationDeviceKey,
      targetHandle: tl.destinationPortKey,
      style: { stroke: signalColor(tl.signalType), strokeWidth: 1.5 },
      data: {
        signalColor: signalColor(tl.signalType),
        sourceDeviceKey: tl.sourceDeviceKey,
        sourcePortKey: tl.sourcePortKey,
        destinationDeviceKey: tl.destinationDeviceKey,
        destinationPortKey: tl.destinationPortKey,
        signalType: tl.signalType,
      },
      type: "tieLine",
      animated: false,
    }));

  return { nodes, edges };
}

// ─── Signal type toggle button list ─────────────────────────────────────────

function uniqueSignalTypes(tieLines: TieLine[]): string[] {
  return [...new Set(tieLines.map((tl) => tl.signalType))].sort();
}

// ─── Node types registry (stable reference outside component) ────────────────

const nodeTypes: NodeTypes = {
  routingDevice: RoutingDeviceNode,
};

const edgeTypes: EdgeTypes = {
  tieLine: TieLineEdge,
};

// ─── Component ───────────────────────────────────────────────────────────────

const Routing = () => {
  const { appId } = useAppParams();
  const { data: versions } = useGetVersionsQuery(appId ? { appId } : skipToken);
  const { data, isLoading, isError } = useGetRoutingDevicesAndTieLinesQuery(
    appId ? { appId } : skipToken,
  );

  const [hiddenTypes, setHiddenTypes] = useState<Set<string>>(new Set());
  const [hideUnconnected, setHideUnconnected] = useState(false);
  const [hiddenDevices, setHiddenDevices] = useState<Set<string>>(new Set());
  const [deviceSearch, setDeviceSearch] = useState("");
  const [hideUnconnectedPorts, setHideUnconnectedPorts] = useState(false);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(true);

  const sortedDevices = useMemo(
    () =>
      [...(data?.devices ?? [])].sort((a, b) =>
        (a.name || a.key).localeCompare(b.name || b.key),
      ),
    [data],
  );

  const filteredDropdownDevices = useMemo(() => {
    const q = deviceSearch.toLowerCase();
    if (!q) return sortedDevices;
    return sortedDevices.filter(
      (d) =>
        d.key.toLowerCase().includes(q) || d.name.toLowerCase().includes(q),
    );
  }, [sortedDevices, deviceSearch]);

  const signalTypes = useMemo(
    () => (data ? uniqueSignalTypes(data.tieLines) : []),
    [data],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges] = useEdgesState<Edge>([]);

  // Re-run dagre layout only when the source data or filters change.
  // Using useEffect (not useMemo) means React Flow owns the node array
  // between renders, so drag positions are preserved.
  useEffect(() => {
    if (!data) return;
    const { nodes: layoutNodes, edges: layoutEdges } = buildGraph(
      data,
      hiddenTypes,
      hideUnconnected,
      hiddenDevices,
      hideUnconnectedPorts,
    );
    setNodes(
      layoutNodes.map((n) => ({
        ...n,
        data: {
          ...n.data,
          darkMode,
          onHide: () =>
            setHiddenDevices((prev) => {
              const next = new Set(prev);
              next.add(n.id);
              return next;
            }),
        },
      })),
    );
    setEdges(layoutEdges);
    setSelectedEdgeId(null);
  }, [
    data,
    hiddenTypes,
    hideUnconnected,
    hiddenDevices,
    hideUnconnectedPorts,
    darkMode,
    setNodes,
    setEdges,
  ]);

  // Re-style edges when selection changes without triggering a layout rebuild.
  useEffect(() => {
    setEdges((eds) =>
      eds.map((e) => {
        const baseColor =
          (e.data as { signalColor?: string } | undefined)?.signalColor ??
          FALLBACK_COLOR;
        const isSelected = selectedEdgeId !== null && e.id === selectedEdgeId;
        if (selectedEdgeId === null) {
          return {
            ...e,
            data: { ...e.data, selected: false },
            style: { stroke: baseColor, strokeWidth: 1.5 },
          };
        }
        return {
          ...e,
          data: { ...e.data, selected: isSelected },
          style: {
            stroke: isSelected ? baseColor : "#ccc",
            strokeWidth: isSelected ? 3.5 : 1.5,
            opacity: isSelected ? 1 : 0.35,
          },
        };
      }),
    );
  }, [selectedEdgeId, setEdges]);

  const onEdgeClick = useCallback(
    (_: React.MouseEvent, edge: Edge) =>
      setSelectedEdgeId((prev) => (prev === edge.id ? null : edge.id)),
    [],
  );

  const onPaneClick = useCallback(() => setSelectedEdgeId(null), []);

  const onEdgeMouseEnter = useCallback(
    (_: React.MouseEvent, edge: Edge) =>
      setEdges((eds) => {
        if (eds.some((e) => e.data?.selected)) return eds;
        return eds.map((e) =>
          e.id === edge.id ? { ...e, data: { ...e.data, hovered: true } } : e,
        );
      }),
    [setEdges],
  );

  const onEdgeMouseLeave = useCallback(
    (_: React.MouseEvent, edge: Edge) =>
      setEdges((eds) =>
        eds.map((e) =>
          e.id === edge.id ? { ...e, data: { ...e.data, hovered: false } } : e,
        ),
      ),
    [setEdges],
  );

  function toggleSignalType(type: string) {
    setHiddenTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  }

  function toggleDevice(key: string) {
    setHiddenDevices((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  function selectAllDevices() {
    setHiddenDevices(new Set());
  }

  function deselectAllDevices() {
    setHiddenDevices(new Set((data?.devices ?? []).map((d) => d.key)));
  }

  const visibleDeviceCount = (data?.devices.length ?? 0) - hiddenDevices.size;

  if (isLoading) return <div className="p-3">Loading routing data…</div>;
  if (isError || !data)
    return <div className="p-3 text-danger">Failed to load routing data.</div>;

  if (
    versions &&
    !versions.some(
      (v) =>
        v.Name === "PepperDashEssentials.dll" &&
        meetsMinVersion(v.Version, "2.29"),
    )
  ) {
    return (
      <div className="p-3 text-danger">
        Routing feature is not available for this version.
      </div>
    );
  }

  return (
    <div className="h-100 d-flex flex-column overflow-hidden">
      {/* Signal type filter bar */}
      <div className="d-flex flex-wrap gap-2 p-2 border-bottom align-items-center gap-3">
        <div className="d-flex align-items-center gap-1">
          <span className={`fw-semibold me-1 ${styles.signalTypesLabel}`}>
            Signal&nbsp;types:
          </span>
          {/* Device filter dropdown */}

          {signalTypes.map((type) => {
            const hidden = hiddenTypes.has(type);
            const color = signalColor(type);
            return (
              <button
                key={type}
                className={`btn btn-sm ${styles.signalTypeBtn}${hidden ? ` ${styles.signalTypeBtnHidden}` : ""}`}
                style={{ "--signal-color": color } as React.CSSProperties}
                onClick={() => toggleSignalType(type)}
                title={hidden ? `Show ${type}` : `Hide ${type}`}
              >
                {type}
              </button>
            );
          })}
        </div>
        <div className="d-flex align-items-center gap-1">
          <span className={`fw-semibold me-1 ${styles.signalTypesLabel}`}>
            Filters:
          </span>
          <Dropdown autoClose="outside">
            <Dropdown.Toggle
              size="sm"
              variant={hiddenDevices.size > 0 ? "warning" : "outline-secondary"}
              className={styles.dropdownToggle}
            >
              Devices ({visibleDeviceCount}/{data.devices.length})
            </Dropdown.Toggle>
            <Dropdown.Menu className={styles.dropdownMenu}>
              <div className="p-2 border-bottom">
                <input
                  className="form-control form-control-sm"
                  placeholder="Search devices…"
                  value={deviceSearch}
                  onChange={(e) => setDeviceSearch(e.target.value)}
                />
                <div className="d-flex gap-2 mt-1">
                  <button
                    className={`btn btn-link btn-sm p-0 ${styles.dropdownAction}`}
                    onClick={selectAllDevices}
                  >
                    Select all
                  </button>
                  <button
                    className={`btn btn-link btn-sm p-0 ${styles.dropdownAction}`}
                    onClick={deselectAllDevices}
                  >
                    Deselect all
                  </button>
                </div>
              </div>
              <div className={styles.deviceListScroller}>
                {filteredDropdownDevices.map((device, idx) => (
                  <div
                    key={`${idx}-${device.key}`}
                    className={`form-check px-3 py-1 ${styles.deviceItem}`}
                  >
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id={`dev-chk-${device.key}`}
                      checked={!hiddenDevices.has(device.key)}
                      onChange={() => toggleDevice(device.key)}
                    />
                    <label
                      className="form-check-label text-truncate d-block"
                      htmlFor={`dev-chk-${device.key}`}
                      title={device.key}
                    >
                      {device.name || device.key}
                      {device.name && (
                        <span
                          className={`text-muted ms-1 ${styles.deviceKeyLabel}`}
                        >
                          ({device.key})
                        </span>
                      )}
                    </label>
                  </div>
                ))}
                {filteredDropdownDevices.length === 0 && (
                  <div
                    className={`text-muted px-3 py-2 ${styles.noDevicesMessage}`}
                  >
                    No devices match.
                  </div>
                )}
              </div>
            </Dropdown.Menu>
          </Dropdown>
        </div>
        <div className="d-flex ms-auto gap-3 align-items-center">
          <div
            className={`form-check form-switch mb-0 d-flex align-items-center gap-1 ${styles.hideUnconnectedSwitch}`}
          >
            <input
              className="form-check-input"
              type="checkbox"
              role="switch"
              id="hideUnconnectedSwitch"
              checked={hideUnconnected}
              onChange={(e) => setHideUnconnected(e.target.checked)}
            />
            <label className="form-check-label" htmlFor="hideUnconnectedSwitch">
              Hide unconnected devices
            </label>
          </div>
          <div
            className={`form-check form-switch mb-0 d-flex align-items-center gap-1 ${styles.hideUnconnectedSwitch}`}
          >
            <input
              className="form-check-input"
              type="checkbox"
              role="switch"
              id="hideUnconnectedPortsSwitch"
              checked={hideUnconnectedPorts}
              onChange={(e) => setHideUnconnectedPorts(e.target.checked)}
            />
            <label
              className="form-check-label"
              htmlFor="hideUnconnectedPortsSwitch"
            >
              Hide unconnected ports
            </label>
          </div>
          <div
            className={`form-check form-switch mb-0 d-flex align-items-center gap-1 ${styles.hideUnconnectedSwitch}`}
          >
            <input
              className="form-check-input"
              type="checkbox"
              role="switch"
              id="darkModeSwitch"
              checked={darkMode}
              onChange={(e) => setDarkMode(e.target.checked)}
            />
            <label className="form-check-label" htmlFor="darkModeSwitch">
              Dark mode
            </label>
          </div>
        </div>
      </div>

      {/* React Flow canvas */}
      <div
        className={`flex-grow-1 position-relative${darkMode ? " bg-dark" : ""}`}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgeClick={onEdgeClick}
          onEdgeMouseEnter={onEdgeMouseEnter}
          onEdgeMouseLeave={onEdgeMouseLeave}
          onPaneClick={onPaneClick}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          nodesConnectable={false}
          elementsSelectable={false}
          colorMode={darkMode ? "dark" : "light"}
          fitView
          fitViewOptions={{ padding: 0.1 }}
          minZoom={0.05}
          maxZoom={2}
          proOptions={{ hideAttribution: false }}
        >
          <Background />
          <Controls showInteractive={false} />
          <MiniMap nodeStrokeWidth={3} zoomable pannable />
        </ReactFlow>
      </div>
    </div>
  );
};

export default Routing;
