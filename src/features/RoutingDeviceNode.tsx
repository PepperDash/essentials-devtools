import { Handle, NodeProps, Position } from "@xyflow/react";

import { MidpointRoute, RoutingDevice } from "../store/apiSlice";
import styles from "./RoutingDeviceNode.module.scss";

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

export type RoutingDeviceNodeData = {
  device: RoutingDevice;
  onHide?: () => void;
  darkMode?: boolean;
  currentRoutes?: MidpointRoute[];
  /** When edges are selected, contains the set of "inputPortKey:outputPortKey" pairs on this node that are part of the path. null = no selection active. */
  highlightedRouteKeys?: Set<string> | null;
  /** Whether this device has an active multiview canvas/tile layout (IRoutingSinkWithLayoutState). */
  hasLayout?: boolean;
  /** Called when the layout toggle button is clicked - shows/hides this device's floating layout panel (see Routing.tsx). */
  onToggleLayoutPanel?: () => void;
};

const PORT_ROW_PX = 28;
const HEADER_PX = 38;

const RoutingDeviceNode = ({ data }: NodeProps) => {
  const {
    device,
    onHide,
    darkMode,
    currentRoutes,
    highlightedRouteKeys,
    hasLayout,
    onToggleLayoutPanel,
  } = data as RoutingDeviceNodeData;
  const inputPorts = device.inputPorts ?? [];
  const outputPorts = device.outputPorts ?? [];
  const portRows = Math.max(inputPorts.length, outputPorts.length, 1);
  const bodyHeight = portRows * PORT_ROW_PX;

  return (
    <div
      className={`card border ${styles.nodeCard} ${darkMode ? styles.nodeCardDark : ""}`}
      style={{ minHeight: HEADER_PX + bodyHeight }}
    >
      <div
        className={`card-header py-1 px-2 fw-semibold d-flex align-items-start ${darkMode ? styles.nodeHeaderDark : "bg-secondary-subtle"} ${styles.nodeHeader}`}
        style={{ height: HEADER_PX }}
        title={device.key}
      >
        <div className="text-truncate flex-grow-1 overflow-hidden me-1">
          <div className="text-truncate">{device.name || device.key}</div>
          {device.name && (
            <div className={`text-muted text-truncate ${styles.nodeKeyLabel}`}>
              {device.key}
            </div>
          )}
        </div>
        {hasLayout && (
        <button
          className={`nodrag ${styles.layoutToggleBtn}`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleLayoutPanel?.();
          }}
          title="Show/hide window layout"
          aria-label="Show/hide window layout"
        >
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="1" y="1" width="6.5" height="6.5" rx="1" fill="currentColor" opacity="0.85" />
              <rect x="8.5" y="1" width="6.5" height="6.5" rx="1" fill="currentColor" opacity="0.55" />
              <rect x="1" y="8.5" width="6.5" height="6.5" rx="1" fill="currentColor" opacity="0.55" />
              <rect x="8.5" y="8.5" width="6.5" height="6.5" rx="1" fill="currentColor" opacity="0.85" />
            </svg>
          </button>
        )}
        {onHide && (
          <button
            className={`nodrag ${styles.hideBtn}`}
            onClick={onHide}
            title="Hide device"
          >
            &times;
          </button>
        )}
      </div>

      <div className="card-body p-0 position-relative" style={{ height: bodyHeight }}>
        {/* Input port handles (left side) */}
        {inputPorts.map((port, i) => {
          const topPct = ((i + 0.5) / portRows) * 100;
          return (
            <Handle
              key={`in-${i}-${port.key}`}
              type="target"
              position={Position.Left}
              id={port.key}
              className={styles.handle}
              style={{ top: `${topPct}%` }}
              title={port.key}
            />
          );
        })}

        {/* Port label rows */}
        {Array.from({ length: portRows }).map((_, i) => {
          const inPort = inputPorts[i];
          const outPort = outputPorts[i];
          return (
            <div
              key={`row-${i}`}
              className={`d-flex justify-content-between align-items-center px-3 ${styles.portRow} ${darkMode ? styles.portRowDark : ""}`}
              style={{ height: PORT_ROW_PX }}
            >
              <div className={styles.portLabelWrap}>
                <span className={`text-muted text-truncate ${styles.portLabelText}`} title={inPort?.key}>
                  {inPort?.key ?? ""}
                </span>
                {inPort && (
                  <span className={styles.portTooltip}>{inPort.signalType}</span>
                )}
              </div>
              <div className={`text-end ${styles.portLabelWrap}`}>
                <span className={`text-muted text-truncate ${styles.portLabelText}`} title={outPort?.key}>
                  {outPort?.key ?? ""}
                </span>
                {outPort && (
                  <span className={styles.portTooltip}>{outPort.signalType}</span>
                )}
              </div>
            </div>
          );
        })}

        {/* Internal route SVG overlay */}
        {currentRoutes && currentRoutes.length > 0 && (
          <svg
            className={styles.internalRouteSvg}
            width="100%"
            height={bodyHeight}
            style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none" }}
          >
            {currentRoutes.map((route, idx) => {
              const inIdx = inputPorts.findIndex((p) => p.key === route.inputPortKey);
              const outIdx = outputPorts.findIndex((p) => p.key === route.outputPortKey);
              if (inIdx === -1 || outIdx === -1) return null;

              const inY = ((inIdx + 0.5) / portRows) * bodyHeight;
              const outY = ((outIdx + 0.5) / portRows) * bodyHeight;
              const color = SIGNAL_COLORS[route.signalType] ?? FALLBACK_COLOR;

              // Determine if this route is highlighted or dimmed
              const routeKey = `${route.inputPortKey}:${route.outputPortKey}`;
              const isHighlighted = highlightedRouteKeys == null || highlightedRouteKeys.has(routeKey);

              // Bezier control points for a smooth S-curve
              const x1 = 24;
              const x2 = 256;
              const cx1 = x1 + (x2 - x1) * 0.4;
              const cx2 = x2 - (x2 - x1) * 0.4;

              return (
                <path
                  key={`route-${idx}`}
                  d={`M ${x1} ${inY} C ${cx1} ${inY}, ${cx2} ${outY}, ${x2} ${outY}`}
                  stroke={isHighlighted ? color : "#ccc"}
                  strokeWidth={isHighlighted && highlightedRouteKeys != null ? 3 : 2}
                  strokeOpacity={isHighlighted ? 0.7 : 0.2}
                  fill="none"
                />
              );
            })}
          </svg>
        )}

        {/* Output port handles (right side) */}
        {outputPorts.map((port, i) => {
          const topPct = ((i + 0.5) / portRows) * 100;
          return (
            <Handle
              key={`out-${i}-${port.key}`}
              type="source"
              position={Position.Right}
              id={port.key}
              className={styles.handle}
              style={{ top: `${topPct}%` }}
              title={port.key}
            />
          );
        })}
      </div>
    </div>
  );
};

export { HEADER_PX, PORT_ROW_PX };
export default RoutingDeviceNode;
