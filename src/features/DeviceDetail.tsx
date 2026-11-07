import { skipToken } from '@reduxjs/toolkit/query';
import { useState } from 'react';
import { Button, Form, InputGroup, Modal, Spinner } from 'react-bootstrap';
import useAppParams from '../shared/hooks/useAppParams';
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

const DeviceDetail = ({ item }: DeviceDetailProps) => {
  const { appId } = useAppParams();
  const [liveUpdates, setLiveUpdates] = useState(true);

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
  onRefresh,
  isRefreshing,
  refreshFailed,
}: DeviceDetailRenderProps) => {
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
      <div className="h-100 d-flex flex-column overflow-auto">
        <h3 className="device-section-title">Properties</h3>
        <table className="table table-sm table-striped device-props">
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Value</th>
              <th className="d-none d-md-table-cell">Access</th>
            </tr>
          </thead>
          <tbody>
            {properties.map((p) => (
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

        <h3 className="device-section-title">Methods</h3>
        <table className="table table-sm table-striped device-methods">
          <thead>
            <tr>
              <th>Name</th>
              <th className="method-run-col">Run</th>
            </tr>
          </thead>
          <tbody>
            {methods.map((m) => (
              <MethodRow
                key={`${deviceKey}|${m.Name}|${m.Params.map((p) => p.Name).join(',')}`}
                method={m}
                deviceKey={deviceKey}
              />
            ))}
          </tbody>
        </table>

        <h3 className="device-section-title">Feedbacks</h3>
        {feedbacks && (
          <>
            <h4 className="device-subsection-title">Boolean</h4>
            <table className="table table-sm table-striped device-feedback">
              <thead>
                <tr>
                  <th>Key</th>
                  <th>Value</th>
                </tr>
              </thead>
              <tbody>
                {feedbacks.BoolValues.length > 0 ? (
                  feedbacks.BoolValues.map((f) => (
                    <tr key={f.FeedbackKey}>
                      <td className="text-break">{f.FeedbackKey}</td>
                      <td className="feedback-value">{String(f.Value)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={2}>None</td>
                  </tr>
                )}
              </tbody>
            </table>

            <h4 className="device-subsection-title">Integer</h4>
            <table className="table table-sm table-striped device-feedback">
              <thead>
                <tr>
                  <th>Key</th>
                  <th>Value</th>
                </tr>
              </thead>
              <tbody>
                {feedbacks.IntValues.length > 0 ? (
                  feedbacks.IntValues.map((f) => (
                    <tr key={f.FeedbackKey}>
                      <td className="text-break">{f.FeedbackKey}</td>
                      <td className="feedback-value">{f.Value}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={2}>None</td>
                  </tr>
                )}
              </tbody>
            </table>

            <h4 className="device-subsection-title">Serial</h4>
            <table className="table table-sm table-striped device-feedback">
              <thead>
                <tr>
                  <th>Key</th>
                  <th>Value</th>
                </tr>
              </thead>
              <tbody>
                {feedbacks.SerialValues.length > 0 ? (
                  feedbacks.SerialValues.map((f) => (
                    <tr key={f.FeedbackKey}>
                      <td className="text-break">{f.FeedbackKey}</td>
                      <td className="feedback-value">{f.Value}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={2}>None</td>
                  </tr>
                )}
              </tbody>
            </table>
          </>
        )}
      </div>
    </>
  );
};

// One method, with its parameters as inline inputs. Execute sends the values as entered; a method
// whose only parameter is a Boolean also gets Press & Release, which sends true, waits the delay,
// then sends false.
const MethodRow = ({ method, deviceKey }: MethodRowProps) => {
  const { appId } = useAppParams();
  const [executeMethod, { isLoading: isExecuting }] =
    useSetDeviceJsonCommandMutation();
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      method.Params.map((p) => [p.Name, defaultParamValue(p.Type)])
    )
  );
  const [isPressing, setIsPressing] = useState(false);
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
    if (!isPressable || !pressDelayValid) return;
    setResult(null);
    setIsPressing(true);
    try {
      // Time the delay from when true goes out, so the gap between the two sends is the delay
      // entered (or one round trip, if that is longer)
      const start = performance.now();
      if (!(await run(['true']))) {
        setResult('failed');
        return;
      }
      const remaining = pressDelayS * 1000 - (performance.now() - start);
      if (remaining > 0) {
        await new Promise((resolve) => setTimeout(resolve, remaining));
      }
      setResult((await run(['false'])) ? 'sent' : 'failed');
    } finally {
      setIsPressing(false);
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
  onRefresh: () => void;
  isRefreshing: boolean;
  refreshFailed: boolean;
}
