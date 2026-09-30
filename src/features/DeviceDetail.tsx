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
    setParamValues(Object.fromEntries(method.Params.map((p) => [p.Name, ''])));
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
        <table className="table table-sm table-striped">
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Value</th>
              <th>Can Read</th>
              <th>Can Write</th>
            </tr>
          </thead>
          <tbody>
            {properties.map((p) => (
              <tr key={p.Name}>
                <td>{p.Name}</td>
                <td>{p.Type}</td>
                <td>{p.Value}</td>
                <td>{p.CanRead ? 'Yes' : 'No'}</td>
                <td>{p.canWrite ? 'Yes' : 'No'}</td>
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
                <td>{m.Name}</td>
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
                  </Form.Group>
                ))}
              </Form>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => void handleExecute()}
              disabled={isExecuting}
            >
              {isExecuting ? 'Executing…' : 'Execute'}
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
                      <td>{f.FeedbackKey}</td>
                      <td>{String(f.Value)}</td>
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
