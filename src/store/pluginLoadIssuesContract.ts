/**
 * Helpers for the Essentials plugin load issues API (GET /pluginLoadIssues), added in Essentials 3.0.
 * Wire types live in apiSlice.ts alongside the endpoint.
 */
import type {
  PluginLoadIssueCategory,
  PluginLoadIssueSeverity,
  PluginLoadStatus,
} from './apiSlice';

/**
 * True when the processor exposes the plugin load issues API, detected from its live CWS route
 * table rather than from a version number, so the page appears exactly where the endpoint exists.
 */
export function supportsPluginLoadIssuesApi(
  routes?: { Url?: string }[]
): boolean {
  if (!routes) return false;
  return routes.some((route) =>
    /(^|\/)pluginLoadIssues(\/|$)/i.test(route.Url ?? '')
  );
}

/** Bootstrap colour for a severity badge. */
export function severityVariant(severity: PluginLoadIssueSeverity): string {
  return severity === 'Error' ? 'danger' : 'warning';
}

/**
 * Text colour for a badge on the given Bootstrap variant. With this app's theme colours, white text
 * fails the 4.5:1 contrast minimum on success (2.56:1), secondary (4.00:1) and warning (2.21:1), so
 * those get dark text. Danger keeps white text, which passes at 5.05:1 where dark would not (4.16:1).
 */
export function badgeText(variant: string): 'dark' | undefined {
  return variant === 'danger' ? undefined : 'dark';
}

/** Bootstrap colour for a status badge. */
export function statusVariant(status: PluginLoadStatus): string {
  switch (status) {
    case 'Loaded':
      return 'success';
    case 'LoadedAsLibrary':
      return 'secondary';
    case 'Skipped':
      return 'warning';
    default:
      return 'danger';
  }
}

const STATUS_LABELS: Record<PluginLoadStatus, string> = {
  Pending: 'Pending',
  Loaded: 'Loaded',
  LoadedAsLibrary: 'Loaded (library)',
  Skipped: 'Skipped',
  Failed: 'Failed',
};

export function statusLabel(status: PluginLoadStatus): string {
  return STATUS_LABELS[status] ?? status;
}

const CATEGORY_LABELS: Record<PluginLoadIssueCategory, string> = {
  BuiltAgainstNewerEssentials: 'Built against newer Essentials',
  NewerDependencyReference: 'Newer dependency',
  IncompatibleApi: 'Incompatible API',
  MinimumVersionNotMet: 'Minimum version not met',
  MissingDependency: 'Missing dependency',
  LoadFailure: 'Load failure',
  TypeLoadFailure: 'Type load failure',
  FactoryFailure: 'Factory failure',
  PackageExtractFailure: 'Package extract failure',
};

/** Readable label for a category; unknown categories from a newer Essentials show as sent. */
export function categoryLabel(category: PluginLoadIssueCategory): string {
  return CATEGORY_LABELS[category] ?? category;
}
