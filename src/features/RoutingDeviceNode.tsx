import { Handle, NodeProps, Position } from '@xyflow/react';

import { MidpointRoute, RoutingDevice, RoutingPort } from '../store/apiSlice';
import { signalColor } from './routing/signalColors';
import styles from './RoutingDeviceNode.module.scss';

/**
 * A command was sent for this port but the processor has not confirmed it over the feedback
 * WebSocket yet; "timedOut" means it never did.
 */
export type PortStatus = 'pending' | 'timedOut';

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
  /** Opens the route popover for a port. Absent when route editing is unavailable. */
  onPortClick?: (
    port: RoutingPort,
    kind: 'input' | 'output',
    rect: DOMRect
  ) => void;
  /** Input ports are clickable on route destinations (pure sinks and multiview parents). */
  canEditInputs?: boolean;
  /** Output ports are clickable on midpoints. */
  canEditOutputs?: boolean;
  /** In-flight/timed-out route commands on this device, keyed by port key. */
  portStatus?: Readonly<Record<string, PortStatus>>;
  /** Port key whose popover is currently open, for the active outline. */
  editingPortKey?: string | null;
};

/** Multiview tile ports arrive qualified as "tile{N}:{portKey}" - see RoutingGraphHelpers. */
const TILE_PORT_RE = /^tile(\d+):/;

/** "tile2:tileInput" truncates badly in a 280px card; "Tile 2" does not. */
function portDisplayLabel(portKey: string): string {
  const match = TILE_PORT_RE.exec(portKey);
  return match ? `Tile ${match[1]}` : portKey;
}

interface PortCellProps {
  port?: RoutingPort;
  kind: 'input' | 'output';
  editable: boolean;
  status?: PortStatus;
  isEditing: boolean;
  onPortClick?: RoutingDeviceNodeData['onPortClick'];
}

const PortCell = ({
  port,
  kind,
  editable,
  status,
  isEditing,
  onPortClick,
}: PortCellProps) => {
  const align = kind === 'output' ? 'text-end ' : '';
  if (!port) return <div className={`${align}${styles.portLabelWrap}`} />;

  const label = portDisplayLabel(port.key);
  const indicator = status && (
    <span
      className={
        status === 'pending' ? styles.portPending : styles.portTimedOut
      }
      title={
        status === 'pending'
          ? 'Waiting for the processor to confirm this route…'
          : 'No feedback received - the route may not have been made.'
      }
    >
      {status === 'pending' ? '●' : '!'}
    </span>
  );

  return (
    <div className={`${align}${styles.portLabelWrap}`}>
      {editable && onPortClick ? (
        <button
          type="button"
          // nodrag/nopan keep React Flow from reading the press as a node drag or canvas pan;
          // stopPropagation keeps onNodeClick from also running its path trace.
          className={`nodrag nopan ${styles.portLabelText} ${styles.portButton} ${
            kind === 'output' ? styles.portButtonEnd : ''
          } ${isEditing ? styles.portButtonActive : ''}`}
          title={port.key}
          aria-haspopup="dialog"
          aria-expanded={isEditing}
          onClick={(e) => {
            e.stopPropagation();
            onPortClick(port, kind, e.currentTarget.getBoundingClientRect());
          }}
        >
          {indicator}
          <span className="text-truncate">{label}</span>
        </button>
      ) : (
        <span
          className={`text-muted text-truncate ${styles.portLabelText}`}
          title={port.key}
        >
          {indicator}
          {label}
        </span>
      )}
      <span className={styles.portTooltip}>{port.signalType}</span>
    </div>
  );
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
    onPortClick,
    canEditInputs,
    canEditOutputs,
    portStatus,
    editingPortKey,
  } = data as RoutingDeviceNodeData;
  const inputPorts = device.inputPorts ?? [];
  const outputPorts = device.outputPorts ?? [];
  const portRows = Math.max(inputPorts.length, outputPorts.length, 1);
  const bodyHeight = portRows * PORT_ROW_PX;

  return (
    <div
      className={`card border ${styles.nodeCard} ${darkMode ? styles.nodeCardDark : ''}`}
      style={{ minHeight: HEADER_PX + bodyHeight }}
    >
      <div
        className={`card-header py-1 px-2 fw-semibold d-flex align-items-start ${darkMode ? styles.nodeHeaderDark : 'bg-secondary-subtle'} ${styles.nodeHeader}`}
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
            <svg
              width="13"
              height="13"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect
                x="1"
                y="1"
                width="6.5"
                height="6.5"
                rx="1"
                fill="currentColor"
                opacity="0.85"
              />
              <rect
                x="8.5"
                y="1"
                width="6.5"
                height="6.5"
                rx="1"
                fill="currentColor"
                opacity="0.55"
              />
              <rect
                x="1"
                y="8.5"
                width="6.5"
                height="6.5"
                rx="1"
                fill="currentColor"
                opacity="0.55"
              />
              <rect
                x="8.5"
                y="8.5"
                width="6.5"
                height="6.5"
                rx="1"
                fill="currentColor"
                opacity="0.85"
              />
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

      <div
        className="card-body p-0 position-relative"
        style={{ height: bodyHeight }}
      >
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
              className={`d-flex justify-content-between align-items-center px-3 ${styles.portRow} ${darkMode ? styles.portRowDark : ''}`}
              style={{ height: PORT_ROW_PX }}
            >
              {/* Handlers hang off each side's cell, not the row: a midpoint row carries an input
                  on the left and an output on the right, so a row-level click is ambiguous. */}
              <PortCell
                port={inPort}
                kind="input"
                editable={Boolean(canEditInputs)}
                status={inPort ? portStatus?.[inPort.key] : undefined}
                isEditing={Boolean(inPort && editingPortKey === inPort.key)}
                onPortClick={onPortClick}
              />
              <PortCell
                port={outPort}
                kind="output"
                editable={Boolean(canEditOutputs)}
                status={outPort ? portStatus?.[outPort.key] : undefined}
                isEditing={Boolean(outPort && editingPortKey === outPort.key)}
                onPortClick={onPortClick}
              />
            </div>
          );
        })}

        {/* Internal route SVG overlay */}
        {currentRoutes && currentRoutes.length > 0 && (
          <svg
            className={styles.internalRouteSvg}
            width="100%"
            height={bodyHeight}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              pointerEvents: 'none',
            }}
          >
            {currentRoutes.map((route, idx) => {
              const inIdx = inputPorts.findIndex(
                (p) => p.key === route.inputPortKey
              );
              const outIdx = outputPorts.findIndex(
                (p) => p.key === route.outputPortKey
              );
              if (inIdx === -1 || outIdx === -1) return null;

              const inY = ((inIdx + 0.5) / portRows) * bodyHeight;
              const outY = ((outIdx + 0.5) / portRows) * bodyHeight;
              const color = signalColor(route.signalType);

              // Determine if this route is highlighted or dimmed
              const routeKey = `${route.inputPortKey}:${route.outputPortKey}`;
              const isHighlighted =
                highlightedRouteKeys == null ||
                highlightedRouteKeys.has(routeKey);

              // Bezier control points for a smooth S-curve
              const x1 = 24;
              const x2 = 256;
              const cx1 = x1 + (x2 - x1) * 0.4;
              const cx2 = x2 - (x2 - x1) * 0.4;

              return (
                <path
                  key={`route-${idx}`}
                  d={`M ${x1} ${inY} C ${cx1} ${inY}, ${cx2} ${outY}, ${x2} ${outY}`}
                  stroke={isHighlighted ? color : '#ccc'}
                  strokeWidth={
                    isHighlighted && highlightedRouteKeys != null ? 3 : 2
                  }
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
