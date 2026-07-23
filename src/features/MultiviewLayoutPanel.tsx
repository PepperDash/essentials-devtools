import { useCallback, useRef } from "react";

import { MultiviewLayoutState, MultiviewTileState } from "../store/apiSlice";
import MultiviewLayoutCanvas from "./MultiviewLayoutCanvas";
import styles from "./MultiviewLayoutPanel.module.scss";

export interface MultiviewLayoutPanelPosition {
  x: number;
  y: number;
}

export interface MultiviewLayoutPanelProps {
  title: string;
  layout: MultiviewLayoutState;
  position: MultiviewLayoutPanelPosition;
  darkMode?: boolean;
  selectedTileNumber?: number | null;
  resolveSourceName: (deviceKey: string) => string;
  onTileClick?: (tile: MultiviewTileState) => void;
  onClose: () => void;
  onMove: (position: MultiviewLayoutPanelPosition) => void;
}

/**
 * A floating, freely-draggable window showing a single device's multiview canvas/tile mock-up
 * (via MultiviewLayoutCanvas). Rendered as a sibling of the React Flow canvas (not as part of a
 * graph node), so its position is independent of node positions - which move whenever the dagre
 * layout re-runs in response to routing/filter changes. Stays open until explicitly closed, and
 * multiple panels (one per device) can be open and dragged around independently at once.
 */
const MultiviewLayoutPanel = ({
  title,
  layout,
  position,
  darkMode,
  selectedTileNumber,
  resolveSourceName,
  onTileClick,
  onClose,
  onMove,
}: MultiviewLayoutPanelProps) => {
  const dragStateRef = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null);

  const handleTitleBarPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      // Only left-click / primary touch should start a drag.
      if (e.button !== 0) return;

      dragStateRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        originX: position.x,
        originY: position.y,
      };

      const handlePointerMove = (moveEvent: PointerEvent) => {
        const dragState = dragStateRef.current;
        if (!dragState) return;
        onMove({
          x: dragState.originX + (moveEvent.clientX - dragState.startX),
          y: dragState.originY + (moveEvent.clientY - dragState.startY),
        });
      };

      const handlePointerUp = () => {
        dragStateRef.current = null;
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", handlePointerUp);
        window.removeEventListener("pointercancel", handlePointerUp);
      };

      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp, { once: true });
      window.addEventListener("pointercancel", handlePointerUp, { once: true });
    },
    [position.x, position.y, onMove],
  );

  return (
    <div
      className={`${styles.panel}${darkMode ? ` ${styles.panelDark}` : ""}`}
      style={{ left: position.x, top: position.y }}
    >
      <div
        className={`${styles.titleBar}${darkMode ? ` ${styles.titleBarDark}` : ""}`}
        onPointerDown={handleTitleBarPointerDown}
      >
        <span className={styles.title} title={title}>
          {title}
        </span>
        <button className={styles.closeBtn} onClick={onClose} title="Close">
          &times;
        </button>
      </div>
      <div className={styles.body}>
        <MultiviewLayoutCanvas
          layout={layout}
          resolveSourceName={resolveSourceName}
          darkMode={darkMode}
          selectedTileNumber={selectedTileNumber}
          onTileClick={onTileClick}
        />
      </div>
    </div>
  );
};

export default MultiviewLayoutPanel;
