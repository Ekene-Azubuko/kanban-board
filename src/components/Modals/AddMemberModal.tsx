import React, { useState } from 'react';
import { X, UserPlus } from 'lucide-react';

interface Props {
  onClose: () => void;
  onSubmit: (name: string, email?: string) => Promise<unknown>;
}

/** Collects the inputs needed to create a new team member. */
export function AddMemberModal({ onClose, onSubmit }: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    await onSubmit(name.trim(), email || undefined);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box modal-sm" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2><UserPlus size={16} style={{ display: 'inline', marginRight: 8 }} />Add Member</h2>
          <button className="icon-btn" onClick={onClose}><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className="modal-form">
          <label className="field-label">Name *</label>
          <input className="field-input" value={name} onChange={e => setName(e.target.value)}
            placeholder="Full name" autoFocus required />
          <label className="field-label">Email (optional)</label>
          <input type="email" className="field-input" value={email}
            onChange={e => setEmail(e.target.value)} placeholder="email@example.com" />
          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={!name.trim() || loading}>
              {loading ? 'Adding…' : 'Add Member'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
