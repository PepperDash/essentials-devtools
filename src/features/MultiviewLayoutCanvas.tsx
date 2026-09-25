import { MultiviewLayoutState, MultiviewTileState } from '../store/apiSlice';
import styles from './MultiviewLayoutCanvas.module.scss';

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
  /**
   * Called when a tile's edit badge is clicked, with the badge's viewport rect for anchoring the
   * route popover. Omitted when route editing is unavailable, which also hides the badge.
   */
  onTileEditClick?: (tile: MultiviewTileState, rect: DOMRect) => void;
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
  onTileEditClick,
}: MultiviewLayoutCanvasProps) => {
  const aspectRatio = layout.canvasWidth / layout.canvasHeight;

  return (
    <div>
      <div className={`text-muted mb-1 ${styles.canvasMeta}`}>
        {layout.canvasWidth}&times;{layout.canvasHeight}
      </div>
      <div
        className={`${styles.canvas}${darkMode ? '' : ` ${styles.canvasLight}`}`}
        style={{
          aspectRatio:
            Number.isFinite(aspectRatio) && aspectRatio > 0
              ? aspectRatio
              : 16 / 9,
        }}
      >
        {[...layout.tiles]
          .sort((a, b) => a.zOrder - b.zOrder)
          .map((tile) => {
            const isEmpty = !tile.sourceDeviceKey;
            const isSelected = selectedTileNumber === tile.tileNumber;
            const sourceName = tile.sourceDeviceKey
              ? resolveSourceName(tile.sourceDeviceKey)
              : 'Empty';

            return (
              <div
                key={tile.tileNumber}
                className={`${styles.tile}${isEmpty ? ` ${styles.tileEmpty}` : ''}${isSelected ? ` ${styles.tileSelected}` : ''}`}
                style={{
                  left: `${(tile.x / layout.canvasWidth) * 100}%`,
                  top: `${(tile.y / layout.canvasHeight) * 100}%`,
                  width: `${(tile.width / layout.canvasWidth) * 100}%`,
                  height: `${(tile.height / layout.canvasHeight) * 100}%`,
                  zIndex: tile.zOrder,
                }}
                title={`Tile ${tile.tileNumber}: ${sourceName}`}
                // Not a <button>: it contains the edit <button>, and buttons can't nest.
                role={onTileClick ? "button" : undefined}
                tabIndex={onTileClick ? 0 : undefined}
                aria-label={onTileClick ? `Tile ${tile.tileNumber}: ${sourceName}` : undefined}
                aria-pressed={onTileClick ? isSelected : undefined}
                onClick={(e) => {
                  e.stopPropagation();
                  onTileClick?.(tile);
                }}
                onKeyDown={(e) => {
                  // Ignore keys bubbling up from the nested edit button.
                  if (!onTileClick || e.target !== e.currentTarget) return;
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    e.stopPropagation();
                    onTileClick(tile);
                  }
                }}
              >
                <span className={styles.tileNumberBadge}>
                  {tile.tileNumber}
                </span>
                {onTileEditClick && (
                  <button
                    type="button"
                    className={styles.tileEditBtn}
                    title={`Route tile ${tile.tileNumber}`}
                    aria-label={`Route tile ${tile.tileNumber}`}
                    aria-haspopup="dialog"
                    // Without this the tile's own click handler would also fire and trace the
                    // existing path, fighting the popover for the user's attention.
                    onClick={(e) => {
                      e.stopPropagation();
                      onTileEditClick(
                        tile,
                        e.currentTarget.getBoundingClientRect()
                      );
                    }}
                  >
                    <svg
                      width="10"
                      height="10"
                      viewBox="0 0 16 16"
                      fill="currentColor"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168l10-10zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207 11.207 2.5zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293l6.5-6.5z" />
                    </svg>
                  </button>
                )}
                <span className={styles.tileLabel}>{sourceName}</span>
              </div>
            );
          })}
      </div>
    </div>
  );
};

export default MultiviewLayoutCanvas;
