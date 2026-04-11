import { Handle, NodeProps, Position } from "@xyflow/react";
import { RoutingDevice } from "../store/apiSlice";
import styles from "./RoutingDeviceNode.module.scss";

export type RoutingDeviceNodeData = {
  device: RoutingDevice;
  onHide?: () => void;
};

const PORT_ROW_PX = 28;
const HEADER_PX = 38;

const RoutingDeviceNode = ({ data }: NodeProps) => {
  const { device, onHide } = data as RoutingDeviceNodeData;
  const inputPorts = device.inputPorts ?? [];
  const outputPorts = device.outputPorts ?? [];
  const portRows = Math.max(inputPorts.length, outputPorts.length, 1);
  const bodyHeight = portRows * PORT_ROW_PX;

  return (
    <div
      className={`card border ${styles.nodeCard}`}
      style={{ minHeight: HEADER_PX + bodyHeight }}
    >
      <div
        className={`card-header py-1 px-2 fw-semibold bg-secondary-subtle d-flex align-items-start ${styles.nodeHeader}`}
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
              className={`d-flex justify-content-between align-items-center px-3 ${styles.portRow}`}
              style={{ height: PORT_ROW_PX }}
            >
              <span className={`text-muted text-truncate ${styles.portLabel}`} title={inPort?.key}>
                {inPort?.key ?? ""}
              </span>
              <span
                className={`text-muted text-truncate text-end ${styles.portLabel}`}
                title={outPort?.key}
              >
                {outPort?.key ?? ""}
              </span>
            </div>
          );
        })}

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
