import React from 'react';
import type { Member } from '../../types';
import { Avatar } from './Avatar';

interface Props {
  members: Member[];
  selectedIds: string[];
  onToggle: (memberId: string) => void;
  emptyMessage?: string;
}

/** Reusable multi-select picker for choosing one or more task assignees. */
export function MemberPicker({ members, selectedIds, onToggle, emptyMessage = 'No team members yet.' }: Props) {
  if (members.length === 0) {
    return <p className="member-picker-empty">{emptyMessage}</p>;
  }

  return (
    <div className="member-picker">
      {members.map(member => {
        const selected = selectedIds.includes(member.id);

        return (
          <button
            key={member.id}
            type="button"
            className={`member-chip ${selected ? 'selected' : ''}`}
            onClick={() => onToggle(member.id)}
          >
            <Avatar member={member} size="sm" />
            <span className="member-chip-name">{member.name}</span>
          </button>
        );
      })}
    </div>
  );
}
