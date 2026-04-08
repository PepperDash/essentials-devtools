import { skipToken } from '@reduxjs/toolkit/query';
import useAppParams from '../shared/hooks/useAppParams';
import { useGetMobileControlInfoQuery } from '../store/apiSlice';


const MobileControl = () => {
  const { appId } = useAppParams();
  console.log("AppId in MobileControl", appId);

  const { data: info } = useGetMobileControlInfoQuery(appId ? { appId, deviceKey: "appServer" } : skipToken);
  console.log("Mobile Control Info", info);

  if (!info) {
    return <div>Mobile Control Not Available</div>;
  }

  const { directServer: ds } = info;

  return (
    <div className="d-flex flex-column overflow-hidden h-100">
      <h2 className="mb-2">Mobile Control</h2>

      <div className="mb-3">
        <h5>Direct Server</h5>
        <table className="table table-bordered w-auto">
          <tbody>
            <tr>
              <th>User App URL</th>
              <td><code>{ds.userAppUrl}</code></td>
            </tr>
            <tr>
              <th>Server Port</th>
              <td>{ds.serverPort}</td>
            </tr>
            <tr>
              <th>Tokens Defined</th>
              <td>{ds.tokensDefined}</td>
            </tr>
            <tr>
              <th>Clients Connected</th>
              <td>{ds.clientsConnected}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="overflow-auto">
        <h5>Clients</h5>
        <table className="table table-striped table-bordered">
          <thead>
            <tr>
              <th>#</th>
              <th>Room Key</th>
              <th>Touchpanel Key</th>
              <th>Token</th>
              <th>URL</th>
            </tr>
          </thead>
          <tbody>
            {ds.clients.map((client) => (
              <tr key={client.clientNumber}>
                <td>{client.clientNumber}</td>
                <td>{client.roomKey}</td>
                <td>{client.touchpanelKey}</td>
                <td><code>{client.token}</code></td>
                <td>
                  <a href={client.url} target="_blank" rel="noreferrer">
                    {client.url}
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default MobileControl;