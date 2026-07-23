import { MultiviewLayoutState, MultiviewTileState } from "../store/apiSlice";
import styles from "./MultiviewLayoutCanvas.module.scss";

export interface MultiviewLayoutCanvasProps {
  /** Current multiview canvas/tile layout to render. */
  layout: MultiviewLayoutState;
  /** Resolves a device key (e.g. a tile's sourceDeviceKey) to a display name. */
  resolveSourceName: (deviceKey: string) => string;
  darkMode?: boolean;
  /** Tile number to render as selected/highlighted, or null/undefined if none. */
  selectedTileNumber?: number | null;
  /** Called when a tile is clicked, with the full tile state. */
  onTileClick?: (tile: MultiviewTileState) => void;
}

/**
 * Renders a visual mock-up of what is actually displayed on the monitor fed by a single
 * multiview-capable decoder: its canvas at the correct aspect ratio, with every tile
 * positioned/sized/stacked to match and labeled with its routed source. Used inside a per-node
 * popover in RoutingDeviceNode - purely additive, it does not alter the existing tie-line/route
 * graph visualization in Routing.tsx.
 */
const MultiviewLayoutCanvas = ({
  layout,
  resolveSourceName,
  darkMode,
  selectedTileNumber,
  onTileClick,
}: MultiviewLayoutCanvasProps) => {
  const aspectRatio = layout.canvasWidth / layout.canvasHeight;

  return (
    <div>
      <div className={`text-muted mb-1 ${styles.canvasMeta}`}>
        {layout.canvasWidth}&times;{layout.canvasHeight}
      </div>
      <div
        className={`${styles.canvas}${darkMode ? "" : ` ${styles.canvasLight}`}`}
        style={{ aspectRatio: Number.isFinite(aspectRatio) && aspectRatio > 0 ? aspectRatio : 16 / 9 }}
      >
        {[...layout.tiles]
          .sort((a, b) => a.zOrder - b.zOrder)
          .map((tile) => {
            const isEmpty = !tile.sourceDeviceKey;
            const isSelected = selectedTileNumber === tile.tileNumber;
            const sourceName = tile.sourceDeviceKey
              ? resolveSourceName(tile.sourceDeviceKey)
              : "Empty";

            return (
              <div
                key={tile.tileNumber}
                className={`${styles.tile}${isEmpty ? ` ${styles.tileEmpty}` : ""}${isSelected ? ` ${styles.tileSelected}` : ""}`}
                style={{
                  left: `${(tile.x / layout.canvasWidth) * 100}%`,
                  top: `${(tile.y / layout.canvasHeight) * 100}%`,
                  width: `${(tile.width / layout.canvasWidth) * 100}%`,
                  height: `${(tile.height / layout.canvasHeight) * 100}%`,
                  zIndex: tile.zOrder,
                }}
                title={`Tile ${tile.tileNumber}: ${sourceName}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onTileClick?.(tile);
                }}
              >
                <span className={styles.tileNumberBadge}>{tile.tileNumber}</span>
                <span className={styles.tileLabel}>{sourceName}</span>
              </div>
            );
          })}
      </div>
    </div>
  );
};

export default MultiviewLayoutCanvas;

