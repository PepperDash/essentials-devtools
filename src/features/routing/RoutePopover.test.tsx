import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { RoutingPort } from '../../store/apiSlice';
import { CandidateSource } from './routeGraph';
import RoutePopover, {
  RouteEditTarget,
  RoutePopoverProps,
} from './RoutePopover';

const port = (key: string, signalType = 'AudioVideo'): RoutingPort => ({
  key,
  signalType,
  connectionType: 'Hdmi',
  isInternal: false,
});

const candidate = (
  deviceKey: string,
  matchedFlags = ['Audio', 'Video']
): CandidateSource => ({
  deviceKey,
  name: deviceKey,
  isPureSource: true,
  matchedFlags,
});

const anchorRect = {
  top: 100,
  left: 100,
  right: 380,
  bottom: 128,
  width: 280,
  height: 28,
  x: 100,
  y: 100,
  toJSON: () => ({}),
} as DOMRect;

const sinkTarget: RouteEditTarget = {
  kind: 'sinkInput',
  deviceKey: 'display-1',
  deviceName: 'Main Display',
  port: port('hdmiIn1'),
};

function renderPopover(overrides: Partial<RoutePopoverProps> = {}) {
  const onSubmit = vi.fn();
  const onClose = vi.fn();
  const props: RoutePopoverProps = {
    target: sinkTarget,
    anchorRect,
    getCandidateSources: () => [candidate('laptop-1'), candidate('bluray-1')],
    onSubmit,
    onClose,
    ...overrides,
  };
  render(<RoutePopover {...props} />);
  return { onSubmit, onClose };
}

const optionButton = (name: RegExp | string) =>
  screen.getByRole('button', { name });

describe('signal-type step', () => {
  it('offers the full type plus each breakaway option for an AudioVideo port', () => {
    renderPopover();
    expect(optionButton('AudioVideo')).toHaveAttribute('aria-pressed', 'true');
    expect(optionButton('Audio')).toHaveAttribute('aria-pressed', 'false');
    expect(optionButton('Video')).toHaveAttribute('aria-pressed', 'false');
  });

  it('collapses to a static label for a single-type port', () => {
    renderPopover({
      target: { ...sinkTarget, port: port('hdmiIn1', 'Video') },
    });
    expect(
      screen.queryByRole('button', { name: 'Video' })
    ).not.toBeInTheDocument();
    expect(screen.getByText('Video')).toBeInTheDocument();
  });

  it('re-queries candidates when the signal type changes', () => {
    const getCandidateSources = vi.fn((signalType: string) =>
      signalType === 'Audio'
        ? [candidate('dsp-1', ['Audio'])]
        : [candidate('laptop-1')]
    );
    renderPopover({ getCandidateSources });

    expect(screen.getByText('laptop-1')).toBeInTheDocument();
    fireEvent.click(optionButton('Audio'));

    expect(getCandidateSources).toHaveBeenCalledWith('Audio');
    expect(screen.getByText('dsp-1')).toBeInTheDocument();
    expect(screen.queryByText('laptop-1')).not.toBeInTheDocument();
  });
});

describe('sink routing', () => {
  it('submits a sinkRoute command with the selected source and signal type', () => {
    const { onSubmit } = renderPopover();
    fireEvent.click(optionButton(/laptop-1/));

    expect(onSubmit).toHaveBeenCalledWith({
      command: 'sinkRoute',
      deviceKey: 'display-1',
      inputPortKey: 'hdmiIn1',
      sourceDeviceKey: 'laptop-1',
      signalType: 'AudioVideo',
    });
  });

  it('submits the narrowed signal type after a breakaway selection', () => {
    const { onSubmit } = renderPopover();
    fireEvent.click(optionButton('Video'));
    fireEvent.click(optionButton(/laptop-1/));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        signalType: 'Video',
        sourceDeviceKey: 'laptop-1',
      })
    );
  });

  it('submits a clearSink command from the None option', () => {
    const { onSubmit } = renderPopover();
    fireEvent.click(optionButton(/clear route/i));

    expect(onSubmit).toHaveBeenCalledWith({
      command: 'clearSink',
      deviceKey: 'display-1',
      inputPortKey: 'hdmiIn1',
      clearSinkInput: true,
    });
  });

  it('marks the currently routed source', () => {
    renderPopover({ current: { sourceDeviceKey: 'bluray-1' } });
    expect(within(optionButton(/bluray-1/)).getByText('✓')).toBeInTheDocument();
  });

  it('badges a candidate that only has a path for one half of AudioVideo', () => {
    renderPopover({
      getCandidateSources: () => [
        candidate('cam-1', ['Video']),
        candidate('av-1'),
      ],
    });
    expect(
      within(optionButton(/cam-1/)).getByText('video only')
    ).toBeInTheDocument();
    expect(
      within(optionButton(/av-1/)).queryByText(/only/)
    ).not.toBeInTheDocument();
  });

  // A partial match is offerable, not blocked: the request goes out as the selected AudioVideo and
  // the processor routes whichever half has a path. Narrowing it to "Video" here would silently
  // change what the user asked for.
  it('submits a partial-match candidate with the selected signal type, unnarrowed', () => {
    const { onSubmit } = renderPopover({
      getCandidateSources: () => [candidate('cam-1', ['Video'])],
    });
    fireEvent.click(optionButton(/cam-1/));

    expect(onSubmit).toHaveBeenCalledWith({
      command: 'sinkRoute',
      deviceKey: 'display-1',
      inputPortKey: 'hdmiIn1',
      sourceDeviceKey: 'cam-1',
      signalType: 'AudioVideo',
    });
  });

  it('does not disable a partial-match candidate', () => {
    renderPopover({
      getCandidateSources: () => [candidate('cam-1', ['Video'])],
    });
    expect(optionButton(/cam-1/)).not.toBeDisabled();
  });

  it('does not badge anything once the request is narrowed to one atom', () => {
    renderPopover({
      getCandidateSources: () => [candidate('cam-1', ['Video'])],
    });
    fireEvent.click(optionButton('Video'));
    expect(screen.queryByText(/only/)).not.toBeInTheDocument();
  });

  it('explains an empty candidate list', () => {
    renderPopover({ getCandidateSources: () => [] });
    expect(
      screen.getByText('No source has a path to this input for AudioVideo.')
    ).toBeInTheDocument();
  });

  it('labels a multiview tile port readably', () => {
    renderPopover({
      target: {
        kind: 'sinkInput',
        deviceKey: 'nvx-1',
        deviceName: 'Decoder',
        port: port('tile2:tileInput'),
        tileNumber: 2,
      },
    });
    expect(screen.getByText(/Tile 2/)).toBeInTheDocument();
  });
});

describe('midpoint routing', () => {
  const midpointTarget: RouteEditTarget = {
    kind: 'midpointOutput',
    deviceKey: 'dm-chassis-1',
    deviceName: 'DM Chassis',
    port: port('outputCard5'),
    inputPorts: [
      port('inputCard1'),
      port('inputCard2', 'Video'),
      port('inputCard3', 'Audio'),
    ],
  };

  it("lists the device's own input ports, without consulting the graph", () => {
    const getCandidateSources = vi.fn(() => []);
    renderPopover({ target: midpointTarget, getCandidateSources });

    expect(getCandidateSources).not.toHaveBeenCalled();
    expect(optionButton(/inputCard1/)).toBeInTheDocument();
  });

  it('hides inputs that cannot carry the requested signal type', () => {
    renderPopover({ target: midpointTarget });
    // An AudioVideo request needs both flags; the Video-only and Audio-only cards cannot serve it.
    expect(optionButton(/inputCard1/)).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /inputCard2/ })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /inputCard3/ })
    ).not.toBeInTheDocument();
  });

  it('reveals a breakaway-only input once the type is narrowed', () => {
    renderPopover({ target: midpointTarget });
    fireEvent.click(optionButton('Video'));
    expect(optionButton(/inputCard2/)).toBeInTheDocument();
  });

  it('submits a midpointSwitch command', () => {
    const { onSubmit } = renderPopover({ target: midpointTarget });
    fireEvent.click(optionButton(/inputCard1/));

    expect(onSubmit).toHaveBeenCalledWith({
      command: 'midpointSwitch',
      deviceKey: 'dm-chassis-1',
      inputPortKey: 'inputCard1',
      outputPortKey: 'outputCard5',
      signalType: 'AudioVideo',
    });
  });

  it('submits a clearMidpointOutput command from the None option', () => {
    const { onSubmit } = renderPopover({ target: midpointTarget });
    fireEvent.click(optionButton(/clear route/i));

    expect(onSubmit).toHaveBeenCalledWith({
      command: 'clearMidpointOutput',
      deviceKey: 'dm-chassis-1',
      outputPortKey: 'outputCard5',
      signalType: 'AudioVideo',
    });
  });
});

describe('panel styling', () => {
  // Regression guard. The panel is positioned fixed by its own CSS module, but Bootstrap is
  // emitted after the modules in the bundle, so any Bootstrap single-class selector setting the
  // same property wins on source order. Adding `card` back here silently reverts the panel to
  // position:relative, which parks the portal at the end of <body> where it cannot be seen -
  // the popover mounts and behaves correctly, it is just invisible, so no behavioral test
  // catches it. jsdom does not apply the module CSS, so the class list is what we can assert.
  it('does not borrow Bootstrap classes that would override its own positioning', () => {
    renderPopover();
    const panel = screen.getByRole('dialog');
    for (const cls of [
      'card',
      'card-body',
      'card-header',
      'position-relative',
      'position-absolute',
    ]) {
      expect(panel.classList.contains(cls)).toBe(false);
    }
    expect(panel.querySelector('.card, .card-body, .card-header')).toBeNull();
  });
});

describe('submission state and dismissal', () => {
  it('disables the options and shows progress while submitting', () => {
    renderPopover({ isSubmitting: true });
    expect(screen.getByText('Sending…')).toBeInTheDocument();
    expect(optionButton(/laptop-1/)).toBeDisabled();
    expect(optionButton(/clear route/i)).toBeDisabled();
  });

  it('shows an error without closing', () => {
    renderPopover({
      errorMessage: 'No path from laptop-1 to display-1 for Video.',
    });
    expect(screen.getByRole('alert')).toHaveTextContent(
      'No path from laptop-1'
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('closes on Escape', () => {
    const { onClose } = renderPopover();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('closes on an outside click but not on an inside one', () => {
    const { onClose } = renderPopover();

    fireEvent.pointerDown(screen.getByText('Main Display'));
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.pointerDown(document.body);
    expect(onClose).toHaveBeenCalled();
  });

  it('closes from the header close button', () => {
    const { onClose } = renderPopover();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalled();
  });
});

describe('filtering', () => {
  const many = Array.from({ length: 20 }, (_, i) => candidate(`src-${i}`));

  it('offers a filter box only for long lists', () => {
    renderPopover({ getCandidateSources: () => [candidate('laptop-1')] });
    expect(screen.queryByLabelText('Filter options')).not.toBeInTheDocument();
  });

  it('narrows a long list', () => {
    renderPopover({ getCandidateSources: () => many });
    fireEvent.change(screen.getByLabelText('Filter options'), {
      target: { value: 'src-19' },
    });

    expect(optionButton(/src-19/)).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /src-18/ })
    ).not.toBeInTheDocument();
  });

  it('keeps the clear option available while filtering', () => {
    renderPopover({ getCandidateSources: () => many });
    fireEvent.change(screen.getByLabelText('Filter options'), {
      target: { value: 'nothingmatches' },
    });

    expect(screen.getByText('No matches.')).toBeInTheDocument();
    expect(optionButton(/clear route/i)).toBeInTheDocument();
  });
});
