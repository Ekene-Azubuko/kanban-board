import React from 'react';
import { Clock, Briefcase, LayoutDashboard, Bell, Settings, HelpCircle, ChevronDown, Search } from 'lucide-react';
import { Avatar } from '../UI/Avatar';
import type { Member } from '../../types';

interface Props {
  currentUser?: Member;
  onSearch: (q: string) => void;
  searchValue: string;
}

/** Renders the static workspace sidebar and a secondary search input. */
export function AppSidebar({ currentUser, onSearch, searchValue }: Props) {
  return (
    <aside className="app-sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M10 2L3 6v8l7 4 7-4V6L10 2z" fill="#d4f542" stroke="#d4f542" strokeWidth="1.5" strokeLinejoin="round"/>
            <path d="M10 2v16M3 6l7 4 7-4" stroke="#1a1a1a" strokeWidth="1.5"/>
          </svg>
        </div>
        <span className="sidebar-workspace">Workspace</span>
        <ChevronDown size={14} className="sidebar-chevron" />
      </div>

      {/* Search */}
      <div className="sidebar-search">
        <Search size={13} className="search-icon" />
        <input
          className="sidebar-search-input"
          placeholder="Search…"
          value={searchValue}
          onChange={e => onSearch(e.target.value)}
        />
      </div>

      {/* General */}
      <div className="sidebar-section-label">GENERAL</div>
      <nav className="sidebar-nav">
        <a className="sidebar-nav-item"><Clock size={14} />My Time</a>
        <a className="sidebar-nav-item"><Briefcase size={14} />My Work</a>
        <a className="sidebar-nav-item active"><LayoutDashboard size={14} />Boards</a>
        <a className="sidebar-nav-item"><Bell size={14} />Notification <span className="nav-badge">4</span></a>
      </nav>

      {/* Projects */}
      <div className="sidebar-section-label">PROJECTS <ChevronDown size={10} /></div>
      <nav className="sidebar-nav">
        <a className="sidebar-nav-item active-project">
          <span className="project-icon" style={{ background: '#d4f542', color: '#1a1a1a' }}>K</span>
          Kanban Board
        </a>
      </nav>

      {/* Other */}
      <div className="sidebar-spacer" />
      <div className="sidebar-section-label">OTHER <ChevronDown size={10} /></div>
      <nav className="sidebar-nav">
        <a className="sidebar-nav-item"><Settings size={14} />Settings</a>
        <a className="sidebar-nav-item"><HelpCircle size={14} />Help Center</a>
      </nav>

      {/* User */}
      <div className="sidebar-user">
        <Avatar member={currentUser} size="sm" />
        <div className="sidebar-user-info">
          <span className="sidebar-user-name">{currentUser?.name ?? 'Guest User'}</span>
          <span className="sidebar-user-email">{currentUser?.email ?? 'guest@board.local'}</span>
        </div>
      </div>
    </aside>
  );
}
