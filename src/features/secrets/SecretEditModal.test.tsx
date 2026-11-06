import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { SecretProviderInfo } from '../../store/secretsContract';
import SecretEditModal, { SecretEditSubmission } from './SecretEditModal';

const providers: SecretProviderInfo[] = [
  {
    key: 'default',
    scope: 'local',
    enumerationSupported: true,
    maxKeyLength: 32,
    maxValueLength: 1600,
  },
  {
    key: 'CrestronSecureSecrets',
    scope: 'local',
    enumerationSupported: true,
    maxKeyLength: 32,
    maxValueLength: 8192,
  },
];

// The shape of a PEM key: line breaks every 64 characters, which a password input would strip.
const PEM = [
  '-----BEGIN RSA PRIVATE KEY-----',
  ...Array.from({ length: 25 }, () => 'A'.repeat(64)),
  '-----END RSA PRIVATE KEY-----',
  '',
].join('\n');

function renderModal(provider: string) {
  const onSubmit = vi.fn<(submission: SecretEditSubmission) => void>();
  render(
    <SecretEditModal
      target={{ mode: 'add' }}
      provider={provider}
      providers={providers}
      existingKeys={[]}
      onSubmit={onSubmit}
      onClose={vi.fn()}
    />
  );
  fireEvent.change(screen.getByLabelText(/^Key/), {
    target: { value: 'iotKey' },
  });
  return onSubmit;
}

const valueInput = () =>
  document.querySelector('#secret-value') as HTMLInputElement;
const addButton = () => screen.getByRole('button', { name: 'Add secret' });

describe('value limit follows the selected provider', () => {
  it('refuses a value over the Data Store limit', () => {
    renderModal('default');
    fireEvent.change(valueInput(), { target: { value: 'v'.repeat(1601) } });
    expect(addButton()).toBeDisabled();
    expect(
      screen.getByText(/default accepts values up to 1600/)
    ).toBeInTheDocument();
  });

  it("accepts a 1,679-character key under the secure provider's limit", () => {
    const onSubmit = renderModal('CrestronSecureSecrets');
    fireEvent.change(valueInput(), { target: { value: 'v'.repeat(1679) } });
    expect(addButton()).toBeEnabled();
    fireEvent.click(addButton());
    expect(onSubmit.mock.calls[0][0].value).toHaveLength(1679);
  });
});

describe('multi-line values keep their line breaks', () => {
  it('keeps a pasted PEM intact and shows only its size', () => {
    const onSubmit = renderModal('CrestronSecureSecrets');
    fireEvent.paste(valueInput(), {
      clipboardData: { getData: () => PEM },
    });

    expect(
      screen.getByDisplayValue(
        `Multi-line value from pasted text: 28 lines, ${PEM.length} characters`
      )
    ).toBeInTheDocument();
    expect(screen.queryByText(/AAAA/)).not.toBeInTheDocument();

    fireEvent.click(addButton());
    expect(onSubmit.mock.calls[0][0].value).toBe(PEM);
  });

  it('leaves single-line pastes to the normal field', () => {
    renderModal('CrestronSecureSecrets');
    const pasted = fireEvent.paste(valueInput(), {
      clipboardData: { getData: () => 'one-line-password' },
    });
    // Not prevented, so the browser's own paste goes ahead.
    expect(pasted).toBe(true);
    expect(screen.queryByText(/Multi-line value/)).not.toBeInTheDocument();
  });

  it('loads a value from a file byte for byte', async () => {
    const onSubmit = renderModal('CrestronSecureSecrets');
    const file = new File([PEM], 'device.key');
    // jsdom's File has no text() in every version
    Object.defineProperty(file, 'text', { value: () => Promise.resolve(PEM) });
    fireEvent.change(screen.getByTestId('secret-value-file'), {
      target: { files: [file] },
    });

    await waitFor(() =>
      expect(
        screen.getByDisplayValue(/Multi-line value from device.key/)
      ).toBeInTheDocument()
    );
    fireEvent.click(addButton());
    expect(onSubmit.mock.calls[0][0].value).toBe(PEM);
  });

  it('blocks saving while a file is read, and ignores a read replaced by Clear', async () => {
    const onSubmit = renderModal('CrestronSecureSecrets');
    let finishRead: (text: string) => void = () => {};
    const file = new File([PEM], 'slow.key');
    Object.defineProperty(file, 'text', {
      value: () =>
        new Promise<string>((resolve) => {
          finishRead = resolve;
        }),
    });

    fireEvent.change(valueInput(), { target: { value: 'typed-first' } });
    fireEvent.change(screen.getByTestId('secret-value-file'), {
      target: { files: [file] },
    });
    expect(addButton()).toBeDisabled();

    fireEvent.change(valueInput(), { target: { value: 'typed-after' } });
    finishRead(PEM);
    await waitFor(() => expect(addButton()).toBeEnabled());
    expect(screen.queryByText(/Multi-line value/)).not.toBeInTheDocument();

    fireEvent.click(addButton());
    expect(onSubmit.mock.calls[0][0].value).toBe('typed-after');
  });

  it('reports a failed read without the file content and allows a retry', async () => {
    renderModal('CrestronSecureSecrets');
    const file = new File([PEM], 'broken.key');
    Object.defineProperty(file, 'text', {
      value: () => Promise.reject(new Error('NotReadableError')),
    });
    const input = screen.getByTestId('secret-value-file') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });

    expect(
      await screen.findByText('"broken.key" could not be read.')
    ).toBeInTheDocument();
    expect(input.value).toBe('');
    expect(addButton()).toBeDisabled();
  });

  it('clears a loaded value back to the normal field', () => {
    renderModal('CrestronSecureSecrets');
    fireEvent.paste(valueInput(), { clipboardData: { getData: () => PEM } });
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
    expect(valueInput()).toHaveValue('');
    expect(addButton()).toBeDisabled();
  });
});
