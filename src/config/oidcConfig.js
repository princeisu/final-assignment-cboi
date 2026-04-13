import { WebStorageStateStore } from 'oidc-react'

export const oidcConfig = {
  authority: import.meta.env.VITE_AUTH_ISSUER ?? 'https://cboi-auth-stage.isupay.in/application/o/merchant-web-application/',
  clientId: import.meta.env.VITE_AUTH_CLIENT_ID ?? '02WnEFxSElzxzrv3Qht29IacaiO6qKa3pclXleoo',
  redirectUri: import.meta.env.VITE_AUTH_REDIRECT_URL ?? `${window.location.origin}/callback`,
  //postLogoutRedirectUri: `${window.location.origin}/sso/logout`,
  // redirectUri: 'com.isu.merchant.CBOI:/callback',
  postLogoutRedirectUri: `${window.location.origin}/sso/logout`,
  responseType: 'code',
  scope:
    'openid profile email offline_access authorities privileges user_name created adminName bankCode goauthentik.io/api',
  automaticSilentRenew: true,
  loadUserInfo: true,
  monitorSession: true,
  filterProtocolClaims: true,
  userStore: new WebStorageStateStore({
    store: window.sessionStorage,
    sync: true,
  }),
}