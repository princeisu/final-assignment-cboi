import { useEffect, useRef, useState } from 'react'
import avatarImg from '../../assets/avatar.png'
import { authStorageKeys } from '../../config/authConfig'
import { apiConfig } from '../../config/apiConfig'
import { Button } from '../ui/Button'
import { LoaderOverlay } from '../ui/LoaderOverlay'
import { Snackbar } from '../ui/Snackbar'
import { apiRequest } from '../../services/apiClient'

function LogoutIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  )
}

function KeyIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="8.5" cy="15.5" r="3.5" />
      <path d="M11 13l8-8" />
      <path d="M16 5h3v3" />
      <path d="M14 7l3 3" />
    </svg>
  )
}

function ChevronDownIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  )
}

export function PortalTopNav({ isSidebarCollapsed, onToggleSidebar, onLogout }) {
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false)
  const [isProfileDetailsOpen, setIsProfileDetailsOpen] = useState(false)
  const [isFetchingProfileDetails, setIsFetchingProfileDetails] = useState(false)
  const [profileDetails, setProfileDetails] = useState(null)
  const [snackbarState, setSnackbarState] = useState({
    open: false,
    message: '',
    autoClose: true,
    colorType: 'danger',
  })
  const profileMenuRef = useRef(null)

  const storedProfile = window.sessionStorage.getItem(authStorageKeys.oidcProfile)
  const profileData = storedProfile ? JSON.parse(storedProfile) : null

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!profileMenuRef.current?.contains(event.target)) {
        setIsProfileMenuOpen(false)
      }
    }

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setIsProfileMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [])

  const formatLabel = (value) => {
    return value
      .replace(/_/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/\b\w/g, (letter) => letter.toUpperCase())
  }

  const getDisplayEntries = (value) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return []
    }

    return Object.entries(value).filter(([, entryValue]) => {
      return typeof entryValue !== 'object' || entryValue === null
    })
  }

  const detailSource = Array.isArray(profileDetails)
    ? profileDetails[0] ?? null
    : profileDetails?.data && Array.isArray(profileDetails.data)
      ? profileDetails.data[0] ?? null
      : profileDetails?.data && typeof profileDetails.data === 'object'
        ? profileDetails.data
        : profileDetails
  const detailEntries = getDisplayEntries(detailSource)

  const handleViewDetails = () => {
    setIsProfileMenuOpen(false)

    try {
      const selectedVpa = window.sessionStorage.getItem(authStorageKeys.selectedVpa) || ''
      const storedUserDetails = window.sessionStorage.getItem(authStorageKeys.userDetails)

      if (!storedUserDetails) {
        throw new Error('No user records found. Please load the dashboard first.')
      }

      const parsed = JSON.parse(storedUserDetails)
      const records = Array.isArray(parsed) ? parsed : (parsed?.data ?? [])

      // Find the specific VPA record, or fallback to the first one available
      const specificRecord = records.find(r => r.vpa_id === selectedVpa) || records[0]

      if (!specificRecord) {
        throw new Error('No corresponding VPA details found.')
      }

      setProfileDetails(specificRecord)
      setIsProfileDetailsOpen(true)
    } catch (error) {
      console.error('[Profile Details] Failed to extract user details from session', error)
      setSnackbarState({
        open: true,
        message: error.message || 'Failed to view user details',
        autoClose: true,
        colorType: 'danger',
      })
    }
  }

  const handleLogout = () => {
    setIsProfileMenuOpen(false)
    onLogout?.()
  }

  const maskAccountNumber = (accountNo) => {
    if (!accountNo) return '-'
    const str = String(accountNo)
    if (str.length <= 4) return str
    const last4 = str.slice(-4)
    const maskedPart = 'X'.repeat(str.length - 4)
    return `${maskedPart}${last4}`
  }

  return (
    <>
      <header className="portal-topnav">
        <LoaderOverlay open={isFetchingProfileDetails} text="cboi Portal Loading..." />

        <Snackbar
          open={snackbarState.open}
          message={snackbarState.message}
          autoClose={snackbarState.autoClose}
          colorType={snackbarState.colorType}
          onClose={() =>
            setSnackbarState((current) => ({
              ...current,
              open: false,
            }))
          }
        />

        <button
          className="portal-icon-button"
          type="button"
          aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          onClick={onToggleSidebar}
        >
          <MenuIcon />
        </button>

        <div className="portal-topnav__actions">
          <div className="portal-profile-menu" ref={profileMenuRef}>
            <button
              className={`portal-profile${isProfileMenuOpen ? ' is-open' : ''}`}
              type="button"
              onClick={() => setIsProfileMenuOpen((current) => !current)}
              aria-haspopup="menu"
              aria-expanded={isProfileMenuOpen}
            >
              <div className="portal-profile__avatar" aria-hidden="true">
                <img src={avatarImg} alt="User Avatar" />
              </div>
              <span>{profileData?.name || profileData?.user_name || 'cboi Portal'}</span>
              <span className="portal-profile__chevron" aria-hidden="true">
                <ChevronDownIcon />
              </span>
            </button>

            <div
              className={`portal-profile-dropdown${isProfileMenuOpen ? ' is-open' : ''}`}
              role="menu"
              aria-label="Profile actions"
            >
              <button
                className="portal-profile-dropdown__item"
                type="button"
                role="menuitem"
                onClick={handleViewDetails}
                disabled={isFetchingProfileDetails}
              >
                <span>{isFetchingProfileDetails ? 'Loading...' : 'View Details'}</span>
                <KeyIcon />
              </button>

              <button
                className="portal-profile-dropdown__item portal-profile-dropdown__color"
                type="button"
                role="menuitem"
                onClick={handleLogout}
              >
                <span>Logout</span>
                <LogoutIcon />
              </button>
            </div>
          </div>
        </div>
      </header>

      {isProfileDetailsOpen ? (
        <div className="profile-details-modal-overlay" role="presentation">
          <div
            className="profile-details-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="profile-details-title"
          >
            <div className="profile-details-modal__header">
              <h2 id="profile-details-title">View Profile Details</h2>
            </div>

            <div className="profile-details-modal__body">
              <div className="profile-details-card">
                <div className="profile-details-card__title">
                  <h3>Basic Information</h3>
                </div>
                <div className="profile-details-card__content">
                  <div className="profile-details-row">
                    <span>Name</span>
                    <strong>{detailSource?.merchant_name || ''}</strong>
                  </div>
                  <div className="profile-details-row">
                    <span>Phone</span>
                    <strong>{detailSource?.merchant_mobile ? `+91 ${detailSource.merchant_mobile}` : ''}</strong>
                  </div>
                </div>
              </div>

              <div className="profile-details-card">
                <div className="profile-details-card__title">
                  <h3>Device Information</h3>
                </div>
                <div className="profile-details-card__content">
                  <div className="profile-details-row">
                    <span>Device Serial Number</span>
                    <strong>{detailSource?.serial_number || ''}</strong>
                  </div>
                  <div className="profile-details-row">
                    <span>Linked Account Number</span>
                    <strong>{detailSource?.merchant_account_no ? maskAccountNumber(detailSource.merchant_account_no) : ''}</strong>
                  </div>
                  <div className="profile-details-row">
                    <span>UPI ID</span>
                    <strong>{detailSource?.vpa_id || ''}</strong>
                  </div>
                  <div className="profile-details-row">
                    <span>IFSC Code</span>
                    <strong>{detailSource?.ifsc || ''}</strong>
                  </div>
                  <div className="profile-details-row">
                    <span>Device Model Name</span>
                    <strong>{detailSource?.model_name || ''}</strong>
                  </div>
                  <div className="profile-details-row">
                    <span>Device Mobile Number</span>
                    <strong>{detailSource?.merchant_mobile ? `+91 ${detailSource.merchant_mobile}` : ''}</strong>
                  </div>
                  <div className="profile-details-row">
                    <span>Network Type</span>
                    <strong>{detailSource?.network_type || ''}</strong>
                  </div>
                  <div className="profile-details-row">
                    <span>Device Status</span>
                    <strong className="status-active">{detailSource?.device_status || ''}</strong>
                  </div>
                  <div className="profile-details-row">
                    <span>Battery Percentage</span>
                    <strong>{detailSource?.battery_per || ''}</strong>
                  </div>
                  <div className="profile-details-row">
                    <span>Network Strength</span>
                    <strong>{detailSource?.network_strength || ''}</strong>
                  </div>
                </div>
              </div>
            </div>

            <div className="profile-details-modal__footer">
              <Button
                className="profile-details-modal__button profile-details-modal__button--close"
                type="button"
                onClick={() => setIsProfileDetailsOpen(false)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
