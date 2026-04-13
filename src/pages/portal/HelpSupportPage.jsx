import { useState, useEffect } from 'react'
import { apiConfig } from '../../config/apiConfig'
import { apiRequest } from '../../services/apiClient'
import { LoaderOverlay } from '../../components/ui/LoaderOverlay'
import { Snackbar } from '../../components/ui/Snackbar'

export function HelpSupportPage() {
  const getTodayStr = () => new Date().toISOString().split('T')[0]
  const formatDateToDisplay = (dateStr) => {
    if (!dateStr) return 'N/A'
    const [year, month, day] = dateStr.split('T')[0].split('-')
    return `${day}-${month}-${year}`
  }

  const [startDate, setStartDate] = useState(getTodayStr())
  const [endDate, setEndDate] = useState(getTodayStr())
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

  // Fetch tickets on mount
  useEffect(() => {
    handleFilterSubmit(true)
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
    setStartDate(getTodayStr())
    setEndDate(getTodayStr())
    setTicketStatus('all')
    setSearchTerm('')
    // Optionally fetch defaults
    handleFilterSubmit(true)
  }

  const handleFilterSubmit = async (silent = false) => {
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

  return (
    <section className="portal-section help-support-page">
      <LoaderOverlay open={isLoading || isSubmitting} text={isLoading ? "Loading Tickets..." : "Raising Ticket..."} />
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

      <div className="help-support-panel v3">
        <div className="help-support-filters-v3">
          <div className="filter-row">
            <div className="filter-group">
              <label>Select Status</label>
              <select value={ticketStatus} onChange={(e) => setTicketStatus(e.target.value)}>
                <option value="all">ALL</option>
                <option value="new">New</option>
                <option value="open">Open</option>
                <option value="pending">Pending</option>
                <option value="solved">Solved</option>
                <option value="closed">Closed</option>
              </select>
            </div>
            <div className="filter-group">
              <label>Start Date</label>
              <div className="date-input-wrapper">
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
            </div>
            <div className="filter-group">
              <label>End Date</label>
              <div className="date-input-wrapper">
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </div>
            <div className="filter-actions-v3">
              <button className="reports-action-button v3-submit" onClick={() => handleFilterSubmit()}>Submit</button>
              <button className="reports-action-button v3-reset" onClick={handleReset}>Reset</button>
            </div>
          </div>

          <div className="search-row-v3">
            <div className="search-input-v3">
              <input 
                type="text" 
                placeholder="Search ticket" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>
            <button className="export-csv-btn" onClick={handleExportCSV}>
              Export To CSV
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
            </button>
          </div>
        </div>

        <div className="help-support-table-container">
          <table className="help-support-table v3">
            <thead>
              <tr>
                <th>SERIAL NUMBER</th>
                <th>REGISTERED MOBILE NUMBER</th>
                <th>ISSUE TYPE</th>
                <th>ISSUE SUB TYPE</th>
                <th>SUBJECT</th>
                <th>CREATED DATE</th>
              </tr>
            </thead>
            <tbody>
              {tickets.length > 0 ? (
                tickets.map((ticket, index) => (
                  <tr key={index}>
                    <td>{ticket.serial_number || '12934508'}</td>
                    <td>{ticket.mobile_number || '9348781833'}</td>
                    <td>{ticket.issue_type || 'QR'}</td>
                    <td>{ticket.issue_sub_type || 'Damaged Qr'}</td>
                    <td>{ticket.subject || 'Other'}</td>
                    <td>{formatDateToDisplay(ticket.created_at || startDate)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                   <td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
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
    </section>
  )
}
