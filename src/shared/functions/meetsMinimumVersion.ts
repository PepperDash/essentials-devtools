// Compares dot-separated version strings numerically (e.g. "2.29" > "2.9").
// Strips semver pre-release suffixes (e.g. "2.29.0-alpha.1" → "2.29.0").
export function meetsMinVersion(version: string, minimum: string): boolean {
  const vParts = version.split("-")[0].split(".").map((s) => parseInt(s, 10));
  const mParts = minimum.split("-")[0].split(".").map((s) => parseInt(s, 10));
  for (let i = 0; i < Math.max(vParts.length, mParts.length); i++) {
    const a = vParts[i] ?? 0;
    const b = mParts[i] ?? 0;
    if (a !== b) return a > b;
  }
  return true;
}