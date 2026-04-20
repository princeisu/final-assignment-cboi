import { useEffect, useState } from 'react'
import { authStorageKeys } from '../../config/authConfig'
import { apiConfig } from '../../config/apiConfig'
import { StatCard } from '../../components/portal/StatCard'
import { LoaderOverlay } from '../../components/ui/LoaderOverlay'
import { apiRequest } from '../../services/apiClient'

function TransactionIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 10h12l-4-4" />
      <path d="M17 14H5l4 4" />
    </svg>
  )
}

function AmountIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M3 12h1M20 12h1M12 6v1M12 17v1" />
    </svg>
  )
}

// Removed hardcoded fallback for VPA

// Track the fetch promise at the module level to synchronize concurrent requests 
// (especially for React 18 Strict Mode) and ensure results are shared.
let userDetailsRequestPromise = null
let activeSummaryRequestParams = ""
let activeSummaryRequestPromise = null

export function DashboardPage() {
  const [isFetchingUserDetails, setIsFetchingUserDetails] = useState(false)
  const [isFetchingSummary, setIsFetchingSummary] = useState(false)
  const [hasLoadedSummary, setHasLoadedSummary] = useState(false)
  const [userRecords, setUserRecords] = useState([])
  const [selectedVpa, setSelectedVpa] = useState(() => window.sessionStorage.getItem(authStorageKeys.selectedVpa) || '')
  const [showVpaModal, setShowVpaModal] = useState(false)
  const [tempSelectedVpa, setTempSelectedVpa] = useState('')
  const [dateFilter, setDateFilter] = useState('today')
  const [summaryData, setSummaryData] = useState({ count: '0', amount: '0' })

  // Sync selectedVpa to sessionStorage
  useEffect(() => {
    if (selectedVpa) {
      window.sessionStorage.setItem(authStorageKeys.selectedVpa, selectedVpa)
    }
  }, [selectedVpa])

  // Initial fetch of user details/VPAs
  useEffect(() => {
    let isMounted = true

    const fetchUserDetails = async () => {
      // 1. Get mobile number
      const storedProfile = window.sessionStorage.getItem(authStorageKeys.oidcProfile)
      const profileData = storedProfile ? JSON.parse(storedProfile) : null
      const mobileNumber = profileData?.user_name ?? ''

      if (!mobileNumber) return

      try {
        if (isMounted) setIsFetchingUserDetails(true)

        // 2. Use global promise to synchronize between strict-mode double mounts, but clear it later
        if (!userDetailsRequestPromise) {
          userDetailsRequestPromise = apiRequest(apiConfig.fetchUserDetailsEndpoint, {
            method: 'POST',
            body: JSON.stringify({ mobile_number: mobileNumber }),
          })
        }

        const response = await userDetailsRequestPromise

        if (!isMounted) return

        console.log('[Dashboard] fetchById response received', response)
        window.sessionStorage.setItem(authStorageKeys.userDetails, JSON.stringify(response))

        const records = Array.isArray(response) ? response : (response?.data ?? [])
        setUserRecords(records)

        // Only auto-select or show modal if there's no pre-existing valid selected VPA
        const currentVpa = window.sessionStorage.getItem(authStorageKeys.selectedVpa)
        const validVpa = records.find(r => r.vpa_id === currentVpa)

        if (!validVpa) {
          if (records.length === 1 && records[0]?.vpa_id) {
            setSelectedVpa(records[0].vpa_id)
          } else if (records.length > 1) {
            setSelectedVpa('')
            setTempSelectedVpa(records[0]?.vpa_id || '')
            setShowVpaModal(true)
          }
        }
      } catch (error) {
        console.error('[Dashboard] Failed to fetch user details', error)
      } finally {
        // Always reset so next mount makes a fresh call
        userDetailsRequestPromise = null
        if (isMounted) setIsFetchingUserDetails(false)
      }
    }

    fetchUserDetails()

    return () => {
      isMounted = false
    }
  }, [])

  // Fetch summary when VPA or Date changes
  useEffect(() => {
    if (!selectedVpa) return

    let isMounted = true

    const fetchSummary = async () => {
      try {
        if (isMounted) setIsFetchingSummary(true)

        // Helper to get formatted dates
        const getFormattedDate = (date) => {
          const d = new Date(date)
          const day = String(d.getDate()).padStart(2, '0')
          const month = String(d.getMonth() + 1).padStart(2, '0')
          const year = d.getFullYear()
          return `${day}/${month}/${year}`
        }

        const todayStr = getFormattedDate(new Date())
        let targetDate = todayStr

        if (dateFilter === 'yesterday') {
          const yesterday = new Date()
          yesterday.setDate(yesterday.getDate() - 1)
          targetDate = getFormattedDate(yesterday)
        }

        const requestParams = `${selectedVpa}_${targetDate}`

        // Synchronize across simultaneous mounts (Strict Mode) using module-level locking
        // We reuse the promise ONLY if the parameters match AND the promise is still active.
        if (!activeSummaryRequestPromise || activeSummaryRequestParams !== requestParams) {
          activeSummaryRequestParams = requestParams
          activeSummaryRequestPromise = fetch(apiConfig.reportsQuerySubmitUserEndpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json',
            },
            body: JSON.stringify({
              startDate: targetDate,
              endDate: targetDate,
              vpa_id: selectedVpa,
              mode: 'both',
            }),
          }).then(async (res) => {
            if (!res.ok) throw new Error(`Summary API failed with status ${res.status}`)
            return res.json()
          }).catch(err => {
            throw err
          })
        }

        const responseData = await activeSummaryRequestPromise

        if (!isMounted) return

        setSummaryData({
          count: String(responseData?.row_count ?? 0),
          amount: String(responseData?.total_amount ?? 0),
        })
        setHasLoadedSummary(true)
      } catch (error) {
        console.error('[Dashboard] Failed to fetch summary', error)
        if (isMounted) {
          setSummaryData({ count: '0', amount: '0' })
          setHasLoadedSummary(true)
        }
      } finally {
        // Clear the promise when the component unmounts or finishes so next visits get fresh data
        // but it stays defined long enough for the Strict Mode remount to catch it.
        if (isMounted) {
          activeSummaryRequestPromise = null
          setIsFetchingSummary(false)
        }
      }
    }

    fetchSummary()
    return () => {
      isMounted = false
    }
  }, [selectedVpa, dateFilter])

  const formatCount = (count) => {
    const num = Number(count)
    if (isNaN(num) || num === 0) return '0'
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return String(num)
  }

  const formatAmount = (amount) => {
    const num = Number(amount)
    if (isNaN(num) || num === 0) return '0'
    return num.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })
  }

  return (
    <section className="portal-section dashboard-page">
      <LoaderOverlay open={isFetchingUserDetails || (isFetchingSummary && !hasLoadedSummary)} inline />

      <h1 className="portal-section__title">Dashboard</h1>

      <div className="dashboard-header-row">
        <div className="dashboard-control-group">
          {userRecords.length <= 1 ? (
            <div className="dashboard-vpa-display">
              VPA ID : <span>{selectedVpa || 'Not Selected'}</span>
            </div>
          ) : (
            <>
              <label htmlFor="vpa-selector">VPA ID :</label>
              <select
                id="vpa-selector"
                value={selectedVpa}
                onChange={(e) => setSelectedVpa(e.target.value)}
                className="dashboard-select"
              >
                {!selectedVpa && <option value="" disabled>Select VPA</option>}
                {userRecords.map((record, index) => (
                  <option key={record.vpa_id || index} value={record.vpa_id}>
                    {record.vpa_id}
                  </option>
                ))}
              </select>
            </>
          )}
        </div>

        <div className="dashboard-control-group dashboard-control-group--right">
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="dashboard-select dashboard-select--date"
          >
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
          </select>
        </div>
      </div>

      <div className="stats-grid">
        <LoaderOverlay open={isFetchingSummary && hasLoadedSummary} inline />
        <StatCard
          label="Total No Of Transaction"
          value={formatCount(summaryData.count)}
          icon={<TransactionIcon />}
          className="stat-card--transaction"
        />
        <StatCard
          label="Total Amount"
          value={formatAmount(summaryData.amount)}
          icon={<AmountIcon />}
          className="stat-card--amount"
        />
      </div>

      {showVpaModal && userRecords.length > 1 && (
        <div className="vpa-modal-overlay">
          <div className="vpa-modal" role="dialog" aria-modal="true">
            <h2 className="vpa-modal__title">Select VPA</h2>
            <p className="vpa-modal__subtitle">Select a VPA to Proceed</p>

            <div className="vpa-modal__list">
              {userRecords.map((record, index) => {
                const vId = record.vpa_id;
                const isSelected = tempSelectedVpa === vId;
                return (
                  <label
                    key={vId || index}
                    className={`vpa-modal__item ${isSelected ? 'vpa-modal__item--selected' : ''}`}
                  >
                    <input
                      type="radio"
                      name="vpa_selection"
                      value={vId}
                      checked={isSelected}
                      onChange={() => setTempSelectedVpa(vId)}
                    />
                    <span>{vId}</span>
                  </label>
                )
              })}
            </div>

            <div className="vpa-modal__actions">
              <button
                type="button"
                className="vpa-modal__btn-cancel"
                onClick={() => setShowVpaModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="vpa-modal__btn-proceed"
                disabled={!tempSelectedVpa}
                onClick={() => {
                  setSelectedVpa(tempSelectedVpa)
                  setShowVpaModal(false)
                }}
              >
                Proceed
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
