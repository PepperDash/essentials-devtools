import {
  DeviceFeedbacks,
  DeviceMethods,
  DeviceProperties,
  IKeyed,
  useGetDeviceFeedbacksQuery,
  useGetDeviceMethodsQuery,
  useGetDevicePropertiesQuery,
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
}: DeviceDetailRenderProps) => {
  return (
    <>
      <h2>Device Detail</h2>
      <div className="h-100 d-flex flex-column overflow-auto">
        <h3>Properties</h3>
        <ul>
          {properties.map((p) => (
            <li key={p.Name}>
              {p.Name} ({p.Type}) - Value: {p.Value} - CanRead:{" "}
              {p.CanRead ? "Yes" : "No"} - CanWrite: {p.canWrite ? "Yes" : "No"}
            </li>
          ))}
        </ul>

        <h3>Methods</h3>
        <ul>
          {methods.map((m) => (
            <li key={m.Name}>
              {m.Name} - Params:{" "}
              {m.Params.map((param) => `${param.Name}: ${param.Type}`).join(
                ", ",
              )}
            </li>
          ))}
        </ul>

        <h3>Feedbacks</h3>
        {feedbacks && (
          <>
            <h4>Boolean</h4>
            <ul>
              {feedbacks.BoolValues.length > 0 ? (
                <>
                  {feedbacks.BoolValues.map((f) => (
                    <li key={f.FeedbackKey}>
                      {f.FeedbackKey} - Value: {f.Value}
                    </li>
                  ))}
                </>
              ) : (
                <li>None</li>
              )}
            </ul>

            <h4>Integer</h4>
            <ul>
              {feedbacks.IntValues.length > 0 ? (
                <>
                  {feedbacks.IntValues.map((f) => (
                    <li key={f.FeedbackKey}>
                      {f.FeedbackKey} - Value: {f.Value}
                    </li>
                  ))}
                </>
              ) : (
                <li>None</li>
              )}
            </ul>

            <h4>Serial</h4>
            <ul>
              {feedbacks.SerialValues.length > 0 ? (
                <>
                  {feedbacks.SerialValues.map((f) => (
                    <li key={f.FeedbackKey}>
                      {f.FeedbackKey} - Value: {f.Value}
                    </li>
                  ))}
                </>
              ) : (
                <li>None</li>
              )}
            </ul>
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
}
