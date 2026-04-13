const defaultScopes = [
  'adminName',
  'user_name',
  'goauthentik.io/api',
  'authorities',
  'bankCode',
  'email',
  'profile',
  'openid',
  'offline_access',
  'created',
  'privileges',
]

export const authConfig = {
  issuer:
    import.meta.env.VITE_AUTH_ISSUER ??
    'https://cboi-auth-stage.isupay.in/application/o/cboi/',
  discoveryUrl:
    import.meta.env.VITE_AUTH_DISCOVERY_URL ??
    'https://cboi-auth-stage.isupay.in/application/o/cboi/.well-known/openid-configuration',
  clientId: import.meta.env.VITE_AUTH_CLIENT_ID ?? 'LiDhbaV7qGd3HJHMz2g1wscXAxP2zYqiud6TKl83',
  tokenUrl:
    import.meta.env.VITE_AUTH_TOKEN_URL ??
    'https://cboi-auth-stage.isupay.in/application/o/token/',
  redirectUrl:
    import.meta.env.VITE_AUTH_REDIRECT_URL ?? `${window.location.origin}/callback`,
  grantType: import.meta.env.VITE_AUTH_GRANT_TYPE ?? 'authorization_code',
  authorizationCode:
    import.meta.env.VITE_AUTHORIZATION_CODE ?? 'ecebf8571ef5415b925804a6242a0e99',
  codeVerifier:
    import.meta.env.VITE_AUTH_CODE_VERIFIER ??
    '10b29de25e864910be0c547dfe2530f259ec09474cb94b97ad2c5e23586ab98e8398b3424977425b8b8eb838e217f3e9',
  dangerouslyAllowInsecureHttpRequests:
    import.meta.env.VITE_AUTH_ALLOW_INSECURE_HTTP === 'true',
  useStaticAuth: import.meta.env.VITE_USE_STATIC_AUTH === 'true',
  useMockAuth: import.meta.env.VITE_USE_MOCK_AUTH === 'true',
  scopes: import.meta.env.VITE_AUTH_SCOPES?.split(',').map((value) => value.trim()).filter(Boolean) ??
    defaultScopes,
}

export const authStorageKeys = {
  local: 'cboi-auth-session',
  session: 'cboi-auth-session-temporary',
  oidcRawSession: 'cboi-oidc-token-response',
  oidcProfile: 'cboi-oidc-profile-data',
  userDetails: 'cboi-user-details-response',
  userDetailsFetchPending: 'cboi-user-details-fetch-pending',
  currentLanguage: 'cboi-current-language-response',
  languageOptions: 'cboi-language-options-response',
  languageUpdateResponse: 'cboi-language-update-response',
  staticQrResponse: 'cboi-static-qr-response',
  selectedVpa: 'cboi-selected-vpa',
}
