export interface UrlParameter {
  /** The name as written in the route, minus any decoration: "filter" for "{filter}" */
  name: string;
  /** An optional parameter ("{name?}") may be left empty */
  optional: boolean;
  /** A catch-all parameter ("{*path}") can hold slashes */
  catchAll: boolean;
}

const PLACEHOLDER = /\{([^}]+)\}/g;

const parse = (raw: string): UrlParameter => {
  const catchAll = raw.startsWith('*');
  const optional = raw.includes('?') || raw.includes('=');
  const name = raw.replace(/^\*/, '').split(/[?:=]/)[0];
  return { name, optional, catchAll };
};

/** The distinct parameters in a route's URL, in the order they first appear. */
export function getUrlParameters(url: string): UrlParameter[] {
  const seen = new Map<string, UrlParameter>();
  for (const match of url.matchAll(PLACEHOLDER)) {
    const param = parse(match[1]);
    if (!seen.has(param.name)) seen.set(param.name, param);
  }
  return [...seen.values()];
}

const encodeValue = (value: string, catchAll: boolean) =>
  catchAll
    ? value.split('/').map(encodeURIComponent).join('/')
    : encodeURIComponent(value);

/**
 * Fills the route's placeholders from `values`. A placeholder with no value is left as written,
 * so the preview shows what is still missing; an optional one with no value is dropped along with
 * its leading slash. `complete` says whether every required parameter has a value.
 */
export function resolveUrl(url: string, values: Record<string, string>) {
  let complete = true;
  const resolved = url.replace(
    /(\/?)\{([^}]+)\}/g,
    (whole, slash: string, raw: string) => {
      const param = parse(raw);
      const value = (values[param.name] ?? '').trim();
      if (value) return slash + encodeValue(value, param.catchAll);
      if (param.optional) return '';
      complete = false;
      return whole;
    }
  );
  return { url: resolved, complete };
}

export type SuggestionKind = 'bridge' | 'device' | 'type';

/**
 * What kind of value a parameter takes, judged from its name, so the form can offer a list to pick
 * from: deviceKey and key take a device key, bridgeKey a bridge's key, and filter and type take a
 * type name. Anything else is left as a plain text field.
 */
export function suggestionKind(parameterName: string): SuggestionKind | null {
  const name = parameterName.toLowerCase();
  if (name.includes('bridge')) return 'bridge';
  if (name.includes('device') || name === 'key') return 'device';
  if (name.includes('type') || name === 'filter') return 'type';
  return null;
}
