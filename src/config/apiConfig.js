export const apiConfig = {
  baseUrl: import.meta.env.VITE_API_BASE_URL ?? 'https://api-preprod.txninfra.com/encrV4',
  fetchUserDetailsEndpoint:
    import.meta.env.VITE_FETCH_USER_DETAILS_ENDPOINT ?? '/CBOI/fetch/bankfetchById',
  reportsQuerySubmitUserEndpoint:
    import.meta.env.VITE_REPORTS_QUERY_SUBMIT_USER_ENDPOINT ??
    'https://services-cboi-uat.isupay.in/CBOI/reports/querysubmit_username',
  currentLanguageEndpoint:
    import.meta.env.VITE_CURRENT_LANGUAGE_ENDPOINT ?? '/CBOI/isu_soundbox/user_api/current_language',
  fetchLanguageEndpoint:
    import.meta.env.VITE_FETCH_LANGUAGE_ENDPOINT ?? '/CBOI/isu_soundbox/lang/fetch_language',
  updateLanguageEndpoint:
    import.meta.env.VITE_UPDATE_LANGUAGE_ENDPOINT ?? 'https://services-cboi-uat.isupay.in/CBOI/isu_soundbox/lang/status_update',
  staticQrEndpoint:
    import.meta.env.VITE_STATIC_QR_ENDPOINT ?? 'https://api-preprod.txninfra.com/encrV4/CBOI/merchant/qr_convert_to_base64',
  dynamicQrEndpoint:
    import.meta.env.VITE_DYNAMIC_QR_ENDPOINT ?? 'https://services-cboi-uat.isupay.in/CBOI/merchant/get-qr-string',
  createTicketEndpoint:
    import.meta.env.VITE_CREATE_TICKET_ENDPOINT ?? '/CBOI/zendesk/v2/createTicket',
  filterTicketsEndpoint:
    import.meta.env.VITE_FILTER_TICKETS_ENDPOINT ?? '/CBOI/zendesk/v2/filterTickets',
  userDetailsSerialNumber:
    import.meta.env.VITE_USER_DETAILS_SERIAL_NUMBER ?? '38241108350403',
  staticAuthorizationToken: import.meta.env.VITE_STATIC_AUTH_TOKEN ?? '',
  authorizationScheme: import.meta.env.VITE_STATIC_AUTH_SCHEME ?? 'Bearer',
  staticPassKey: import.meta.env.VITE_STATIC_PASS_KEY ?? '',
  passKeyHeader: import.meta.env.VITE_PASS_KEY_HEADER ?? 'pass_key',
  passKeyStorageKey: 'CBOI-pass-key',
}

export function getStaticAuthorizationHeader() {
  if (!apiConfig.staticAuthorizationToken) {
    return {}
  }

  const headerValue = apiConfig.authorizationScheme
    ? `${apiConfig.authorizationScheme} ${apiConfig.staticAuthorizationToken}`
    : apiConfig.staticAuthorizationToken

  return {
    Authorization: headerValue,
  }
}

export function getStaticPassKeyHeader() {
  const storedPassKey =
    window.sessionStorage.getItem(apiConfig.passKeyStorageKey) ?? apiConfig.staticPassKey

  if (!storedPassKey || !apiConfig.passKeyHeader) {
    return {}
  }

  return {
    [apiConfig.passKeyHeader]: storedPassKey,
  }
}

export function storePassKey(passKey) {
  if (!passKey) {
    window.sessionStorage.removeItem(apiConfig.passKeyStorageKey)
    return
  }

  window.sessionStorage.setItem(apiConfig.passKeyStorageKey, passKey)
}
