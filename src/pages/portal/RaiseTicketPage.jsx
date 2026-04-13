import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiConfig } from '../../config/apiConfig'
import { apiRequest } from '../../services/apiClient'
import { LoaderOverlay } from '../../components/ui/LoaderOverlay'
import { Snackbar } from '../../components/ui/Snackbar'

const ZENDESK_FORM_ID = 47501075391257
const ELASTIC_API_URL = 'https://services.txninfra.com/isu/elastic/fetch'

export function RaiseTicketPage() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    subject: '',
    description: '',
    vpaId: '',
    issueType: '',
    issueSubType: '',
    phoneNumber: '',
    callType: '',
    attachment: null,
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoadingDropdowns, setIsLoadingDropdowns] = useState(true)
  const [issueTypes, setIssueTypes] = useState([])
  const [issueSubTypes, setIssueSubTypes] = useState({})
  const [snackbarState, setSnackbarState] = useState({
    open: false,
    message: '',
    autoClose: true,
    colorType: 'warning',
  })

  // Fetch dropdown options from API on component mount
  useEffect(() => {
    fetchDropdownOptions()
  }, [])

  const fetchDropdownOptions = async () => {
    try {
      setIsLoadingDropdowns(true)
      const payload = {
        index: 'zendesk_form',
        type: 'em',
        query: {
          query: {
            nested: {
              path: 'forms',
              query: {
                bool: {
                  must: [
                    {
                      match: {
                        'forms.id': ZENDESK_FORM_ID
                      }
                    }
                  ]
                }
              }
            }
          }
        }
      }

      console.log('[RaiseTicket] Fetching dropdown options with payload:', payload)
      
      const response = await fetch(ELASTIC_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      })

      console.log('[RaiseTicket] API Response Status:', response.status)

      if (!response.ok) {
        throw new Error(`API returned status ${response.status}`)
      }

      const data = await response.json()
      console.log('[RaiseTicket] API Response Data:', data)
      
      // Parse the response to extract issue types and subtypes
      const parsedTypes = parseFormData(data)
      console.log('[RaiseTicket] Parsed Types Count:', parsedTypes.types?.length)
      console.log('[RaiseTicket] Parsed Subtypes Count:', Object.keys(parsedTypes.subtypes).length)
      
      setIssueTypes(parsedTypes.types || [])
      setIssueSubTypes(parsedTypes.subtypes || {})

      // Auto-select first issue type if available
      if (parsedTypes.types?.length > 0) {
        console.log('[RaiseTicket] Auto-selecting first issue type:', parsedTypes.types[0].value)
        setFormData(prev => ({
          ...prev,
          issueType: parsedTypes.types[0].value
        }))
      } else {
        console.log('[RaiseTicket] No issue types found, using default options')
        setDefaultOptions()
      }
    } catch (error) {
      console.error('[RaiseTicket] Fetch Dropdown Error:', error)
      setSnackbarState({
        open: true,
        message: `Failed to load form options: ${error.message}. Using defaults.`,
        autoClose: true,
        colorType: 'warning'
      })
      setDefaultOptions()
    } finally {
      setIsLoadingDropdowns(false)
    }
  }

  const setDefaultOptions = () => {
    const defaultTypes = [
      { name: 'QR', value: 'qr' },
      { name: 'Payment', value: 'payment' },
      { name: 'Account', value: 'account' },
      { name: 'Technical', value: 'technical' }
    ]
    const defaultSubTypes = {
      'qr': [
        { name: 'Damaged QR', value: 'damaged_qr' },
        { name: 'Missing QR', value: 'missing_qr' },
        { name: 'Incorrect QR', value: 'incorrect_qr' },
        { name: 'Other', value: 'other' }
      ],
      'payment': [
        { name: 'Transaction Failed', value: 'transaction_failed' },
        { name: 'Duplicate Charge', value: 'duplicate_charge' },
        { name: 'Refund Issue', value: 'refund_issue' },
        { name: 'Other', value: 'other' }
      ],
      'account': [
        { name: 'Login Issue', value: 'login_issue' },
        { name: 'Password Reset', value: 'password_reset' },
        { name: 'Account Locked', value: 'account_locked' },
        { name: 'Other', value: 'other' }
      ],
      'technical': [
        { name: 'App Crash', value: 'app_crash' },
        { name: 'Slow Performance', value: 'slow_performance' },
        { name: 'Bug Report', value: 'bug_report' },
        { name: 'Other', value: 'other' }
      ]
    }
    setIssueTypes(defaultTypes)
    setIssueSubTypes(defaultSubTypes)
    
    // Auto-select first type
    setFormData(prev => ({
      ...prev,
      issueType: defaultTypes[0].value
    }))
  }

  const parseFormData = (response) => {
    try {
      console.log('[RaiseTicket] Parsing form data from response')
      
      let types = []
      let subtypes = {}

      if (response.data?.hits && Array.isArray(response.data.hits) && response.data.hits.length > 0) {
        const formData = response.data.hits[0]?._source
        console.log('[RaiseTicket] Form data found:', formData)

        if (formData?.forms && Array.isArray(formData.forms) && formData.forms.length > 0) {
          const form = formData.forms[0]
          console.log('[RaiseTicket] Form found:', form)
          
          if (form.ticket_fields && Array.isArray(form.ticket_fields)) {
            console.log('[RaiseTicket] Ticket fields count:', form.ticket_fields.length)
            
            let issueTypeField = null
            let issueSubTypeField = null
            
            form.ticket_fields.forEach((field) => {
              console.log(`[RaiseTicket] Field:`, {
                id: field.id,
                title: field.title,
                type: field.type,
                has_options: !!field.custom_field_options,
                options_count: field.custom_field_options?.length
              })

              // Issue Type field - ID: 32240028334873
              if (field.id === 32240028334873) {
                console.log('[RaiseTicket] Issue Type field found:', field.title)
                issueTypeField = field
                types = field.custom_field_options?.map(opt => ({
                  name: opt.name,
                  value: opt.value
                })) || []
                console.log('[RaiseTicket] Issue types extracted:', types)
              }
              
              // Issue Sub-type field - ID: 32240169914009
              if (field.id === 32240169914009) {
                console.log('[RaiseTicket] Issue Sub-type field found:', field.title)
                issueSubTypeField = field
              }
            })

            // Process subtypes
            if (issueSubTypeField?.custom_field_options) {
              const allSubtypes = issueSubTypeField.custom_field_options.map(opt => ({
                name: opt.name,
                value: opt.value
              }))
              
              // Assign all subtypes to all types
              types.forEach(type => {
                subtypes[type.value] = allSubtypes
              })
              
              console.log('[RaiseTicket] Issue subtypes extracted:', subtypes)
            }
          }
        }
      } else {
        console.log('[RaiseTicket] No hits found in response. Response structure:', response)
      }

      return { types, subtypes }
    } catch (error) {
      console.error('[RaiseTicket] Error parsing form data:', error)
      return { types: [], subtypes: {} }
    }
  }

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
      ...(field === 'issueType' && { issueSubType: '' }) // Reset sub-type when type changes
    }))
  }

  const handlePhoneNumberChange = (e) => {
    let value = e.target.value
    
    // Remove all non-digit characters
    value = value.replace(/\D/g, '')
    
    // Limit to 10 digits
    if (value.length > 10) {
      value = value.slice(0, 10)
    }
    
    handleInputChange('phoneNumber', value)
  }

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      setFormData(prev => ({
        ...prev,
        attachment: file
      }))
    }
  }

  const handleSnackbarClose = () => {
    setSnackbarState((current) => ({
      ...current,
      open: false,
    }))
  }

  const validateForm = () => {
    const required = ['subject', 'description', 'vpaId', 'issueType', 'issueSubType', 'phoneNumber', 'callType']
    const empty = required.filter(field => !formData[field])
    
    if (empty.length > 0) {
      setSnackbarState({
        open: true,
        message: `Please fill in all mandatory fields: ${empty.join(', ')}`,
        autoClose: true,
        colorType: 'warning',
      })
      return false
    }

    // Validate phone number - must be exactly 10 digits
    const phoneDigits = formData.phoneNumber.replace(/\D/g, '')
    if (phoneDigits.length !== 10) {
      setSnackbarState({
        open: true,
        message: 'Phone number must be exactly 10 digits',
        autoClose: true,
        colorType: 'warning',
      })
      return false
    }

    return true
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    try {
      setIsSubmitting(true)

      const payload = {
        subject: formData.subject,
        body: formData.description,
        custom_fields: [
          { id: 900013325983, value: formData.subject },
          { id: 32240028334873, value: formData.vpaId },
          { id: 32240169914009, value: formData.issueType },
          { id: 32240169914010, value: formData.issueSubType },
          { id: 32240169914011, value: formData.phoneNumber },
          { id: 32240169914012, value: formData.callType },
          { id: 900013326003, value: formData.description }
        ],
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

      // Reset form
      setFormData({
        subject: '',
        description: '',
        vpaId: '',
        issueType: '',
        issueSubType: '',
        phoneNumber: '',
        callType: '',
        attachment: null,
      })
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

  const handleReset = () => {
    setFormData({
      subject: '',
      description: '',
      vpaId: '',
      issueType: '',
      issueSubType: '',
      phoneNumber: '',
      callType: '',
      attachment: null,
    })
  }

  return (
    <section className="portal-section raise-ticket-page" style={{ padding: '24px', background: '#F8FAFC', minHeight: '100vh' }}>
      <LoaderOverlay open={isSubmitting || isLoadingDropdowns} text={isSubmitting ? "Raising Ticket..." : "Loading form options..."} />
      <Snackbar
        open={snackbarState.open}
        message={snackbarState.message}
        autoClose={snackbarState.autoClose}
        colorType={snackbarState.colorType}
        duration={3000}
        onClose={handleSnackbarClose}
      />

      <div className="raise-ticket-top-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <button type="button" onClick={() => navigate(-1)} className="back-btn" style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        
        <div className="support-info" style={{ display: 'flex', gap: '24px', background: '#fff', padding: '10px 24px', borderRadius: '30px', border: '1px solid #E2E8F0', alignItems: 'center', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
          <div className="support-item" style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#475569', fontSize: '14px', fontWeight: '500' }}>
            <div style={{ background: '#64748B', borderRadius: '50%', padding: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="white" stroke="none">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
              </svg>
            </div>
            Merchant Support No. : 9124573230
          </div>
          <div className="support-item" style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#475569', fontSize: '14px', fontWeight: '500' }}>
            <div style={{ background: '#64748B', borderRadius: '50%', padding: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
            </div>
            Email : cboisupport@iserveu.in
          </div>
        </div>
      </div>

      <div className="raise-ticket-container" style={{ background: '#fff', borderRadius: '12px', padding: '24px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div className="raise-ticket-title-bar" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="#64748B" stroke="none">
            <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z M4 22v-7" stroke="#64748B" strokeWidth="2" fill="none" />
          </svg>
          <h1 className="portal-section__title" style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#1e293b' }}>Raise a Ticket</h1>
        </div>
        <form onSubmit={handleSubmit} className="raise-ticket-form">
          <div className="form-section">
            <div className="form-group">
              <label className="form-label">
                Subject <span className="required">*</span>
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="Enter Subject"
                value={formData.subject}
                onChange={(e) => handleInputChange('subject', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                Description <span className="required">*</span>
              </label>
              <textarea
                className="form-textarea"
                placeholder="Any additional details..."
                rows="5"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
              />
              <span className="char-limit">Describe your issue within 300 characters</span>
            </div>

            <div className="form-group">
              <label className="form-label">
                VPA Id <span className="required">*</span>
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="Enter VPA Id"
                value={formData.vpaId}
                onChange={(e) => handleInputChange('vpaId', e.target.value)}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">
                  Issue Type <span className="required">*</span>
                </label>
                <select
                  className="form-select"
                  value={formData.issueType}
                  onChange={(e) => handleInputChange('issueType', e.target.value)}
                  disabled={isLoadingDropdowns}
                >
                  <option value="">Select Issue Type</option>
                  {issueTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">
                  Issue Sub-type <span className="required">*</span>
                </label>
                <select
                  className="form-select"
                  value={formData.issueSubType}
                  onChange={(e) => handleInputChange('issueSubType', e.target.value)}
                  disabled={!formData.issueType || isLoadingDropdowns}
                >
                  <option value="">Select Issue Sub-type</option>
                  {formData.issueType && issueSubTypes[formData.issueType]?.map((subType) => (
                    <option key={subType.value} value={subType.value}>
                      {subType.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">
                  Phone number <span className="required">*</span>
                </label>
                <input
                  type="tel"
                  className="form-input"
                  placeholder="Enter 10-digit Phone number"
                  value={formData.phoneNumber}
                  onChange={handlePhoneNumberChange}
                  maxLength="10"
                  pattern="\d{10}"
                  inputMode="numeric"
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  Call Type <span className="required">*</span>
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Enter Call Type"
                  value={formData.callType}
                  onChange={(e) => handleInputChange('callType', e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Attachment</label>
              <div className="file-upload-wrapper">
                <label className="file-upload-label">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 2.2" />
                  </svg>
                  <span>Please Add Attachment</span>
                  <input
                    type="file"
                    className="file-input"
                    onChange={handleFileChange}
                    accept="image/*,.pdf,.doc,.docx"
                  />
                </label>
                {formData.attachment && (
                  <div className="file-info">
                    <span>{formData.attachment.name}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={handleReset}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Submitting...' : 'Submit'}
            </button>
          </div>
        </form>
      </div>
    </section>
  )
}
