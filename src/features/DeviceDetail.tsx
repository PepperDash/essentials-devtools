import { useState } from "react";
import { Button, Form, Modal } from "react-bootstrap";
import {
  DeviceFeedbacks,
  DeviceMethods,
  DeviceProperties,
  IKeyed,
  useGetDeviceFeedbacksQuery,
  useGetDeviceMethodsQuery,
  useGetDevicePropertiesQuery,
  useSetDeviceJsonCommandMutation,
} from "../store/apiSlice";

const DeviceDetail = ({ item }: DeviceDetailProps) => {
  const { data: properties } = useGetDevicePropertiesQuery(item.Key, {
    skip: !item?.Key,
  });
  const { data: methods } = useGetDeviceMethodsQuery(item.Key, {
    skip: !item?.Key,
  });
  const { data: feedbacks } = useGetDeviceFeedbacksQuery(item.Key, {
    skip: !item?.Key,
  });

  console.log("DeviceDetail == ", { item, properties, methods, feedbacks });

  if (!properties || !methods) {
    return <div>Loading...</div>;
  }

  return (
    <DeviceDetailRender
      properties={properties}
      methods={methods}
      feedbacks={feedbacks}
      deviceKey={item.Key}
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
}: DeviceDetailRenderProps) => {
  const [selectedMethod, setSelectedMethod] = useState<DeviceMethods | null>(null);
  const [paramValues, setParamValues] = useState<Record<string, string>>({});
  const [executeMethod, { isLoading: isExecuting }] = useSetDeviceJsonCommandMutation();

  const handleOpen = (method: DeviceMethods) => {
    setSelectedMethod(method);
    setParamValues(Object.fromEntries(method.Params.map((p) => [p.Name, ""])));
  };

  const handleClose = () => {
    setSelectedMethod(null);
    setParamValues({});
  };

  const handleExecute = async () => {
    if (!selectedMethod) return;
    await executeMethod({ deviceKey, methodName: selectedMethod.Name, params: Object.values(paramValues) });
    handleClose();
  };

  return (
    <>
      <h2>Device Detail</h2>
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
                <td>{p.CanRead ? "Yes" : "No"}</td>
                <td>{p.canWrite ? "Yes" : "No"}</td>
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
                  {m.Params.map((param) => `${param.Name}: ${param.Type}`).join(", ")}
                </td>
                <td>
                  <button className="btn btn-sm btn-primary" onClick={() => handleOpen(m)}>Execute</button>
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
                      {param.Name} <small className="text-muted">({param.Type})</small>
                    </Form.Label>
                    <Form.Control
                      type="text"
                      placeholder={param.Type}
                      value={paramValues[param.Name] ?? ""}
                      onChange={(e) =>
                        setParamValues((prev) => ({ ...prev, [param.Name]: e.target.value }))
                      }
                    />
                  </Form.Group>
                ))}
              </Form>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleClose}>Cancel</Button>
            <Button variant="primary" onClick={handleExecute} disabled={isExecuting}>
              {isExecuting ? "Executing…" : "Execute"}
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
                  <tr><td colSpan={2}>None</td></tr>
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
                  <tr><td colSpan={2}>None</td></tr>
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
                  <tr><td colSpan={2}>None</td></tr>
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
}
