import { Button, Modal } from 'react-bootstrap';

const RestartConfirmModal = ({show, handleClose, handleConfirm}: RestartConfirmModalProps) => {
  return (
    <Modal show={show} onHide={handleClose}>
    <Modal.Header closeButton>
      <Modal.Title>Restart Program</Modal.Title>
    </Modal.Header>
    <Modal.Body>Are you sure you want to restart the program?</Modal.Body>
    <Modal.Footer>
      <Button variant="light" onClick={handleClose}>
        Cancel
      </Button>
      <Button
        variant="danger"
        onClick={handleConfirm}
      >
        Restart
      </Button>
    </Modal.Footer>
  </Modal>

    );
}

export default RestartConfirmModal;

interface RestartConfirmModalProps {
  show: boolean;
  handleClose: () => void;
  handleConfirm: () => void;
}