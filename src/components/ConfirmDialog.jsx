// Confirmation for actions that lose progress. The safe choice is first and focused.
import { Modal, Button } from './ui.jsx';
import Bi from './Bi.jsx';

export default function ConfirmDialog({ title, message, cancel, confirm, onCancel, onConfirm }) {
  return (
    <Modal onClose={onCancel} className="confirm-dialog">
      <h2 className="modal-title">{title}</h2>
      <p>{message}</p>
      <div className="confirm-actions">
        <Button variant="secondary" onClick={onCancel} autoFocus>
          {cancel}
        </Button>
        <Button variant="danger" onClick={onConfirm}>
          {confirm}
        </Button>
      </div>
    </Modal>
  );
}

/** The two run-ending confirmations, shared by the Adventure menu and the in-run menu. */
export function ConfirmNewRun({ onCancel, onConfirm }) {
  return (
    <ConfirmDialog
      title={<Bi py="kāi shǐ xīn mào xiǎn?" en="Start a New Run?" />}
      message="Your current adventure will be abandoned. Your vocabulary progress, permanent unlocks, and achievements will be preserved."
      cancel={<Bi k="cancel" />}
      confirm={<Bi py="kāi shǐ xīn mào xiǎn" en="Start New Run" />}
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );
}

export function ConfirmAbandon({ onCancel, onConfirm }) {
  return (
    <ConfirmDialog
      title={<Bi py="fàng qì zhè cì mào xiǎn?" en="Abandon Current Run?" />}
      message="Your current adventure progress will be lost, but your permanent progression and Mandarin learning progress will remain."
      cancel={<Bi k="keepPlaying" />}
      confirm={<Bi k="abandonRun" />}
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );
}
