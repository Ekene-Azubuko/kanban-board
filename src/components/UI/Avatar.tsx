import React from 'react';
import type { Member } from '../../types';

interface AvatarProps {
  member?: Member;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  style?: React.CSSProperties;
}

const sizes = { sm: 24, md: 32, lg: 40 };

/** Renders a member avatar or a fallback placeholder. */
export function Avatar({ member, size = 'sm', className = '', style }: AvatarProps) {
  const px = sizes[size];
  if (!member) {
    return (
      <div className={`avatar avatar-empty ${className}`} style={{ width: px, height: px, fontSize: px * 0.4, ...style }}>
        ?
      </div>
    );
  }
  return (
    <div
      className={`avatar ${className}`}
      style={{ width: px, height: px, backgroundColor: member.avatar_color, fontSize: px * 0.38, ...style }}
      title={member.name}
    >
      {member.avatar_initials}
    </div>
  );
}

/** Displays a compact overlapping stack of member avatars. */
export function AvatarStack({ members, max = 3 }: { members: Member[]; max?: number }) {
  const shown = members.slice(0, max);
  const rest = members.length - max;
  return (
    <div className="avatar-stack">
      {shown.map((m, i) => (
        <Avatar key={m.id} member={m} size="sm" className="avatar-stacked" style={{ zIndex: shown.length - i }} />
      ))}
      {rest > 0 && (
        <div className="avatar avatar-rest avatar-stacked" style={{ width: 24, height: 24, fontSize: 10, zIndex: 0 }}>+{rest}</div>
      )}
    </div>
  );
}
