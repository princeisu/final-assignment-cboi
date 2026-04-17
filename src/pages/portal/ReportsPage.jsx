import { useEffect, useMemo, useState } from 'react'
import { authStorageKeys } from '../../config/authConfig'
import { apiConfig } from '../../config/apiConfig'
import { LoaderOverlay } from '../../components/ui/LoaderOverlay'
import { Snackbar } from '../../components/ui/Snackbar'

const monthlyOptions = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

const HARDCODED_VPA = '6291777315m@cboiupi'

const reportColumns = [
  { key: 'Transaction_Id', label: 'Transaction ID' },
  { key: 'Transaction_Amount', label: 'Amount' },
  { key: 'Date_&_Time', label: 'Date' },
  { key: 'Status', label: 'Status' },
]

function formatDateForApi(dateValue) {
  if (!dateValue) {
    return ''
  }

  const [year, month, day] = dateValue.split('-')
  if (!year || !month || !day) {
    return ''
  }

  return `${day}/${month}/${year}`
}

function getTodayInputValue() {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatInputDate(dateValue) {
  const year = dateValue.getFullYear()
  const month = String(dateValue.getMonth() + 1).padStart(2, '0')
  const day = String(dateValue.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getMonthDateRange(monthName) {
  const monthIndex = monthlyOptions.indexOf(monthName)

  if (monthIndex < 0) {
    return null
  }

  const today = new Date()
  const currentYear = today.getFullYear()

  return {
    startDate: formatInputDate(new Date(currentYear, monthIndex, 1)),
    endDate: formatInputDate(new Date(currentYear, monthIndex + 1, 0)),
  }
}

function getStoredUserDetailsRecord() {
  const storedUserDetails = window.sessionStorage.getItem(authStorageKeys.userDetails)

  if (!storedUserDetails) {
    return null
  }

  try {
    const parsedUserDetails = JSON.parse(storedUserDetails)

    if (Array.isArray(parsedUserDetails)) {
      return parsedUserDetails[0] ?? null
    }

    if (parsedUserDetails?.data && Array.isArray(parsedUserDetails.data)) {
      return parsedUserDetails.data[0] ?? null
    }

    return parsedUserDetails
  } catch (error) {
    console.error('[Reports] Failed to parse stored user details', error)
    return null
  }
}

function normalizeReportRows(rows) {
  return Array.isArray(rows) ? rows : []
}

function getErrorMessage(error, fallbackMessage) {
  return error?.statusDescription || error?.message || fallbackMessage
}

function escapeExcelCell(value) {
  const normalizedValue = String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

  return normalizedValue
}

function downloadReportRowsAsExcel(rows) {
  if (!rows.length) {
    return false
  }

  const tableHeaders = reportColumns
    .map((column) => `<th>${escapeExcelCell(column.label)}</th>`)
    .join('')

  const tableRows = rows
    .map(
      (row) =>
        `<tr>
          <td>${escapeExcelCell(rows.indexOf(row) + 1)}</td>
          ${reportColumns
            .map((column) => {
              if (column.key === 'Status') {
                return `<td>Received</td>`
              }
              return `<td>${escapeExcelCell(row?.[column.key] ?? '-')}</td>`
            })
            .join('')}
        </tr>`,
    )
    .join('')

  const htmlContent = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
      <head>
        <meta charset="UTF-8" />
      </head>
      <body>
        <table>
          <thead>
            <tr>${tableHeaders}</tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
      </body>
    </html>
  `

  const blob = new Blob([htmlContent], {
    type: 'application/vnd.ms-excel;charset=utf-8;',
  })
  const downloadUrl = window.URL.createObjectURL(blob)
  const downloadLink = document.createElement('a')
  downloadLink.href = downloadUrl
  downloadLink.download = 'cboi-reports.xls'
  document.body.appendChild(downloadLink)
  downloadLink.click()
  document.body.removeChild(downloadLink)
  window.URL.revokeObjectURL(downloadUrl)
  return true
}

async function fetchReports({ startDate, endDate, vpaId }) {
  const response = await fetch(apiConfig.reportsQuerySubmitUserEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      startDate,
      endDate,
      vpa_id: vpaId,
      mode: 'both',
    }),
  })

  const responseData = await response.json().catch(() => null)

  if (!response.ok) {
    const error = new Error(
      responseData?.statusDescription ||
      responseData?.message ||
      `API request failed with status ${response.status}`,
    )
    error.statusDescription = responseData?.statusDescription ?? ''
    throw error
  }

  return responseData
}

export function ReportsPage() {
  const todayInputValue = useMemo(() => getTodayInputValue(), [])
  const currentMonthIndex = useMemo(() => new Date().getMonth(), [])
  const [filterType, setFilterType] = useState('custom')
  const [searchValue, setSearchValue] = useState('')
  const [monthlySelection, setMonthlySelection] = useState(monthlyOptions[0])
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [currentPage, setCurrentPage] = useState(1)
  const [goToPageInput, setGoToPageInput] = useState('1')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const [selectedVpa, setSelectedVpa] = useState(() => {
    return window.sessionStorage.getItem(authStorageKeys.selectedVpa) || ''
  })
  const [reportResponse, setReportResponse] = useState(null)
  const [reportRows, setReportRows] = useState([])
  const [isFetchingReports, setIsFetchingReports] = useState(false)
  const [snackbarState, setSnackbarState] = useState({
    open: false,
    message: '',
    autoClose: true,
    colorType: 'danger',
  })  // Sync selectedVpa to sessionStorage
  useEffect(() => {
    if (selectedVpa) {
      window.sessionStorage.setItem(authStorageKeys.selectedVpa, selectedVpa)
    }
  }, [selectedVpa])
  // Fetch user details/VPAs on mount
  useEffect(() => {
    const storedUserDetails = window.sessionStorage.getItem(authStorageKeys.userDetails)
    if (storedUserDetails) {
      const parsed = JSON.parse(storedUserDetails)
      let records = Array.isArray(parsed) ? parsed : (parsed?.data ?? [])

      // Ensure hardcoded VPA is in the list
      if (!records.some(r => r.vpa_id === HARDCODED_VPA)) {
        records = [...records, { vpa_id: HARDCODED_VPA }]
      }

      if (records[0]?.vpa_id && !selectedVpa) {
        setSelectedVpa(records[0].vpa_id)
      }
    }
  }, [selectedVpa])

  const loadReports = async ({ nextStartDate, nextEndDate }) => {
    const vpaId = selectedVpa || getStoredUserDetailsRecord()?.vpa_id || ''

    if (!vpaId) {
      setReportResponse(null)
      setReportRows([])
      setSnackbarState({
        open: true,
        message: 'Unable to fetch reports',
        autoClose: true,
        colorType: 'danger',
      })
      return
    }

    try {
      setIsFetchingReports(true)

      const response = await fetchReports({
        startDate: formatDateForApi(nextStartDate),
        endDate: formatDateForApi(nextEndDate),
        vpaId,
      })

      console.log('[Reports] querysubmit_user response', response)
      setReportResponse(response)
      setReportRows(normalizeReportRows(response?.data))
      setCurrentPage(1)
      setGoToPageInput('1')
    } catch (error) {
      console.error('[Reports] Failed to fetch reports', error)
      setReportResponse(null)
      setReportRows([])
      setSnackbarState({
        open: true,
        message: getErrorMessage(error, 'Unable to fetch reports'),
        autoClose: true,
        colorType: 'danger',
      })
    } finally {
      setIsFetchingReports(false)
    }
  }

  useEffect(() => {
    if (filterType !== 'today') {
      return
    }

    setStartDate(todayInputValue)
    setEndDate(todayInputValue)
    loadReports({
      nextStartDate: todayInputValue,
      nextEndDate: todayInputValue,
    })
  }, [filterType, todayInputValue, selectedVpa])

  const filteredRows = useMemo(() => {
    const term = searchValue.trim().toLowerCase()

    if (!term) {
      return reportRows
    }

    return reportRows.filter((row) =>
      reportColumns.some(({ key }) => String(row?.[key] ?? '').toLowerCase().includes(term)),
    )
  }, [reportRows, searchValue])

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / rowsPerPage))

  useEffect(() => {
    setCurrentPage(1)
  }, [searchValue, rowsPerPage, reportRows])

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
      return
    }

    setGoToPageInput(String(currentPage))
  }, [currentPage, totalPages])

  const paginatedRows = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage
    return filteredRows.slice(startIndex, startIndex + rowsPerPage)
  }, [currentPage, filteredRows, rowsPerPage])

  const paginationItems = useMemo(() => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, index) => index + 1)
    }

    if (currentPage <= 3) {
      return [1, 2, 3, 'ellipsis', totalPages]
    }

    if (currentPage >= totalPages - 2) {
      return [1, 'ellipsis', totalPages - 2, totalPages - 1, totalPages]
    }

    return [1, 'ellipsis-left', currentPage, 'ellipsis-right', totalPages]
  }, [currentPage, totalPages])

  const handlePageChange = (page) => {
    if (page < 1 || page > totalPages) {
      return
    }

    setCurrentPage(page)
  }

  const handleGoToPageBlur = () => {
    const nextPage = Number(goToPageInput)

    if (Number.isNaN(nextPage)) {
      setGoToPageInput(String(currentPage))
      return
    }

    handlePageChange(nextPage)
  }

  const handleCustomSubmit = () => {
    if (!startDate || !endDate) {
      setSnackbarState({
        open: true,
        message: 'please choose start and end date',
        autoClose: true,
        colorType: 'warning',
      })
      return
    }

    loadReports({
      nextStartDate: startDate,
      nextEndDate: endDate,
    })
  }

  const handleMonthlySubmit = () => {
    const monthDateRange = getMonthDateRange(monthlySelection)

    if (!monthDateRange) {
      setSnackbarState({
        open: true,
        message: 'Select a valid month',
        autoClose: true,
        colorType: 'warning',
      })
      return
    }

    setStartDate(monthDateRange.startDate)
    setEndDate(monthDateRange.endDate)
    loadReports({
      nextStartDate: monthDateRange.startDate,
      nextEndDate: monthDateRange.endDate,
    })
  }

  const handleDownloadAll = () => {
    const hasDownloaded = downloadReportRowsAsExcel(reportRows)

    if (!hasDownloaded) {
      setSnackbarState({
        open: true,
        message: 'No report data available to download',
        autoClose: true,
        colorType: 'warning',
      })
    }
  }

  return (
    <section className="portal-section reports-page">
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

      <h1 className="portal-section__title">Transaction Reports</h1>

      <div className="reports-filter-card">
        <div className="reports-vpa-selector-group">
          <p className="reports-filter-card__label" style={{ marginBottom: 0 }}>VPA ID : <span style={{ fontWeight: '600', color: 'var(--portal-primary)' }}>{selectedVpa || 'Not Selected'}</span></p>
        </div>

        <p className="reports-filter-card__label">Select a Report Filter</p>

        <div className="reports-filter-card__options">
          <label className="reports-radio">
            <input
              checked={filterType === 'today'}
              name="report-filter"
              type="radio"
              onChange={() => setFilterType('today')}
            />
            <span>Today</span>
          </label>

          <label className="reports-radio">
            <input
              checked={filterType === 'monthly'}
              name="report-filter"
              type="radio"
              onChange={() => setFilterType('monthly')}
            />
            <span>Monthly</span>
          </label>

          <label className="reports-radio">
            <input
              checked={filterType === 'custom'}
              name="report-filter"
              type="radio"
              onChange={() => setFilterType('custom')}
            />
            <span>Custom Range</span>
          </label>
        </div>

        {filterType !== 'today' ? (
          <div className="reports-filter-card__controls">
            {filterType === 'monthly' ? (
              <label className="reports-input-group reports-input-group--wide">
                <span>Monthly Range</span>
                <select
                  value={monthlySelection}
                  onChange={(event) => setMonthlySelection(event.target.value)}
                >
                  {monthlyOptions.map((option, index) => (
                    <option key={option} value={option} disabled={index > currentMonthIndex}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <>
                <label className="reports-input-group">
                  <span>Start Date</span>
                  <input
                    type="date"
                    data-placeholder="DD/MM/YYYY"
                    className={!startDate ? "is-empty" : ""}
                    value={startDate}
                    onChange={(event) => setStartDate(event.target.value)}
                  />
                </label>

                <label className="reports-input-group">
                  <span>End Date</span>
                  <input
                    type="date"
                    data-placeholder="DD/MM/YYYY"
                    className={!endDate ? "is-empty" : ""}
                    value={endDate}
                    onChange={(event) => setEndDate(event.target.value)}
                  />
                </label>
              </>
            )}

            <button
              className="reports-action-button"
              type="button"
              onClick={
                filterType === 'custom'
                  ? handleCustomSubmit
                  : filterType === 'monthly'
                    ? handleMonthlySubmit
                    : undefined
              }
              disabled={filterType !== 'custom' && filterType !== 'monthly'}
            >
              Submit
            </button>
          </div>
        ) : null}
      </div>

      <div className="reports-table-card">
        <LoaderOverlay open={isFetchingReports} inline />
        <div className="reports-table-card__toolbar">
          <label className="reports-search">
            <input
              type="search"
              placeholder="Search here..."
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
            />
          </label>

          <div className="reports-summary">
            <button
              className="reports-action-button reports-action-button--small"
              type="button"
              onClick={handleDownloadAll}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Download All
            </button>
          </div>
        </div>

        <div className="reports-table-wrapper">
          <table className="reports-table">
            <thead>
              <tr>
                <th>
                  <div className="reports-table__header-cell">
                    S. No.
                    <span className="reports-table__sort-icon">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m7 15 5 5 5-5M7 9l5-5 5 5"/></svg>
                    </span>
                  </div>
                </th>
                {reportColumns.map((column) => (
                  <th key={column.key}>
                    <div className="reports-table__header-cell">
                      {column.label}
                      <span className="reports-table__sort-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m7 15 5 5 5-5M7 9l5-5 5 5"/></svg>
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginatedRows.length ? (
                paginatedRows.map((row, index) => (
                  <tr key={`${row.Transaction_Id ?? 'row'}-${index}`}>
                    <td>{(currentPage - 1) * rowsPerPage + index + 1}</td>
                    {reportColumns.map((column) => (
                      <td key={column.key}>
                        {column.key === 'Status' ? (
                          <span className="reports-table__status reports-table__status--received">
                            Received
                          </span>
                        ) : column.key === 'Transaction_Amount' ? (
                          Number(row?.[column.key] || 0).toLocaleString('en-IN')
                        ) : (
                          String(row?.[column.key] ?? '-')
                        )}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={reportColumns.length + 1} className="reports-table__empty">
                    No report data available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="reports-table-card__footer">
          <div className="reports-table-card__meta">
            <span>Row per page</span>
            <select
              value={rowsPerPage}
              onChange={(event) => setRowsPerPage(Number(event.target.value))}
            >
              <option value="5">5</option>
              <option value="10">10</option>
              <option value="15">15</option>
            </select>
            <span>Go to</span>
            <input
              type="text"
              value={goToPageInput}
              onChange={(event) => setGoToPageInput(event.target.value)}
              onBlur={handleGoToPageBlur}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  handleGoToPageBlur()
                }
              }}
            />
          </div>

          <div className="reports-pagination">
            <button
              type="button"
              aria-label="Previous page"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              &lt;
            </button>

            {paginationItems.map((item, index) =>
              typeof item === 'number' ? (
                <button
                  key={`${item}-${index}`}
                  className={item === currentPage ? 'is-active' : ''}
                  type="button"
                  onClick={() => handlePageChange(item)}
                >
                  {item}
                </button>
              ) : (
                <span key={`${item}-${index}`}>...</span>
              ),
            )}

            <button
              type="button"
              aria-label="Next page"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              &gt;
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
