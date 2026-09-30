import { useState } from 'react';
import { Button, Form, Modal } from 'react-bootstrap';

import { SecretEntry } from '../../store/secretsContract';

export interface SecretDeleteModalProps {
  entry: SecretEntry;
  provider: string;
  isDeleting?: boolean;
  errorMessage?: string | null;
  onConfirm: () => void;
  onClose: () => void;
}

/**
 * Confirms deleting a secret.
 *
 * An unmanaged record - one this tool did not create - requires typing the key to confirm. Those
 * records belong to other parts of the system: Mobile Control keeps its pairing tokens in the same
 * flat data store, and deleting that one silently un-pairs every touchpanel. A second click is too
 * cheap a gate for that.
 */
const SecretDeleteModal = ({
  entry,
  provider,
  isDeleting = false,
  errorMessage,
  onConfirm,
  onClose,
}: SecretDeleteModalProps) => {
  const [typedKey, setTypedKey] = useState('');

  const strict = !entry.managed;
  const confirmed = !strict || typedKey.trim() === entry.key;

  return (
    <Modal show onHide={onClose} centered>
      <Modal.Header closeButton>
        <Modal.Title>Delete secret</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        <p className="mb-2">
          Delete <strong>{entry.key}</strong> from <strong>{provider}</strong>?
        </p>
        <p className="text-muted small">
          Any device configured to use this secret will fail to authenticate
          until it is replaced. The value cannot be recovered.
        </p>

        {strict && (
          <div className="alert alert-danger py-2 px-3" role="alert">
            <div className="mb-2">
              This record was not created by this tool and may belong to another
              part of the system, such as Mobile Control's paired clients.
            </div>
            <Form.Group controlId="secret-delete-confirm">
              <Form.Label className="small mb-1">
                Type <code>{entry.key}</code> to confirm
              </Form.Label>
              <Form.Control
                type="text"
                value={typedKey}
                onChange={(e) => setTypedKey(e.target.value)}
                disabled={isDeleting}
                autoComplete="off"
                spellCheck={false}
              />
            </Form.Group>
          </div>
        )}

        {errorMessage && (
          <div className="alert alert-danger py-2 px-3 mb-0" role="alert">
            {errorMessage}
          </div>
        )}
      </Modal.Body>

      <Modal.Footer>
        <Button variant="secondary" onClick={onClose} disabled={isDeleting}>
          Cancel
        </Button>
        <Button
          variant="danger"
          onClick={onConfirm}
          disabled={isDeleting || !confirmed}
        >
          {isDeleting ? 'Deleting…' : 'Delete'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default SecretDeleteModal;
