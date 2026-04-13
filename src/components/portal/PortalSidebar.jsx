import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import cboiLogo from '../../assets/cboi-bank-logo.png'

function DashboardIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3a9 9 0 1 0 9 9h-9Z" />
      <path d="M13 3a9 9 0 0 1 8 8h-8Z" />
      <path d="M12 12l4-4" />
    </svg>
  )
}

function LanguageIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 5h12" />
      <path d="M12 5v14" />
      <path d="M8 10h8" />
      <path d="M7 19l5-9 5 9" />
    </svg>
  )
}

function ReportsIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 4h9l3 3v13H6Z" />
      <path d="M9 12h6M9 16h4M15 4v4h4" />
    </svg>
  )
}

function QrIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 4h6v6H4Z" />
      <path d="M14 4h6v6h-6Z" />
      <path d="M4 14h6v6H4Z" />
      <path d="M14 14h2M18 14h2M14 18h6M17 14v6" />
    </svg>
  )
}

function HelpSupportIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}

function RaiseTicketIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  )
}

function ViewTicketIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  )
}

function ChevronDownIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

export function PortalSidebar({ isCollapsed }) {
  const [isHelpOpen, setIsHelpOpen] = useState(true)

  return (
    <aside className={`portal-sidebar${isCollapsed ? ' is-collapsed' : ''}`}>
      <div className="portal-sidebar__brand">
        <img src={cboiLogo} alt="cboi" />
      </div>

      <nav className="portal-nav" aria-label="Portal navigation">
        <NavLink to="/dashboard" end className={({ isActive }) => `portal-nav__item${isActive ? ' is-active' : ''}`}>
          <span className="portal-nav__main">
            <span className="portal-nav__icon"><DashboardIcon /></span>
            <span className="portal-nav__label">Dashboard</span>
          </span>
        </NavLink>

        <NavLink to="/reports" className={({ isActive }) => `portal-nav__item${isActive ? ' is-active' : ''}`}>
          <span className="portal-nav__main">
            <span className="portal-nav__icon"><ReportsIcon /></span>
            <span className="portal-nav__label">Transaction Reports</span>
          </span>
        </NavLink>

        <NavLink to="/qr-details" className={({ isActive }) => `portal-nav__item${isActive ? ' is-active' : ''}`}>
          <span className="portal-nav__main">
            <span className="portal-nav__icon"><QrIcon /></span>
            <span className="portal-nav__label">QR Details</span>
          </span>
        </NavLink>

        <NavLink to="/language-update" className={({ isActive }) => `portal-nav__item${isActive ? ' is-active' : ''}`}>
          <span className="portal-nav__main">
            <span className="portal-nav__icon"><LanguageIcon /></span>
            <span className="portal-nav__label">Language Update</span>
          </span>
        </NavLink>

        <div className={`portal-nav__group ${isHelpOpen ? 'is-open' : ''}`}>
          <div className="portal-nav__item has-submenu" onClick={() => setIsHelpOpen(!isHelpOpen)}>
            <span className="portal-nav__main">
              <span className="portal-nav__icon"><HelpSupportIcon /></span>
              <span className="portal-nav__label">Help & Support</span>
            </span>
            <span className={`portal-nav__chevron ${isHelpOpen ? 'is-rotated' : ''}`}>
              <ChevronDownIcon />
            </span>
          </div>
          
          <div className="portal-nav__submenu">
            <NavLink to="/help-support/raise" className={({ isActive }) => `portal-nav__submenu-item${isActive ? ' is-active' : ''}`}>
              <span className="portal-nav__main">
                <span className="portal-nav__icon"><RaiseTicketIcon /></span>
                <span className="portal-nav__label">Raise Ticket</span>
              </span>
            </NavLink>
            <NavLink to="/help-support" end className={({ isActive }) => `portal-nav__submenu-item${isActive ? ' is-active' : ''}`}>
              <span className="portal-nav__main">
                <span className="portal-nav__icon"><ViewTicketIcon /></span>
                <span className="portal-nav__label">View Tickets</span>
              </span>
            </NavLink>
          </div>
        </div>
      </nav>
    </aside>
  )
}
