import {
  BaseEdge,
  EdgeLabelRenderer,
  EdgeProps,
  getBezierPath,
} from "@xyflow/react";
import styles from "./Routing.module.scss";

export interface TieLineEdgeData {
  signalColor: string;
  sourceDeviceKey: string;
  sourcePortKey: string;
  destinationDeviceKey: string;
  destinationPortKey: string;
  signalType: string;
  hovered?: boolean;
  selected?: boolean;
  [key: string]: unknown;
}

const TieLineEdge = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  data,
  markerEnd,
}: EdgeProps) => {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const d = data as TieLineEdgeData | undefined;
  const showTooltip = (d?.hovered || d?.selected) ?? false;

  return (
    <>
      <BaseEdge id={id} path={edgePath} style={style} markerEnd={markerEnd} />
      {showTooltip && d && (
        <EdgeLabelRenderer>
          <div
            className={styles.tieLineTooltip}
            style={{
              transform: `translate(-50%, -100%) translate(${labelX}px, ${labelY - 8}px)`,
            }}
          >
            <div className={styles.tieLineTooltipRow}>
              <span className={styles.tieLineTooltipLabel}>Type</span>
              <span>{d.signalType}</span>
            </div>
            <div className={styles.tieLineTooltipRow}>
              <span className={styles.tieLineTooltipLabel}>Source</span>
              <span>{d.sourceDeviceKey}</span>
            </div>
            <div className={styles.tieLineTooltipRow}>
              <span className={styles.tieLineTooltipLabel}>Src Port</span>
              <span>{d.sourcePortKey}</span>
            </div>
            <div className={styles.tieLineTooltipRow}>
              <span className={styles.tieLineTooltipLabel}>Dest</span>
              <span>{d.destinationDeviceKey}</span>
            </div>
            <div className={styles.tieLineTooltipRow}>
              <span className={styles.tieLineTooltipLabel}>Dst Port</span>
              <span>{d.destinationPortKey}</span>
            </div>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
};

export default TieLineEdge;
