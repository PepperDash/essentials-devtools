/**
 * Saving generated content to the user's machine.
 *
 * Extracted from DebugConsole's inline log export so the secrets template download shares one
 * implementation rather than a second copy of the same eight lines.
 */

/**
 * Prompts the browser to save `text` as `filename`.
 *
 * The anchor has to be in the document for the synthetic click to work in Firefox, and the object
 * URL can only be revoked once the click has been dispatched - hence the deferred cleanup rather
 * than revoking inline, which cancels the download in some browsers.
 */
export function downloadText(
  filename: string,
  text: string,
  mime = 'text/plain'
): void {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();

  setTimeout(() => {
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }, 0);
}

/** Pretty-prints `data` and saves it as a .json file. */
export function downloadJson(filename: string, data: unknown): void {
  downloadText(filename, JSON.stringify(data, null, 2), 'application/json');
}

/**
 * Builds a filename stamped with the current date, e.g. `secrets-template-app01-2026-09-16.json`.
 * Matching the timestamped convention the debug log export already uses.
 */
export function timestampedFilename(prefix: string, extension: string): string {
  const date = new Date().toISOString().slice(0, 10);
  return `${prefix}-${date}.${extension}`;
}
