import { useParams, useNavigate } from 'react-router-dom'
import { useState, useEffect, useCallback } from 'react'
import { apiConfig, getStaticPassKeyHeader } from '../../config/apiConfig'
import { apiRequest } from '../../services/apiClient'
import { getAuthorizationHeader } from '../../services/authService'
import { LoaderOverlay } from '../../components/ui/LoaderOverlay'

export function TicketDetailsPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [comments, setComments] = useState([])
  const [ticketData, setTicketData] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [isResultModalOpen, setIsResultModalOpen] = useState(false)
  const [modalType, setModalType] = useState('success')
  const [modalMessage, setModalMessage] = useState('')
  const [showAllMessages, setShowAllMessages] = useState(false)
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false)
  const [closeModalRemark, setCloseModalRemark] = useState('')
  const [isClosing, setIsClosing] = useState(false)
  const [isReopenModalOpen, setIsReopenModalOpen] = useState(false)
  const [isReopening, setIsReopening] = useState(false)
  const VISIBLE_COUNT = 2

  const BackIcon = () => (
    <div className="back-icon-circle">
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="19" y1="12" x2="5" y2="12"></line>
        <polyline points="12 19 5 12 12 5"></polyline>
      </svg>
    </div>
  )

  const FlagIcon = () => (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path>
      <line x1="4" y1="22" x2="4" y2="15"></line>
    </svg>
  )

  const SendIcon = () => (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
      <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"></path>
    </svg>
  )

  const AttachmentIcon = () => (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
    </svg>
  )

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A'
    const date = new Date(dateStr)
    return date.toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })
  }

  const fetchTicketDetails = useCallback(async (showLoader = true) => {
    if (!id) return
    if (showLoader) setIsLoading(true)
    try {
      const response = await apiRequest(apiConfig.viewTicketEndpoint, {
        method: 'POST',
        body: JSON.stringify({
          ticket_id: parseInt(id)
        })
      })

      if (response?.statusCode === 0 || response?.status === 'SUCCESS') {
        setTicketData(response.data || response)
      }
    } catch (error) {
      console.error('[Ticket Details] Failed to fetch ticket details', error)
    } finally {
      if (showLoader) setIsLoading(false)
    }
  }, [id])

  const fetchComments = useCallback(async () => {
    if (!id) return
    try {
      const response = await apiRequest(apiConfig.fetchCommentsEndpoint, {
        method: 'POST',
        body: JSON.stringify({
          ticket_id: parseInt(id)
        })
      })

      if (response?.statusCode === 0 || response?.status === 'SUCCESS') {
        const fetchedComments = response.data || []
        setComments([...fetchedComments].reverse())
      }
    } catch (error) {
      console.error('[Ticket Details] Failed to fetch comments', error)
    }
  }, [id])

  useEffect(() => {
    fetchTicketDetails()
    fetchComments()
  }, [fetchTicketDetails, fetchComments])

  const handleDownloadTicket = async () => {
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

    try {
      setIsLoading(true, false)
      const downloadUrl = `${apiConfig.downloadTicketEndpoint}?ticket_id=${id}&user_name=${userName}`

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
            link.download = `Ticket_${id}.pdf`
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
          a.download = `Ticket_${id}.pdf`
          document.body.appendChild(a)
          a.click()
          window.URL.revokeObjectURL(url)
          document.body.removeChild(a)
        }
      } else {
        throw new Error(`Download failed with status ${response.status}`)
      }
    } catch (error) {
      console.error('[TicketDetails] Download error:', error)
      setModalType('error')
      setModalMessage('Error initiating download. Please try again later.')
      setIsResultModalOpen(true)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSendMessage = async () => {
    if (!replyText.trim()) return
    if (isSending) return

    // Get current user info for optimistic update
    let currentUsername = 'User'
    try {
      const profileData = window.sessionStorage.getItem('cboi-oidc-profile-data')
      if (profileData) {
        const parsed = JSON.parse(profileData)
        currentUsername = parsed.user_name || parsed.username || parsed.name || 'User'
      }
    } catch (e) {
      console.error('Failed to get user info', e)
    }

    const newMessage = {
      username: currentUsername,
      body: replyText,
      created_at: new Date().toISOString(),
      attachments: []
    }

    // Optimistically add to UI
    setComments(prev => [...prev, newMessage])
    const textToSend = replyText
    setReplyText('')
    setIsSending(true)

    try {
      const response = await apiRequest(apiConfig.createCommentEndpoint, {
        method: 'POST',
        body: JSON.stringify({
          ticket_id: parseInt(id),
          body: textToSend,
          attachmentURL: "",
          attachmentName: ""
        })
      })

      if (response?.statusCode === 0 || response?.status === 'SUCCESS') {
        // Refresh to get server-side details (like real timestamp/id)
        fetchComments()
      }
    } catch (error) {
      console.error('[Ticket Details] Failed to create comment', error)
      // Optionally handle failure (e.g. remove the optimistic message)
    } finally {
      setIsSending(false)
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSendMessage()
    }
  }

  const handleConfirmCloseTicket = async () => {
    if (!closeModalRemark.trim()) return

    try {
      setIsClosing(true)
      const response = await apiRequest(apiConfig.closeTicketEndpoint, {
        method: 'POST',
        body: JSON.stringify({
          ticket_id: parseInt(id),
          remarks: closeModalRemark
        })
      })

      if (response?.statusCode === 0 || response?.status === 'SUCCESS') {
        setIsCloseModalOpen(false)
        setCloseModalRemark('')
        setModalType('success')
        setModalMessage(response.statusDesc || 'Ticket closed succesfully!!')
        setIsResultModalOpen(true)
        fetchTicketDetails(false)
      } else {
        setIsCloseModalOpen(false)
        setModalType('error')
        setModalMessage(response?.statusDesc || response?.status_desc || 'Failed to close ticket')
        setIsResultModalOpen(true)
      }
    } catch (error) {
      console.error('[Ticket Details] Failed to close ticket', error)
      setIsCloseModalOpen(false)
      setModalType('error')
      setModalMessage('Error closing ticket. Please try again.')
      setIsResultModalOpen(true)
    } finally {
      setIsClosing(false)
    }
  }

  const handleConfirmReopenTicket = async () => {
    if (!closeModalRemark.trim()) return

    try {
      setIsReopening(true)
      const response = await apiRequest(apiConfig.reopenTicketEndpoint, {
        method: 'POST',
        body: JSON.stringify({
          ticket_id: parseInt(id),
          remarks: closeModalRemark
        }),
      })

      if (response?.statusCode === 0 || response?.status === 'SUCCESS') {
        setIsReopenModalOpen(false)
        setCloseModalRemark('')
        setModalType('success')
        setModalMessage(response?.statusDesc || 'Ticket reopened successfully!!')
        setIsResultModalOpen(true)
        fetchTicketDetails(false)
      } else {
        setIsReopenModalOpen(false)
        setModalType('error')
        setModalMessage(response?.statusDesc || 'Failed to reopen ticket')
        setIsResultModalOpen(true)
      }
    } catch (error) {
      console.error('[Ticket Details] Failed to reopen ticket', error)
      setIsReopenModalOpen(false)
      setModalType('error')
      setModalMessage('Error reopening ticket. Please try again.')
      setIsResultModalOpen(true)
    } finally {
      setIsReopening(false)
    }
  }

  let currentInitials = 'U'
  try {
    const profileData = window.sessionStorage.getItem('cboi-oidc-profile-data')
    if (profileData) {
      const parsed = JSON.parse(profileData)
      const name = parsed.user_name || parsed.username || parsed.name || 'User'
      currentInitials = name.split(' ').filter(Boolean).map(n => n[0]).join('').substring(0, 2).toUpperCase()
    }
  } catch (e) {
    console.error('Failed to get initials', e)
  }

  const displayedMessages = showAllMessages
    ? comments
    : comments.slice(Math.max(0, comments.length - VISIBLE_COUNT))

  return (
    <section className="portal-section ticket-details-page">
      <LoaderOverlay open={isLoading} text="Fetching details..." inline />

      <div className="help-support-header v3">
        <h1 className="portal-section__title" style={{ fontSize: '1rem', color: '#64748b', fontWeight: '500' }}>Help & Support</h1>
      </div>

      <div className="ticket-details-subheader">
        <div className="subheader-left">
          <button className="back-button" onClick={() => navigate('/help-support')}>
            <BackIcon />
          </button>
          <h2 className="help-support-subheader__title">View Details</h2>
        </div>
        <div className="subheader-right">
          <button className="btn-details-download" onClick={handleDownloadTicket}>Download</button>
          {(ticketData?.status || '').toLowerCase() === 'solved' && (
            <button className="btn-details-close" style={{ background: '#10b981 !important' }} onClick={() => setIsReopenModalOpen(true)}>Reopen Ticket</button>
          )}
          {(ticketData?.status || '').toLowerCase() !== 'closed' && (ticketData?.status || '').toLowerCase() !== 'solved' && (
            <button className="btn-details-close" onClick={() => setIsCloseModalOpen(true)}>Close Ticket</button>
          )}
        </div>
      </div>

      <div className="ticket-summary-card">
        <div className="ticket-summary__header">
          <FlagIcon />
          <span>Ticket ID: #{id || ticketData?.id || '352355'}</span>
        </div>

        <div className="ticket-summary__grid">
          <div className="summary-col">
            <div className="summary-item">
              <label>Issue Type</label>
              <span>{ticketData?.issue_type || 'N/A'}</span>
            </div>
            <div className="summary-item">
              <label>Issue Sub Type</label>
              <span>{ticketData?.issue_sub_type || 'N/A'}</span>
            </div>
            <div className="summary-item">
              <label>Ticket Created Date</label>
              <span>{ticketData?.created_at ? formatDate(ticketData.created_at) : 'N/A'}</span>
            </div>
            <div className="summary-item">
              <label>User Type</label>
              <span>{ticketData?.user_type || 'N/A'}</span>
            </div>
            <div className="summary-item">
              <label>Username</label>
              <span>{ticketData?.username || 'N/A'}</span>
            </div>
          </div>

          <div className="summary-col">
            <div className="summary-item">
              <label>VPA ID</label>
              <span>{ticketData?.vpa_id || 'N/A'}</span>
            </div>
            <div className="summary-item">
              <label>Device Serial Number</label>
              <span>{ticketData?.serial_number || 'N/A'}</span>
            </div>
            <div className="summary-item">
              <label>Status</label>
              <div className={`status-pill status--${(ticketData?.status || 'pending').toLowerCase()}`}>
                <span className="status-dot"></span>
                {ticketData?.status || 'Pending'}
              </div>
            </div>
            <div className="summary-item">
              <label>Registered Mobile Number</label>
              <span>{ticketData?.mobile || ticketData?.registered_mobile || 'N/A'}</span>
            </div>
            <div className="summary-item">
              <label>Registered Email ID</label>
              <span>{ticketData?.email || ticketData?.registered_email || 'N/A'}</span>
            </div>
          </div>

          <div className="summary-col description-col">
            <div className="summary-item">
              <label>Issue Description</label>
              <p className="summary-description-text">
                {ticketData?.subject || ticketData?.description || 'No description provided.'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="messages-section">
        <h3 className="messages-title">Messages</h3>

        {comments.length > VISIBLE_COUNT && !showAllMessages && (
          <div className="older-messages-container">
            <button className="btn-show-older" onClick={() => setShowAllMessages(true)}>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="18 15 12 9 6 15"></polyline>
              </svg>
              Show Older Messages
            </button>
          </div>
        )}

        <div className="messages-list">
          {comments.length === 0 && !isLoading && (
            <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8' }}>No messages found for this ticket.</div>
          )}
          {displayedMessages.map((comment, index) => {
            const isSupport = (comment.username || '').toLowerCase().includes('support')
            const initials = isSupport ? 'ST' : ((comment.username || '').split(' ').filter(Boolean).map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'U')

            return (
              <div key={index} className="message-wrapper">
                <div className="message-avatar">
                  <div className={`avatar-initials ${!isSupport ? 'user-avatar' : ''}`}>
                    {initials}
                  </div>
                </div>
                <div className="message-content">
                  <div className="message-header">
                    <span className="message-sender">{comment.username || 'System User'}</span>
                    <span className="message-time">{formatDate(comment.created_at)}</span>
                  </div>
                  <div className="message-bubble">
                    {comment.body}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="message-input-container">
          <div className="avatar-initials input-avatar user-avatar">{currentInitials}</div>
          <div className="input-wrapper">
            <input
              type="text"
              placeholder={(ticketData?.status || '').toLowerCase() === 'closed' ? "This ticket is closed" : "Reply here..."}
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isSending || (ticketData?.status || '').toLowerCase() === 'closed'}
            />
            <button
              className="btn-send-message"
              onClick={handleSendMessage}
              disabled={isSending || !replyText.trim() || (ticketData?.status || '').toLowerCase() === 'closed'}
            >
              <SendIcon />
            </button>
          </div>
        </div>
      </div>

      {/* Close Ticket Form Modal */}
      {isCloseModalOpen && (
        <div className="language-update-modal-overlay">
          <div className="close-ticket-form-modal" style={{ position: 'relative' }}>
            <LoaderOverlay open={isClosing} text="Closing ticket..." inline />
            <h2 className="close-form-title">Close Ticket?</h2>

            <div className="close-form-summary">
              <div className="summary-header">Ticket ID: #{id || ticketData?.id}</div>
              <div className="summary-grid">
                <div className="summary-item-inline">
                  <label>Issue Type</label>
                  <span>{ticketData?.issue_type || 'N/A'}</span>
                </div>
                <div className="summary-item-inline">
                  <label>Ticket Created Date</label>
                  <span>{ticketData?.created_at ? formatDate(ticketData.created_at) : 'N/A'}</span>
                </div>
                <div className="summary-item-inline">
                  <label>Issue Sub Type</label>
                  <span>{ticketData?.issue_sub_type || 'N/A'}</span>
                </div>
                <div className="summary-item-inline">
                  <label>Status</label>
                  <span className="status-text-red">{ticketData?.status || 'Open'}</span>
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
              <button className="btn-submit-close" onClick={handleConfirmCloseTicket} disabled={isLoading}>Close Ticket</button>
              <button className="btn-cancel-close" onClick={() => setIsCloseModalOpen(false)} disabled={isLoading}>Cancel</button>
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
      {/* Reopen Ticket Form Modal */}
      {isReopenModalOpen && (
        <div className="language-update-modal-overlay">
          <div className="close-ticket-form-modal" style={{ position: 'relative' }}>
            <LoaderOverlay open={isReopening} text="Reopening ticket..." inline />
            <h2 className="close-form-title">Reopen Ticket?</h2>

            <div className="close-form-summary">
              <div className="summary-header">Ticket ID: #{id || ticketData?.id}</div>
              <div className="summary-grid">
                <div className="summary-item-inline">
                  <label>Issue Type</label>
                  <span>{ticketData?.issue_type || 'N/A'}</span>
                </div>
                <div className="summary-item-inline">
                  <label>Ticket Created Date</label>
                  <span>{ticketData?.created_at ? formatDate(ticketData.created_at) : 'N/A'}</span>
                </div>
                <div className="summary-item-inline">
                  <label>Issue Sub Type</label>
                  <span>{ticketData?.issue_sub_type || 'N/A'}</span>
                </div>
                <div className="summary-item-inline">
                  <label>Status</label>
                  <span className="status-pill status--solved" style={{ padding: '0 8px', fontSize: '0.65rem' }}>{ticketData?.status || 'Solved'}</span>
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
    </section>
  )
}
