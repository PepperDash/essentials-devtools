import { useEffect, useState } from 'react';
import { Button, Form, Offcanvas } from 'react-bootstrap';
import SuggestInput, { Suggestion } from '../shared/components/SuggestInput';
import useAppParams from '../shared/hooks/useAppParams';
import { Route, useGetDevicesQuery, useGetTypesQuery } from '../store/apiSlice';
import {
  getUrlParameters,
  resolveUrl,
  suggestionKind,
  SuggestionKind,
} from './apiPathUrl';

// A bridge is a device, but the device list doesn't say which are bridges, so they're picked out
// by what their key or name looks like. A program with none gets a plain field, not a list of
// devices that aren't bridges.
const LOOKS_LIKE_BRIDGE = /bridge|eisc|api/i;

/**
 * The URL for a path, with a field for each {parameter} in it. Copy and Open use the URL with the
 * values filled in. Keyed by route by the caller, so the values start empty for each path.
 */
const PathUrl = ({ route, baseUrl }: { route: Route; baseUrl: string }) => {
  const parameters = getUrlParameters(route.Url);
  const { appId } = useAppParams();

  // Suggestions are only fetched for a path that has parameters. Both lists are cached and shared
  // with the Devices and Types pages, so this is usually no extra request.
  const wantsLists = parameters.length > 0 && !!appId;
  const { data: devices } = useGetDevicesQuery(
    { appId: appId ?? '' },
    { skip: !wantsLists }
  );
  const { data: types } = useGetTypesQuery(
    { appId: appId ?? '' },
    { skip: !wantsLists }
  );

  const suggestionsFor = (kind: SuggestionKind | null): Suggestion[] => {
    if (kind === 'type') {
      const classes = [...new Set((types ?? []).map((t) => t.CType))]
        .filter(Boolean)
        .sort()
        .map((value) => ({ value, label: 'class' }));
      const names = (types ?? [])
        .map((t) => ({ value: t.Type, label: t.Description }))
        .sort((a, b) => a.value.localeCompare(b.value));
      return [...names, ...classes];
    }
    if (kind === 'device' || kind === 'bridge') {
      const all = (devices ?? [])
        .map((d) => ({ value: d.Key, label: d.Name }))
        .sort((a, b) => a.value.localeCompare(b.value));
      if (kind === 'device') return all;
      return all.filter((d) =>
        LOOKS_LIKE_BRIDGE.test(`${d.value} ${d.label ?? ''}`)
      );
    }
    return [];
  };
  const [values, setValues] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(timer);
  }, [copied]);

  const { url: resolvedPath, complete } = resolveUrl(route.Url, values);
  const fullUrl = `${baseUrl}/${resolvedPath}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
    } catch {
      // Clipboard access can be refused (an insecure page, or blocked by the browser); the URL is
      // still shown to select by hand
    }
  };

  const open = () => {
    if (complete) window.open(fullUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        open();
      }}
    >
      {parameters.length > 0 && (
        <div className="d-flex flex-column gap-2 mb-3">
          {parameters.map((param, index) => (
            <Form.Group key={param.name} controlId={`api-param-${param.name}`}>
              <Form.Label>
                {param.name}
                {param.optional && (
                  <span className="text-muted fw-normal"> (optional)</span>
                )}
              </Form.Label>
              <SuggestInput
                id={`api-param-${param.name}`}
                value={values[param.name] ?? ''}
                onChange={(value) =>
                  setValues((prev) => ({ ...prev, [param.name]: value }))
                }
                suggestions={suggestionsFor(suggestionKind(param.name))}
                placeholder={`Value for {${param.name}}`}
                autoFocus={index === 0}
              />
              {suggestionKind(param.name) === 'bridge' &&
                suggestionsFor('bridge').length === 0 &&
                devices && (
                  <Form.Text className="text-muted">
                    No bridge devices found on this program; enter the key by
                    hand.
                  </Form.Text>
                )}
            </Form.Group>
          ))}
        </div>
      )}
      <div className="api-url api-detail-url">{fullUrl}</div>
      <div className="d-flex flex-wrap align-items-center gap-2 mt-2">
        <Button
          variant="outline-secondary"
          size="sm"
          onClick={() => void copy()}
        >
          {copied ? 'Copied' : 'Copy URL'}
        </Button>
        <Button
          type="submit"
          variant={parameters.length > 0 ? 'primary' : 'outline-secondary'}
          size="sm"
          disabled={!complete}
          title={complete ? undefined : 'Fill in the parameters first'}
        >
          Open in new tab
        </Button>
        {!complete && (
          <span className="text-muted small">
            Fill in the parameters to open it.
          </span>
        )}
      </div>
    </form>
  );
};

const ApiPathDetailDrawer = ({
  show,
  route,
  handleClose,
  url,
}: ApiPathDetailDrawerProps) => {
  if (!route) return null;

  return (
    <Offcanvas
      show={show}
      onHide={handleClose}
      placement="end"
      backdrop={false}
      className="right-drawer shadow-sm border p-3"
    >
      <Offcanvas.Header closeButton>
        <Offcanvas.Title>API Path Detail</Offcanvas.Title>
      </Offcanvas.Header>
      <Offcanvas.Body>
        <div className="d-flex flex-column gap-3">
          <div>
            <h5>Name</h5>
            {route.Name}
          </div>
          <div>
            <h5>URL</h5>
            <PathUrl key={route.Url} route={route} baseUrl={url} />
          </div>
          {route.DataTokens?.Name && (
            <div>
              <h5>Data Token Name</h5>
              {route.DataTokens.Name}
            </div>
          )}
          <div className="text-muted small">
            Use the up and down arrow keys to step through the paths.
          </div>
        </div>
      </Offcanvas.Body>
    </Offcanvas>
  );
};

export default ApiPathDetailDrawer;

interface ApiPathDetailDrawerProps {
  show: boolean;
  route: Route | undefined;
  handleClose: () => void;
  url: string;
}
