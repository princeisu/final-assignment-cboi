import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { authStorageKeys } from '../../config/authConfig'
import { apiConfig } from '../../config/apiConfig'
import { LoaderOverlay } from '../../components/ui/LoaderOverlay'
import { Snackbar } from '../../components/ui/Snackbar'
import { apiRequest } from '../../services/apiClient'

const initialValues = {
  vpaId: '',
  deviceSerialNumber: '',
  currentLanguage: '',
  languageUpdate: '',
}


export function LanguageUpdatePage() {
  const [formValues, setFormValues] = useState(initialValues)
  const [touched, setTouched] = useState({})
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false)
  const [isInitializingPage, setIsInitializingPage] = useState(false)
  const [isUpdatingLanguage, setIsUpdatingLanguage] = useState(false)
  const [languageOptions, setLanguageOptions] = useState([])
  const [successMessage, setSuccessMessage] = useState('Language update request initiated successfully')
  const [modalType, setModalType] = useState('success') // 'success' or 'error'
  const [lastUpdateInfo, setLastUpdateInfo] = useState({ language: '', timestamp: 0 })
  const [snackbarState, setSnackbarState] = useState({
    open: false,
    message: '',
    autoClose: true,
    colorType: 'danger',
  })
  const fetchedCurrentLanguageForTidRef = useRef('')
  const hasFetchedLanguageOptionsRef = useRef(false)

  useEffect(() => {
    const selectedVpa = window.sessionStorage.getItem(authStorageKeys.selectedVpa)
    const storedUserDetails = window.sessionStorage.getItem(authStorageKeys.userDetails)

    if (!storedUserDetails) {
      return
    }

    try {
      const parsedUserDetails = JSON.parse(storedUserDetails)
      let records = Array.isArray(parsedUserDetails)
        ? parsedUserDetails
        : (parsedUserDetails?.data && Array.isArray(parsedUserDetails.data)
          ? parsedUserDetails.data
          : [parsedUserDetails])


      const matchedDetails = selectedVpa
        ? records.find((r) => r.vpa_id === selectedVpa) || records[0]
        : records[0]

      if (!matchedDetails) {
        return
      }

      setFormValues((current) => ({
        ...current,
        vpaId: matchedDetails.vpa_id ?? current.vpaId,
        deviceSerialNumber: matchedDetails.serial_number ?? current.deviceSerialNumber,
      }))
    } catch (error) {
      console.error('[Language Update] Failed to parse stored user details', error)
    }
  }, [])

  useEffect(() => {
    let isMounted = true
    const initializeLanguagePage = async () => {
      if (!formValues.deviceSerialNumber) {
        return
      }

      if (
        fetchedCurrentLanguageForTidRef.current === formValues.deviceSerialNumber &&
        hasFetchedLanguageOptionsRef.current
      ) {
        return
      }

      if (isMounted) {
        setIsInitializingPage(true)
      }

      let failedStep = 'current-language'

      try {
        if (fetchedCurrentLanguageForTidRef.current !== formValues.deviceSerialNumber) {
          fetchedCurrentLanguageForTidRef.current = formValues.deviceSerialNumber

          const currentLanguageResponse = await apiRequest(
            `${apiConfig.currentLanguageEndpoint}/${formValues.deviceSerialNumber}`,
            {
              method: 'GET',
            },
          )

          if (!isMounted) {
            return
          }

          console.log('[Language Update] current language response', currentLanguageResponse)
          window.sessionStorage.setItem(
            authStorageKeys.currentLanguage,
            JSON.stringify(currentLanguageResponse),
          )

          const currentLanguageValue =
            typeof currentLanguageResponse === 'string'
              ? currentLanguageResponse
              : currentLanguageResponse?.data?.current_language ??
              currentLanguageResponse?.data?.language ??
              currentLanguageResponse?.current_language ??
              currentLanguageResponse?.language ??
              currentLanguageResponse?.data ??
              ''

          setFormValues((current) => ({
            ...current,
            currentLanguage:
              typeof currentLanguageValue === 'string'
                ? currentLanguageValue
                : String(currentLanguageValue ?? ''),
          }))
        }

        if (!hasFetchedLanguageOptionsRef.current) {
          failedStep = 'language-options'
          hasFetchedLanguageOptionsRef.current = true

          const languageOptionsResponse = await apiRequest(apiConfig.fetchLanguageEndpoint, {
            method: 'GET',
          })

          if (!isMounted) {
            return
          }

          console.log('[Language Update] fetch language response', languageOptionsResponse)
          window.sessionStorage.setItem(
            authStorageKeys.languageOptions,
            JSON.stringify(languageOptionsResponse),
          )

          const rawLanguageList = Array.isArray(languageOptionsResponse?.data)
            ? languageOptionsResponse.data
            : Array.isArray(languageOptionsResponse)
              ? languageOptionsResponse
              : []

          const languageList = rawLanguageList
            .map((item) =>
              typeof item === 'string'
                ? item
                : item?.language_name ?? item?.language ?? item?.name ?? '',
            )
            .filter(Boolean)

          setLanguageOptions(languageList)
        }
      } catch (error) {
        if (fetchedCurrentLanguageForTidRef.current === formValues.deviceSerialNumber) {
          fetchedCurrentLanguageForTidRef.current = ''
        }

        hasFetchedLanguageOptionsRef.current = false

        console.error('[Language Update] Failed during initialization', error)
        if (isMounted) {
          setSnackbarState({
            open: true,
            message:
              failedStep === 'language-options'
                ? 'Unable to fetch language list'
                : 'Unable to fetch current launguage',
            autoClose: true,
            colorType: 'danger',
          })
        }
      } finally {
        if (isMounted) {
          setIsInitializingPage(false)
        }
      }
    }

    initializeLanguagePage()

    return () => {
      isMounted = false
    }
  }, [formValues.deviceSerialNumber])

  const errors = useMemo(
    () => {
      const baseErrors = {
        vpaId: formValues.vpaId.trim() ? '' : 'VPA ID is required.',
        deviceSerialNumber: formValues.deviceSerialNumber.trim()
          ? ''
          : 'Device serial number is required.',
        currentLanguage: formValues.currentLanguage ? '' : 'Current language is required.',
        languageUpdate: formValues.languageUpdate ? '' : 'Language update is required.',
      }

      // Add cross-field validation
      if (
        formValues.currentLanguage &&
        formValues.languageUpdate &&
        formValues.currentLanguage.toLowerCase() === formValues.languageUpdate.toLowerCase()
      ) {
        baseErrors.languageUpdate = 'New language must be different from current language.'
      }

      return baseErrors
    },
    [formValues.vpaId, formValues.deviceSerialNumber, formValues.currentLanguage, formValues.languageUpdate],
  )

  const isFormValid = Object.values(errors).every((value) => !value)

  const handleChange = (field) => (event) => {
    const value = event.target.value
    setFormValues((current) => ({ ...current, [field]: value }))
  }

  const handleBlur = (field) => () => {
    setTouched((current) => ({ ...current, [field]: true }))
  }

  const handleCancel = () => {
    setFormValues(initialValues)
    setTouched({})
  }

  const handleCloseModal = () => {
    setIsSuccessModalOpen(false)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!isFormValid) {
      setTouched({
        vpaId: true,
        deviceSerialNumber: true,
        currentLanguage: true,
        languageUpdate: true,
      })
      return
    }

    try {
      setIsUpdatingLanguage(true)

      // Guard for immediate hit (within 5 minutes)
      const now = Date.now();
      const FIVE_MINUTES_MS = 300000;
      if (lastUpdateInfo.timestamp > 0 && (now - lastUpdateInfo.timestamp < FIVE_MINUTES_MS)) {
        setModalType('error')
        setSuccessMessage(`${lastUpdateInfo.language} language update is already in progress. Please try again after 5 minutes.`)
        setIsSuccessModalOpen(true)
        setIsUpdatingLanguage(false)
        return
      }

      const response = await apiRequest(apiConfig.updateLanguageEndpoint, {
        method: 'POST',
        body: JSON.stringify({
          tid: formValues.deviceSerialNumber,
          update_language: formValues.languageUpdate,
        }),
      })

      console.log('[Language Update] update response', response)
      window.sessionStorage.setItem(authStorageKeys.languageUpdateResponse, JSON.stringify(response))

      // Update tracking for the next hit
      setLastUpdateInfo({
        language: formValues.languageUpdate,
        timestamp: Date.now()
      })

      setModalType('success')
      setSuccessMessage('Language update request Initiated Successfully')
      setIsSuccessModalOpen(true)
    } catch (error) {
      console.error('[Language Update] Failed to update language', error)
      setSnackbarState({
        open: true,
        message: 'unable to update language',
        autoClose: true,
        colorType: 'danger',
      })
    } finally {
      setIsUpdatingLanguage(false)
    }
  }

  return (
    <section className="portal-section language-update-page">
      <LoaderOverlay
        open={isUpdatingLanguage}
        inline
        text="Updating Language..."
      />
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

      <h1 className="portal-section__title">Language Update</h1>

      <form className="language-update-card" onSubmit={handleSubmit}>
        <LoaderOverlay open={isInitializingPage} inline />
        <div className="language-update-grid">
          <label className="language-update-field">
            <span>VPA ID</span>
            <input
              type="text"
              value={formValues.vpaId}
              onChange={handleChange('vpaId')}
              onBlur={handleBlur('vpaId')}
              placeholder="Enter VPA ID"
              readOnly
            />
            {touched.vpaId && errors.vpaId ? (
              <small className="language-update-field__error">{errors.vpaId}</small>
            ) : null}
          </label>

          <label className="language-update-field">
            <span>Device Serial Number</span>
            <input
              type="text"
              value={formValues.deviceSerialNumber}
              onChange={handleChange('deviceSerialNumber')}
              onBlur={handleBlur('deviceSerialNumber')}
              placeholder="Enter device serial number"
              readOnly
            />
            {touched.deviceSerialNumber && errors.deviceSerialNumber ? (
              <small className="language-update-field__error">
                {errors.deviceSerialNumber}
              </small>
            ) : null}
          </label>

          <label className="language-update-field">
            <span>Current Language</span>
            <input
              type="text"
              value={formValues.currentLanguage}
              onBlur={handleBlur('currentLanguage')}
              placeholder="Current language"
              readOnly
            />
            {touched.currentLanguage && errors.currentLanguage ? (
              <small className="language-update-field__error">{errors.currentLanguage}</small>
            ) : null}
          </label>

          <label className="language-update-field">
            <span>Language Update</span>
            <select
              value={formValues.languageUpdate}
              onChange={handleChange('languageUpdate')}
              onBlur={handleBlur('languageUpdate')}
            >
              <option value="">Select Language Update</option>
              {languageOptions.map((language) => (
                <option key={language} value={language}>
                  {language}
                </option>
              ))}
            </select>
            {touched.languageUpdate && errors.languageUpdate ? (
              <small className="language-update-field__error">{errors.languageUpdate}</small>
            ) : null}
          </label>
        </div>

        <div className="language-update-actions">
          <button
            className="ui-button ui-button--secondary"
            type="button"
            onClick={handleCancel}
          >
            Cancel
          </button>
          <Button type="submit" disabled={!isFormValid}>
            Update
          </Button>
        </div>
      </form>

      {isSuccessModalOpen ? (
        <div className="language-update-modal-overlay" role="presentation">
          <div
            className="language-update-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="language-update-success-title"
          >
            <div className="language-update-modal__body">
              <h2 id="language-update-success-title" className="language-update-modal__title" style={{ marginBottom: '24px' }}>
                {successMessage}
              </h2>

              <div className={`language-update-modal__icon ${modalType === 'error' ? 'language-update-modal__icon--error' : ''}`} aria-hidden="true">
                {modalType === 'error' ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="language-update-modal__svg">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="language-update-modal__svg">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                )}
              </div>
            </div>

            <div className="language-update-modal__footer">
              <Button
                className="language-update-modal__button"
                type="button"
                onClick={handleCloseModal}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}
