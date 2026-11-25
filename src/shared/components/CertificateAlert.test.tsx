import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import CertificateAlert from './CertificateAlert';

afterEach(() => vi.restoreAllMocks());

describe('CertificateAlert', () => {
  it('offers the https address of each failed server, once', () => {
    render(
      <CertificateAlert
        failedUrls={[
          'wss://10.11.50.116:50001/debug',
          'wss://10.11.50.116:50001/other',
          'ws://10.11.50.116:50002/debug',
        ]}
        onRetry={() => {}}
      />
    );
    expect(
      screen.getByText(
        'Open https://10.11.50.116:50001 to accept the certificate'
      )
    ).toBeTruthy();
    expect(
      screen.getByText(
        'Open http://10.11.50.116:50002 to accept the certificate'
      )
    ).toBeTruthy();
  });

  it('opens the address in a new tab and retries when the user comes back', () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    const onRetry = vi.fn();
    render(
      <CertificateAlert
        failedUrls={['wss://10.11.50.116:50001/debug']}
        onRetry={onRetry}
      />
    );

    fireEvent.click(screen.getByText(/to accept the certificate/));
    expect(open).toHaveBeenCalledWith(
      'https://10.11.50.116:50001',
      '_blank',
      'noopener,noreferrer'
    );
    expect(onRetry).not.toHaveBeenCalled();

    fireEvent(window, new Event('focus'));
    expect(onRetry).toHaveBeenCalledTimes(1);

    // One retry per visit: coming back again doesn't retry unprompted
    fireEvent(window, new Event('focus'));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('retries on demand', () => {
    const onRetry = vi.fn();
    render(
      <CertificateAlert failedUrls={['wss://host:1/x']} onRetry={onRetry} />
    );
    fireEvent.click(screen.getByText('Try again'));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('shows nothing when no failed URL can be parsed', () => {
    const { container } = render(
      <CertificateAlert failedUrls={['not a url']} onRetry={() => {}} />
    );
    expect(container.textContent).toBe('');
  });
});
