import { skipToken } from '@reduxjs/toolkit/query';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { Button, Form, InputGroup, Modal, Nav, Spinner } from 'react-bootstrap';
import useAppParams from '../shared/hooks/useAppParams';
import { SortableTh } from '../shared/SortableTh';
import { SortAccessors, useSort } from '../shared/sorting';
import {
  DeviceFeedbacks,
  DeviceMethods,
  DeviceProperties,
  IKeyed,
  MethodParam,
  useGetDeviceFeedbacksQuery,
  useGetDeviceMethodsQuery,
  useGetDevicePropertiesQuery,
  useSetDeviceJsonCommandMutation,
} from '../store/apiSlice';
import { livePolling, POLL_INTERVALS_MS } from '../store/polling';

// Parameter types arrive as bare or qualified names ("Boolean", "System.Boolean")
const isBooleanType = (type: string) => /^(System\.)?Boolean$/i.test(type);
const isIntegerType = (type: string) =>
  /^(System\.)?(U?Int(8|16|32|64)?|Byte|SByte|Short|UShort|Long|ULong)$/i.test(
    type
  );

// Types that can be typed into a single field. Anything else (objects, collections, actions and
// other delegates) can only be entered in a dialog.
const isSimpleType = (type: string) =>
  isBooleanType(type) ||
  isIntegerType(type) ||
  /^(System\.)?(String|Char|Single|Double|Decimal|Float)$/i.test(type);

const defaultParamValue = (type: string) =>
  isBooleanType(type) ? 'false' : '';

// Integers must be whole numbers; everything else (strings, and types we don't recognise) is sent
// as typed
const isParamValid = (type: string, value: string) =>
  !isIntegerType(type) || /^-?\d+$/.test(value.trim());

// How long "Press & Release" holds true before sending false, in seconds
const PRESS_DELAY_DEFAULT_S = 0.75;
// A provisional floor; the transport's own floor is one request round trip (sends are sequential)
const PRESS_DELAY_MIN_S = 0.5;
const PRESS_DELAY_MAX_S = 30;

type DetailTab = 'run' | 'properties';

type PropertyColumn = 'name' | 'type' | 'value' | 'access';
const PROPERTY_SORT: SortAccessors<DeviceProperties, PropertyColumn> = {
  name: (p) => p.Name,
  type: (p) => p.Type,
  value: (p) => p.Value,
  // Read and write, then read only, then neither
  access: (p) => (p.CanRead ? 2 : 0) + (p.canWrite ? 1 : 0),
};

const METHOD_SORT: SortAccessors<DeviceMethods, 'name'> = {
  name: (m) => m.Name,
};

// The share of the Methods & Feedbacks tab given to Methods; Feedbacks, docked beneath, gets the
// rest. Methods is the longer list, but feedbacks sit side by side and need little height.
const SPLIT_DEFAULT = 0.65;
const SPLIT_MIN = 0.2;
const SPLIT_MAX = 0.85;
const SPLIT_KEY_STEP = 0.05;
const SPLIT_STORAGE_KEY = 'essentials-devtools.run-split';

const clampSplit = (value: number) =>
  Math.min(SPLIT_MAX, Math.max(SPLIT_MIN, value));

// The remembered split, if there is one: storage can be missing or blocked
const readSplit = () => {
  try {
    const saved = Number(localStorage.getItem(SPLIT_STORAGE_KEY));
    return saved > 0 ? clampSplit(saved) : SPLIT_DEFAULT;
  } catch {
    return SPLIT_DEFAULT;
  }
};

const DeviceDetail = ({ item }: DeviceDetailProps) => {
  const { appId } = useAppParams();
  const [liveUpdates, setLiveUpdates] = useState(true);
  // Kept here, not in the render below, so the chosen tab survives switching device
  const [tab, setTab] = useState<DetailTab>('run');

  const args = appId && item?.Key ? { appId, key: item.Key } : skipToken;
  // Property and feedback values change underneath us (device polling, hardware changed out of
  // band), so re-read them on an interval. Methods are static. Polling pauses while the browser
  // tab is in the background, and stops when this component unmounts.
  const polling = livePolling(liveUpdates ? POLL_INTERVALS_MS.deviceValues : 0);
  const propertiesQuery = useGetDevicePropertiesQuery(args, polling);
  const { data: methods } = useGetDeviceMethodsQuery(args);
  const feedbacksQuery = useGetDeviceFeedbacksQuery(args, polling);

  const properties = propertiesQuery.data;
  if (!properties || !methods) {
    return <div>Loading...</div>;
  }

  const refresh = () => {
    void propertiesQuery.refetch();
    void feedbacksQuery.refetch();
  };

  return (
    <DeviceDetailRender
      properties={properties}
      methods={methods}
      feedbacks={feedbacksQuery.data}
      deviceKey={item.Key}
      deviceName={item.Name}
      liveUpdates={liveUpdates}
      onLiveUpdatesChange={setLiveUpdates}
      tab={tab}
      onTabChange={setTab}
      onRefresh={refresh}
      isRefreshing={propertiesQuery.isFetching || feedbacksQuery.isFetching}
      // Keep showing the last values when a refresh fails, but say so
      refreshFailed={propertiesQuery.isError || feedbacksQuery.isError}
    />
  );
};

export default DeviceDetail;

interface DeviceDetailProps {
  item: IKeyed;
}

const DeviceDetailRender = ({
  properties,
  methods,
  feedbacks,
  deviceKey,
  deviceName,
  liveUpdates,
  onLiveUpdatesChange,
  tab,
  onTabChange,
  onRefresh,
  isRefreshing,
  refreshFailed,
}: DeviceDetailRenderProps) => {
  const propertySorter = useSort(PROPERTY_SORT);
  const methodSorter = useSort(METHOD_SORT);
  const sortedProperties = useMemo(
    () => propertySorter.apply(properties),
    [propertySorter, properties]
  );
  const sortedMethods = useMemo(
    () => methodSorter.apply(methods),
    [methodSorter, methods]
  );
  const splitRef = useRef<HTMLDivElement>(null);
  const [split, setSplit] = useState(readSplit);

  useEffect(() => {
    try {
      localStorage.setItem(SPLIT_STORAGE_KEY, String(split));
    } catch {
      // Not remembered, which is fine
    }
  }, [split]);

  // Dragging the handle sets the split from where the pointer is within the tab
  const dragSplit = (e: React.PointerEvent<HTMLDivElement>) => {
    const box = splitRef.current?.getBoundingClientRect();
    if (!box || !e.currentTarget.hasPointerCapture(e.pointerId)) return;
    setSplit(clampSplit((e.clientY - box.top) / box.height));
  };

  const keySplit = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const moves: Record<string, number> = {
      ArrowUp: -SPLIT_KEY_STEP,
      ArrowDown: SPLIT_KEY_STEP,
    };
    if (e.key in moves) {
      e.preventDefault();
      setSplit((prev) => clampSplit(prev + moves[e.key]));
    } else if (e.key === 'Home') {
      e.preventDefault();
      setSplit(SPLIT_MIN);
    } else if (e.key === 'End') {
      e.preventDefault();
      setSplit(SPLIT_MAX);
    }
  };

  return (
    <>
      <div className="d-flex flex-wrap align-items-center gap-3">
        {/* Name the device being shown, so the pane reads as the list's selection */}
        <div className="me-auto detail-title">
          <h2 className="detail-title-name">{deviceName || deviceKey}</h2>
          {deviceName && <span className="detail-title-key">{deviceKey}</span>}
        </div>
        {refreshFailed && (
          <span className="small text-danger" role="status">
            Couldn&apos;t refresh; showing the last values read.
          </span>
        )}
        <Form.Check
          type="switch"
          id="device-live-updates"
          className="small mb-0"
          checked={liveUpdates}
          onChange={(e) => onLiveUpdatesChange(e.target.checked)}
          label={`Live updates (every ${POLL_INTERVALS_MS.deviceValues / 1000}s)`}
        />
        <Button
          size="sm"
          variant="outline-secondary"
          onClick={onRefresh}
          disabled={isRefreshing}
        >
          {isRefreshing && !liveUpdates ? (
            <Spinner as="span" size="sm" aria-hidden="true" />
          ) : (
            'Refresh'
          )}
        </Button>
      </div>
      <Nav
        variant="tabs"
        role="tablist"
        className="detail-tabs"
        activeKey={tab}
        onSelect={(key) => key && onTabChange(key as DetailTab)}
      >
        <Nav.Item>
          <Nav.Link eventKey="run" role="tab" aria-selected={tab === 'run'}>
            Methods &amp; Feedbacks
            <span className="detail-tab-count">{methods.length}</span>
          </Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link
            eventKey="properties"
            role="tab"
            aria-selected={tab === 'properties'}
          >
            Properties
            <span className="detail-tab-count">{properties.length}</span>
          </Nav.Link>
        </Nav.Item>
      </Nav>

      {tab === 'properties' ? (
        <div className="detail-scroll">
          <table className="table table-sm table-striped device-props">
            <thead>
              <tr>
                <SortableTh
                  sorter={propertySorter}
                  column="name"
                  label="Name"
                />
                <SortableTh
                  sorter={propertySorter}
                  column="type"
                  label="Type"
                />
                <SortableTh
                  sorter={propertySorter}
                  column="value"
                  label="Value"
                />
                <SortableTh
                  sorter={propertySorter}
                  column="access"
                  label="Access"
                  className="d-none d-md-table-cell"
                />
              </tr>
            </thead>
            <tbody>
              {sortedProperties.map((p) => (
                <tr key={p.Name}>
                  <td className="prop-name">{p.Name}</td>
                  <td className="prop-type">{p.Type}</td>
                  <td className="prop-value">{p.Value}</td>
                  <td className="d-none d-md-table-cell prop-access">
                    <span
                      className={`badge ${p.CanRead ? 'text-bg-secondary' : 'bg-transparent border text-body-secondary'}`}
                      title={p.CanRead ? 'Readable' : 'Not readable'}
                    >
                      R
                    </span>{' '}
                    <span
                      className={`badge ${p.canWrite ? 'text-bg-primary' : 'bg-transparent border text-body-secondary'}`}
                      title={p.canWrite ? 'Writable' : 'Read-only'}
                    >
                      W
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        // Methods above, feedbacks docked beneath, each scrolling on its own: run a method and
        // watch its feedback change without scrolling between them
        <div className="run-split" ref={splitRef}>
          <section className="run-methods" style={{ flexGrow: split }}>
            <h3 className="device-section-title">Methods</h3>
            <table className="table table-sm table-striped device-methods">
              <thead>
                <tr>
                  <SortableTh
                    sorter={methodSorter}
                    column="name"
                    label="Name"
                  />
                  <th className="method-run-col">Run</th>
                </tr>
              </thead>
              <tbody>
                {sortedMethods.map((m) => (
                  <MethodRow
                    key={`${deviceKey}|${m.Name}|${m.Params.map((p) => p.Name).join(',')}`}
                    method={m}
                    deviceKey={deviceKey}
                  />
                ))}
              </tbody>
            </table>
          </section>
          <div
            className="split-handle"
            role="separator"
            aria-orientation="horizontal"
            aria-label="Resize methods and feedbacks"
            aria-valuemin={Math.round(SPLIT_MIN * 100)}
            aria-valuemax={Math.round(SPLIT_MAX * 100)}
            aria-valuenow={Math.round(split * 100)}
            tabIndex={0}
            title="Drag to resize. Double-click to reset."
            onPointerDown={(e) =>
              e.currentTarget.setPointerCapture(e.pointerId)
            }
            onPointerMove={dragSplit}
            onKeyDown={keySplit}
            onDoubleClick={() => setSplit(SPLIT_DEFAULT)}
          />
          <section className="run-feedbacks" style={{ flexGrow: 1 - split }}>
            <h3 className="device-section-title">Feedbacks</h3>
            {feedbacks && <FeedbackTable feedbacks={feedbacks} />}
          </section>
        </div>
      )}
    </>
  );
};

type FeedbackType = 'Boolean' | 'Integer' | 'Serial';
type FeedbackColumn = 'key' | 'type' | 'value';

interface FeedbackRow {
  key: string;
  type: FeedbackType;
  value: string | number;
}

const FEEDBACK_SORT: SortAccessors<FeedbackRow, FeedbackColumn> = {
  key: (r) => r.key,
  type: (r) => r.type,
  value: (r) => r.value,
};

// Every feedback in one list: Boolean, Integer and Serial together, with the type as a column. The
// default order is the device's own, grouped by type; click a heading to sort by it.
const FeedbackTable = ({ feedbacks }: { feedbacks: DeviceFeedbacks }) => {
  const sorter = useSort(FEEDBACK_SORT);

  const all = useMemo<FeedbackRow[]>(() => {
    const toRows = (
      type: FeedbackType,
      list: DeviceFeedbacks['BoolValues']
    ): FeedbackRow[] =>
      list.map((f) => ({
        key: f.FeedbackKey,
        type,
        // Integers stay numbers so signed values sort numerically (-10 before -2); the text
        // collator can't read the sign
        value:
          type === 'Integer' && f.Value !== '' && f.Value != null
            ? Number(f.Value)
            : String(f.Value ?? ''),
      }));
    return [
      ...toRows('Boolean', feedbacks.BoolValues),
      ...toRows('Integer', feedbacks.IntValues),
      ...toRows('Serial', feedbacks.SerialValues),
    ];
  }, [feedbacks]);
  const rows = useMemo(() => sorter.apply(all), [sorter, all]);

  return (
    <table className="table table-sm table-striped device-feedback">
      <thead>
        <tr>
          <SortableTh sorter={sorter} column="key" label="Key" />
          <SortableTh sorter={sorter} column="type" label="Type" />
          <SortableTh sorter={sorter} column="value" label="Value" />
        </tr>
      </thead>
      <tbody>
        {rows.length > 0 ? (
          rows.map((r) => (
            <tr key={`${r.type}|${r.key}`}>
              <td className="feedback-key" title={r.key}>
                {r.key}
              </td>
              <td className="feedback-type">{r.type}</td>
              <td className="feedback-value">{r.value}</td>
            </tr>
          ))
        ) : (
          <tr>
            <td colSpan={3}>None</td>
          </tr>
        )}
      </tbody>
    </table>
  );
};

// One method, with its parameters as inline inputs. Execute sends the values as entered; a method
// whose only parameter is a Boolean also gets Press & Release, which sends true, waits the delay,
// then sends false.
// Press & Release timers outlive the row: switching tabs unmounts the rows, but the release must
// still go out, and the method must stay busy until it has. Keyed by app/device/method.
const activePulses = new Set<string>();
const pulseListeners = new Set<() => void>();
const setPulse = (key: string, active: boolean) => {
  if (active) activePulses.add(key);
  else activePulses.delete(key);
  pulseListeners.forEach((l) => l());
};
const subscribePulses = (l: () => void) => {
  pulseListeners.add(l);
  return () => {
    pulseListeners.delete(l);
  };
};

const MethodRow = ({ method, deviceKey }: MethodRowProps) => {
  const { appId } = useAppParams();
  const [executeMethod, { isLoading: isExecuting }] =
    useSetDeviceJsonCommandMutation();
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      method.Params.map((p) => [p.Name, defaultParamValue(p.Type)])
    )
  );
  const pulseKey = `${appId}|${deviceKey}|${method.Name}`;
  const isPressing = useSyncExternalStore(subscribePulses, () =>
    activePulses.has(pulseKey)
  );
  const [pressDelay, setPressDelay] = useState(String(PRESS_DELAY_DEFAULT_S));
  const [result, setResult] = useState<'sent' | 'failed' | null>(null);

  const pressDelayS = Number(pressDelay);
  const pressDelayValid =
    pressDelay.trim() !== '' &&
    Number.isFinite(pressDelayS) &&
    pressDelayS >= PRESS_DELAY_MIN_S &&
    pressDelayS <= PRESS_DELAY_MAX_S;

  const isPressable =
    method.Params.length === 1 && isBooleanType(method.Params[0].Type);
  // Inline entry is for one simple parameter (or none). Several parameters, or any complex one,
  // are entered in a dialog, where there's room to label each clearly.
  const [showModal, setShowModal] = useState(false);
  const runnable =
    method.Params.length <= 1 &&
    method.Params.every((p) => isSimpleType(p.Type));
  const paramsValid = method.Params.every((p) =>
    isParamValid(p.Type, values[p.Name] ?? '')
  );
  const busy = isExecuting || isPressing;

  const run = async (params: string[]) => {
    if (!appId) return false;
    const response = await executeMethod({
      appId,
      deviceKey,
      methodName: method.Name,
      params,
    });
    return !('error' in response);
  };

  const handleExecute = async () => {
    if (!paramsValid) return;
    setResult(null);
    const ok = await run(method.Params.map((p) => values[p.Name] ?? ''));
    setResult(ok ? 'sent' : 'failed');
    setShowModal(false);
  };

  const handlePressRelease = async () => {
    if (!isPressable || !pressDelayValid || activePulses.has(pulseKey)) return;
    setResult(null);
    setPulse(pulseKey, true);
    try {
      // Time the delay from when true goes out, so the gap between the two sends is the delay
      // entered (or one round trip, if that is longer)
      const start = performance.now();
      if (!(await run(['true']))) {
        // A failed response doesn't prove the press wasn't applied (the connection may have
        // dropped after the processor acted), so try to release anyway and keep the failure
        await run(['false']).catch(() => false);
        setResult('failed');
        return;
      }
      const remaining = pressDelayS * 1000 - (performance.now() - start);
      if (remaining > 0) {
        await new Promise((resolve) => setTimeout(resolve, remaining));
      }
      setResult((await run(['false'])) ? 'sent' : 'failed');
    } finally {
      setPulse(pulseKey, false);
    }
  };

  const setValue = (name: string, value: string) => {
    setResult(null);
    setValues((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <tr>
      <td className="text-break">
        {method.Name}
        {/* Parameters entered in the dialog are listed by signature, as there's no inline field */}
        {!runnable && (
          <div className="small text-body-secondary">
            {method.Params.map((p) => `${p.Name}: ${p.Type}`).join(', ')}
          </div>
        )}
      </td>
      <td className="method-run-col">
        {/* Two coupled groups, left to right. Press & Release sends true, waits the delay, then
            sends false. Execute sends its parameters as entered. */}
        <div className="method-actions">
          <div className="method-press-slot">
            {isPressable && (
              <InputGroup size="sm" className="method-group">
                <Form.Control
                  type="number"
                  className="press-delay-input"
                  aria-label="Press & Release delay (seconds)"
                  title={`Press & Release delay in seconds (${PRESS_DELAY_MIN_S}-${PRESS_DELAY_MAX_S})`}
                  min={PRESS_DELAY_MIN_S}
                  max={PRESS_DELAY_MAX_S}
                  step={0.05}
                  value={pressDelay}
                  isInvalid={!pressDelayValid}
                  disabled={busy}
                  onChange={(e) => setPressDelay(e.target.value)}
                />
                <InputGroup.Text>s</InputGroup.Text>
                <Button
                  variant="outline-primary"
                  onClick={() => void handlePressRelease()}
                  disabled={busy || !pressDelayValid}
                  title={`Sends true, then false ${pressDelay}s later`}
                >
                  {isPressing ? 'Pressing…' : 'Press & Release'}
                </Button>
              </InputGroup>
            )}
          </div>
          <div className="method-execute-slot">
            <InputGroup size="sm" className="method-group method-execute-group">
              {runnable &&
                method.Params.map((param) => (
                  <MethodParamInput
                    key={param.Name}
                    param={param}
                    value={values[param.Name] ?? ''}
                    disabled={busy}
                    onChange={(v) => setValue(param.Name, v)}
                    onSubmit={() => void handleExecute()}
                  />
                ))}
              <Button
                variant="primary"
                onClick={() =>
                  runnable ? void handleExecute() : setShowModal(true)
                }
                disabled={busy || (runnable && !paramsValid)}
              >
                {isExecuting ? 'Executing…' : 'Execute'}
              </Button>
            </InputGroup>
          </div>
          <div className="method-status">
            {result && (
              <span
                className={`small ${result === 'sent' ? 'text-success' : 'text-danger'}`}
                role="status"
              >
                {result === 'sent' ? 'Sent' : 'Failed'}
              </span>
            )}
          </div>
        </div>
      </td>
      {!runnable && (
        <td className="p-0 border-0">
          <Modal show={showModal} onHide={() => setShowModal(false)}>
            <Modal.Header closeButton>
              <Modal.Title>Execute: {method.Name}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <Form onSubmit={(e) => e.preventDefault()}>
                {method.Params.map((param) => (
                  <Form.Group key={param.Name} className="mb-3">
                    <Form.Label>
                      {param.Name}{' '}
                      <small className="text-muted">({param.Type})</small>
                    </Form.Label>
                    {isBooleanType(param.Type) ? (
                      <Form.Select
                        value={values[param.Name] ?? 'false'}
                        onChange={(e) => setValue(param.Name, e.target.value)}
                      >
                        <option value="true">true</option>
                        <option value="false">false</option>
                      </Form.Select>
                    ) : (
                      <Form.Control
                        type="text"
                        placeholder={param.Type}
                        value={values[param.Name] ?? ''}
                        isInvalid={
                          !isParamValid(param.Type, values[param.Name] ?? '')
                        }
                        onChange={(e) => setValue(param.Name, e.target.value)}
                      />
                    )}
                  </Form.Group>
                ))}
              </Form>
            </Modal.Body>
            <Modal.Footer>
              <Button
                variant="primary"
                onClick={() => void handleExecute()}
                disabled={isExecuting || !paramsValid}
              >
                {isExecuting ? 'Executing…' : 'Execute'}
              </Button>
              <Button variant="secondary" onClick={() => setShowModal(false)}>
                Cancel
              </Button>
            </Modal.Footer>
          </Modal>
        </td>
      )}
    </tr>
  );
};

interface MethodRowProps {
  method: DeviceMethods;
  deviceKey: string;
}

const MethodParamInput = ({
  param,
  value,
  disabled,
  onChange,
  onSubmit,
}: {
  param: MethodParam;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
  onSubmit: () => void;
}) => {
  const label = `${param.Name} (${param.Type})`;
  if (isBooleanType(param.Type)) {
    return (
      <Form.Select
        size="sm"
        className="method-param-input"
        aria-label={label}
        title={label}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="true">true</option>
        <option value="false">false</option>
      </Form.Select>
    );
  }
  const integer = isIntegerType(param.Type);
  return (
    <Form.Control
      size="sm"
      className="method-param-input"
      type="text"
      inputMode={integer ? 'numeric' : undefined}
      aria-label={label}
      title={label}
      placeholder={param.Name}
      value={value}
      disabled={disabled}
      isInvalid={!isParamValid(param.Type, value)}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onSubmit();
      }}
    />
  );
};

interface DeviceDetailRenderProps {
  properties: DeviceProperties[];
  methods: DeviceMethods[];
  feedbacks?: DeviceFeedbacks;
  deviceKey: string;
  deviceName?: string;
  liveUpdates: boolean;
  onLiveUpdatesChange: (next: boolean) => void;
  tab: DetailTab;
  onTabChange: (next: DetailTab) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  refreshFailed: boolean;
}
