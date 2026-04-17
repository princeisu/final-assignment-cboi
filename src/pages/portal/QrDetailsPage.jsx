import { useEffect, useMemo, useState, useCallback } from 'react'
import { authStorageKeys } from '../../config/authConfig'
import { apiConfig } from '../../config/apiConfig'
import { LoaderOverlay } from '../../components/ui/LoaderOverlay'
import { Snackbar } from '../../components/ui/Snackbar'
import { apiRequest } from '../../services/apiClient'

const paymentApps = ['CRED', 'navi', 'paytm']
const DYNAMIC_QR_VALIDITY_SECONDS = 120

function formatAmount(amount) {
  return `\u20b9 ${Number(amount || 0).toLocaleString('en-IN')}`
}

function formatCountdown(secondsLeft) {
  const safeSeconds = Math.max(0, secondsLeft)
  const minutes = Math.floor(safeSeconds / 60)
  const seconds = safeSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

function toPngDataUrl(base64Image) {
  if (!base64Image || typeof base64Image !== 'string') {
    return ''
  }

  if (base64Image.startsWith('data:image')) {
    return base64Image
  }

  return `data:image/png;base64,${base64Image}`
}


export function QrDetailsPage() {
  const [qrType, setQrType] = useState('static')
  const [amountInput, setAmountInput] = useState('')
  const [generatedAmount, setGeneratedAmount] = useState('')
  const [staticQrImageUrl, setStaticQrImageUrl] = useState('')
  const [dynamicQrImageUrl, setDynamicQrImageUrl] = useState('')
  const [showStaticQr, setShowStaticQr] = useState(false)
  const [showDynamicQr, setShowDynamicQr] = useState(false)
  const [secondsRemaining, setSecondsRemaining] = useState(DYNAMIC_QR_VALIDITY_SECONDS)
  const [isFetchingStaticQr, setIsFetchingStaticQr] = useState(false)
  const [snackbarState, setSnackbarState] = useState({
    open: false,
    message: '',
    autoClose: true,
    colorType: 'warning',
  })

  const handleSnackbarClose = useCallback(() => {
    setSnackbarState((current) => ({
      ...current,
      open: false,
    }))
  }, [])

  const trimmedAmount = amountInput.trim()
  const numericAmount = Number(trimmedAmount)

  const qrTitle = useMemo(() => {
    return qrType === 'dynamic' ? 'Amount to be Collected' : ''
  }, [qrType])

  const isExpired = qrType === 'dynamic' && showDynamicQr && secondsRemaining === 0

  const handleStaticSubmit = async () => {
    const storedUserDetails = window.sessionStorage.getItem(authStorageKeys.userDetails)
    const selectedVpa = window.sessionStorage.getItem(authStorageKeys.selectedVpa) || ''

    const parsedUserDetails = storedUserDetails ? JSON.parse(storedUserDetails) : null
    const records = Array.isArray(parsedUserDetails)
      ? parsedUserDetails
      : (parsedUserDetails?.data ?? [])

    const specificRecord = records.find(r => r.vpa_id === selectedVpa) || records[0]
    const qrString = specificRecord?.qr_string ?? ''

    if (!qrString) {
      setSnackbarState({
        open: true,
        message: 'Unable to fetch QR',
        autoClose: true,
        colorType: 'danger',
      })
      setStaticQrImageUrl('')
      setShowStaticQr(false)
      return
    }



    try {
      setIsFetchingStaticQr(true)
      const response = await apiRequest(apiConfig.staticQrEndpoint, {
        method: 'POST',
        body: JSON.stringify({
          qrString,
        }),
      })

      console.log('[QR Details] static QR response', response)
      const base64Image = response?.base64Image ?? response?.data?.base64Image ?? ''

      if (!base64Image) {
        throw new Error('Missing base64Image in QR response')
      }

      window.sessionStorage.setItem(authStorageKeys.staticQrResponse, JSON.stringify(response))
      setStaticQrImageUrl(toPngDataUrl(base64Image))
      setShowStaticQr(true)
    } catch (error) {
      console.error('[QR Details] Failed to fetch static QR', error)

      setSnackbarState({
        open: true,
        message: 'Unable to fetch QR',
        autoClose: true,
        colorType: 'danger',
      })
      setStaticQrImageUrl('')
      setShowStaticQr(false)
    } finally {
      setIsFetchingStaticQr(false)
    }
  }

  const handleDownloadStaticQr = () => {
    if (!staticQrImageUrl) {
      setSnackbarState({
        open: true,
        message: 'Unable to fetch QR',
        autoClose: true,
        colorType: 'danger',
      })
      return
    }

    const downloadLink = document.createElement('a')
    downloadLink.href = staticQrImageUrl
    downloadLink.download = 'cboi-static-qr.png'
    document.body.appendChild(downloadLink)
    downloadLink.click()
    document.body.removeChild(downloadLink)
  }



  const handleGenerateQr = async () => {
    if (!trimmedAmount) {
      setSnackbarState({
        open: true,
        message: 'Amount is required.',
        autoClose: true,
        colorType: 'warning',
      })
      return
    }

    if (Number.isNaN(numericAmount) || numericAmount <= 0) {
      setSnackbarState({
        open: true,
        message: 'Enter a valid amount greater than 0.',
        autoClose: true,
        colorType: 'warning',
      })
      return
    }

    if (numericAmount > 100000) {
      setSnackbarState({
        open: true,
        message: 'Amount exceeds UPI limit of ₹1,00,000.',
        autoClose: true,
        colorType: 'warning',
      })
      return
    }

    const storedUserDetails = window.sessionStorage.getItem(authStorageKeys.userDetails)
    const selectedVpa = window.sessionStorage.getItem(authStorageKeys.selectedVpa) || ''
    const parsedUserDetails = storedUserDetails ? JSON.parse(storedUserDetails) : null
    const records = Array.isArray(parsedUserDetails) ? parsedUserDetails : (parsedUserDetails?.data ?? [])
    const specificRecord = records.find(r => r.vpa_id === selectedVpa) || records[0]

    const serialNo = specificRecord?.serial_no || apiConfig.userDetailsSerialNumber
    const vpaId = specificRecord?.vpa_id || selectedVpa

    try {
      setIsFetchingStaticQr(true)

      const qrStringResponse = await apiRequest(apiConfig.dynamicQrEndpoint, {
        method: 'POST',
        skipCrypto: true,
        body: JSON.stringify({
          txnAmount: numericAmount.toFixed(2),
          serialNo: serialNo,
          vpa_id: vpaId,
        }),
      })

      const qrString = qrStringResponse?.data?.qrString ||
        qrStringResponse?.qrString ||
        qrStringResponse?.data?.qr_string ||
        qrStringResponse?.qr_string

      if (!qrString) {
        throw new Error('Dynamic QR is currently not active.')
      }

      const imageResponse = await apiRequest(apiConfig.staticQrEndpoint, {
        method: 'POST',
        body: JSON.stringify({ qrString }),
      })

      const base64Image = imageResponse?.base64Image ?? imageResponse?.data?.base64Image ?? ''
      if (!base64Image) {
        throw new Error('Failed to convert QR string to image')
      }

      setDynamicQrImageUrl(toPngDataUrl(base64Image))
    } catch (error) {
      console.error('[QR Details] Dynamic QR Error - Falling back to Static', error)
      setSnackbarState({
        open: true,
        message: 'Dynamic QR is currently not active.',
        autoClose: true,
        colorType: 'danger',
      })

      // If static QR is not yet loaded, try fetching it now
      if (!staticQrImageUrl) {
        try {
          await handleStaticSubmit()
        } catch (staticErr) {
          console.error('[QR Details] Failed to fetch static fallback', staticErr)
        }
      }

      setDynamicQrImageUrl('') // Ensure we use the static QR on failure
    } finally {
      setIsFetchingStaticQr(false)
      // Regardless of API success/failure, start the dynamic flow with whatever QR is available (Dynamic or Static)
      setGeneratedAmount(trimmedAmount)
      setSecondsRemaining(DYNAMIC_QR_VALIDITY_SECONDS)
      setShowDynamicQr(true)
    }
  }

  useEffect(() => {
    let timer
    if (showDynamicQr && secondsRemaining > 0) {
      timer = setInterval(() => {
        setSecondsRemaining((prev) => prev - 1)
      }, 1000)
    }
    return () => clearInterval(timer)
  }, [showDynamicQr, secondsRemaining])



  return (
    <section className="portal-section qr-details-page">
      <Snackbar
        open={snackbarState.open}
        message={snackbarState.message}
        autoClose={snackbarState.autoClose}
        colorType={snackbarState.colorType}
        duration={3000}
        onClose={handleSnackbarClose}
      />

      <h1 className="portal-section__title">QR Details</h1>

      <div className="qr-details-panel">
        <LoaderOverlay open={isFetchingStaticQr} inline />
        <div className="qr-details-panel__header">
          <div>
            <p className="qr-details-panel__label">Select The Type of QR</p>

            <div className="qr-details-toggle">
              <label className="reports-radio">
                <input
                  checked={qrType === 'static'}
                  name="qr-type"
                  type="radio"
                  onChange={() => {
                    setQrType('static')
                    setShowDynamicQr(false)
                  }}
                />
                <span>Static</span>
              </label>

              <label className="reports-radio">
                <input
                  checked={qrType === 'dynamic'}
                  name="qr-type"
                  type="radio"
                  onChange={() => {
                    setQrType('dynamic')
                    setStaticQrImageUrl('')
                    setShowStaticQr(false)
                  }}
                />
                <span>Dynamic</span>
              </label>
            </div>
          </div>

          {qrType === 'static' && (
            <button
              className="reports-action-button"
              type="button"
              onClick={handleStaticSubmit}
            >
              Submit
            </button>
          )}
        </div>

        {qrType === 'dynamic' ? (
          <div className="qr-details-controls">
            <div className="qr-details-controls__row">
              <label className="qr-details-controls__field">
                <span>Amount to be collected</span>
                <input
                  type="number"
                  placeholder="Enter amount"
                  max="100000"
                  value={amountInput}
                  onChange={(e) => {
                    const val = e.target.value
                    if (val === '' || Number(val) <= 100000) {
                      setAmountInput(val)
                    }
                  }}
                />
              </label>

              <button
                className="reports-action-button"
                type="button"
                onClick={handleGenerateQr}
              >
                Generate QR
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {(qrType === 'static' && showStaticQr) || (qrType === 'dynamic' && showDynamicQr) ? (
        <div className="qr-preview-card">
          <div className="qr-preview-card__inner">
            {qrTitle && <p className="qr-preview-card__eyebrow">{qrTitle}</p>}
            {qrType === 'dynamic' && showDynamicQr ? (
              <strong className="qr-preview-card__amount">{formatAmount(generatedAmount)}</strong>
            ) : null}

            <div className={`qr-ticket${qrType === 'static' ? ' qr-ticket--static' : ''}${isExpired ? ' qr-ticket--expired' : ''}`}>
              <img
                className="qr-ticket__image"
                src={(qrType === 'dynamic' && dynamicQrImageUrl) ? dynamicQrImageUrl : staticQrImageUrl}
                alt="Merchant QR code"
              />
              {qrType === 'dynamic' && isExpired && (
                <div className="qr-ticket__expired-overlay">
                  <div className="qr-ticket__expired-content">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    <span>QR Expired</span>
                    <button type="button" onClick={handleGenerateQr}>Regenerate</button>
                  </div>
                </div>
              )}
            </div>

            {qrType === 'dynamic' ? (
              <p className="qr-preview-card__validity">
                Valid till {formatCountdown(secondsRemaining)}
              </p>
            ) : (
              <button
                className="reports-action-button reports-action-button--small"
                type="button"
                onClick={handleDownloadStaticQr}
              >
                Download QR
              </button>
            )}
          </div>
        </div>
      ) : null}
    </section>
  )
}
