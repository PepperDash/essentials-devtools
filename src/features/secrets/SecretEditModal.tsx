import { useState } from 'react';
import { Button, Form, InputGroup, Modal } from 'react-bootstrap';

import EyeIcon from '../../shared/components/EyeIcon';
import {
  DOCUMENTED_MAX_SECRET_KEY_LENGTH,
  MAX_SECRET_VALUE_LENGTH,
  SecretEntry,
  SecretProviderInfo,
} from '../../store/secretsContract';

/** What the modal is doing: creating a new secret, or replacing an existing one's value. */
export type SecretEditTarget =
  { mode: 'add' } | { mode: 'update'; entry: SecretEntry };

export interface SecretEditSubmission {
  provider: string;
  key: string;
  value: string;
  description?: string;
  /** True when the key already exists, so the processor is told to replace rather than refuse. */
  overwrite: boolean;
}

export interface SecretEditModalProps {
  target: SecretEditTarget;
  provider: string;
  providers: SecretProviderInfo[];
  /** Existing keys in the selected provider, for collision detection. */
  existingKeys: SecretEntry[];
  isSaving?: boolean;
  errorMessage?: string | null;
  onSubmit: (submission: SecretEditSubmission) => void;
  onClose: () => void;
}

/**
 * Add or replace a single secret.
 *
 * The value field is write-only in both directions: the processor never returns a stored value, so
 * an update always starts blank rather than pre-filling something we cannot know.
 */
const SecretEditModal = ({
  target,
  provider,
  providers,
  existingKeys,
  isSaving = false,
  errorMessage,
  onSubmit,
  onClose,
}: SecretEditModalProps) => {
  const isUpdate = target.mode === 'update';

  const [selectedProvider, setSelectedProvider] = useState(provider);
  const [key, setKey] = useState(isUpdate ? target.entry.key : '');
  const [description, setDescription] = useState(
    isUpdate ? (target.entry.description ?? '') : ''
  );
  const [value, setValue] = useState('');
  const [showValue, setShowValue] = useState(false);
  const [acknowledgeUnmanaged, setAcknowledgeUnmanaged] = useState(false);

  const trimmedKey = key.trim();
  const collision = existingKeys.find(
    (entry) => entry.key.toLowerCase() === trimmedKey.toLowerCase()
  );
  // An update is always a collision with itself; only a *new* key colliding is worth warning about.
  const collidesUnexpectedly = !isUpdate && collision !== undefined;
  const collidesWithUnmanaged = collision !== undefined && !collision.managed;

  // A warning, not a block: the processor accepts longer keys than the SDK documents, and it is
  // the authority on what it will take. See DOCUMENTED_MAX_SECRET_KEY_LENGTH.
  const keyIsLong = trimmedKey.length > DOCUMENTED_MAX_SECRET_KEY_LENGTH;
  const valueTooLong = value.length > MAX_SECRET_VALUE_LENGTH;

  const blocked =
    isSaving ||
    trimmedKey === '' ||
    value === '' ||
    valueTooLong ||
    (collidesWithUnmanaged && !acknowledgeUnmanaged);

  const handleSubmit = () => {
    if (blocked) return;
    onSubmit({
      provider: selectedProvider,
      key: trimmedKey,
      value,
      description: description.trim() || undefined,
      overwrite: collision !== undefined,
    });
  };

  return (
    <Modal show onHide={onClose} centered>
      <Modal.Header closeButton>
        <Modal.Title>
          {isUpdate ? 'Replace secret value' : 'Add secret'}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {/* autoComplete off throughout so the browser never offers to save the credential. */}
        <Form
          autoComplete="off"
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
        >
          <Form.Group className="mb-3" controlId="secret-provider">
            <Form.Label>Provider</Form.Label>
            <Form.Select
              value={selectedProvider}
              onChange={(e) => setSelectedProvider(e.target.value)}
              disabled={isUpdate || isSaving}
            >
              {providers.map((item) => (
                <option key={item.key} value={item.key}>
                  {item.key}
                  {item.scope === 'global' ? ' (shared across programs)' : ''}
                </option>
              ))}
            </Form.Select>
          </Form.Group>

          <Form.Group className="mb-3" controlId="secret-key">
            <Form.Label>
              Key <span className="text-danger">*</span>
            </Form.Label>
            <Form.Control
              type="text"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              disabled={isUpdate || isSaving}
              spellCheck={false}
              autoComplete="off"
            />
            {keyIsLong && (
              <Form.Text className="text-warning-emphasis">
                This key is {trimmedKey.length} characters, longer than the
                documented limit of {DOCUMENTED_MAX_SECRET_KEY_LENGTH}. The
                processor may reject it.
              </Form.Text>
            )}
            {!isUpdate && (
              <Form.Text className="text-muted">
                This is the key a device config refers to, e.g.{' '}
                <code>{`{"secret": {"provider": "${selectedProvider}", "key": "${trimmedKey || 'yourKey'}"}}`}</code>
              </Form.Text>
            )}
          </Form.Group>

          <Form.Group className="mb-3" controlId="secret-description">
            <Form.Label>Description</Form.Label>
            <Form.Control
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isSaving}
              placeholder="What this credential is for"
              autoComplete="off"
            />
          </Form.Group>

          <Form.Group className="mb-3" controlId="secret-value">
            <Form.Label>
              Value <span className="text-danger">*</span>
            </Form.Label>
            <InputGroup hasValidation>
              <Form.Control
                type={showValue ? 'text' : 'password'}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                disabled={isSaving}
                isInvalid={valueTooLong}
                autoComplete="off"
                spellCheck={false}
              />
              <Button
                type="button"
                variant="outline-secondary"
                onClick={() => setShowValue((prev) => !prev)}
                disabled={isSaving}
                aria-label={showValue ? 'Hide value' : 'Show value'}
                aria-pressed={showValue}
              >
                <EyeIcon slashed={showValue} />
              </Button>
              <Form.Control.Feedback type="invalid">
                Values are limited to {MAX_SECRET_VALUE_LENGTH} characters.
              </Form.Control.Feedback>
            </InputGroup>
            {isUpdate && (
              <Form.Text className="text-muted">
                The stored value is never readable, so enter the new value in
                full.
              </Form.Text>
            )}
          </Form.Group>

          {collidesUnexpectedly && !collidesWithUnmanaged && (
            <div className="alert alert-warning py-2 px-3" role="alert">
              <strong>{trimmedKey}</strong> already exists. Saving will replace
              its value.
            </div>
          )}

          {collidesWithUnmanaged && (
            <div className="alert alert-danger py-2 px-3" role="alert">
              <div className="mb-2">
                <strong>{trimmedKey}</strong> exists in the data store but was
                not created here. It may belong to another part of the system.
              </div>
              <Form.Check
                type="checkbox"
                id="secret-ack-unmanaged"
                checked={acknowledgeUnmanaged}
                onChange={(e) => setAcknowledgeUnmanaged(e.target.checked)}
                disabled={isSaving}
                label="I understand this will overwrite a record this tool does not manage"
              />
            </div>
          )}

          {errorMessage && (
            <div className="alert alert-danger py-2 px-3 mb-0" role="alert">
              {errorMessage}
            </div>
          )}
        </Form>
      </Modal.Body>

      <Modal.Footer>
        <Button variant="secondary" onClick={onClose} disabled={isSaving}>
          Cancel
        </Button>
        <Button variant="primary" onClick={handleSubmit} disabled={blocked}>
          {isSaving ? 'Saving…' : isUpdate ? 'Replace value' : 'Add secret'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default SecretEditModal;
