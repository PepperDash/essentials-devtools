import { skipToken } from '@reduxjs/toolkit/query';
import { useState } from 'react';
import { Button, Form, Modal, Spinner } from 'react-bootstrap';
import useAppParams from '../shared/hooks/useAppParams';
import {
  DeviceFeedbacks,
  DeviceMethods,
  DeviceProperties,
  IKeyed,
  useGetDeviceFeedbacksQuery,
  useGetDeviceMethodsQuery,
  useGetDevicePropertiesQuery,
  useSetDeviceJsonCommandMutation,
} from '../store/apiSlice';
import { livePolling, POLL_INTERVALS_MS } from '../store/polling';

// Parameter types arrive as bare or qualified names ("Boolean", "System.Boolean")
const isBooleanType = (type: string) => /^(System\.)?Boolean$/i.test(type);

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
  liveUpdates,
  onLiveUpdatesChange,
  onRefresh,
  isRefreshing,
  refreshFailed,
}: DeviceDetailRenderProps) => {
  const { appId } = useAppParams();
  const [selectedMethod, setSelectedMethod] = useState<DeviceMethods | null>(
    null
  );
  const [paramValues, setParamValues] = useState<Record<string, string>>({});
  const [executeMethod, { isLoading: isExecuting }] =
    useSetDeviceJsonCommandMutation();

  const handleOpen = (method: DeviceMethods) => {
    setSelectedMethod(method);
    setParamValues(
      Object.fromEntries(
        method.Params.map((p) => [p.Name, isBooleanType(p.Type) ? 'false' : ''])
      )
    );
  };

  const [isPressing, setIsPressing] = useState(false);
  const [pressDelay, setPressDelay] = useState(String(PRESS_DELAY_DEFAULT_S));
  const pressDelayS = Number(pressDelay);
  const pressDelayValid =
    pressDelay.trim() !== '' &&
    Number.isFinite(pressDelayS) &&
    pressDelayS >= PRESS_DELAY_MIN_S &&
    pressDelayS <= PRESS_DELAY_MAX_S;

  // A method with a single Boolean parameter is a momentary press: send true, hold, send false
  const isPressable =
    selectedMethod?.Params.length === 1 &&
    isBooleanType(selectedMethod.Params[0].Type);

  const handlePressRelease = async () => {
    if (!selectedMethod || !appId || !isPressable || !pressDelayValid) return;
    setIsPressing(true);
    try {
      const send = (value: string) =>
        executeMethod({
          appId,
          deviceKey,
          methodName: selectedMethod.Name,
          params: [value],
        });
      // Time the delay from when true goes out, so the gap between the two sends is the delay
      // entered (or one round trip, if that is longer)
      const start = performance.now();
      await send('true');
      const remaining = pressDelayS * 1000 - (performance.now() - start);
      if (remaining > 0) {
        await new Promise((resolve) => setTimeout(resolve, remaining));
      }
      await send('false');
    } finally {
      setIsPressing(false);
    }
    handleClose();
  };

  const handleClose = () => {
    setSelectedMethod(null);
    setParamValues({});
  };

  const handleExecute = async () => {
    if (!selectedMethod || !appId) return;
    await executeMethod({
      appId,
      deviceKey,
      methodName: selectedMethod.Name,
      params: Object.values(paramValues),
    });
    handleClose();
  };

  return (
    <>
      <div className="d-flex flex-wrap align-items-center gap-3">
        <h2 className="me-auto">Device Detail</h2>
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
        <h3>Properties</h3>
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

        <h3>Methods</h3>
        <table className="table table-sm table-striped">
          <thead>
            <tr>
              <th>Name</th>
              <th>Params</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {methods.map((m) => (
              <tr key={m.Name}>
                <td className="text-break">{m.Name}</td>
                <td>
                  {m.Params.map((param) => `${param.Name}: ${param.Type}`).join(
                    ', '
                  )}
                </td>
                <td>
                  <button
                    className="btn btn-sm btn-primary"
                    onClick={() => handleOpen(m)}
                  >
                    Execute
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <Modal show={!!selectedMethod} onHide={handleClose}>
          <Modal.Header closeButton>
            <Modal.Title>Execute: {selectedMethod?.Name}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {selectedMethod?.Params.length === 0 ? (
              <p>This method has no parameters.</p>
            ) : (
              <Form>
                {selectedMethod?.Params.map((param) => (
                  <Form.Group key={param.Name} className="mb-3">
                    <Form.Label>
                      {param.Name}{' '}
                      <small className="text-muted">({param.Type})</small>
                    </Form.Label>
                    {isBooleanType(param.Type) ? (
                      <Form.Select
                        value={paramValues[param.Name] ?? 'false'}
                        onChange={(e) =>
                          setParamValues((prev) => ({
                            ...prev,
                            [param.Name]: e.target.value,
                          }))
                        }
                      >
                        <option value="true">true</option>
                        <option value="false">false</option>
                      </Form.Select>
                    ) : (
                      <Form.Control
                        type="text"
                        placeholder={param.Type}
                        value={paramValues[param.Name] ?? ''}
                        onChange={(e) =>
                          setParamValues((prev) => ({
                            ...prev,
                            [param.Name]: e.target.value,
                          }))
                        }
                      />
                    )}
                  </Form.Group>
                ))}
              </Form>
            )}
            {isPressable && (
              <Form.Group className="mb-1">
                <Form.Label htmlFor="press-release-delay">
                  Press &amp; Release delay{' '}
                  <small className="text-muted">(seconds)</small>
                </Form.Label>
                <Form.Control
                  id="press-release-delay"
                  type="number"
                  min={PRESS_DELAY_MIN_S}
                  max={PRESS_DELAY_MAX_S}
                  step={0.05}
                  value={pressDelay}
                  isInvalid={!pressDelayValid}
                  disabled={isPressing}
                  onChange={(e) => setPressDelay(e.target.value)}
                />
                <Form.Control.Feedback type="invalid">
                  Enter {PRESS_DELAY_MIN_S} to {PRESS_DELAY_MAX_S} seconds.
                </Form.Control.Feedback>
                <Form.Text muted>
                  Sends true, then false this long after. Can't be shorter than
                  one request round trip.
                </Form.Text>
              </Form.Group>
            )}
          </Modal.Body>
          <Modal.Footer>
            {isPressable && (
              <Button
                variant="outline-primary"
                onClick={() => void handlePressRelease()}
                disabled={isPressing || isExecuting || !pressDelayValid}
                title={`Sends true, then false ${pressDelay}s later`}
              >
                {isPressing ? 'Pressing…' : 'Press & Release'}
              </Button>
            )}
            <Button
              variant="primary"
              onClick={() => void handleExecute()}
              disabled={isExecuting || isPressing}
            >
              {isExecuting ? 'Executing…' : 'Execute'}
            </Button>
            <Button
              variant="secondary"
              onClick={handleClose}
              disabled={isPressing}
            >
              Cancel
            </Button>
          </Modal.Footer>
        </Modal>

        <h3>Feedbacks</h3>
        {feedbacks && (
          <>
            <h4>Boolean</h4>
            <table className="table table-sm table-striped">
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
                      <td className="text-break">{String(f.Value)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={2}>None</td>
                  </tr>
                )}
              </tbody>
            </table>

            <h4>Integer</h4>
            <table className="table table-sm table-striped">
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
                      <td>{f.FeedbackKey}</td>
                      <td>{f.Value}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={2}>None</td>
                  </tr>
                )}
              </tbody>
            </table>

            <h4>Serial</h4>
            <table className="table table-sm table-striped">
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
                      <td>{f.FeedbackKey}</td>
                      <td>{f.Value}</td>
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

interface DeviceDetailRenderProps {
  properties: DeviceProperties[];
  methods: DeviceMethods[];
  feedbacks?: DeviceFeedbacks;
  deviceKey: string;
  liveUpdates: boolean;
  onLiveUpdatesChange: (next: boolean) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  refreshFailed: boolean;
}
