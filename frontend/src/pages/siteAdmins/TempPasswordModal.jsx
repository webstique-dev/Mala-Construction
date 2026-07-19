import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import Modal from '../../components/modals/Modal';
import Button from '../../components/common/Button';

export default function TempPasswordModal({ tempPassword, onClose }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(tempPassword.password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API can fail on non-secure origins - the password is still visible to select manually.
    }
  };

  return (
    <Modal
      isOpen={!!tempPassword}
      onClose={onClose}
      title="Temporary password"
      size="sm"
      footer={<Button onClick={onClose}>Done</Button>}
    >
      <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-md)' }}>
        Share this password with <strong>{tempPassword?.name}</strong> through a secure channel. It won't be shown
        again.
      </p>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-sm)',
          padding: 'var(--space-md)',
          background: 'var(--color-bg)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-sm)',
          fontFamily: 'monospace',
          fontSize: 'var(--font-size-lg)',
        }}
      >
        <span style={{ flex: 1, wordBreak: 'break-all' }}>{tempPassword?.password}</span>
        <button type="button" className="icon-btn touch-target" onClick={handleCopy} aria-label="Copy password">
          {copied ? <Check size={16} /> : <Copy size={16} />}
        </button>
      </div>
    </Modal>
  );
}
