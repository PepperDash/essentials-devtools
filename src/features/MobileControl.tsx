import { skipToken } from "@reduxjs/toolkit/query";
import { useState } from "react";
import { Button, Modal } from "react-bootstrap";
import useAppParams from "../shared/hooks/useAppParams";
import {
  ActionPath,
  ClientRequest,
  ClientResponse,
  MobileControlClient,
  useCreateMobileControlUiClientMutation,
  useDeleteAllMobileControlUiClientsMutation,
  useDeleteMobileControlUiClientMutation,
  useGetMobileControlActionPathsQuery,
  useGetMobileControlInfoQuery,
} from "../store/apiSlice";

const MobileControl = () => {
  const { appId } = useAppParams();
  console.log("AppId in MobileControl", appId);

  const { data: info } = useGetMobileControlInfoQuery(
    appId ? { appId, deviceKey: "appServer" } : skipToken,
  );
  const { data: actionPaths } = useGetMobileControlActionPathsQuery(
    appId ? { appId, deviceKey: "appServer" } : skipToken,
  );

  const [deleteClient] = useDeleteMobileControlUiClientMutation();
  const [deleteAllClients] = useDeleteAllMobileControlUiClientsMutation();
  const [createClient] = useCreateMobileControlUiClientMutation();
  const [pendingDelete, setPendingDelete] =
    useState<MobileControlClient | null>(null);
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRoomKey, setNewRoomKey] = useState("");
  const [newGrantCode, setNewGrantCode] = useState("");

  const handleConfirmDelete = async () => {
    if (!appId || !pendingDelete) return;
    const clientPayload: ClientResponse = {
      error: "",
      token: pendingDelete.token,
      path: "",
    };
    await deleteClient({
      appId,
      deviceKey: "appServer-directServer",
      client: clientPayload,
    });
    setPendingDelete(null);
  };

  const handleConfirmDeleteAll = async () => {
    if (!appId) return;
    await deleteAllClients({ appId, deviceKey: "appServer-directServer" });
    setConfirmDeleteAll(false);
  };

  const handleCreateClient = async () => {
    if (!appId || !newRoomKey.trim()) return;
    const request: ClientRequest = {
      roomKey: newRoomKey.trim(),
      grantCode: newGrantCode.trim(),
      token: "",
    };
    await createClient({ appId, deviceKey: "appServer-directServer", request });
    setShowCreateModal(false);
    setNewRoomKey("");
    setNewGrantCode("");
  };

  if (!info || !actionPaths) {
    return <div>Mobile Control Not Available</div>;
  }

  const { directServer: ds } = info;

  return (
    <div className="d-flex flex-column overflow-hidden h-100 gap-4">
      <h2 className="mb-2">Mobile Control</h2>

      {ds && (
        <div className="d-flex flex-column ">
          <h5>Direct Server</h5>
          <table className="table table-bordered w-auto">
            <tbody>
              <tr>
                <th>User App URL</th>
                <td>
                  <code>{ds.userAppUrl}</code>
                </td>
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
      )}

      <div className="d-flex flex-column h-100">
        <h5>Clients</h5>
        <div className="overflow-auto flex-grow-1">
          <table className="table table-striped table-bordered">
            <thead className="table-light sticky-top">
              <tr>
                <th>#</th>
                <th>Room Key</th>
                <th>Touchpanel Key</th>
                <th>
                  Token
                </th>
                <th>URL</th>
                <th>
                  <div className="d-flex justify-content-end gap-1">
                    <Button
                      size="sm"
                      variant="outline-primary"
                      onClick={() => setShowCreateModal(true)}
                    >
                      Add +
                    </Button>
                    {ds.clients.length > 0 && (
                      <Button
                        size="sm"
                        variant="outline-danger"
                        onClick={() => setConfirmDeleteAll(true)}
                      >
                        Delete All
                      </Button>
                    )}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {ds.clients.map((client) => (
                <tr key={client.clientNumber}>
                  <td>{client.clientNumber}</td>
                  <td>{client.roomKey}</td>
                  <td>{client.touchpanelKey}</td>
                  <td>
                    <code>{client.token}</code>
                  </td>
                  <td>
                    <a href={client.url} target="_blank" rel="noreferrer">
                      {client.url}
                    </a>
                  </td>
                  <td className='d-flex justify-content-end'>
                    <Button
                      size="sm"
                      variant="outline-danger"
                      onClick={() => setPendingDelete(client)}
                    >
                      Delete
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="d-flex flex-column h-100">
        <h5>Action Paths</h5>
        <div className="overflow-auto flex-grow-1">
          <table className="table table-striped table-bordered mb-0">
            <thead className="table-light sticky-top">
              <tr>
                <th>Messenger Key</th>
                <th>Path</th>
              </tr>
            </thead>
            <tbody>
              {actionPaths.actionPaths.map((ap: ActionPath) => (
                <tr key={ap.messengerKey}>
                  <td>{ap.messengerKey}</td>
                  <td>
                    <code>{ap.path}</code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        show={!!pendingDelete}
        onHide={() => setPendingDelete(null)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Delete Client</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to delete client{" "}
          <strong>{pendingDelete?.clientNumber}</strong>?
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setPendingDelete(null)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleConfirmDelete}>
            Delete
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal
        show={confirmDeleteAll}
        onHide={() => setConfirmDeleteAll(false)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Delete All Clients</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to delete <strong>all</strong> clients?
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => setConfirmDeleteAll(false)}
          >
            Cancel
          </Button>
          <Button variant="danger" onClick={handleConfirmDeleteAll}>
            Delete All
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal
        show={showCreateModal}
        onHide={() => setShowCreateModal(false)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>New Client</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="mb-3">
            <label htmlFor="newRoomKey" className="form-label">
              Room Key <span className="text-danger">*</span>
            </label>
            <input
              id="newRoomKey"
              className="form-control"
              value={newRoomKey}
              onChange={(e) => setNewRoomKey(e.target.value)}
              placeholder="e.g. room1"
            />
          </div>
          <div>
            <label htmlFor="newGrantCode" className="form-label">
              Grant Code
            </label>
            <input
              id="newGrantCode"
              className="form-control"
              value={newGrantCode}
              onChange={(e) => setNewGrantCode(e.target.value)}
              placeholder="e.g. abc123"
            />
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleCreateClient}
            disabled={!newRoomKey.trim()}
          >
            Create
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default MobileControl;
