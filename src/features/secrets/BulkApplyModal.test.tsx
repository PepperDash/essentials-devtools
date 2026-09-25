import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
  BulkEntryResult,
  BulkSecretEntry,
  BulkSecretsResponse,
} from '../../store/secretsContract';
import BulkApplyModal, { BulkApplyModalProps } from './BulkApplyModal';

type RunOptions = Parameters<BulkApplyModalProps['onRun']>[1];

const respond = (results: BulkEntryResult[]): BulkSecretsResponse => ({
  mode: 'preview',
  provider: 'default',
  overwrite: true,
  summary: {
    total: results.length,
    create: results.filter((r) => r.action === 'create').length,
    overwrite: results.filter((r) => r.action === 'overwrite').length,
    skip: results.filter((r) => r.action === 'skip').length,
    invalid: 0,
    failed: 0,
  },
  entries: results,
});

// Stands in for the processor's classification: an unmanaged target is skipped unless the request
// explicitly allows overwriting it.
const fakeProcessor =
  (unmanaged: string[]) => (entries: BulkSecretEntry[], options: RunOptions) =>
    Promise.resolve(
      respond(
        entries.map((entry, index) => ({
          index,
          key: entry.key,
          provider: entry.provider ?? 'default',
          applied: options.mode === 'commit',
          ...(unmanaged.includes(entry.key) && !options.allowUnmanagedOverwrite
            ? { action: 'skip' as const, reason: 'unmanagedTarget' }
            : { action: 'overwrite' as const }),
        }))
      )
    );

function renderModal(onRun: BulkApplyModalProps['onRun']) {
  render(<BulkApplyModal provider="default" onRun={onRun} onClose={vi.fn()} />);
}

async function chooseFile(contents: object) {
  const text = JSON.stringify(contents);
  const file = new File([text], 'secrets.json', { type: 'application/json' });
  // jsdom's File has no text() in every version
  Object.defineProperty(file, 'text', { value: () => Promise.resolve(text) });
  const input = document.querySelector(
    'input[type="file"]'
  ) as HTMLInputElement;
  fireEvent.change(input, { target: { files: [file] } });
}

describe('provider overrides', () => {
  it('refuses a file aimed at another provider without sending it', async () => {
    const onRun = vi.fn(fakeProcessor([]));
    renderModal(onRun);

    await chooseFile({ provider: 'other', secrets: { a: '1' } });

    expect(
      await screen.findByText(/This file is for "other", not "default"/)
    ).toBeInTheDocument();
    expect(onRun).not.toHaveBeenCalled();
  });

  it('accepts a file naming the selected provider', async () => {
    const onRun = vi.fn(fakeProcessor([]));
    renderModal(onRun);

    await chooseFile({ provider: 'Default', secrets: { a: '1' } });

    await waitFor(() => expect(onRun).toHaveBeenCalled());
  });
});

describe('unmanaged targets', () => {
  it('flags the entries the processor held back and only sends the override once acknowledged', async () => {
    const onRun = vi.fn(fakeProcessor(['mcTokens']));
    renderModal(onRun);

    await chooseFile({ secrets: { mcTokens: 'x', mine: 'y' } });

    const ack = await screen.findByLabelText(
      /Also overwrite 1 record this tool does not manage/
    );
    expect(screen.getByText('not managed here')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Apply 1 secret' })
    ).toBeEnabled();

    fireEvent.click(ack);

    // Re-previewed with the override, so the count matches what Apply will write
    expect(
      await screen.findByRole('button', { name: 'Apply 2 secrets' })
    ).toBeEnabled();
    expect(onRun).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({
        mode: 'preview',
        allowUnmanagedOverwrite: true,
      })
    );
    // Still marked after the processor starts reporting it as a plain overwrite
    expect(screen.getByText('not managed here')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Apply 2 secrets' }));

    await waitFor(() =>
      expect(onRun).toHaveBeenLastCalledWith(
        expect.anything(),
        expect.objectContaining({
          mode: 'commit',
          allowUnmanagedOverwrite: true,
        })
      )
    );
  });
});
