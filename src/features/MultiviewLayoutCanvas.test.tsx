import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MultiviewLayoutState } from '../store/apiSlice';
import MultiviewLayoutCanvas from './MultiviewLayoutCanvas';

const layout: MultiviewLayoutState = {
  canvasWidth: 1920,
  canvasHeight: 1080,
  tiles: [
    {
      tileNumber: 1,
      tileSinkKey: 'mv-1-tile1',
      x: 0,
      y: 0,
      width: 960,
      height: 1080,
      zOrder: 1,
      sourceDeviceKey: 'laptop',
    },
  ],
};

describe('MultiviewLayoutCanvas', () => {
  it('renders selecting and routing a tile as sibling buttons, not nested ones', () => {
    render(
      <MultiviewLayoutCanvas
        layout={layout}
        resolveSourceName={() => 'Laptop'}
        onTileClick={() => {}}
        onTileEditClick={() => {}}
      />
    );

    const select = screen.getByRole('button', { name: 'Tile 1: Laptop' });
    const edit = screen.getByRole('button', { name: 'Route tile 1' });
    expect(select.contains(edit)).toBe(false);
    expect(edit.contains(select)).toBe(false);
    expect(select.closest('button')).toBe(select);
  });

  it('sends a select click and an edit click to their own handlers', () => {
    const onTileClick = vi.fn();
    const onTileEditClick = vi.fn();
    render(
      <MultiviewLayoutCanvas
        layout={layout}
        resolveSourceName={() => 'Laptop'}
        onTileClick={onTileClick}
        onTileEditClick={onTileEditClick}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Route tile 1' }));
    expect(onTileEditClick).toHaveBeenCalledTimes(1);
    expect(onTileClick).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Tile 1: Laptop' }));
    expect(onTileClick).toHaveBeenCalledWith(layout.tiles[0]);
  });

  it('renders no buttons when the tile is not interactive', () => {
    render(
      <MultiviewLayoutCanvas
        layout={layout}
        resolveSourceName={() => 'Laptop'}
      />
    );
    expect(screen.queryAllByRole('button')).toHaveLength(0);
    expect(screen.getByText('Laptop')).toBeInTheDocument();
  });
});
