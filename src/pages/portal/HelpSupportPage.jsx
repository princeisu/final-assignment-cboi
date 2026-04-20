import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiConfig } from '../../config/apiConfig'
import { apiRequest } from '../../services/apiClient'
import { LoaderOverlay } from '../../components/ui/LoaderOverlay'
import { Snackbar } from '../../components/ui/Snackbar'

export function HelpSupportPage() {
  const navigate = useNavigate()
  const getTodayStr = () => new Date().toISOString().split('T')[0]
  const formatDateToDisplay = (dateStr) => {
    if (!dateStr) return 'N/A'
    const [year, month, day] = dateStr.split('T')[0].split('-')
    return `${day}-${month}-${year}`
  }

  const BackIcon = () => (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  )

  const CalendarIcon = () => (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )

  const ExportIcon = () => (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
    </svg>
  )

  const SearchIcon = () => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  )

  const MoreIcon = () => (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="5" r="1" />
      <circle cx="12" cy="12" r="1" />
      <circle cx="12" cy="19" r="1" />
    </svg>
  )

  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [ticketStatus, setTicketStatus] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [tickets, setTickets] = useState([])

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [queryForm, setQueryForm] = useState({
    reason: '',
    transactionId: '',
    description: '',
  })

  const [snackbarState, setSnackbarState] = useState({
    open: false,
    message: '',
    autoClose: true,
    colorType: 'warning',
  })

  const [openActionMenu, setOpenActionMenu] = useState(null)
  const actionMenuRef = useRef(null)

  const [replyText, setReplyText] = useState('')
  const [isResultModalOpen, setIsResultModalOpen] = useState(false)
  const [modalType, setModalType] = useState('success')
  const [modalMessage, setModalMessage] = useState('')
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false)
  const [isReopenModalOpen, setIsReopenModalOpen] = useState(false)
  const [selectedTicket, setSelectedTicket] = useState(null)
  const [closeModalRemark, setCloseModalRemark] = useState('')
  const [isClosing, setIsClosing] = useState(false)
  const [isReopening, setIsReopening] = useState(false)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (actionMenuRef.current && !actionMenuRef.current.contains(e.target)) {
        setOpenActionMenu(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Hydrate from session storage on mount
  useEffect(() => {
    const cachedData = window.sessionStorage.getItem('help_support_cache')
    if (cachedData) {
      try {
        const { startDate: s, endDate: e, ticketStatus: st, tickets: t } = JSON.parse(cachedData)
        if (s) setStartDate(s)
        if (e) setEndDate(e)
        if (st) setTicketStatus(st)
        if (t) setTickets(t)
      } catch (err) {
        console.error('Failed to parse help support cache', err)
      }
    } else {
      // If no cache, we can still try silent fetch but it might fail without dates
      handleFilterSubmit(true)
    }
  }, [])

  const handleSnackbarClose = () => {
    setSnackbarState((current) => ({
      ...current,
      open: false,
    }))
  }

  const handleInputChange = (field, value) => {
    setQueryForm(prev => ({ ...prev, [field]: value }))
  }

  const handleReset = () => {
    setStartDate('')
    setEndDate('')
    setTicketStatus('all')
    setSearchTerm('')
    setTickets([])
    window.sessionStorage.removeItem('help_support_cache')
  }

  const handleFilterSubmit = async (silent = false) => {
    if (!startDate || !endDate) {
      if (!silent) {
        setSnackbarState({
          open: true,
          message: 'Please choose start and end date',
          autoClose: true,
          colorType: 'warning',
        })
      }
      return
    }

    try {
      setIsLoading(true)
      const payload = {
        status: ticketStatus || 'all',
        created_after: startDate,
        created_before: endDate,
      }

      const response = await apiRequest(apiConfig.filterTicketsEndpoint, {
        method: 'POST',
        body: JSON.stringify(payload)
      })

      const fetchedTickets = response?.data?.tickets || response?.tickets || response?.data || []
      const ticketArray = Array.isArray(fetchedTickets) ? fetchedTickets : []
      setTickets(ticketArray)

      // Save to cache
      window.sessionStorage.setItem('help_support_cache', JSON.stringify({
        startDate,
        endDate,
        ticketStatus,
        tickets: ticketArray
      }))

      if (!silent) {
        if (ticketArray.length > 0) {
          setSnackbarState({
            open: true,
            message: 'Tickets fetched successfully',
            autoClose: true,
            colorType: 'success'
          })
        } else {
          setSnackbarState({
            open: true,
            message: response.statusdesc || 'No tickets found for selected range',
            autoClose: true,
            colorType: 'info'
          })
        }
      }
    } catch (error) {
      console.error('[HelpSupport] Filter Tickets Error', error)
      if (!silent) {
        setSnackbarState({
          open: true,
          message: error.message || 'Failed to fetch tickets',
          autoClose: true,
          colorType: 'danger'
        })
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleModalSubmit = async () => {
    if (!queryForm.reason || !queryForm.description) {
      setSnackbarState({
        open: true,
        message: 'Please fill in all mandatory fields (Reason & Description)',
        autoClose: true,
        colorType: 'warning',
      })
      return
    }

    try {
      setIsSubmitting(true)
      const payload = {
        body: queryForm.description,
        custom_fields: [
          { id: 900013325983, value: queryForm.reason },
          { id: 32240028334873, value: 'qr' },
          { id: 32240169914009, value: 'damaged_qr' },
          { id: 900013326003, value: queryForm.description }
        ],
        subject: queryForm.reason,
        ticket_form_id: 47501075391257
      }

      const response = await apiRequest(apiConfig.createTicketEndpoint, {
        method: 'POST',
        body: JSON.stringify(payload)
      })

      setSnackbarState({
        open: true,
        message: response.statusdesc || 'Ticket raised successfully',
        autoClose: true,
        colorType: 'success'
      })
      setIsModalOpen(false)
      setQueryForm({ reason: '', transactionId: '', description: '' })
      handleFilterSubmit(true)
    } catch (error) {
      setSnackbarState({
        open: true,
        message: error.message || 'Failed to raise ticket',
        autoClose: true,
        colorType: 'danger'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleExportCSV = () => {
    if (!tickets || tickets.length === 0) {
      setSnackbarState({
        open: true,
        message: 'No tickets to export',
        autoClose: true,
        colorType: 'warning',
      })
      return
    }

    try {
      // Define CSV headers
      const headers = ['SERIAL NUMBER', 'REGISTERED MOBILE NUMBER', 'ISSUE TYPE', 'ISSUE SUB TYPE', 'SUBJECT', 'CREATED DATE']

      // Convert tickets to CSV rows
      const rows = tickets.map(ticket => [
        ticket.serial_number || '12934508',
        ticket.mobile_number || '9348781833',
        ticket.issue_type || 'QR',
        ticket.issue_sub_type || 'Damaged Qr',
        ticket.subject || 'Other',
        formatDateToDisplay(ticket.created_at || startDate)
      ])

      // Create CSV content
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n')

      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)

      link.setAttribute('href', url)
      link.setAttribute('download', `tickets_${new Date().toISOString().split('T')[0]}.csv`)
      link.style.visibility = 'hidden'

      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      setSnackbarState({
        open: true,
        message: `Exported ${tickets.length} tickets successfully`,
        autoClose: true,
        colorType: 'success',
      })
    } catch (error) {
      console.error('[HelpSupport] CSV Export Error:', error)
      setSnackbarState({
        open: true,
        message: 'Failed to export CSV',
        autoClose: true,
        colorType: 'danger',
      })
    }
  }

  const handleCloseTicket = async (ticketId) => {
    console.log('[HelpSupport] handleCloseTicket triggered for ID:', ticketId)
    setOpenActionMenu(null)
    setIsLoading(true)

    try {
      const response = await apiRequest(apiConfig.closeTicketEndpoint, {
        method: 'POST',
        body: JSON.stringify({
          ticket_id: Number(ticketId),
        }),
      })

      console.log('[HelpSupport] Close Ticket Response:', response)

      if (response?.statusCode === 0 || response?.status === 'SUCCESS') {
        setModalType('success')
        setModalMessage(response?.statusDesc || 'Ticket closed successfully!!')
        setIsResultModalOpen(true)
        // Refresh ticket list to show updated status
        handleFilterSubmit(true)
      } else {
        setModalType('error')
        setModalMessage(response?.statusDesc || 'Failed to close ticket')
        setIsResultModalOpen(true)
      }
    } catch (error) {
      console.error('[HelpSupport] Close Ticket Error:', error)
      setModalType('error')
      setModalMessage('An error occurred while closing the ticket')
      setIsResultModalOpen(true)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDownloadTicket = async (ticketId) => {
    let userName = ''
    try {
      const profileData = window.sessionStorage.getItem('cboi-oidc-profile-data')
      if (profileData) {
        const parsed = JSON.parse(profileData)
        userName = parsed.user_name || parsed.username || parsed.name || ''
      }
    } catch (e) {
      console.error('Failed to get user info', e)
    }

    console.log('[HelpSupport] handleDownloadTicket triggered for ID:', ticketId)
    setOpenActionMenu(null)
    setIsLoading(true)

    try {
      const downloadUrl = `${apiConfig.downloadTicketEndpoint}?ticket_id=${ticketId}&user_name=${userName}`
      
      // Per request: No authorization and use GET method
      const response = await fetch(downloadUrl, { 
        method: 'GET' 
      })

      if (response.ok) {
        const contentType = response.headers.get('content-type') || ''
        if (contentType.includes('application/json')) {
          const json = await response.json()
          const fileData = json?.data?.file_url || json?.file_url || json?.data

          if (fileData && typeof fileData === 'string' && fileData.startsWith('http')) {
            window.open(fileData, '_blank')
          } else if (json?.data?.base64 || (typeof json?.data === 'string' && json.data.length > 100)) {
            const link = document.createElement('a')
            const base64Data = json?.data?.base64 || json?.data || json
            link.href = `data:application/pdf;base64,${base64Data}`
            link.download = `Ticket_${ticketId}.pdf`
            link.click()
          } else {
            throw new Error('No valid download data found in response')
          }
        } else {
          // Handle direct binary response
          const blob = await response.blob()
          const url = window.URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `Ticket_${ticketId}.pdf`
          document.body.appendChild(a)
          a.click()
          window.URL.revokeObjectURL(url)
          document.body.removeChild(a)
        }
      } else {
        throw new Error(`Download failed with status ${response.status}`)
      }
    } catch (error) {
      console.error('[HelpSupport] Download Ticket Error:', error)
      setSnackbarState({
        open: true,
        message: 'Error initiating download. Please try again later.',
        autoClose: true,
        colorType: 'danger'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenCloseModal = (ticket) => {
    setSelectedTicket(ticket)
    setCloseModalRemark('')
    setIsCloseModalOpen(true)
    setOpenActionMenu(null)
  }

  const handleConfirmCloseTicket = async () => {
    if (!selectedTicket || !closeModalRemark.trim()) return

    try {
      setIsClosing(true)
      const response = await apiRequest(apiConfig.closeTicketEndpoint, {
        method: 'POST',
        body: JSON.stringify({
          ticket_id: parseInt(selectedTicket.id),
          remarks: closeModalRemark
        })
      })

      if (response?.statusCode === 0 || response?.status === 'SUCCESS') {
        setIsCloseModalOpen(false)
        setCloseModalRemark('')
        setModalType('success')
        setModalMessage(response.statusDesc || 'Ticket closed succesfully!!')
        setIsResultModalOpen(true)
        handleFilterSubmit(true)
      } else {
        setIsCloseModalOpen(false)
        setModalType('error')
        setModalMessage(response?.statusDesc || response?.status_desc || 'Failed to close ticket')
        setIsResultModalOpen(true)
      }
    } catch (error) {
      console.error('[HelpSupport] Failed to close ticket', error)
      setIsCloseModalOpen(false)
      setModalType('error')
      setModalMessage('Error closing ticket. Please try again.')
      setIsResultModalOpen(true)
    } finally {
      setIsClosing(false)
    }
  }

  const handleOpenReopenModal = (ticket) => {
    setSelectedTicket(ticket)
    setCloseModalRemark('') // Clear remark for new action
    setIsReopenModalOpen(true)
    setOpenActionMenu(null)
  }

  const handleConfirmReopenTicket = async () => {
    if (!selectedTicket || !closeModalRemark.trim()) return

    try {
      setIsReopening(true)
      const response = await apiRequest(apiConfig.reopenTicketEndpoint, {
        method: 'POST',
        body: JSON.stringify({
          ticket_id: parseInt(selectedTicket.id),
          remarks: closeModalRemark
        })
      })

      if (response?.statusCode === 0 || response?.status === 'SUCCESS') {
        setIsReopenModalOpen(false)
        setCloseModalRemark('')
        setModalType('success')
        setModalMessage(response?.statusDesc || 'Ticket reopened successfully!!')
        setIsResultModalOpen(true)
        handleFilterSubmit(true)
      } else {
        setIsReopenModalOpen(false)
        setModalType('error')
        setModalMessage(response?.statusDesc || 'Failed to reopen ticket')
        setIsResultModalOpen(true)
      }
    } catch (error) {
      console.error('[HelpSupport] Reopen Ticket Error:', error)
      setIsReopenModalOpen(false)
      setModalType('error')
      setModalMessage('An error occurred while reopening the ticket')
      setIsResultModalOpen(true)
    } finally {
      setIsReopening(false)
    }
  }

  const handleReopenTicket = async (ticketId) => {
    console.log('[HelpSupport] handleReopenTicket triggered for ID:', ticketId)
    setOpenActionMenu(null)
    setIsLoading(true)

    try {
      const response = await apiRequest(apiConfig.reopenTicketEndpoint, {
        method: 'POST',
        body: JSON.stringify({
          ticket_id: Number(ticketId),
        }),
      })

      if (response?.statusCode === 0 || response?.status === 'SUCCESS') {
        setModalType('success')
        setModalMessage(response?.statusDesc || 'Ticket reopened successfully!!')
        setIsResultModalOpen(true)
        handleFilterSubmit(true)
      } else {
        setModalType('error')
        setModalMessage(response?.statusDesc || 'Failed to reopen ticket')
        setIsResultModalOpen(true)
      }
    } catch (error) {
      console.error('[HelpSupport] Reopen Ticket Error:', error)
      setModalType('error')
      setModalMessage('An error occurred while reopening the ticket')
      setIsResultModalOpen(true)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <section className="portal-section help-support-page">
      <LoaderOverlay open={isSubmitting} inline text="Raising Ticket..." />
      <LoaderOverlay open={isLoading} inline text="Fetching Tickets..." />
      <Snackbar
        open={snackbarState.open}
        message={snackbarState.message}
        autoClose={snackbarState.autoClose}
        colorType={snackbarState.colorType}
        duration={3000}
        onClose={handleSnackbarClose}
      />

      <div className="help-support-header v3">
        <h1 className="portal-section__title">Help & Support</h1>
      </div>

      <div className="help-support-subheader">
        <button className="back-button" onClick={() => window.history.back()}>
          <BackIcon />
        </button>
        <h2 className="help-support-subheader__title">View Tickets</h2>
      </div>

      <div className="help-support-filter-row-top">
        <div className="filter-item">
          <label>Start Date</label>
          <div className="filter-input-wrapper">
            <input
              type="date"
              data-placeholder="DD/MM/YYYY"
              className={!startDate ? "is-empty" : ""}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
        </div>
        <div className="filter-item">
          <label>End Date</label>
          <div className="filter-input-wrapper">
            <input
              type="date"
              data-placeholder="DD/MM/YYYY"
              className={!endDate ? "is-empty" : ""}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>
        <div className="filter-item">
          <label>Ticket Status</label>
          <div className="filter-input-wrapper">
            <select value={ticketStatus} onChange={(e) => setTicketStatus(e.target.value)}>
              <option value="all">All</option>
              <option value="new">New</option>
              <option value="open">Open</option>
              <option value="pending">Pending</option>
              <option value="solved">Solved</option>
              <option value="closed">Closed</option>
            </select>
          </div>
        </div>
        <div className="filter-actions-main">
          <button className="btn-reset" onClick={handleReset}>Reset</button>
          <button className="btn-submit" onClick={() => handleFilterSubmit()}>Submit</button>
        </div>
      </div>

      <div className="help-support-filter-row-bottom">
        <div className="search-bar-new">
          <SearchIcon />
          <input
            type="text"
            placeholder="Search Here"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button className="btn-export-new" onClick={handleExportCSV}>
          <span>Export To CSV</span>
          <ExportIcon />
        </button>
      </div>

      <div className="help-support-table-card">
        <div className="help-support-table-container">
          <table className="help-support-table-v4">
            <thead>
              <tr>
                <th>Ticket ID</th>
                <th>VPA ID</th>
                <th>Device Serial Number</th>
                <th>Issue Type</th>
                <th>Issue Sub Type</th>
                <th>Subject</th>
                <th>Created Date</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {tickets.length > 0 ? (
                tickets.map((ticket, index) => (
                  <tr key={ticket.id || index}>
                    <td>{ticket.id || '372817'}</td>
                    <td>{ticket.vpa_id || '87288268@cnrb'}</td>
                    <td>{ticket.serial_number || '738978927897923'}</td>
                    <td>{ticket.issue_type || 'QR'}</td>
                    <td>{ticket.issue_sub_type || 'Damaged QR'}</td>
                    <td>{ticket.subject || 'Damaged QR'}</td>
                    <td>{formatDateToDisplay(ticket.created_at || startDate)}</td>
                    <td>
                      <span className={`status-pill status--${(ticket.status || 'solved').toLowerCase()}`}>
                        <span className="status-dot"></span>
                        {ticket.status || 'Solved'}
                      </span>
                    </td>
                    <td style={{ position: 'relative' }}>
                      <div ref={openActionMenu === index ? actionMenuRef : null} style={{ display: 'inline-block', position: 'relative' }}>
                        <button
                          className="action-more-btn"
                          onClick={() => setOpenActionMenu(openActionMenu === index ? null : index)}
                        >
                          <MoreIcon />
                        </button>
                        {openActionMenu === index && (
                          <div className="action-dropdown">
                          <button className="action-dropdown__item" onClick={() => {
                            setOpenActionMenu(null)
                            navigate(`/help-support/ticket/${ticket.id || '352355'}`)
                          }}>
                            <span className="action-dropdown__icon action-dropdown__icon--doc">
                              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                <polyline points="14 2 14 8 20 8" />
                                <line x1="16" y1="13" x2="8" y2="13" />
                                <line x1="16" y1="17" x2="8" y2="17" />
                                <polyline points="10 9 9 9 8 9" />
                              </svg>
                            </span>
                            <span>View Details</span>
                          </button>
                          <button className="action-dropdown__item" onClick={() => handleDownloadTicket(ticket.id || '372817')}>
                            <span className="action-dropdown__icon action-dropdown__icon--download">
                              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                <polyline points="7 10 12 15 17 10" />
                                <line x1="12" y1="15" x2="12" y2="3" />
                              </svg>
                            </span>
                            <span>Download</span>
                          </button>
                          {(ticket.status || '').toLowerCase() === 'solved' && (
                            <button
                              className="action-dropdown__item"
                              onClick={() => handleOpenReopenModal(ticket)}
                            >
                              <span className="action-dropdown__icon action-dropdown__icon--reopen">●</span>
                              <span>Reopen</span>
                            </button>
                          )}
                          {(ticket.status || '').toLowerCase() !== 'closed' && (
                            <button
                              className="action-dropdown__item action-dropdown__item--danger"
                              onClick={() => handleOpenCloseModal(ticket)}
                            >
                              <span className="action-dropdown__icon action-dropdown__icon--close">
                                <svg viewBox="0 0 24 24" width="18" height="18" fill="#ef4444">
                                  <circle cx="12" cy="12" r="10" />
                                  <line x1="15" y1="9" x2="9" y2="15" stroke="white" strokeWidth="2" strokeLinecap="round" />
                                  <line x1="9" y1="9" x2="15" y2="15" stroke="white" strokeWidth="2" strokeLinecap="round" />
                                </svg>
                              </span>
                              <span>Close</span>
                            </button>
                          )}
                        </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                    No tickets found for selected range.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="help-modal-overlay">
          <div className="help-modal">
            <div className="help-modal__header">
              <h2>Raise a Query</h2>
            </div>
            <div className="help-modal__body">
              <div className="modal-field">
                <label>Reason</label>
                <select value={queryForm.reason} onChange={(e) => handleInputChange('reason', e.target.value)}>
                  <option value="">Please Select Reason</option>
                  <option value="Billing Issue">Billing Issue</option>
                  <option value="Technical Support">Technical Support</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="modal-field">
                <label>Transaction ID</label>
                <input type="text" placeholder="Enter the Transaction ID" value={queryForm.transactionId} onChange={(e) => handleInputChange('transactionId', e.target.value)} />
              </div>
              <div className="modal-field">
                <label>Description</label>
                <textarea placeholder="Any additional details..." rows="4" value={queryForm.description} onChange={(e) => handleInputChange('description', e.target.value)} />
              </div>
            </div>
            <div className="help-modal__footer">
              <button className="modal-cancel-btn" onClick={() => setIsModalOpen(false)}>Cancel</button>
              <button className="reports-action-button" onClick={handleModalSubmit} disabled={isSubmitting}>
                {isSubmitting ? 'Submitting...' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      )}

      {isResultModalOpen && (
        <div className="language-update-modal-overlay" role="presentation">
          <div
            className="language-update-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ticket-close-result-title"
          >
            <div className="language-update-modal__body">
              <h2 id="ticket-close-result-title" className="language-update-modal__title" style={{ marginBottom: '24px' }}>
                {modalMessage}
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
              <button
                className="ui-button"
                style={{
                  padding: '10px 32px',
                  background: '#1658a0',
                  color: 'white',
                  borderRadius: '6px',
                  fontWeight: '600',
                  border: 'none',
                  cursor: 'pointer'
                }}
                type="button"
                onClick={() => setIsResultModalOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Close Ticket Form Modal */}
      {isCloseModalOpen && (
        <div className="language-update-modal-overlay">
          <div className="close-ticket-form-modal" style={{ position: 'relative' }}>
            <LoaderOverlay open={isClosing} text="Closing ticket..." inline />
            <h2 className="close-form-title">Close Ticket?</h2>

            <div className="close-form-summary">
              <div className="summary-header">Ticket ID: #{selectedTicket?.id || 'N/A'}</div>
              <div className="summary-grid">
                <div className="summary-item-inline">
                  <label>Issue Type</label>
                  <span>{selectedTicket?.issue_type || 'N/A'}</span>
                </div>
                <div className="summary-item-inline">
                  <label>Ticket Created Date</label>
                  <span>{selectedTicket?.created_at ? formatDateToDisplay(selectedTicket.created_at) : 'N/A'}</span>
                </div>
                <div className="summary-item-inline">
                  <label>Issue Sub Type</label>
                  <span>{selectedTicket?.issue_sub_type || 'N/A'}</span>
                </div>
                <div className="summary-item-inline">
                  <label>Status</label>
                  <span className="status-text-red">{selectedTicket?.status || 'Open'}</span>
                </div>
              </div>
            </div>

            <div className="remark-form-field">
              <label>Remark<span>*</span></label>
              <textarea
                placeholder="Enter Your Remarks"
                value={closeModalRemark}
                onChange={(e) => setCloseModalRemark(e.target.value)}
              />
            </div>

            <div className="close-form-actions">
              <button className="btn-submit-close" onClick={handleConfirmCloseTicket} disabled={isClosing}>Close Ticket</button>
              <button className="btn-cancel-close" onClick={() => setIsCloseModalOpen(false)} disabled={isClosing}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Reopen Ticket Form Modal */}
      {isReopenModalOpen && (
        <div className="language-update-modal-overlay">
          <div className="close-ticket-form-modal" style={{ position: 'relative' }}>
            <LoaderOverlay open={isReopening} text="Reopening ticket..." inline />
            <h2 className="close-form-title">Reopen Ticket?</h2>

            <div className="close-form-summary">
              <div className="summary-header">Ticket ID: #{selectedTicket?.id || 'N/A'}</div>
              <div className="summary-grid">
                <div className="summary-item-inline">
                  <label>Issue Type</label>
                  <span>{selectedTicket?.issue_type || 'N/A'}</span>
                </div>
                <div className="summary-item-inline">
                  <label>Ticket Created Date</label>
                  <span>{selectedTicket?.created_at ? formatDateToDisplay(selectedTicket.created_at) : 'N/A'}</span>
                </div>
                <div className="summary-item-inline">
                  <label>Issue Sub Type</label>
                  <span>{selectedTicket?.issue_sub_type || 'N/A'}</span>
                </div>
                <div className="summary-item-inline">
                  <label>Status</label>
                  <span className="status-pill status--solved" style={{ padding: '0 8px', fontSize: '0.65rem' }}>{selectedTicket?.status || 'Solved'}</span>
                </div>
              </div>
            </div>

            <div className="remark-form-field">
              <label>Remark<span>*</span></label>
              <textarea
                placeholder="Enter Your Remarks"
                value={closeModalRemark}
                onChange={(e) => setCloseModalRemark(e.target.value)}
              />
            </div>

            <div className="close-form-actions">
              <button className="btn-submit-close" onClick={handleConfirmReopenTicket} disabled={isReopening}>Reopen Ticket</button>
              <button className="btn-cancel-close" onClick={() => setIsReopenModalOpen(false)} disabled={isReopening}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Result Status Modal */}
      {isResultModalOpen && (
        <div className="language-update-modal-overlay">
          <div className="language-update-modal">
            <div className="language-update-modal__body">
              <h2 className="language-update-modal__title">{modalMessage}</h2>
              <div className={`language-update-modal__icon ${modalType === 'error' ? 'language-update-modal__icon--error' : ''}`}>
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
              <button className="ui-button" onClick={() => setIsResultModalOpen(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
