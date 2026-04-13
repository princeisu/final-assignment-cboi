import { useEffect } from 'react'
import { Button } from '../components/ui/Button'
import { useAuth } from 'oidc-react'
import cboiLogo from '../assets/cboi-bank-logo.png'

export function LoginPage() {
  const auth = useAuth()

  useEffect(() => {
    if (!auth.isLoading && !auth.userData) {
      auth.signIn().catch(() => { })
    }
  }, [auth])

  return (
    <main className="login-page">
      <div className="login-page__glow" aria-hidden="true" />

      <section className="login-card" aria-label="Login form">
        <div className="login-card__body">
          <img className="login-card__logo" src={cboiLogo} alt="cboi" />

          <h1 className="login-card__title">Redirecting To Secure Login</h1>

          <p className="login-form__hint">
            {auth.isLoading
              ? 'Checking your session and preparing the secure sign-in page.'
              : 'If the login page did not open automatically, continue manually.'}
          </p>

          <div className="login-form">
            <Button type="button" onClick={() => auth.signIn()} disabled={auth.isLoading}>
              {auth.isLoading ? 'Please wait...' : 'Continue To Login'}
            </Button>
          </div>
        </div>
      </section>

      <footer className="page-footer">
        <a href="/" onClick={(event) => event.preventDefault()}>
          Terms and Conditions
        </a>
        <a href="/" onClick={(event) => event.preventDefault()}>
          Privacy Policy
        </a>
        <a href="/" onClick={(event) => event.preventDefault()}>
          CA Privacy Notice
        </a>
      </footer>
    </main>
  )
}
