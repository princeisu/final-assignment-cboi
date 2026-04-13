import { useEffect } from 'react'

const variantConfig = {
  success: {
    class: 'ui-snackbar--success',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    ),
  },
  danger: {
    class: 'ui-snackbar--danger',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    ),
  },
  warning: {
    class: 'ui-snackbar--warning',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    ),
  },
  info: {
    class: 'ui-snackbar--info',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="16" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12.01" y2="8" />
      </svg>
    ),
  },
}

export function Snackbar({
  open,
  message,
  autoClose = true,
  colorType = 'info',
  onClose,
  duration = 3000,
}) {
  useEffect(() => {
    if (!open || !autoClose) {
      return undefined
    }

    const timeoutId = window.setTimeout(() => {
      onClose?.()
    }, duration)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [autoClose, duration, onClose, open])

  if (!open || !message) {
    return null
  }

  const config = variantConfig[colorType] ?? variantConfig.info

  return (
    <div className={`ui-snackbar-v2 ${config.class}`} role="status" aria-live="polite">
      <div className="ui-snackbar-v2__content">
        <div className="ui-snackbar-v2__icon-wrapper">
          {config.icon}
        </div>
        <span className="ui-snackbar-v2__message">{message}</span>
        <button
          type="button"
          className="ui-snackbar-v2__close"
          onClick={() => onClose?.()}
          aria-label="Close notification"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
      {autoClose && (
        <div 
          className="ui-snackbar-v2__progress" 
          style={{ animationDuration: `${duration}ms` }} 
        />
      )}
    </div>
  )
}
