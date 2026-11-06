import { ClipboardEvent, useRef, useState } from 'react';
import { Button, Form, InputGroup, Modal } from 'react-bootstrap';

import EyeIcon from '../../shared/components/EyeIcon';
import {
  describeProviderStorage,
  DOCUMENTED_MAX_SECRET_KEY_LENGTH,
  lengthUnitFor,
  maxValueLengthFor,
  measureValue,
  SecretEntry,
  SecretProviderInfo,
} from '../../store/secretsContract';

/** Where a multi-line value came from, shown in place of the single-line field. */
interface MultilineValue {
  source: string;
}

/** Larger than any provider's limit, so a stray large file is refused before it is read. */
const MAX_VALUE_FILE_BYTES = 64 * 1024;

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
  /** The program being managed, e.g. app01, to say which program can read a secret. */
  appId?: string;
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
  appId,
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
  // A text or password input strips line breaks from its value (HTML value sanitization), which
  // would silently corrupt a PEM key or certificate. A multi-line value is held here instead, and
  // the field shows only its size.
  const [multiline, setMultiline] = useState<MultilineValue | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [readingFile, setReadingFile] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  // Bumped by every value change, so a file read that finishes late can tell it has been replaced
  // and must not overwrite a newer value.
  const readId = useRef(0);

  const maxValueLength = maxValueLengthFor(providers, selectedProvider);
  const lengthUnit = lengthUnitFor(providers, selectedProvider);

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
  const valueTooLong = measureValue(value, lengthUnit) > maxValueLength;
  const lineCount = value === '' ? 0 : value.split(/\r\n|\r|\n/).length;

  /** Abandons any file read in progress; its result will be ignored. */
  const supersedeRead = () => {
    readId.current += 1;
    setReadingFile(false);
    setFileError(null);
  };

  const handleValueChange = (next: string) => {
    supersedeRead();
    setValue(next);
  };

  const handlePaste = (event: ClipboardEvent<HTMLInputElement>) => {
    const pasted = event.clipboardData.getData('text');
    if (!/[\r\n]/.test(pasted)) return;
    event.preventDefault();
    supersedeRead();
    setValue(pasted);
    setMultiline({ source: 'pasted text' });
  };

  const handleFile = async (file: File | undefined) => {
    supersedeRead();
    if (!file) return;
    if (file.size > MAX_VALUE_FILE_BYTES) {
      setFileError(
        `"${file.name}" is too large for a secret value (${file.size} bytes).`
      );
      if (fileRef.current) fileRef.current.value = '';
      return;
    }

    const id = readId.current;
    setReadingFile(true);
    try {
      const text = await file.text();
      if (id !== readId.current) return;
      setValue(text);
      setMultiline({ source: file.name });
    } catch {
      // Never includes any of the file's content.
      if (id === readId.current)
        setFileError(`"${file.name}" could not be read.`);
    } finally {
      if (id === readId.current) setReadingFile(false);
      // Lets the same file be chosen again, e.g. to retry after a failed read.
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const clearValue = () => {
    supersedeRead();
    setValue('');
    setMultiline(null);
  };

  const blocked =
    isSaving ||
    readingFile ||
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
                  {item.key} ({describeProviderStorage(item, appId).option})
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
            {multiline ? (
              <InputGroup hasValidation>
                <Form.Control
                  type="text"
                  readOnly
                  value={`Multi-line value from ${multiline.source}: ${lineCount} lines, ${value.length} characters`}
                  isInvalid={valueTooLong}
                  aria-label="Multi-line value"
                />
                <Button
                  type="button"
                  variant="outline-secondary"
                  onClick={clearValue}
                  disabled={isSaving}
                >
                  Clear
                </Button>
                <Form.Control.Feedback type="invalid">
                  {selectedProvider} accepts values up to {maxValueLength}{' '}
                  {lengthUnit}.
                </Form.Control.Feedback>
              </InputGroup>
            ) : (
              <InputGroup hasValidation>
                <Form.Control
                  type={showValue ? 'text' : 'password'}
                  value={value}
                  onChange={(e) => handleValueChange(e.target.value)}
                  onPaste={handlePaste}
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
                  {selectedProvider} accepts values up to {maxValueLength}{' '}
                  {lengthUnit}.
                </Form.Control.Feedback>
              </InputGroup>
            )}
            <div className="mt-1">
              <input
                ref={fileRef}
                type="file"
                className="d-none"
                data-testid="secret-value-file"
                onChange={(e) => void handleFile(e.target.files?.[0])}
              />
              <Button
                type="button"
                variant="link"
                size="sm"
                className="p-0"
                onClick={() => fileRef.current?.click()}
                disabled={isSaving}
              >
                Load value from a file
              </Button>
            </div>
            {fileError && (
              <Form.Text className="text-danger d-block">{fileError}</Form.Text>
            )}
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
