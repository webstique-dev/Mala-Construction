import Modal from './Modal';
import Button from '../common/Button';

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirmation Required',
  description,
  message,
  children,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = false,
  isLoading = false,
}) {
  const bodyText = description || message || children || 'Are you sure you want to perform this action?';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title || 'Confirmation Required'}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            {cancelLabel}
          </Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm} isLoading={isLoading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {typeof bodyText === 'string' ? (
        <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)', margin: 0 }}>
          {bodyText}
        </p>
      ) : (
        bodyText
      )}
    </Modal>
  );
}
