export function LoaderOverlay({ open, text = 'CBIO Portal Loading...' }) {
  if (!open) {
    return null
  }

  return (
    <div className="portal-loader-overlay" role="status" aria-live="polite" aria-label="Loading...">
      <div className="portal-loader">
        <img 
          src="/favicon.svg" 
          alt="Loading..." 
          className="portal-loader__logo-spinner" 
        />
      </div>
    </div>
  )
}
