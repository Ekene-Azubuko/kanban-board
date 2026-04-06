import React, { useMemo, useState } from 'react';
import { Check, Pencil, Plus, Trash2, X } from 'lucide-react';
import type { Label } from '../../types';

interface Props {
  labels: Label[];
  onClose: () => void;
  onCreate: (name: string, color: string) => Promise<Label | undefined>;
  onUpdate: (labelId: string, updates: Pick<Label, 'name' | 'color'>) => Promise<Label | undefined>;
  onDelete: (labelId: string) => Promise<void>;
  onSelectLabel?: (labelId: string) => void;
}

const DEFAULT_COLOR = '#818cf8';

/** Creates, edits, and deletes reusable task labels. */
export function ManageLabelsModal({ labels, onClose, onCreate, onUpdate, onDelete, onSelectLabel }: Props) {
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(DEFAULT_COLOR);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingColor, setEditingColor] = useState(DEFAULT_COLOR);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  // Keep labels predictable in every picker and editor.
  const sortedLabels = useMemo(
    () => [...labels].sort((a, b) => a.name.localeCompare(b.name)),
    [labels]
  );

  /** Clears the local edit form after a save or cancel action. */
  const resetEditing = () => {
    setEditingId(null);
    setEditingName('');
    setEditingColor(DEFAULT_COLOR);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    setError('');
    setSavingId('create');

    try {
      const label = await onCreate(newName.trim(), newColor);
      if (label) onSelectLabel?.(label.id);
      setNewName('');
      setNewColor(DEFAULT_COLOR);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create label.');
    } finally {
      setSavingId(null);
    }
  };

  const startEditing = (label: Label) => {
    setError('');
    setEditingId(label.id);
    setEditingName(label.name);
    setEditingColor(label.color);
  };

  const handleUpdate = async (labelId: string) => {
    if (!editingName.trim()) return;

    setError('');
    setSavingId(labelId);

    try {
      await onUpdate(labelId, { name: editingName.trim(), color: editingColor });
      resetEditing();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update label.');
    } finally {
      setSavingId(null);
    }
  };

  const handleDelete = async (label: Label) => {
    const confirmed = window.confirm(`Delete label "${label.name}"? This removes it from existing tasks too.`);
    if (!confirmed) return;

    setError('');
    setDeletingId(label.id);

    try {
      await onDelete(label.id);
      if (editingId === label.id) resetEditing();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to delete label.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box modal-sm label-manager-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Manage Labels</h2>
          <button className="icon-btn" onClick={onClose}><X size={16} /></button>
        </div>

        <div className="modal-form">
          <form className="label-manager-create" onSubmit={handleCreate}>
            <div className="label-manager-field">
              <label className="field-label">New label</label>
              <input
                className="field-input"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="Frontend"
                autoFocus
              />
            </div>
            <div className="label-manager-color-wrap">
              <label className="field-label">Color</label>
              <input
                type="color"
                className="label-color-input"
                value={newColor}
                onChange={e => setNewColor(e.target.value)}
                aria-label="Choose label color"
              />
            </div>
            <button type="submit" className="btn-primary label-create-btn" disabled={!newName.trim() || savingId === 'create'}>
              <Plus size={13} />
              {savingId === 'create' ? 'Adding…' : 'Add'}
            </button>
          </form>

          {error && <p className="form-error">{error}</p>}

          <div className="label-manager-list">
            {sortedLabels.length === 0 && (
              <div className="label-manager-empty">
                <p>No labels yet. Add the first one above.</p>
              </div>
            )}

            {sortedLabels.map(label => {
              const isEditing = editingId === label.id;
              const isSaving = savingId === label.id;
              const isDeleting = deletingId === label.id;

              return (
                <div key={label.id} className="label-manager-row">
                  {isEditing ? (
                    <>
                      <input
                        className="field-input label-manager-row-input"
                        value={editingName}
                        onChange={e => setEditingName(e.target.value)}
                        placeholder="Label name"
                      />
                      <input
                        type="color"
                        className="label-color-input"
                        value={editingColor}
                        onChange={e => setEditingColor(e.target.value)}
                        aria-label={`Choose color for ${label.name}`}
                      />
                      <button
                        type="button"
                        className="icon-btn"
                        onClick={() => handleUpdate(label.id)}
                        disabled={!editingName.trim() || isSaving}
                        aria-label={`Save ${label.name}`}
                      >
                        <Check size={14} />
                      </button>
                      <button type="button" className="icon-btn" onClick={resetEditing} aria-label="Cancel editing">
                        <X size={14} />
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="label-manager-preview">
                        <span className="label-swatch" style={{ backgroundColor: label.color }} />
                        <span className="label-manager-name">{label.name}</span>
                      </div>
                      <div className="label-manager-actions">
                        <button type="button" className="icon-btn" onClick={() => startEditing(label)} aria-label={`Edit ${label.name}`}>
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          className="icon-btn label-delete-btn"
                          onClick={() => handleDelete(label)}
                          disabled={isDeleting}
                          aria-label={`Delete ${label.name}`}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>Done</button>
          </div>
        </div>
      </div>
    </div>
  );
}
