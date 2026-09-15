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
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Dropdown } from "react-bootstrap";

import { meetsMinVersion } from "../shared/functions/meetsMinimumVersion";
import useAppParams from "../shared/hooks/useAppParams";
import {
  MidpointRoute,
  RoutingDevice,
  RoutingDevicesAndTieLines,
  RoutingPort,
  SinkRoute,
  TieLine,
  useGetPathsQuery,
  useGetRoutingDevicesAndTieLinesQuery,
  useGetVersionsQuery,
  useSendRoutingCommandMutation,
} from "../store/apiSlice";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import {
  ROUTING_WS_CONNECT,
  ROUTING_WS_DISCONNECT,
  routingSnapshotReceived,
} from "../store/routingFeedbackSlice";
import {
  describeRoutingError,
  ROUTING_COMMAND_PATH,
  RoutingCommand,
} from "../store/routingCommands";
import MultiviewLayoutPanel, { MultiviewLayoutPanelPosition } from "./MultiviewLayoutPanel";
import {
  agePendingRoutes,
  isExpectationMet,
  PendingRoute,
  pendingFromCommand,
  pendingId,
} from "./routing/pendingRoutes";
import { buildRouteIndex, isMidpoint, isRouteDestination } from "./routing/routeGraph";
import RoutePopover, { RouteEditTarget } from "./routing/RoutePopover";
import { FALLBACK_COLOR, signalColor } from "./routing/signalColors";
import useRouteCandidates from "./routing/useRouteCandidates";
import styles from "./Routing.module.scss";
import RoutingDeviceNode, {
  HEADER_PX,
  PORT_ROW_PX,
  PortStatus,
  RoutingDeviceNodeData,
} from "./RoutingDeviceNode";
import TieLineEdge from "./TieLineEdge";

// ─── Constants ──────────────────────────────────────────────────────────────

const NODE_WIDTH = 280;
const NODE_SEP = 60;
const RANK_SEP = 350;

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
  sinkRoutes: Record<string, SinkRoute[]>,
): { nodes: Node[]; edges: Edge[] } {
  // Live, tile-aware current-source feedback (sinkRoutes) reflects routes made via
  // device-specific bulk APIs (e.g. ApplyDynamicLayout) that never create a real TieLine. Turn
  // these into synthetic tie-line-shaped edges so they're visualized just like static wiring -
  // but only where no real tie line already targets that exact device+port (a real tie line's
  // active route is already covered by midpointRoutes/tie-line tracing).
  const realTieLineDestinations = new Set(
    data.tieLines.map((tl) => `${tl.destinationDeviceKey}:${tl.destinationPortKey}`),
  );
  const deviceOutputPortKey = new Map<string, string>(
    data.devices
      .filter((d) => (d.outputPorts ?? []).length === 1)
      .map((d) => [d.key, d.outputPorts![0].key]),
  );
  const syntheticTieLines: TieLine[] = Object.entries(sinkRoutes).flatMap(
    ([deviceKey, routes]) =>
      routes
        .filter((r) => !realTieLineDestinations.has(`${deviceKey}:${r.inputPortKey}`))
        // A cleared route carries no source, so it can produce no edge.
        .filter((r): r is SinkRoute & { sourceDeviceKey: string } =>
          Boolean(r.sourceDeviceKey) && deviceOutputPortKey.has(r.sourceDeviceKey!),
        )
        .map((r) => ({
          sourceDeviceKey: r.sourceDeviceKey,
          sourcePortKey: deviceOutputPortKey.get(r.sourceDeviceKey)!,
          destinationDeviceKey: deviceKey,
          destinationPortKey: r.inputPortKey,
          signalType: r.signalType,
          isInternal: false,
        })),
  );
  const allTieLines = [...data.tieLines, ...syntheticTieLines];
  const syntheticTieLineKeys = new Set(
    syntheticTieLines.map(
      (tl) => `${tl.sourceDeviceKey}|${tl.sourcePortKey}|${tl.destinationDeviceKey}|${tl.destinationPortKey}`,
    ),
  );

  // Devices that appear in at least one *visible* tie line endpoint (real or synthetic)
  const connectedKeys = new Set<string>(
    allTieLines
      .filter((tl) => !hiddenTypes.has(tl.signalType))
      .flatMap((tl) => [tl.sourceDeviceKey, tl.destinationDeviceKey]),
  );

  // Tie lines (real or synthetic) that pass all active filters (used for port-level filtering)
  const visibleTieLines = allTieLines.filter(
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

  // Map tieLines (real + synthetic sink-route edges) → React Flow edges, filtering by hidden
  // signal types and hidden devices. All tie lines are rendered regardless of whether they were
  // excluded from the layout pass — backwards edges still appear as connections on the canvas.
  const edges: Edge[] = allTieLines
    .filter(
      (tl) =>
        !hiddenTypes.has(tl.signalType) &&
        !hiddenDevices.has(tl.sourceDeviceKey) &&
        !hiddenDevices.has(tl.destinationDeviceKey),
    )
    .map((tl, idx) => {
      const isLiveOnly = syntheticTieLineKeys.has(
        `${tl.sourceDeviceKey}|${tl.sourcePortKey}|${tl.destinationDeviceKey}|${tl.destinationPortKey}`,
      );
      return {
        id: `tl-${idx}-${tl.sourceDeviceKey}-${tl.sourcePortKey}-${tl.destinationDeviceKey}-${tl.destinationPortKey}`,
        source: tl.sourceDeviceKey,
        sourceHandle: tl.sourcePortKey,
        target: tl.destinationDeviceKey,
        targetHandle: tl.destinationPortKey,
        style: {
          stroke: signalColor(tl.signalType),
          strokeWidth: 1.5,
          ...(isLiveOnly ? { strokeDasharray: "6 4" } : {}),
        },
        data: {
          signalColor: signalColor(tl.signalType),
          sourceDeviceKey: tl.sourceDeviceKey,
          sourcePortKey: tl.sourcePortKey,
          destinationDeviceKey: tl.destinationDeviceKey,
          destinationPortKey: tl.destinationPortKey,
          signalType: tl.signalType,
          isLiveOnly,
        },
        type: "tieLine",
        animated: false,
      };
    });

  return { nodes, edges };
}

// ─── Signal type toggle button list ─────────────────────────────────────────

function uniqueSignalTypes(tieLines: TieLine[]): string[] {
  return [...new Set(tieLines.map((tl) => tl.signalType))].sort();
}

// ─── Signal path tracing ─────────────────────────────────────────────────────

/**
 * Given a clicked edge, traces the full signal path from source to sink through
 * midpoint devices using midpointRoutes data.  Returns a Set of edge IDs that
 * form the continuous path.
 */
function traceSignalPath(
  edges: Edge[],
  clickedEdgeId: string,
  midpointRoutes: Record<string, MidpointRoute[]>,
): Set<string> {
  interface EdgeData {
    sourceDeviceKey?: string;
    sourcePortKey?: string;
    destinationDeviceKey?: string;
    destinationPortKey?: string;
  }

  const result = new Set<string>();
  const clickedEdge = edges.find((e) => e.id === clickedEdgeId);
  if (!clickedEdge) return result;

  result.add(clickedEdgeId);

  const d = (e: Edge) => (e.data ?? {}) as EdgeData;

  // Build lookup maps:
  // "deviceKey:portKey" → edge that ARRIVES at that input port
  const edgeByDestPort = new Map<string, Edge>();
  // "deviceKey:portKey" → edge that LEAVES from that output port
  const edgeBySrcPort = new Map<string, Edge>();

  for (const e of edges) {
    const ed = d(e);
    const srcKey = `${ed.sourceDeviceKey}:${ed.sourcePortKey}`;
    const dstKey = `${ed.destinationDeviceKey}:${ed.destinationPortKey}`;
    edgeBySrcPort.set(srcKey, e);
    edgeByDestPort.set(dstKey, e);
  }

  // Trace upstream from the clicked edge's source
  function traceUpstream(deviceKey: string | undefined, outputPortKey: string | undefined) {
    if (!deviceKey || !outputPortKey) return;
    const routes = midpointRoutes[deviceKey];
    if (!routes) return;
    // Find ALL input ports that feed this output port
    const matchingRoutes = routes.filter((r) => r.outputPortKey === outputPortKey);
    for (const route of matchingRoutes) {
      const incomingEdge = edgeByDestPort.get(`${deviceKey}:${route.inputPortKey}`);
      if (!incomingEdge || result.has(incomingEdge.id)) continue;
      result.add(incomingEdge.id);
      const ed = d(incomingEdge);
      traceUpstream(ed.sourceDeviceKey, ed.sourcePortKey);
    }
  }

  // Trace downstream from the clicked edge's destination
  function traceDownstream(deviceKey: string | undefined, inputPortKey: string | undefined) {
    if (!deviceKey || !inputPortKey) return;
    const routes = midpointRoutes[deviceKey]; 
    if (!routes) return;
    // Find ALL output ports that this input port feeds
    const matchingRoutes = routes.filter((r) => r.inputPortKey === inputPortKey);
    for (const route of matchingRoutes) {
      const outgoingEdge = edgeBySrcPort.get(`${deviceKey}:${route.outputPortKey}`);
      if (!outgoingEdge || result.has(outgoingEdge.id)) continue;
      result.add(outgoingEdge.id);
      const ed = d(outgoingEdge);
      traceDownstream(ed.destinationDeviceKey, ed.destinationPortKey);
    }
  }

  // Start tracing in both directions from the clicked edge
  const clickedData = d(clickedEdge);
  traceUpstream(clickedData.sourceDeviceKey, clickedData.sourcePortKey);
  traceDownstream(clickedData.destinationDeviceKey, clickedData.destinationPortKey);

  return result;
}

// ─── Route editing ───────────────────────────────────────────────────────────

const EMPTY_PORT_STATUS: Readonly<Record<string, PortStatus>> = Object.freeze({});

/** Multiview tile ports arrive qualified as "tile{N}:{portKey}". */
const TILE_PORT_RE = /^tile(\d+):/;

function tileNumberOf(portKey: string): number | undefined {
  const match = TILE_PORT_RE.exec(portKey);
  return match ? Number(match[1]) : undefined;
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
  const dispatch = useAppDispatch();
  const midpointRoutes = useAppSelector((s) => s.routingFeedback.midpointRoutes);
  const sinkRoutes = useAppSelector((s) => s.routingFeedback.sinkRoutes);
  const layouts = useAppSelector((s) => s.routingFeedback.layouts);
  const routingWsConnected = useAppSelector((s) => s.routingFeedback.connected);
  const failedUrls = useAppSelector((s) => s.routingFeedback.failedUrls);
  const { data: versions } = useGetVersionsQuery(appId ? { appId } : skipToken);
  const { data, isLoading, isError, refetch } = useGetRoutingDevicesAndTieLinesQuery(
    appId ? { appId } : skipToken,
  );

  const [hiddenTypes, setHiddenTypes] = useState<Set<string>>(new Set());
  const [hideUnconnected, setHideUnconnected] = useState(false);
  const [hiddenDevices, setHiddenDevices] = useState<Set<string>>(new Set());
  const [deviceSearch, setDeviceSearch] = useState("");
  const [hideUnconnectedPorts, setHideUnconnectedPorts] = useState(false);
  const [selectedEdgeIds, setSelectedEdgeIds] = useState<Set<string>>(new Set());
  const [darkMode, setDarkMode] = useState(true);

  // ── Route editing ──────────────────────────────────────────────────────────
  const [routeEdit, setRouteEdit] = useState<{
    target: RouteEditTarget;
    anchorRect: DOMRect;
  } | null>(null);
  const [commandError, setCommandError] = useState<string | null>(null);
  // Commands sent but not yet confirmed over the feedback WebSocket, keyed by device+port.
  const [pendingByPort, setPendingByPort] = useState<Record<string, PendingRoute>>({});
  const [sendRoutingCommand, { isLoading: isSendingCommand }] =
    useSendRoutingCommandMutation();

  // Floating, freely-draggable multiview layout panels - independent of graph node positions
  // (which move whenever dagre re-runs in response to routing/filter changes). Keyed by device
  // key; presence in the record means the panel is open. Persists until explicitly closed.
  const [layoutPanels, setLayoutPanels] = useState<Record<string, MultiviewLayoutPanelPosition>>({});
  // Tile number to highlight in each device's open layout panel, based on the current graph
  // edge/path selection (see the selection-highlight effect below).
  const [selectedTileNumberByDevice, setSelectedTileNumberByDevice] = useState<Record<string, number>>({});

  const toggleLayoutPanel = useCallback((deviceKey: string) => {
    setLayoutPanels((prev) => {
      if (prev[deviceKey]) {
        const next = { ...prev };
        delete next[deviceKey];
        return next;
      }
      // Cascade new panels so they don't stack exactly on top of one another.
      const count = Object.keys(prev).length;
      return { ...prev, [deviceKey]: { x: 40 + count * 24, y: 40 + count * 24 } };
    });
  }, []);

  const closeLayoutPanel = useCallback((deviceKey: string) => {
    setLayoutPanels((prev) => {
      if (!(deviceKey in prev)) return prev;
      const next = { ...prev };
      delete next[deviceKey];
      return next;
    });
  }, []);

  const moveLayoutPanel = useCallback((deviceKey: string, position: MultiviewLayoutPanelPosition) => {
    setLayoutPanels((prev) => (prev[deviceKey] ? { ...prev, [deviceKey]: position } : prev));
  }, []);

  const isV3 = useMemo(() => {
    const essentialsVersion = versions?.find(
      (v) => v.Name === "PepperDashEssentials.dll",
    )?.Version;
    return essentialsVersion ? meetsMinVersion(essentialsVersion, "3.0.0") : false;
  }, [versions]);

  // Route editing needs a routing-command endpoint that older processors do not have. Detect it by
  // capability rather than version: apiPaths reports the processor's live CWS route table, which is
  // exact and does not need updating when the shipping version changes. Editing stays off until
  // the probe confirms the route, so an older processor simply renders the read-only page.
  const { data: apiPaths } = useGetPathsQuery(appId ? { appId } : skipToken);
  const canEditRoutes = useMemo(
    () =>
      Boolean(
        appId &&
          isV3 &&
          apiPaths?.routes?.some((r) => r.Url?.includes(ROUTING_COMMAND_PATH)),
      ),
    [appId, isV3, apiPaths],
  );

  // Seed routing feedback state from the HTTP response before the WebSocket connects
  useEffect(() => {
    if (!data || !isV3) return;
    const midpoints: Record<string, { inputPortKey: string; outputPortKey: string; signalType: string }[]> = {};

    for (const group of data.currentRoutes ?? []) {
      for (const route of group.routes) {
        // Each step is a switching device in the route path
        for (const step of route.steps) {
          if (!midpoints[step.switchingDeviceKey]) {
            midpoints[step.switchingDeviceKey] = [];
          }
          midpoints[step.switchingDeviceKey].push({
            inputPortKey: step.inputPortKey,
            outputPortKey: step.outputPortKey,
            signalType: group.signalType,
          });
        }
      }
    }

    // Sink current sources come from sinkCurrentSources, read directly from each sink's own
    // current-source bookkeeping on the backend - unlike currentRoutes, this also reflects routes
    // made via device-specific bulk APIs (e.g. dynamic multiview layouts) that never create a
    // RouteDescriptor/TieLine at all. A device implementing IRoutingSinkWithLayouts (e.g. a
    // multiview decoder) can have multiple simultaneous tile routes under its one device key, so
    // this is a list per device.
    const sinks: Record<string, { inputPortKey: string; sourceDeviceKey: string; signalType: string }[]> = {};
    for (const source of data.sinkCurrentSources ?? []) {
      if (!sinks[source.deviceKey]) {
        sinks[source.deviceKey] = [];
      }
      sinks[source.deviceKey].push({
        inputPortKey: source.inputPortKey,
        sourceDeviceKey: source.sourceDeviceKey,
        signalType: source.signalType,
      });
    }

    dispatch(
      routingSnapshotReceived({
        type: "snapshot",
        midpointRoutes: midpoints,
        sinkRoutes: sinks,
        layouts: data.multiviewLayouts ?? {},
      }),
    );
  }, [data, isV3, dispatch]);

  // Fetches the routing feedback session URL from the API, then connects the WebSocket. Shared
  // by the mount effect below and the manual refresh button.
  const connectRoutingWebSocket = useCallback(
    (onCancelledRef?: { current: boolean }) => {
      if (!appId || !isV3) return;
      const baseUrl = `/cws/${appId}/api/routingFeedbackSession`;

      fetch(baseUrl)
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        })
        .then((session: { url: string; fallbackUrl?: string }) => {
          if (onCancelledRef?.current) return;
          dispatch({
            type: ROUTING_WS_CONNECT,
            payload: { url: session.url, fallbackUrl: session.fallbackUrl },
          });
        })
        .catch((err) => {
          console.warn("[routing-ws] Failed to start feedback session:", err);
        });
    },
    [appId, isV3, dispatch],
  );

  // Connect to routing feedback WebSocket when data is available (v3+ only)
  useEffect(() => {
    if (!appId || !isV3) return;
    const cancelledRef = { current: false };
    connectRoutingWebSocket(cancelledRef);

    return () => {
      cancelledRef.current = true;
      dispatch({ type: ROUTING_WS_DISCONNECT });
    };
  }, [appId, isV3, dispatch, connectRoutingWebSocket]);

  // Manual refresh: reloads the routing devices/tie-lines snapshot over HTTP and forces the
  // WebSocket to disconnect and reconnect (e.g. after the routing feedback server was restarted,
  // or its connection got stuck).
  const handleRefreshClick = useCallback(() => {
    refetch();
    dispatch({ type: ROUTING_WS_DISCONNECT });
    connectRoutingWebSocket();
  }, [refetch, dispatch, connectRoutingWebSocket]);

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

  // Keep a ref to current edges for path tracing without triggering re-renders
  const edgesRef = useRef<Edge[]>([]);
  useEffect(() => {
    edgesRef.current = edges;
  }, [edges]);

  // Keep refs to the latest feedback data so the layout effect can read current
  // values without depending on them (and thus without re-running dagre on every
  // WebSocket update).
  const midpointRoutesRef = useRef(midpointRoutes);
  useEffect(() => {
    midpointRoutesRef.current = midpointRoutes;
  }, [midpointRoutes]);
  const layoutsRef = useRef(layouts);
  useEffect(() => {
    layoutsRef.current = layouts;
  }, [layouts]);

  // Resolves a device key (e.g. a multiview tile's routed source) to a display name.
  const deviceNameByKey = useMemo(() => {
    const map = new Map<string, string>();
    for (const d of data?.devices ?? []) {
      map.set(d.key, d.name || d.key);
    }
    return map;
  }, [data]);
  const resolveSourceName = useCallback(
    (key: string) => deviceNameByKey.get(key) ?? key,
    [deviceNameByKey],
  );

  // Tile click (from a device node's layout popover): find the tie-line/synthetic edge feeding
  // that tile (its destination port is qualified as "tile{N}:...", per RoutingGraphHelpers on the
  // backend) and trace/highlight its signal path the same way clicking a graph edge/node does.
  const handleTileClick = useCallback(
    (deviceKey: string, tile: { tileNumber: number }) => {
      const currentEdges = edgesRef.current;
      const targetEdge = currentEdges.find((e) => {
        const ed = e.data as
          | { destinationDeviceKey?: string; destinationPortKey?: string }
          | undefined;
        return (
          ed?.destinationDeviceKey === deviceKey &&
          ed?.destinationPortKey?.startsWith(`tile${tile.tileNumber}:`)
        );
      });

      if (!targetEdge) {
        setSelectedEdgeIds(new Set());
        return;
      }

      const pathEdges = traceSignalPath(currentEdges, targetEdge.id, midpointRoutes);
      setSelectedEdgeIds((prev) => {
        const allMatch =
          prev.size === pathEdges.size && [...prev].every((id) => pathEdges.has(id));
        return allMatch ? new Set() : pathEdges;
      });
    },
    [midpointRoutes],
  );

  // ── Route editing ──────────────────────────────────────────────────────────

  // Candidate-source lookups run against the full, unfiltered tie-line graph: hiding a device or
  // a signal type in the toolbar changes the view, never what is physically routable.
  const routeIndex = useMemo(() => (data ? buildRouteIndex(data) : null), [data]);
  const getCandidates = useRouteCandidates(routeIndex);

  // Read the latest data from a ref inside the click handlers, so the handlers stay referentially
  // stable and the dagre effect (which injects them into node data) does not re-run.
  const dataRef = useRef(data);
  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  const closeRoutePopover = useCallback(() => {
    setRouteEdit(null);
    setCommandError(null);
  }, []);

  const handlePortClick = useCallback(
    (deviceKey: string, port: RoutingPort, kind: "input" | "output", rect: DOMRect) => {
      // Resolve against the UNFILTERED device, so "Hide unconnected ports" cannot hide an input
      // from a midpoint's route-from list.
      const device = dataRef.current?.devices.find((d) => d.key === deviceKey);
      if (!device) return;

      const deviceName = device.name || device.key;
      const target: RouteEditTarget =
        kind === "input"
          ? {
              kind: "sinkInput",
              deviceKey,
              deviceName,
              port,
              tileNumber: tileNumberOf(port.key),
            }
          : {
              kind: "midpointOutput",
              deviceKey,
              deviceName,
              port,
              inputPorts: device.inputPorts ?? [],
            };

      setCommandError(null);
      setRouteEdit({ target, anchorRect: rect });
    },
    [],
  );

  // Edit badge on a tile in a floating multiview layout panel. Tiles are exposed on the parent
  // node as "tile{N}:" qualified input ports, so this resolves to the same port the node's own row
  // would open and reuses the identical flow.
  const handleTileEditClick = useCallback(
    (deviceKey: string, tile: { tileNumber: number }, rect: DOMRect) => {
      const device = dataRef.current?.devices.find((d) => d.key === deviceKey);
      const port = device?.inputPorts?.find((p) =>
        p.key.startsWith(`tile${tile.tileNumber}:`),
      );
      if (!port) return;
      handlePortClick(deviceKey, port, "input", rect);
    },
    [handlePortClick],
  );

  const handleSubmitRouteCommand = useCallback(
    async (command: RoutingCommand) => {
      if (!appId) return;
      try {
        await sendRoutingCommand({ appId, command }).unwrap();
      } catch (error) {
        // Keep the popover open so the user can pick something else.
        setCommandError(describeRoutingError(error));
        return;
      }

      // A sinkRoute/clearSink is only *accepted* by the processor; the authoritative result lands
      // over the feedback WebSocket. Mark the port pending until the expected feedback shows up.
      const pending = pendingFromCommand(command, Date.now());
      if (pending) {
        setPendingByPort((prev) => ({
          ...prev,
          [pendingId(pending.deviceKey, pending.portKey)]: pending,
        }));
      }

      setRouteEdit(null);
      setCommandError(null);
    },
    [appId, sendRoutingCommand],
  );

  // Clear pending markers once the feedback confirms what was asked for.
  //
  // pendingByPort is a dependency as well as the thing being set, so a newly-added marker is
  // checked against feedback immediately rather than waiting for the next WebSocket tick. That
  // matters for two cases that would otherwise sit pending until they timed out and showed a
  // spurious warning: feedback that raced ahead of the mutation resolving, and re-selecting the
  // source that is already routed, which changes nothing and so produces no feedback at all.
  // The updater returns `prev` unchanged when nothing resolved, so React bails out rather than
  // looping.
  useEffect(() => {
    setPendingByPort((prev) => {
      const entries = Object.entries(prev);
      if (entries.length === 0) return prev;

      const next: Record<string, PendingRoute> = {};
      let changed = false;
      for (const [id, pending] of entries) {
        if (isExpectationMet(sinkRoutes, midpointRoutes, pending)) changed = true;
        else next[id] = pending;
      }
      return changed ? next : prev;
    });
  }, [sinkRoutes, midpointRoutes, pendingByPort]);

  // Age out anything the processor never confirmed: warn at PENDING_TIMEOUT_MS, then drop it. The
  // interval only runs while something is actually pending.
  const hasPending = Object.keys(pendingByPort).length > 0;
  useEffect(() => {
    if (!hasPending) return;
    const interval = setInterval(() => {
      setPendingByPort((prev) => agePendingRoutes(prev, Date.now()));
    }, 1000);
    return () => clearInterval(interval);
  }, [hasPending]);

  // Port status grouped by device, so the node-data effect below can hand each node a stable
  // object and skip re-rendering every other node on every pending change.
  const portStatusByDevice = useMemo(() => {
    const map = new Map<string, Record<string, PortStatus>>();
    for (const pending of Object.values(pendingByPort)) {
      const forDevice = map.get(pending.deviceKey) ?? {};
      forDevice[pending.portKey] = pending.timedOut ? "timedOut" : "pending";
      map.set(pending.deviceKey, forDevice);
    }
    return map;
  }, [pendingByPort]);

  // What is routed to the port the popover is open on, for its check mark.
  const routeEditCurrent = useMemo(() => {
    if (!routeEdit) return null;
    const { target } = routeEdit;
    if (target.kind === "sinkInput") {
      const route = sinkRoutes[target.deviceKey]?.find(
        (r: SinkRoute) => r.inputPortKey === target.port.key,
      );
      return { sourceDeviceKey: route?.sourceDeviceKey ?? null };
    }
    const route = midpointRoutes[target.deviceKey]?.find(
      (r: MidpointRoute) => r.outputPortKey === target.port.key,
    );
    return { inputPortKey: route?.inputPortKey ?? null };
  }, [routeEdit, sinkRoutes, midpointRoutes]);

  const getCandidatesForOpenPopover = useCallback(
    (signalType: string) =>
      routeEdit
        ? getCandidates(routeEdit.target.deviceKey, routeEdit.target.port.key, signalType)
        : [],
    [routeEdit, getCandidates],
  );

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
      sinkRoutes,
    );
    setNodes(
      layoutNodes.map((n) => {
        const device = (n.data as RoutingDeviceNodeData).device;
        return {
          ...n,
          data: {
            ...n.data,
            darkMode,
            currentRoutes: midpointRoutesRef.current[n.id],
            hasLayout: Boolean(layoutsRef.current[n.id]),
            onToggleLayoutPanel: () => toggleLayoutPanel(n.id),
            // Only the stable edit fields go in here; pending/editing state is injected by the
            // cheap effect below so feedback ticks never re-run dagre.
            onPortClick: canEditRoutes
              ? (port: RoutingPort, kind: "input" | "output", rect: DOMRect) =>
                  handlePortClick(n.id, port, kind, rect)
              : undefined,
            // Inputs are routable on route destinations - pure sinks AND multiview parents, which
            // report hasInputs && hasOutputs without being midpoints.
            canEditInputs: canEditRoutes && isRouteDestination(device),
            canEditOutputs: canEditRoutes && isMidpoint(device),
            onHide: () =>
              setHiddenDevices((prev) => {
                const next = new Set(prev);
                next.add(n.id);
                return next;
              }),
          },
        };
      }),
    );
    setEdges(layoutEdges);
    setSelectedEdgeIds(new Set());
  }, [
    data,
    hiddenTypes,
    hideUnconnected,
    hiddenDevices,
    hideUnconnectedPorts,
    darkMode,
    sinkRoutes,
    resolveSourceName,
    handleTileClick,
    canEditRoutes,
    handlePortClick,
    toggleLayoutPanel,
    setNodes,
    setEdges,
  ]);

  // Keep node data's currentRoutes/hasLayout/port status fresh as feedback arrives, without
  // re-running dagre or resetting the current selection.
  useEffect(() => {
    const editingDeviceKey = routeEdit?.target.deviceKey ?? null;
    const editingPortKey = routeEdit?.target.port.key ?? null;

    setNodes((nds) =>
      nds.map((n) => {
        const portStatus = portStatusByDevice.get(n.id) ?? EMPTY_PORT_STATUS;
        const nodeEditingPortKey = n.id === editingDeviceKey ? editingPortKey : null;
        const prev = n.data as RoutingDeviceNodeData;

        // Most nodes are unaffected by any given pending change; returning the same object keeps
        // React Flow from re-rendering them.
        if (
          prev.portStatus === portStatus &&
          (prev.editingPortKey ?? null) === nodeEditingPortKey &&
          prev.currentRoutes === midpointRoutes[n.id] &&
          prev.hasLayout === Boolean(layouts[n.id])
        ) {
          return n;
        }

        return {
          ...n,
          data: {
            ...n.data,
            currentRoutes: midpointRoutes[n.id],
            hasLayout: Boolean(layouts[n.id]),
            portStatus,
            editingPortKey: nodeEditingPortKey,
          },
        };
      }),
    );
  }, [midpointRoutes, layouts, portStatusByDevice, routeEdit, setNodes]);

  // Re-style edges and update node highlights when selection changes.
  useEffect(() => {
    setEdges((eds) =>
      eds.map((e) => {
        const baseColor =
          (e.data as { signalColor?: string } | undefined)?.signalColor ??
          FALLBACK_COLOR;
        const isLiveOnly = Boolean(
          (e.data as { isLiveOnly?: boolean } | undefined)?.isLiveOnly,
        );
        const dash = isLiveOnly ? { strokeDasharray: "6 4" } : {};
        const isSelected = selectedEdgeIds.size > 0 && selectedEdgeIds.has(e.id);
        if (selectedEdgeIds.size === 0) {
          return {
            ...e,
            data: { ...e.data, selected: false },
            style: { stroke: baseColor, strokeWidth: 1.5, ...dash },
          };
        }
        return {
          ...e,
          data: { ...e.data, selected: isSelected },
          style: {
            stroke: isSelected ? baseColor : "#ccc",
            strokeWidth: isSelected ? 3.5 : 1.5,
            opacity: isSelected ? 1 : 0.35,
            ...dash,
          },
        };
      }),
    );

    // Compute which internal routes on each midpoint node are part of the path
    if (selectedEdgeIds.size === 0) {
      setNodes((nds) =>
        nds.map((n) => ({
          ...n,
          data: { ...n.data, highlightedRouteKeys: null },
        })),
      );
      setSelectedTileNumberByDevice({});
    } else {
      const selectedDestPorts = new Set<string>();
      const selectedSrcPorts = new Set<string>();
      const selectedTileNumberByDevice = new Map<string, number>();
      for (const e of edgesRef.current) {
        if (selectedEdgeIds.has(e.id)) {
          const ed = e.data as { sourceDeviceKey?: string; sourcePortKey?: string; destinationDeviceKey?: string; destinationPortKey?: string } | undefined;
          if (ed?.destinationDeviceKey && ed?.destinationPortKey) {
            selectedDestPorts.add(`${ed.destinationDeviceKey}:${ed.destinationPortKey}`);
            const tileMatch = /^tile(\d+):/.exec(ed.destinationPortKey);
            if (tileMatch) {
              selectedTileNumberByDevice.set(ed.destinationDeviceKey, Number(tileMatch[1]));
            }
          }
          if (ed?.sourceDeviceKey && ed?.sourcePortKey) {
            selectedSrcPorts.add(`${ed.sourceDeviceKey}:${ed.sourcePortKey}`);
          }
        }
      }

      setNodes((nds) =>
        nds.map((n) => {
          const routes = midpointRoutes[n.id];
          if (!routes || routes.length === 0) {
            return { ...n, data: { ...n.data, highlightedRouteKeys: new Set<string>() } };
          }
          const highlighted = new Set<string>();
          for (const r of routes) {
            const inputInPath = selectedDestPorts.has(`${n.id}:${r.inputPortKey}`);
            const outputInPath = selectedSrcPorts.has(`${n.id}:${r.outputPortKey}`);
            if (inputInPath && outputInPath) {
              highlighted.add(`${r.inputPortKey}:${r.outputPortKey}`);
            }
          }
          return { ...n, data: { ...n.data, highlightedRouteKeys: highlighted } };
        }),
      );
      setSelectedTileNumberByDevice(Object.fromEntries(selectedTileNumberByDevice));
    }
  }, [selectedEdgeIds, setEdges, setNodes, midpointRoutes]);

  // Edge click: highlight only the single clicked edge
  const onEdgeClick = useCallback(
    (_: React.MouseEvent, edge: Edge) =>
      setSelectedEdgeIds((prev) => {
        if (prev.has(edge.id)) return new Set();
        return new Set([edge.id]);
      }),
    [],
  );

  // Node click: trace all signal paths through/from/to the clicked device
  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      const currentEdges = edgesRef.current;
      const allPathEdges = new Set<string>();

      // Find all edges connected to this device and trace each one
      for (const e of currentEdges) {
        const ed = e.data as { sourceDeviceKey?: string; destinationDeviceKey?: string } | undefined;
        if (ed?.sourceDeviceKey === node.id || ed?.destinationDeviceKey === node.id) {
          const pathFromEdge = traceSignalPath(currentEdges, e.id, midpointRoutes);
          for (const id of pathFromEdge) {
            allPathEdges.add(id);
          }
        }
      }

      setSelectedEdgeIds((prev) => {
        // Toggle off if clicking the same node again
        if (prev.size > 0 && allPathEdges.size > 0) {
          const prevArr = [...prev];
          const allMatch = prevArr.every((id) => allPathEdges.has(id)) && prevArr.length === allPathEdges.size;
          if (allMatch) return new Set();
        }
        return allPathEdges;
      });
    },
    [midpointRoutes],
  );

  const onPaneClick = useCallback(() => setSelectedEdgeIds(new Set()), []);

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

  const certUrls = failedUrls.length > 0
    ? [...new Set<string>(failedUrls.map((u: string) =>
        new URL(u).origin.replace(/^wss:/, "https:").replace(/^ws:/, "http:"),
      ))]
    : null;

  return (
    <div className="h-100 d-flex flex-column overflow-hidden">
      {certUrls && certUrls.length > 0 && (
        <Alert variant="warning" className="py-2 px-3 mb-0 rounded-0" style={{ fontSize: '0.82rem' }}>
          <strong>Live feedback connection failed.</strong> The routing feedback server may have an untrusted certificate.{' '}
          {certUrls.map((certUrl, i) => (
            <span key={certUrl}>
              {i > 0 && ' or '}
              <Alert.Link href={certUrl} target="_blank" rel="noreferrer">
                Open {certUrl}
              </Alert.Link>
            </span>
          ))}
          {' in a new tab, accept the certificate, then reload this page.'}
        </Alert>
      )}
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
          <span
            className={`badge ${routingWsConnected ? "bg-success" : "bg-secondary"}`}
            title={routingWsConnected ? "Live routing feedback connected" : "Live routing feedback disconnected"}
          >
            {routingWsConnected ? "Live" : "Offline"}
          </span>
          <button
            className="btn btn-sm btn-outline-secondary py-0 px-1 d-flex align-items-center"
            onClick={handleRefreshClick}
            title="Refresh routing data and reconnect"
          >
            <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
              <path d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z" />
              <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z" />
            </svg>
          </button>
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
          onNodeClick={onNodeClick}
          onEdgeClick={onEdgeClick}
          onEdgeMouseEnter={onEdgeMouseEnter}
          onEdgeMouseLeave={onEdgeMouseLeave}
          onPaneClick={onPaneClick}
          // The popover is anchored to a viewport rect, so it cannot follow a pan, zoom or node
          // drag. Close it instead of letting it drift away from its port.
          onMoveStart={closeRoutePopover}
          onNodeDragStart={closeRoutePopover}
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

        {/* Floating multiview layout panels - siblings of the React Flow canvas (not graph
            nodes), so their position is independent of node positions/dagre re-layout. */}
        {Object.entries(layoutPanels).map(([deviceKey, position]) => {
          const layout = layouts[deviceKey];
          if (!layout) return null;
          return (
            <MultiviewLayoutPanel
              key={deviceKey}
              title={resolveSourceName(deviceKey)}
              layout={layout}
              position={position}
              darkMode={darkMode}
              selectedTileNumber={selectedTileNumberByDevice[deviceKey] ?? null}
              resolveSourceName={resolveSourceName}
              onTileClick={(tile) => handleTileClick(deviceKey, tile)}
              onTileEditClick={
                canEditRoutes
                  ? (tile, rect) => handleTileEditClick(deviceKey, tile, rect)
                  : undefined
              }
              onClose={() => closeLayoutPanel(deviceKey)}
              onMove={(nextPosition) => moveLayoutPanel(deviceKey, nextPosition)}
            />
          );
        })}

        {/* Rendered into document.body by the component itself, so it is never clipped by the
            canvas or scaled by its zoom transform. */}
        {routeEdit && (
          <RoutePopover
            target={routeEdit.target}
            anchorRect={routeEdit.anchorRect}
            darkMode={darkMode}
            current={routeEditCurrent}
            getCandidateSources={getCandidatesForOpenPopover}
            isSubmitting={isSendingCommand}
            errorMessage={commandError}
            onSubmit={handleSubmitRouteCommand}
            onClose={closeRoutePopover}
          />
        )}
      </div>
    </div>
  );
};

export default Routing;
