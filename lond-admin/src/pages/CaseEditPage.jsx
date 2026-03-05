import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import '../styles/step-form.css'
import CancelCaseButton from '../components/CancelCaseButton'

const token = () => localStorage.getItem('loandd_admin')
const API = '/api/admin/sales'

// สถานะเคส (แสดงอย่างเดียว — อัพเดทอัตโนมัติจากแต่ละฝ่าย)
const statusLabelMap = {
  new: 'เคสใหม่', contacting: 'กำลังติดต่อ', incomplete: 'ข้อมูลไม่ครบ',
  awaiting_appraisal_fee: 'รอชำระค่าประเมิน', appraisal_scheduled: 'นัดประเมินแล้ว',
  appraisal_passed: 'ผ่านประเมินแล้ว', appraisal_not_passed: 'ไม่ผ่านประเมิน',
  pending_approve: 'รออนุมัติวงเงิน', credit_approved: 'อนุมัติวงเงินแล้ว',
  pending_auction: 'รอประมูล', preparing_docs: 'เตรียมเอกสาร',
  legal_scheduled: 'นัดนิติกรรมแล้ว', legal_completed: 'ทำนิติกรรมเสร็จสิ้น',
  completed: 'เสร็จสมบูรณ์', cancelled: 'ยกเลิก'
}

const paymentStatusOptions = [
  { value: 'unpaid', label: 'ยังไม่ชำระ' },
  { value: 'paid', label: 'ชำระแล้ว' },
]

const appraisalTypeOptions = [
  { value: 'outside', label: 'ประเมินนอก' },
  { value: 'inside', label: 'ประเมินใน' },
  { value: 'check_price', label: 'เช็คราคา' },
]

const loanTypeLabel = { mortgage: 'จำนอง', selling_pledge: 'ขายฝาก' }
const propertyTypeLabel = { land: 'ที่ดินเปล่า', house: 'บ้านเดี่ยว', condo: 'คอนโด', townhouse: 'ทาวน์เฮ้าส์', other: 'อื่นๆ' }

function formatMoney(n) {
  if (!n) return '0'
  return Number(n).toLocaleString('th-TH')
}

function formatDate(d) {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' })
}

function toDateInput(d) {
  if (!d) return ''
  const dt = new Date(d)
  if (isNaN(dt.getTime())) return ''
  return dt.toISOString().split('T')[0]
}

// สไตล์ปุ่มกากบาทลบรูปเดิม (อยู่ในขอบรูป ไม่โดน overflow ตัด)
const xBtnOverlay = {
  position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: '50%',
  background: '#e74c3c', border: '2px solid #fff', color: '#fff', fontSize: 11,
  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
  boxShadow: '0 1px 4px rgba(0,0,0,0.3)', zIndex: 2, padding: 0, lineHeight: 1
}

// สไตล์ปุ่มกากบาทลบไฟล์ที่เลือก (inline)
const xBtnInline = {
  background: '#e74c3c', color: '#fff', border: 'none', borderRadius: '50%',
  width: 18, height: 18, fontSize: 9, cursor: 'pointer', display: 'inline-flex',
  alignItems: 'center', justifyContent: 'center', padding: 0, lineHeight: 1,
  verticalAlign: 'middle', marginLeft: 6
}

const loanTypeDetailOptions = [
  { value: '', label: 'ไม่ระบุ' },
  { value: 'mortgage', label: 'จำนอง' },
  { value: 'selling_pledge', label: 'ขายฝาก' },
]

// เอกสารประมูล 9 ประเภท
const AUCTION_DOCS = [
  { field: 'house_reg_book',         label: 'เล่มทะเบียนบ้าน',                     required: true },
  { field: 'house_reg_book_legal',   label: 'เล่มทะเบียนบ้านที่ทำนิติกรรม',         required: true },
  { field: 'name_change_doc',        label: 'ใบเปลี่ยนชื่อนามสกุล (ถ้ามี)',           required: false },
  { field: 'divorce_doc',            label: 'ใบหย่า (ถ้ามี)',                         required: false },
  { field: 'spouse_consent_doc',     label: 'หนังสือยินยอมคู่สมรส',                  required: false, spouse: true },
  { field: 'spouse_id_card',         label: 'บัตรประชาชนคู่สมรส',                    required: false, spouse: true },
  { field: 'spouse_reg_copy',        label: 'สำเนาทะเบียนคู่สมรส',                   required: false, spouse: true },
  { field: 'marriage_cert',          label: 'ทะเบียนสมรส',                            required: false, spouse: true },
  { field: 'spouse_name_change_doc', label: 'ใบเปลี่ยนชื่อนามสกุลคู่สมรส (ถ้ามี)', required: false, spouse: true },
]

const AUCTION_API = '/api/admin/auction'

const loanTypeDetailColor = { mortgage: '#1565c0', selling_pledge: '#6a1b9a', '': '#888' }
const loanTypeDetailBg = { mortgage: '#e3f2fd', selling_pledge: '#f3e5f5', '': '#f5f5f5' }

export default function CaseEditPage() {
  const { id } = useParams()
  const isEditMode = !!id
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [caseData, setCaseData] = useState(null)
  const [agents, setAgents] = useState([])
  const [debtors, setDebtors] = useState([])
  const [debtorDetail, setDebtorDetail] = useState(null)
  const [msg, setMsg] = useState('')
  const [success, setSuccess] = useState('')
  const [loanTypeDetail, setLoanTypeDetail] = useState('')
  const [loanTypeDropdownOpen, setLoanTypeDropdownOpen] = useState(false)

  // เอกสารประกอบการประมูล
  const [auctionDocs, setAuctionDocs] = useState({
    house_reg_book: [], house_reg_book_legal: [], name_change_doc: [], divorce_doc: [],
    spouse_consent_doc: [], spouse_id_card: [], spouse_reg_copy: [],
    marriage_cert: [], spouse_name_change_doc: []
  })
  const [uploadingDoc, setUploadingDoc] = useState(null)

  const slipRef = useRef(null)
  const bookRef = useRef(null)
  const createSlipRef = useRef(null)
  const createBookRef = useRef(null)

  // track ชื่อไฟล์ที่เลือกใหม่ (สำหรับแสดง X)
  const [createSlipName, setCreateSlipName] = useState('')
  const [createBookName, setCreateBookName] = useState('')
  const [editSlipName, setEditSlipName] = useState('')
  const [editBookName, setEditBookName] = useState('')

  const [createForm, setCreateForm] = useState({
    loan_request_id: '',
    agent_id: '',
    note: '',
    payment_status: 'unpaid',
    appraisal_type: 'outside',
    appraisal_date: '',
    appraisal_fee: 4500,
    payment_date: '',
    recorded_by: '',
    has_obligation: 'no',
    obligation_count: '',
    // ข้อมูลการทำธุรกรรม (ฝ่ายขาย → ฝ่ายนิติกรรม)
    transaction_date: '',
    transaction_time: '',
    transaction_land_office: '',
    transaction_note: '',
    transaction_recorded_by: '',
  })

  const [form, setForm] = useState({
    status: 'pending_approve',
    payment_status: 'unpaid',
    appraisal_fee: 4500,
    approved_amount: '',
    agent_id: '',
    assigned_sales_id: '',
    note: '',
    appraisal_type: 'outside',
    appraisal_date: '',
    payment_date: '',
    recorded_by: '',
    recorded_at: '',
    // ข้อมูลการทำธุรกรรม (ฝ่ายขาย → ฝ่ายนิติกรรม)
    transaction_date: '',
    transaction_time: '',
    transaction_land_office: '',
    transaction_note: '',
    transaction_recorded_by: '',
  })

  useEffect(() => {
    fetch(`${API}/agents`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json())
      .then(d => { if (d.success) setAgents(d.agents) })
      .catch(() => {})

    if (isEditMode) {
      fetch(`${API}/cases/${id}`, { headers: { Authorization: `Bearer ${token()}` } })
        .then(r => r.json())
        .then(d => {
          if (d.success) {
            setCaseData(d.caseData)
            setLoanTypeDetail(d.caseData.loan_type_detail || '')
            // โหลดเอกสารประมูลจาก auction_transactions
            const docs = {}
            AUCTION_DOCS.forEach(({ field }) => {
              try { docs[field] = JSON.parse(d.caseData[field] || '[]') || [] } catch { docs[field] = [] }
            })
            setAuctionDocs(docs)
            setForm({
              status: d.caseData.status || 'pending_approve',
              payment_status: d.caseData.payment_status || 'unpaid',
              appraisal_fee: d.caseData.appraisal_fee || 4500,
              approved_amount: d.caseData.approved_amount || '',
              agent_id: d.caseData.agent_id || '',
              assigned_sales_id: d.caseData.assigned_sales_id || '',
              note: d.caseData.note || '',
              appraisal_type: d.caseData.appraisal_type || 'outside',
              appraisal_date: toDateInput(d.caseData.appraisal_date),
              payment_date: toDateInput(d.caseData.payment_date),
              recorded_by: d.caseData.recorded_by || '',
              recorded_at: d.caseData.recorded_at || '',
              transaction_date: toDateInput(d.caseData.transaction_date),
              transaction_time: d.caseData.transaction_time || '',
              transaction_land_office: d.caseData.transaction_land_office || '',
              transaction_note: d.caseData.transaction_note || '',
              transaction_recorded_by: d.caseData.transaction_recorded_by || '',
            })
          }
          setLoading(false)
        })
        .catch(() => setLoading(false))
    } else {
      fetch(`${API}/debtors`, { headers: { Authorization: `Bearer ${token()}` } })
        .then(r => r.json())
        .then(d => {
          if (d.success) setDebtors(d.debtors.filter(x => !x.case_code))
        })
        .catch(() => {})
      setLoading(false)
    }
  }, [id])

  const set = (key, val) => setForm({ ...form, [key]: val })
  const setCreate = (key, val) => setCreateForm(prev => ({ ...prev, [key]: val }))

  // ===== เอกสารประมูล: อัพโหลดทันที (ใช้ auction API) =====
  const handleAuctionDocUpload = async (field, files) => {
    if (!files || files.length === 0 || !id) return
    setUploadingDoc(field)
    try {
      const fd = new FormData()
      for (const f of Array.from(files)) fd.append(field, f)
      const res = await fetch(`${AUCTION_API}/cases/${id}/docs`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}` },
        body: fd
      })
      const data = await res.json()
      if (data.success) {
        setAuctionDocs(prev => ({ ...prev, [data.field]: data.paths }))
      }
    } catch {}
    setUploadingDoc(null)
  }

  const handleAuctionDocRemove = async (field, filePath) => {
    if (!confirm('ต้องการลบไฟล์นี้?')) return
    try {
      const res = await fetch(`${AUCTION_API}/cases/${id}/docs/remove`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ field, file_path: filePath })
      })
      const data = await res.json()
      if (data.success) {
        setAuctionDocs(prev => ({ ...prev, [field]: data.paths }))
      }
    } catch {}
  }

  const handleLoanTypeChange = async (newVal) => {
    if (!caseData?.loan_request_id) return
    setLoanTypeDetail(newVal)
    setLoanTypeDropdownOpen(false)
    try {
      await fetch(`${API}/debtors/${caseData.loan_request_id}/loan-type`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ loan_type_detail: newVal })
      })
    } catch {}
  }

const handleDebtorSelect = (debtorId) => {
    setCreate('loan_request_id', debtorId)
    
    // ถ้าไม่ได้เลือกลูกหนี้ ให้เคลียร์ข้อมูลลูกหนี้และนายหน้าออก
    if (!debtorId) {
      setDebtorDetail(null)
      setCreate('agent_id', '') // เพิ่มการเคลียร์นายหน้า
      return
    }

    fetch(`${API}/debtors/${debtorId}`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setDebtorDetail(d.debtor)
          const db = d.debtor
          setCreateForm(prev => ({
            ...prev,
            has_obligation: db.has_obligation || 'no',
            obligation_count: db.obligation_count || '',
            agent_id: db.agent_id || '',
            // ดึงข้อมูลสถานะประเมินที่ฝ่ายประเมินกรอกมาแล้ว
            appraisal_type: db.appraisal_type || prev.appraisal_type,
            appraisal_date: db.appraisal_date ? new Date(db.appraisal_date).toISOString().split('T')[0] : prev.appraisal_date,
            appraisal_fee: db.appraisal_fee || prev.appraisal_fee,
            payment_date: db.payment_date ? new Date(db.payment_date).toISOString().split('T')[0] : prev.payment_date,
            payment_status: db.payment_status || prev.payment_status,
            recorded_by: db.appraisal_recorded_by || prev.recorded_by,
          }))
        }
      })
      .catch(() => {})
  }

  // ล้างไฟล์ ref
  const clearFileRef = (ref, setName) => {
    if (ref.current) ref.current.value = ''
    setName('')
  }

  // ลบสลิป/เล่มประเมิน (single column → set NULL ใน cases table)
  const deleteCaseImage = async (column) => {
    if (!confirm('ต้องการลบรูปนี้?')) return
    try {
      const res = await fetch('/api/admin/appraisal/delete-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ table: 'cases', id, column })
      })
      const data = await res.json()
      if (data.success) {
        setCaseData(prev => ({ ...prev, [column]: null }))
      } else {
        alert(data.message || 'ลบไม่สำเร็จ')
      }
    } catch {
      alert('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้')
    }
  }

  // ลบรูปลูกหนี้จาก JSON array (loan_requests table)
  const deleteDebtorImage = async (field, imgPath) => {
    if (!confirm('ต้องการลบรูปนี้?')) return
    try {
      const res = await fetch(`${API}/remove-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ debtor_id: caseData.loan_request_id, field, image_path: imgPath })
      })
      const data = await res.json()
      if (data.success) {
        setCaseData(prev => {
          const arr = (parseImages(prev[field]) || []).filter(p => p !== imgPath)
          return { ...prev, [field]: JSON.stringify(arr) }
        })
      } else {
        alert(data.message || 'ลบไม่สำเร็จ')
      }
    } catch {
      alert('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้')
    }
  }

  // อัพโหลดรูปลูกหนี้เพิ่ม (เรียก API ทันทีเมื่อเลือกไฟล์)
  const uploadDebtorFile = async (fieldName, files) => {
    if (!files || files.length === 0) return
    if (!caseData?.loan_request_id) return

    const fd = new FormData()
    for (const f of files) fd.append(fieldName, f)

    try {
      const res = await fetch(`${API}/debtors/${caseData.loan_request_id}/upload-images`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}` },
        body: fd
      })
      const data = await res.json()
      if (data.success) {
        // อัพเดต state ให้แสดงรูปใหม่ทันที
        setCaseData(prev => ({
          ...prev,
          images: data.images || prev.images,
          deed_images: data.deed_images || prev.deed_images,
        }))
      } else {
        alert(data.message || 'อัพโหลดไม่สำเร็จ')
      }
    } catch {
      alert('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้')
    }
  }

  // ==================== สร้างเคสใหม่ ====================
  const handleCreate = async (e) => {
    e.preventDefault()
    setSaving(true)
    setMsg('')
    setSuccess('')

    if (!createForm.loan_request_id) {
      setMsg('กรุณาเลือกลูกหนี้')
      setSaving(false)
      return
    }

    try {
      const fd = new FormData()
      Object.entries(createForm).forEach(([k, v]) => {
        if (v !== '' && v !== null && v !== undefined) fd.append(k, v)
      })
      if (createSlipRef.current?.files[0]) {
        fd.append('slip_image', createSlipRef.current.files[0])
      }
      if (createBookRef.current?.files[0]) {
        fd.append('appraisal_book_image', createBookRef.current.files[0])
      }

      const res = await fetch(`${API}/cases`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}` },
        body: fd
      })
      const data = await res.json()
      if (data.success) {
        setSuccess(`สร้างเคสสำเร็จ! รหัส: ${data.case_code}`)
        setTimeout(() => navigate('/sales'), 1200)
      } else {
        setMsg(data.message || 'เกิดข้อผิดพลาด')
      }
    } catch {
      setMsg('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้')
    }
    setSaving(false)
  }

  // ==================== อัปเดตเคส ====================
  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setMsg('')
    setSuccess('')

    try {
      const fd = new FormData()
      Object.entries(form).forEach(([k, v]) => {
        if (v !== '' && v !== null && v !== undefined) fd.append(k, v)
      })

      if (slipRef.current?.files[0]) {
        fd.append('slip_image', slipRef.current.files[0])
      }
      if (bookRef.current?.files[0]) {
        fd.append('appraisal_book_image', bookRef.current.files[0])
      }

      const res = await fetch(`${API}/cases/${id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token()}` },
        body: fd
      })
      const data = await res.json()
      if (data.success) {
        setSuccess('บันทึกข้อมูลสำเร็จ!')
        setTimeout(() => navigate('/sales'), 1000)
      } else {
        setMsg(data.message || 'เกิดข้อผิดพลาด')
      }
    } catch {
      setMsg('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้')
    }
    setSaving(false)
  }

  // ==================== Loading ====================
  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0' }}>
        <i className="fas fa-spinner fa-spin" style={{ fontSize: 32, color: 'var(--primary)' }}></i>
        <p style={{ marginTop: 12 }}>กำลังโหลดข้อมูล...</p>
      </div>
    )
  }

  // ==================== Helper ====================
  const parseImages = (jsonStr) => {
    try { return JSON.parse(jsonStr) || [] } catch { return [] }
  }

  const ImageGrid = ({ images, label, onDelete }) => {
    if (!images || images.length === 0) return <span style={{ fontSize: 12, color: '#999' }}>ไม่มีรูป</span>
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
        {images.map((img, i) => (
          <div key={i} style={{ position: 'relative', display: 'inline-block' }}>
            {onDelete && (
              <button type="button" onClick={() => onDelete(img)} style={xBtnOverlay} title="ลบรูป">
                <i className="fas fa-times"></i>
              </button>
            )}
            <a href={img.startsWith('/') ? img : `/${img}`} target="_blank" rel="noreferrer">
              <img src={img.startsWith('/') ? img : `/${img}`} alt={`${label}-${i}`} style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 6, border: '1px solid #ddd' }} onError={(e) => { e.target.style.display = 'none' }} />
            </a>
          </div>
        ))}
      </div>
    )
  }

  // ลบรูปลูกหนี้ (เรียก API จริง)
  const removeImage = (field, imgPath) => {
    deleteDebtorImage(field, imgPath)
  }

  // ==================== โหมดสร้างเคสใหม่ ====================
  if (!isEditMode) {
    const d = debtorDetail
    let images = d ? parseImages(d.images) : []
    let deedImages = d ? parseImages(d.deed_images) : []

    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <button className="btn btn-outline" onClick={() => navigate('/sales')} style={{ padding: '8px 16px' }}>
            <i className="fas fa-arrow-left"></i>
          </button>
          <h2 style={{ margin: 0, fontSize: 20 }}>ID ลูกหนี้</h2>
        </div>
        <p style={{ margin: '0 0 20px', color: '#888', fontSize: 13 }}>เลือก ID ลูกหนี้ เพื่อกรอกเคสใหม่</p>

        {msg && <div className="error-msg" style={{ marginBottom: 16 }}>{msg}</div>}
        {success && <div className="success-msg" style={{ marginBottom: 16 }}>{success}</div>}

        <div style={{ marginBottom: 20, maxWidth: 500 }}>
          <label style={{ fontWeight: 600, fontSize: 14, marginBottom: 6, display: 'block' }}>
            <i className="fas fa-user-tag" style={{ color: 'var(--primary)', marginRight: 6 }}></i>
            เลือกลูกหนี้ <span style={{ color: 'red' }}>*</span>
          </label>
          <select
            value={createForm.loan_request_id}
            onChange={e => handleDebtorSelect(e.target.value)}
            style={{ width: '100%', padding: '10px 12px', fontSize: 14, borderRadius: 8, border: '1px solid #ddd' }}
          >
            <option value="">-- เลือกลูกหนี้ที่ยังไม่มีเคส --</option>
            {debtors.map(dt => (
              <option key={dt.id} value={dt.id}>
                ID:{dt.id} — {dt.contact_name} — {dt.contact_phone}
              </option>
            ))}
          </select>
          {debtors.length === 0 && (
            <small style={{ color: '#999', marginTop: 4, display: 'block' }}>
              <i className="fas fa-info-circle"></i> ไม่มีลูกหนี้ที่ยังไม่ได้สร้างเคส
            </small>
          )}
        </div>

        <form onSubmit={handleCreate}>
          <div className="edit-page-grid">

            {/* คอลัมน์ซ้าย */}
            <div>
              <div className="card" style={{ padding: 24, marginBottom: 20 }}>
                <h3 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 700 }}>
                  {d ? `รหัสจะถูกสร้างอัตโนมัติ` : 'กรุณาเลือกลูกหนี้'}
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className="form-group">
                    <label>ชื่อ-สกุล (เจ้าของทรัพย์)</label>
                    <input type="text" value={d?.contact_name || ''} readOnly style={{ background: '#f5f5f5' }} />
                  </div>
                  <div className="form-group">
                    <label>เบอร์โทร (เจ้าของทรัพย์)</label>
                    <input type="text" value={d?.contact_phone || ''} readOnly style={{ background: '#f5f5f5' }} />
                  </div>
                </div>

                {images.filter(img => img.includes('id-cards')).length > 0 && (
                  <div style={{ marginTop: 12 }}>
                    <label style={{ fontSize: 13, fontWeight: 600 }}>รูปหน้าบัตรประชาชน</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
                      {images.filter(img => img.includes('id-cards')).map((img, i) => (
                        <a key={i} href={img.startsWith('/') ? img : `/${img}`} target="_blank" rel="noreferrer">
                          <img src={img.startsWith('/') ? img : `/${img}`} alt={`id-${i}`} style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8, border: '2px solid #e0e0e0' }} onError={(e) => { e.target.style.display = 'none' }} />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                <div className="form-group" style={{ marginTop: 16 }}>
                  <label>ลักษณะทรัพย์</label>
                  <input type="text" value={d ? (propertyTypeLabel[d.property_type] || d.property_type || '-') : ''} readOnly style={{ background: '#f5f5f5' }} />
                </div>
              </div>

              <div className="card" style={{ padding: 24, marginBottom: 20 }}>
                <h3 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 700 }}>ข้อมูลทรัพย์</h3>

                <div style={{ display: 'flex', gap: 24, marginBottom: 16, alignItems: 'center' }}>
                  <div>
                    <label style={{ fontWeight: 600, fontSize: 13 }}>ทรัพย์ติดภาระหรือไม่</label>
                    <div style={{ marginTop: 6, display: 'flex', gap: 16 }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                        <input type="radio" name="create_obligation" checked={createForm.has_obligation !== 'yes'} onChange={() => setCreate('has_obligation', 'no')} style={{ accentColor: 'var(--primary)' }} /> ไม่ติดภาระ
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                        <input type="radio" name="create_obligation" checked={createForm.has_obligation === 'yes'} onChange={() => setCreate('has_obligation', 'yes')} style={{ accentColor: 'var(--primary)' }} /> ติดภาระ
                      </label>
                    </div>
                  </div>
                  {createForm.has_obligation === 'yes' && (
                    <div className="form-group" style={{ margin: 0, flex: 1 }}>
                      <label>จำนวนภาระ</label>
                      <input type="text" value={createForm.obligation_count} onChange={e => setCreate('obligation_count', e.target.value)} placeholder="จำนวน 1" />
                    </div>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
                  <div className="form-group">
                    <label>จังหวัด</label>
                    <input type="text" value={d?.province || '-'} readOnly style={{ background: '#f5f5f5' }} />
                  </div>
                  <div className="form-group">
                    <label>อำเภอ</label>
                    <input type="text" value={d?.district || '-'} readOnly style={{ background: '#f5f5f5' }} />
                  </div>
                  <div className="form-group">
                    <label>ตำบล</label>
                    <input type="text" value={d?.subdistrict || '-'} readOnly style={{ background: '#f5f5f5' }} />
                  </div>
                </div>

                <div className="form-group">
                  <label>โลเคชั่น</label>
                  <input type="text" value={d?.location_url || ''} readOnly style={{ background: '#f5f5f5' }} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className="form-group">
                    <label>เลขโฉนด</label>
                    <input type="text" value={d?.deed_number || '-'} readOnly style={{ background: '#f5f5f5' }} />
                  </div>
                  <div className="form-group">
                    <label>พื้นที่</label>
                    <input type="text" value={d?.land_area ? `${d.land_area} ตร.วา` : '-'} readOnly style={{ background: '#f5f5f5' }} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginTop: 16 }}>
                  <div>
                    <label style={{ fontSize: 13, fontWeight: 600 }}>รูปโฉนด</label>
                    <ImageGrid images={deedImages} label="deed" />
                  </div>
                  <div>
                    <label style={{ fontSize: 13, fontWeight: 600 }}>รูปภาพทรัพย์</label>
                    <ImageGrid images={images.filter(img => img.includes('properties'))} label="prop" />
                  </div>
                  <div>
                    <label style={{ fontSize: 13, fontWeight: 600 }}>ใบอนุญาตสิ่งปลูกสร้าง</label>
                    <ImageGrid images={images.filter(img => img.includes('permits'))} label="permit" />
                  </div>
                </div>

                {images.filter(img => img.includes('videos')).length > 0 && (
                  <div style={{ marginTop: 16 }}>
                    <label style={{ fontSize: 13, fontWeight: 600 }}>วีดีโอทรัพย์</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
                      {images.filter(img => img.includes('videos')).map((vid, i) => (
                        <a key={i} href={vid.startsWith('/') ? vid : `/${vid}`} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: 'var(--primary)' }}>
                          <i className="fas fa-video"></i> วิดีโอ {i + 1}
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                <div className="form-group" style={{ marginTop: 16 }}>
                  <label>เลือกนายหน้า</label>
                  <select value={createForm.agent_id} onChange={e => setCreate('agent_id', e.target.value)}>
                    <option value="">-- เลือกนายหน้า --</option>
                    {agents.map(a => (
                      <option key={a.id} value={a.id}>
                        {a.full_name} {a.nickname ? `(${a.nickname})` : ''} — {a.phone}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* คอลัมน์ขวา: สถานะประเมิน */}
            <div>
              <div className="card" style={{ padding: 24, marginBottom: 20 }}>
                <h3 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 700, color: 'var(--primary)' }}>
                  สถานะประเมิน
                </h3>

                <div className="form-group">
                  <label style={{ fontWeight: 600 }}>สถานะประเมิน</label>
                  <div style={{ display: 'flex', gap: 20, marginTop: 6 }}>
                    {appraisalTypeOptions.map(opt => (
                      <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                        <input
                          type="radio"
                          name="appraisal_type"
                          value={opt.value}
                          checked={createForm.appraisal_type === opt.value}
                          onChange={e => setCreate('appraisal_type', e.target.value)}
                          style={{ accentColor: 'var(--primary)' }}
                        />
                        {opt.label}
                      </label>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
                  <div className="form-group">
                    <label>วันที่นัดประเมิน</label>
                    <input type="date" value={createForm.appraisal_date} onChange={e => setCreate('appraisal_date', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>จำนวนเงิน</label>
                    <input type="number" step="0.01" value={createForm.appraisal_fee} onChange={e => setCreate('appraisal_fee', e.target.value)} placeholder="4500" />
                  </div>
                </div>

                <div className="form-group">
                  <label>วันที่ชำระ</label>
                  <input type="date" value={createForm.payment_date} onChange={e => setCreate('payment_date', e.target.value)} />
                </div>

                <div className="form-group">
                  <label>อัพโหลดรูปสลิป</label>
                  <input type="file" accept="image/*,.pdf" ref={createSlipRef}
                    onChange={e => setCreateSlipName(e.target.files[0]?.name || '')} />
                  {createSlipName && (
                    <small style={{ color: '#04AA6D', fontSize: 11 }}>
                      {createSlipName} <button type="button" onClick={() => clearFileRef(createSlipRef, setCreateSlipName)} style={xBtnInline} title="ล้างไฟล์"><i className="fas fa-times"></i></button>
                    </small>
                  )}
                  {debtorDetail?.slip_image && !createSlipName && (
                    <div style={{ marginTop: 6 }}>
                      <small style={{ color: '#888', fontSize: 11 }}>ฝ่ายประเมินอัพโหลดไว้แล้ว: </small>
                      <a href={debtorDetail.slip_image.startsWith('/') ? debtorDetail.slip_image : `/${debtorDetail.slip_image}`} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: '#e65100' }}>
                        <i className="fas fa-eye"></i> ดูสลิป
                      </a>
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label>อัพโหลดเล่มประเมิน</label>
                  <input type="file" accept="image/*,.pdf" ref={createBookRef}
                    onChange={e => setCreateBookName(e.target.files[0]?.name || '')} />
                  {createBookName && (
                    <small style={{ color: '#04AA6D', fontSize: 11 }}>
                      {createBookName} <button type="button" onClick={() => clearFileRef(createBookRef, setCreateBookName)} style={xBtnInline} title="ล้างไฟล์"><i className="fas fa-times"></i></button>
                    </small>
                  )}
                  {debtorDetail?.appraisal_book_image && !createBookName && (
                    <div style={{ marginTop: 6 }}>
                      <small style={{ color: '#888', fontSize: 11 }}>ฝ่ายประเมินอัพโหลดไว้แล้ว: </small>
                      <a href={debtorDetail.appraisal_book_image.startsWith('/') ? debtorDetail.appraisal_book_image : `/${debtorDetail.appraisal_book_image}`} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: '#e65100' }}>
                        <i className="fas fa-eye"></i> ดูเล่มประเมิน
                      </a>
                    </div>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className="form-group">
                    <label>ผู้บันทึก</label>
                    <input type="text" value={createForm.recorded_by} onChange={e => setCreate('recorded_by', e.target.value)} placeholder="ชื่อผู้บันทึก" />
                  </div>
                  <div className="form-group">
                    <label>วันเวลาที่บันทึก</label>
                    <input type="text" value="-" readOnly style={{ background: '#f5f5f5' }} />
                  </div>
                </div>

                <div className="form-group" style={{ marginTop: 16 }}>
                  <label style={{ fontWeight: 600 }}>สถานะชำระ</label>
                  <select value={createForm.payment_status} onChange={e => setCreate('payment_status', e.target.value)}>
                    <option value="unpaid">ยังไม่ชำระ</option>
                    <option value="paid">ชำระแล้ว</option>
                  </select>
                </div>

              </div>

              {/* ===== ข้อมูลการทำธุรกรรม (ฝ่ายขาย → ฝ่ายนิติกรรม) ===== */}
              <div className="card" style={{ padding: 24, marginBottom: 20, borderTop: '3px solid var(--primary)' }}>
                <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: 'var(--primary)' }}>
                  <i className="fas fa-handshake" style={{ marginRight: 8 }}></i>
                  ข้อมูลการทำธุรกรรม (ฝ่ายขาย → ฝ่ายนิติกรรม)
                </h3>
                <p style={{ margin: '-8px 0 14px', fontSize: 12, color: '#888' }}>
                  กรอกเมื่อนัดหมายวันทำนิติกรรมแล้ว — ฝ่ายนิติจะเห็นข้อมูลนี้เป็นอ้างอิง
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className="form-group">
                    <label>วันที่ธุรกรรม</label>
                    <input type="date" value={createForm.transaction_date} onChange={e => setCreate('transaction_date', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>เวลา</label>
                    <input type="text" value={createForm.transaction_time} onChange={e => setCreate('transaction_time', e.target.value)} placeholder="เช่น 10:00" />
                  </div>
                </div>

                <div className="form-group" style={{ marginTop: 16 }}>
                  <label>สำนักงานที่ดิน</label>
                  <input type="text" value={createForm.transaction_land_office} onChange={e => setCreate('transaction_land_office', e.target.value)} placeholder="เช่น สำนักงานที่ดินจังหวัดนนทบุรี" />
                </div>

                <div className="form-group" style={{ marginTop: 16 }}>
                  <label>หมายเหตุ</label>
                  <textarea rows="2" value={createForm.transaction_note} onChange={e => setCreate('transaction_note', e.target.value)} placeholder="รายละเอียดเพิ่มเติม..." style={{ resize: 'vertical' }}></textarea>
                </div>

                <div className="form-group" style={{ marginTop: 16 }}>
                  <label>ผู้บันทึก</label>
                  <input type="text" value={createForm.transaction_recorded_by} onChange={e => setCreate('transaction_recorded_by', e.target.value)} placeholder="ชื่อผู้บันทึก" />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <button type="submit" className="btn btn-primary" disabled={saving || !createForm.loan_request_id} style={{ padding: '12px 32px', flex: 1 }}>
                  {saving ? <><i className="fas fa-spinner fa-spin"></i> กำลังสร้าง...</> : <><i className="fas fa-save"></i> บันทึกข้อมูล</>}
                </button>
                <button type="button" className="btn btn-outline" onClick={() => navigate('/sales')} style={{ padding: '12px 24px' }}>
                  ยกเลิก
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    )
  }

  // ==================== ไม่พบเคส ====================
  if (!caseData) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0' }}>
        <i className="fas fa-exclamation-triangle" style={{ fontSize: 32, color: '#e74c3c' }}></i>
        <p style={{ marginTop: 12 }}>ไม่พบข้อมูลเคส</p>
        <button className="btn btn-outline" onClick={() => navigate('/sales')} style={{ marginTop: 16 }}>
          <i className="fas fa-arrow-left"></i> กลับหน้าฝ่ายขาย
        </button>
      </div>
    )
  }

  // ==================== โหมดแก้ไข ====================
  let images = parseImages(caseData.images)
  let deedImages = parseImages(caseData.deed_images)

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <button className="btn btn-outline" onClick={() => navigate('/sales')} style={{ padding: '8px 16px' }}>
            <i className="fas fa-arrow-left"></i>
          </button>
          <h2 style={{ margin: 0, fontSize: 20 }}>
            <i className="fas fa-folder-open" style={{ color: 'var(--primary)', marginRight: 8 }}></i>
            ID ลูกหนี้ — <span style={{ color: 'var(--primary)' }}>{caseData.case_code}</span>
            {caseData.contact_name && <span style={{ color: '#64748b', fontSize: 15, fontWeight: 500, marginLeft: 4 }}>({caseData.contact_name})</span>}
          </h2>
          {/* Inline loan_type_detail dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setLoanTypeDropdownOpen(v => !v)}
              style={{
                padding: '4px 12px', fontSize: 13, fontWeight: 600, borderRadius: 20, cursor: 'pointer',
                background: loanTypeDetailBg[loanTypeDetail] || '#f5f5f5',
                color: loanTypeDetailColor[loanTypeDetail] || '#888',
                border: `1.5px solid ${loanTypeDetailColor[loanTypeDetail] || '#ccc'}`,
                display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap'
              }}
            >
              {loanTypeDetailOptions.find(o => o.value === loanTypeDetail)?.label || 'ไม่ระบุ'}
              <i className="fas fa-chevron-down" style={{ fontSize: 10 }}></i>
            </button>
            {loanTypeDropdownOpen && (
              <div style={{
                position: 'absolute', top: '110%', left: 0, zIndex: 200,
                background: '#fff', border: '1px solid #e0e0e0', borderRadius: 8,
                boxShadow: '0 4px 16px rgba(0,0,0,0.12)', minWidth: 130
              }}>
                {loanTypeDetailOptions.map(opt => (
                  <div
                    key={opt.value}
                    onClick={() => handleLoanTypeChange(opt.value)}
                    style={{
                      padding: '9px 16px', cursor: 'pointer', fontSize: 13,
                      fontWeight: loanTypeDetail === opt.value ? 700 : 400,
                      color: loanTypeDetailColor[opt.value] || '#333',
                      background: loanTypeDetail === opt.value ? (loanTypeDetailBg[opt.value] || '#f5f5f5') : '#fff',
                      borderRadius: opt === loanTypeDetailOptions[0] ? '8px 8px 0 0' : (opt === loanTypeDetailOptions[loanTypeDetailOptions.length - 1] ? '0 0 8px 8px' : 0),
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = loanTypeDetailBg[opt.value] || '#f5f5f5'}
                    onMouseLeave={e => e.currentTarget.style.background = loanTypeDetail === opt.value ? (loanTypeDetailBg[opt.value] || '#f5f5f5') : '#fff'}
                  >
                    {opt.label}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <span style={{ fontSize: 13, color: 'var(--gray)' }}>
          สร้างเมื่อ: {formatDate(caseData.created_at)}
        </span>
      </div>

      {msg && <div className="error-msg" style={{ marginBottom: 16 }}>{msg}</div>}
      {success && <div className="success-msg" style={{ marginBottom: 16 }}>{success}</div>}

      <form onSubmit={handleSubmit}>
        <div className="edit-page-grid">

          {/* คอลัมน์ซ้าย */}
          <div>
            <div className="card" style={{ padding: 24, marginBottom: 20 }}>
              <h3 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 700 }}>
                {caseData.case_code}{caseData.contact_name ? ` — ${caseData.contact_name}` : ''}
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-group">
                  <label>ชื่อ-สกุล (เจ้าของทรัพย์)</label>
                  <input type="text" value={caseData.contact_name || ''} readOnly style={{ background: '#f5f5f5' }} />
                </div>
                <div className="form-group">
                  <label>เบอร์โทร (เจ้าของทรัพย์)</label>
                  <input type="text" value={caseData.contact_phone || ''} readOnly style={{ background: '#f5f5f5' }} />
                </div>
              </div>

              <div style={{ marginTop: 12 }}>
                <label style={{ fontSize: 13, fontWeight: 600 }}>รูปหน้าบัตรประชาชน</label>
                {images.filter(img => img.includes('id-cards')).length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
                    {images.filter(img => img.includes('id-cards')).map((img, i) => (
                      <div key={i} style={{ position: 'relative', display: 'inline-block' }}>
                        <button type="button" onClick={() => removeImage('images', img)} style={xBtnOverlay} title="ลบรูป">
                          <i className="fas fa-times"></i>
                        </button>
                        <a href={img.startsWith('/') ? img : `/${img}`} target="_blank" rel="noreferrer">
                          <img src={img.startsWith('/') ? img : `/${img}`} alt={`id-${i}`} style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8, border: '2px solid #e0e0e0' }} onError={(e) => { e.target.style.display = 'none' }} />
                        </a>
                      </div>
                    ))}
                  </div>
                )}
                <input type="file" accept="image/*,.pdf" style={{ marginTop: 6, fontSize: 12 }}
                  onChange={e => { uploadDebtorFile('id_card_image', Array.from(e.target.files)); e.target.value = '' }} />
              </div>

              <div className="form-group" style={{ marginTop: 16 }}>
                <label>ลักษณะทรัพย์</label>
                <input type="text" value={propertyTypeLabel[caseData.property_type] || caseData.property_type || '-'} readOnly style={{ background: '#f5f5f5' }} />
              </div>
            </div>

            <div className="card" style={{ padding: 24, marginBottom: 20 }}>
              <h3 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 700 }}>ข้อมูลทรัพย์</h3>

              <div style={{ display: 'flex', gap: 24, marginBottom: 16, alignItems: 'center' }}>
                <div>
                  <label style={{ fontWeight: 600, fontSize: 13 }}>ทรัพย์ติดภาระหรือไม่</label>
                  <div style={{ marginTop: 6, display: 'flex', gap: 16 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <input type="radio" checked={caseData.has_obligation !== 'yes'} readOnly /> ไม่ติดภาระ
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <input type="radio" checked={caseData.has_obligation === 'yes'} readOnly /> ติดภาระ
                    </label>
                  </div>
                </div>
                {caseData.has_obligation === 'yes' && (
                  <div className="form-group" style={{ margin: 0, flex: 1 }}>
                    <label>จำนวนภาระ</label>
                    <input type="text" value={caseData.obligation_count || '-'} readOnly style={{ background: '#f5f5f5' }} />
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div className="form-group">
                  <label>จังหวัด</label>
                  <input type="text" value={caseData.province || '-'} readOnly style={{ background: '#f5f5f5' }} />
                </div>
                <div className="form-group">
                  <label>อำเภอ</label>
                  <input type="text" value={caseData.district || '-'} readOnly style={{ background: '#f5f5f5' }} />
                </div>
                <div className="form-group">
                  <label>ตำบล</label>
                  <input type="text" value={caseData.subdistrict || '-'} readOnly style={{ background: '#f5f5f5' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div className="form-group">
                  <label>บ้านเลขที่</label>
                  <input type="text" value={caseData.house_no || '-'} readOnly style={{ background: '#f5f5f5' }} />
                </div>
                <div className="form-group">
                  <label>ชื่อหมู่บ้าน / โครงการ</label>
                  <input type="text" value={caseData.village_name || '-'} readOnly style={{ background: '#f5f5f5' }} />
                </div>
              </div>

              <div className="form-group">
                <label>โลเคชั่น</label>
                {caseData.location_url ? (
                  <a href={caseData.location_url} target="_blank" rel="noreferrer"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 12px', background: '#f5f5f5', borderRadius: 8, border: '1px solid #e0e0e0', fontSize: 13, color: '#1565c0', textDecoration: 'none' }}>
                    <i className="fas fa-map-marker-alt"></i> เปิด Google Maps
                  </a>
                ) : (
                  <input type="text" value="-" readOnly style={{ background: '#f5f5f5' }} />
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-group">
                  <label>เลขโฉนด</label>
                  <input type="text" value={caseData.deed_number || '-'} readOnly style={{ background: '#f5f5f5' }} />
                </div>
                <div className="form-group">
                  <label>พื้นที่</label>
                  <input type="text" value={caseData.land_area ? `${caseData.land_area} ตร.วา` : '-'} readOnly style={{ background: '#f5f5f5' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginTop: 16 }}>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600 }}>รูปโฉนด</label>
                  <ImageGrid images={deedImages} label="deed" onDelete={(img) => removeImage('deed_images', img)} />
                  <input type="file" accept="image/*,.pdf" style={{ marginTop: 6, fontSize: 11, width: '100%' }}
                    onChange={e => { uploadDebtorFile('deed_image', Array.from(e.target.files)); e.target.value = '' }} />
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600 }}>รูปภาพทรัพย์</label>
                  <ImageGrid images={images.filter(img => img.includes('properties'))} label="prop" onDelete={(img) => removeImage('images', img)} />
                  <input type="file" accept="image/*,.pdf" multiple style={{ marginTop: 6, fontSize: 11, width: '100%' }}
                    onChange={e => { uploadDebtorFile('property_image', Array.from(e.target.files)); e.target.value = '' }} />
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600 }}>ใบอนุญาตสิ่งปลูกสร้าง</label>
                  <ImageGrid images={images.filter(img => img.includes('permits'))} label="permit" onDelete={(img) => removeImage('images', img)} />
                  <input type="file" accept="image/*,.pdf" style={{ marginTop: 6, fontSize: 11, width: '100%' }}
                    onChange={e => { uploadDebtorFile('building_permit', Array.from(e.target.files)); e.target.value = '' }} />
                </div>
              </div>

              <div style={{ marginTop: 16 }}>
                <label style={{ fontSize: 13, fontWeight: 600 }}>วีดีโอทรัพย์</label>
                {images.filter(img => img.includes('videos')).length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
                    {images.filter(img => img.includes('videos')).map((vid, i) => (
                      <div key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <a href={vid.startsWith('/') ? vid : `/${vid}`} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: 'var(--primary)' }}>
                          <i className="fas fa-video"></i> วิดีโอ {i + 1}
                        </a>
                        <button type="button" onClick={() => removeImage('images', vid)} style={xBtnInline} title="ลบวิดีโอ">
                          <i className="fas fa-times"></i>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <input type="file" accept="video/*" multiple style={{ marginTop: 6, fontSize: 11 }}
                  onChange={e => { uploadDebtorFile('property_video', Array.from(e.target.files)); e.target.value = '' }} />
              </div>

              {/* ข้อมูลเพิ่มเติมทรัพย์ */}
              {caseData.additional_details && (
                <div className="form-group" style={{ marginTop: 16 }}>
                  <label>รายละเอียดทรัพย์เพิ่มเติม</label>
                  <textarea readOnly value={caseData.additional_details} rows={3}
                    style={{ background: '#f5f5f5', width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e0e0e0', fontSize: 13, fontFamily: 'inherit', resize: 'none', boxSizing: 'border-box' }} />
                </div>
              )}

              <div className="form-group" style={{ marginTop: 16 }}>
                <label>เลือกนายหน้า</label>
                <select value={form.agent_id} onChange={e => set('agent_id', e.target.value)}>
                  <option value="">-- เลือกนายหน้า --</option>
                  {agents.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.full_name} {a.nickname ? `(${a.nickname})` : ''} — {a.phone}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginTop: 16, textAlign: 'center' }}>
                <button type="button" className="btn btn-outline" onClick={() => navigate(`/sales/edit/${caseData.loan_request_id}`)} style={{ fontSize: 13 }}>
                  <i className="fas fa-edit"></i> แก้ไขข้อมูลลูกหนี้
                </button>
              </div>
            </div>

            {/* ===== Fact Finding ===== */}
            {(caseData.desired_amount || caseData.interest_rate || caseData.occupation || caseData.loan_purpose || caseData.net_desired_amount || caseData.contract_years || caseData.monthly_income) && (
              <div className="card" style={{ padding: 24, marginBottom: 20, borderLeft: '3px solid #e67e22' }}>
                <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: '#e67e22' }}>
                  <i className="fas fa-clipboard-list" style={{ marginRight: 8 }}></i>ข้อมูลประกอบ (Fact Finding)
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {caseData.desired_amount && (
                    <div className="form-group"><label>วงเงินที่ต้องการ</label>
                      <input type="text" value={caseData.desired_amount} readOnly style={{ background: '#f5f5f5' }} /></div>
                  )}
                  {caseData.interest_rate && (
                    <div className="form-group"><label>ดอกเบี้ย (%/เดือน)</label>
                      <input type="text" value={caseData.interest_rate} readOnly style={{ background: '#f5f5f5' }} /></div>
                  )}
                  {caseData.net_desired_amount && (
                    <div className="form-group"><label>ต้องการเหลือถึงมือ</label>
                      <input type="text" value={caseData.net_desired_amount} readOnly style={{ background: '#f5f5f5' }} /></div>
                  )}
                  {caseData.contract_years && (
                    <div className="form-group"><label>แพลนสัญญา (ปี)</label>
                      <input type="text" value={caseData.contract_years} readOnly style={{ background: '#f5f5f5' }} /></div>
                  )}
                  {caseData.occupation && (
                    <div className="form-group"><label>อาชีพลูกค้า</label>
                      <input type="text" value={caseData.occupation} readOnly style={{ background: '#f5f5f5' }} /></div>
                  )}
                  {caseData.monthly_income && (
                    <div className="form-group"><label>รายได้ต่อเดือน</label>
                      <input type="text" value={caseData.monthly_income} readOnly style={{ background: '#f5f5f5' }} /></div>
                  )}
                </div>
                {caseData.loan_purpose && (
                  <div className="form-group"><label>สาเหตุที่ต้องการเงิน</label>
                    <textarea readOnly value={caseData.loan_purpose} rows={2}
                      style={{ background: '#f5f5f5', width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e0e0e0', fontSize: 13, fontFamily: 'inherit', resize: 'none', boxSizing: 'border-box' }} /></div>
                )}
              </div>
            )}
          </div>

          {/* คอลัมน์ขวา */}
          <div>
            <div className="card" style={{ padding: 24, marginBottom: 20 }}>
              <h3 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 700, color: 'var(--primary)' }}>
                สถานะประเมิน
              </h3>

              <div className="form-group">
                <label style={{ fontWeight: 600 }}>สถานะประเมิน</label>
                <div style={{ display: 'flex', gap: 20, marginTop: 6 }}>
                  {appraisalTypeOptions.map(opt => (
                    <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="appraisal_type"
                        value={opt.value}
                        checked={form.appraisal_type === opt.value}
                        onChange={e => set('appraisal_type', e.target.value)}
                        style={{ accentColor: 'var(--primary)' }}
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
                <div className="form-group">
                  <label>วันที่นัดประเมิน</label>
                  <input type="date" value={form.appraisal_date} onChange={e => set('appraisal_date', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>จำนวนเงิน</label>
                  <input type="number" step="0.01" value={form.appraisal_fee} onChange={e => set('appraisal_fee', e.target.value)} placeholder="4500" />
                </div>
              </div>

              <div className="form-group">
                <label>วันที่ชำระ</label>
                <input type="date" value={form.payment_date} onChange={e => set('payment_date', e.target.value)} />
              </div>

              {/* สลิป */}
              <div className="form-group">
                <label>อัพโหลดสลิป</label>
                <input type="file" accept="image/*,.pdf" ref={slipRef}
                  onChange={e => setEditSlipName(e.target.files[0]?.name || '')} />
                {editSlipName && (
                  <small style={{ color: '#04AA6D', fontSize: 11 }}>
                    {editSlipName} <button type="button" onClick={() => clearFileRef(slipRef, setEditSlipName)} style={xBtnInline} title="ล้างไฟล์"><i className="fas fa-times"></i></button>
                  </small>
                )}
                {caseData.slip_image && (
                  <div style={{ marginTop: 8, position: 'relative', display: 'inline-block' }}>
                    <button type="button" onClick={() => deleteCaseImage('slip_image')}
                      style={xBtnOverlay} title="ลบรูป">
                      <i className="fas fa-times"></i>
                    </button>
                    <a href={`/${caseData.slip_image}`} target="_blank" rel="noreferrer">
                      {/\.pdf$/i.test(caseData.slip_image) ? (
                        <div style={{ width: 100, height: 100, borderRadius: 8, border: '2px solid #e74c3c', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#fff5f5', color: '#e74c3c' }}>
                          <i className="fas fa-file-pdf" style={{ fontSize: 28 }}></i>
                          <span style={{ fontSize: 10, marginTop: 4 }}>PDF</span>
                        </div>
                      ) : (
                        <img src={`/${caseData.slip_image}`} alt="slip" style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: 8, border: '2px solid #e0e0e0' }} onError={(e) => { e.target.style.display = 'none' }} />
                      )}
                    </a>
                  </div>
                )}
              </div>

              {/* เล่มประเมิน */}
              <div className="form-group">
                <label>อัพโหลดเล่มประเมิน</label>
                <input type="file" accept="image/*,.pdf" ref={bookRef}
                  onChange={e => setEditBookName(e.target.files[0]?.name || '')} />
                {editBookName && (
                  <small style={{ color: '#04AA6D', fontSize: 11 }}>
                    {editBookName} <button type="button" onClick={() => clearFileRef(bookRef, setEditBookName)} style={xBtnInline} title="ล้างไฟล์"><i className="fas fa-times"></i></button>
                  </small>
                )}
                {caseData.appraisal_book_image && (
                  <div style={{ marginTop: 8, position: 'relative', display: 'inline-block' }}>
                    <button type="button" onClick={() => deleteCaseImage('appraisal_book_image')}
                      style={xBtnOverlay} title="ลบรูป">
                      <i className="fas fa-times"></i>
                    </button>
                    <a href={`/${caseData.appraisal_book_image}`} target="_blank" rel="noreferrer">
                      {/\.pdf$/i.test(caseData.appraisal_book_image) ? (
                        <div style={{ width: 100, height: 100, borderRadius: 8, border: '2px solid #e74c3c', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#fff5f5', color: '#e74c3c' }}>
                          <i className="fas fa-file-pdf" style={{ fontSize: 28 }}></i>
                          <span style={{ fontSize: 10, marginTop: 4 }}>PDF</span>
                        </div>
                      ) : (
                        <img src={`/${caseData.appraisal_book_image}`} alt="book" style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: 8, border: '2px solid #e0e0e0' }} onError={(e) => { e.target.style.display = 'none' }} />
                      )}
                    </a>
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-group">
                  <label>ผู้บันทึก</label>
                  <input type="text" value={form.recorded_by} onChange={e => set('recorded_by', e.target.value)} placeholder="ชื่อผู้บันทึก" />
                </div>
                <div className="form-group">
                  <label>วันเวลาที่บันทึก</label>
                  <input type="text" value={form.recorded_at ? formatDate(form.recorded_at) : '-'} readOnly style={{ background: '#f5f5f5' }} />
                </div>
              </div>
            </div>

            {/* ===== ผลประเมินจากฝ่ายประเมิน (อ่านอย่างเดียว) ===== */}
            {caseData && (caseData.appraisal_result || caseData.outside_result || caseData.inside_result || caseData.check_price_value) && (
              <div className="card" style={{ padding: 24, marginBottom: 20, borderTop: '3px solid #e65100', background: '#fff8e1' }}>
                <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: '#e65100' }}>
                  <i className="fas fa-clipboard-check" style={{ marginRight: 8 }}></i>
                  ผลประเมินจากฝ่ายประเมิน
                </h3>
                <p style={{ margin: '-8px 0 14px', fontSize: 12, color: '#888' }}>
                  ข้อมูลที่ฝ่ายประเมินกรอกไว้ — แก้ไขได้ที่ฝ่ายประเมินเท่านั้น
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {caseData.appraisal_result && (
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#888' }}>ผลประเมินรวม</div>
                      <span style={{ fontSize: 13, fontWeight: 700, color: caseData.appraisal_result === 'passed' ? '#2e7d32' : '#c62828' }}>
                        {caseData.appraisal_result === 'passed' ? '✓ ผ่านมาตรฐาน' : '✗ ไม่ผ่านมาตรฐาน'}
                      </span>
                    </div>
                  )}
                  {caseData.outside_result && (
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#888' }}>ผลประเมินนอก</div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: caseData.outside_result === 'passed' ? '#2e7d32' : '#c62828' }}>
                        {caseData.outside_result === 'passed' ? 'ผ่าน' : 'ไม่ผ่าน'}
                      </span>
                      {caseData.outside_reason && <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>เหตุผล: {caseData.outside_reason}</div>}
                    </div>
                  )}
                  {caseData.inside_result && (
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#888' }}>ผลประเมินใน</div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: caseData.inside_result === 'passed' ? '#2e7d32' : '#c62828' }}>
                        {caseData.inside_result === 'passed' ? 'ผ่าน' : 'ไม่ผ่าน'}
                      </span>
                      {caseData.inside_reason && <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>เหตุผล: {caseData.inside_reason}</div>}
                    </div>
                  )}
                  {caseData.check_price_value && (
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#888' }}>ราคาเช็คจากเล่มประเมิน</div>
                      <span style={{ fontSize: 16, fontWeight: 700, color: '#e65100' }}>{formatMoney(caseData.check_price_value)} บาท</span>
                      {caseData.check_price_detail && <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>{caseData.check_price_detail}</div>}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ===== ผลอนุมัติจากฝ่ายอนุมัติสินเชื่อ (อ่านอย่างเดียว) ===== */}
            {caseData && (caseData.approved_credit || caseData.approval_status) && (
              <div className="card" style={{ padding: 24, marginBottom: 20, borderTop: '3px solid #1565c0', background: '#f0f9ff' }}>
                <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: '#1565c0' }}>
                  <i className="fas fa-check-circle" style={{ marginRight: 8 }}></i>
                  ผลอนุมัติจากฝ่ายอนุมัติสินเชื่อ
                </h3>
                <p style={{ margin: '-8px 0 14px', fontSize: 12, color: '#888' }}>
                  ข้อมูลที่ฝ่ายอนุมัติกรอกไว้ — แก้ไขได้ที่ฝ่ายอนุมัติเท่านั้น
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {caseData.approval_status && (
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#888' }}>สถานะอนุมัติ</div>
                      <span style={{ fontSize: 13, fontWeight: 700, color: caseData.approval_status === 'approved' ? '#2e7d32' : caseData.approval_status === 'cancelled' ? '#c62828' : '#f57c00' }}>
                        {caseData.approval_status === 'approved' ? '✓ อนุมัติแล้ว' : caseData.approval_status === 'cancelled' ? '✗ ยกเลิก' : '⏳ รอพิจารณา'}
                      </span>
                    </div>
                  )}
                  {caseData.approved_credit && (
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#888' }}>วงเงินที่อนุมัติ</div>
                      <span style={{ fontSize: 16, fontWeight: 700, color: '#1565c0' }}>{formatMoney(caseData.approved_credit)} บาท</span>
                    </div>
                  )}
                  {caseData.interest_per_year && (
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#888' }}>ดอกเบี้ย/ปี</div>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{caseData.interest_per_year}%</span>
                    </div>
                  )}
                  {caseData.operation_fee && (
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#888' }}>ค่าดำเนินการ</div>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{formatMoney(caseData.operation_fee)} บาท</span>
                    </div>
                  )}
                  {caseData.credit_table_file && (
                    <div style={{ gridColumn: '1 / -1' }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#888', marginBottom: 6 }}>ตารางวงเงิน</div>
                      <a href={caseData.credit_table_file.startsWith('/') ? caseData.credit_table_file : `/${caseData.credit_table_file}`}
                        target="_blank" rel="noreferrer"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', background: '#1565c0', color: '#fff', borderRadius: 6, fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>
                        <i className="fas fa-table"></i> เปิดดูตารางวงเงิน
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ข้อมูลการทำธุรกรรม (ฝ่ายขาย → ฝ่ายนิติกรรม) */}
            <div className="card" style={{ padding: 24, marginBottom: 20, borderTop: '3px solid var(--primary)' }}>
              <h3 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 700, color: 'var(--primary)' }}>
                <i className="fas fa-handshake" style={{ marginRight: 8 }}></i>
                ข้อมูลการทำธุรกรรม (ฝ่ายขาย → ฝ่ายนิติกรรม)
              </h3>
              <p style={{ margin: '-12px 0 16px', fontSize: 12, color: '#888' }}>
                กรอกเมื่อนัดหมายวันทำนิติกรรมแล้ว — ฝ่ายนิติจะเห็นข้อมูลนี้เป็นอ้างอิง
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-group">
                  <label>วันที่ธุรกรรม</label>
                  <input type="date" value={form.transaction_date} onChange={e => set('transaction_date', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>เวลา</label>
                  <input type="text" value={form.transaction_time} onChange={e => set('transaction_time', e.target.value)} placeholder="เช่น 10:00" />
                </div>
              </div>

              <div className="form-group" style={{ marginTop: 16 }}>
                <label>สำนักงานที่ดิน</label>
                <input type="text" value={form.transaction_land_office} onChange={e => set('transaction_land_office', e.target.value)} placeholder="เช่น สำนักงานที่ดินจังหวัดนนทบุรี" />
              </div>

              <div className="form-group" style={{ marginTop: 16 }}>
                <label>หมายเหตุ</label>
                <textarea rows="3" value={form.transaction_note} onChange={e => set('transaction_note', e.target.value)} placeholder="รายละเอียดเพิ่มเติม..." style={{ resize: 'vertical' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
                <div className="form-group">
                  <label>ผู้บันทึก</label>
                  <input type="text" value={form.transaction_recorded_by} onChange={e => set('transaction_recorded_by', e.target.value)} placeholder="ชื่อผู้บันทึก" />
                </div>
                <div className="form-group">
                  <label>วันเวลาที่บันทึก</label>
                  <input type="text" value={caseData?.transaction_recorded_at ? new Date(caseData.transaction_recorded_at).toLocaleString('th-TH') : '-'} readOnly style={{ background: '#f5f5f5' }} />
                </div>
              </div>
            </div>

            {/* ===== เอกสารประกอบการประมูล (ฝ่ายขายอัพโหลด → ฝ่ายประมูล) ===== */}
            <div className="card" style={{ padding: 24, marginBottom: 20, borderLeft: '3px solid #2980b9' }}>
              <h3 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 700, color: '#2980b9' }}>
                <i className="fas fa-folder-open" style={{ marginRight: 8 }}></i>
                เอกสารประกอบการประมูล
              </h3>
              <p style={{ margin: '0 0 20px', fontSize: 12, color: '#888' }}>
                อัพโหลดเอกสารเพื่อให้นายทุนดูประกอบการเสนอราคา
              </p>

              {/* เอกสารหลัก */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: '#555', marginBottom: 12,
                  borderBottom: '1px solid #eee', paddingBottom: 6 }}>
                  เอกสารหลัก
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  {AUCTION_DOCS.filter(d => !d.spouse).map(({ field, label, required }) => (
                    <div key={field}>
                      <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>
                        {label} {required && <span style={{ color: '#e74c3c' }}>*</span>}
                      </label>
                      {auctionDocs[field].map((fp, i) => {
                        const ext = fp.split('.').pop().toLowerCase()
                        const isImage = ['jpg','jpeg','png','gif','webp','bmp'].includes(ext)
                        const isPdf = ext === 'pdf'
                        return (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px',
                            background: '#f8f9fa', borderRadius: 8, border: '1px solid #e0e0e0', marginTop: 6 }}>
                            {isImage ? (
                              <a href={`/${fp}`} target="_blank" rel="noreferrer">
                                <img src={`/${fp}`} alt="doc" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 4, border: '1px solid #ccc' }}
                                  onError={e => { e.target.style.display = 'none' }} />
                              </a>
                            ) : (
                              <a href={`/${fp}`} target="_blank" rel="noreferrer"
                                style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#e74c3c', textDecoration: 'none' }}>
                                <i className={`fas ${isPdf ? 'fa-file-pdf' : 'fa-file'}`} style={{ fontSize: 22 }}></i>
                              </a>
                            )}
                            <a href={`/${fp}`} target="_blank" rel="noreferrer"
                              style={{ flex: 1, fontSize: 11, color: 'var(--primary)', wordBreak: 'break-all', textDecoration: 'none' }}>
                              {fp.split('/').pop()}
                            </a>
                            <button type="button" onClick={() => handleAuctionDocRemove(field, fp)}
                              style={{ background: '#e74c3c', color: '#fff', border: 'none', borderRadius: 4, padding: '3px 8px', fontSize: 11, cursor: 'pointer' }}>
                              <i className="fas fa-trash-alt"></i>
                            </button>
                          </div>
                        )
                      })}
                      <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <label style={{
                          display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px',
                          borderRadius: 8, border: '1px dashed #2980b9', background: '#f0f8ff',
                          color: '#2980b9', fontSize: 12, fontWeight: 600, cursor: 'pointer'
                        }}>
                          {uploadingDoc === field
                            ? <><i className="fas fa-spinner fa-spin"></i> กำลังอัพโหลด...</>
                            : <><i className="fas fa-upload"></i> อัพโหลดไฟล์</>
                          }
                          <input type="file" accept="image/*,.pdf" multiple style={{ display: 'none' }}
                            onChange={e => { handleAuctionDocUpload(field, e.target.files); e.target.value = '' }}
                            disabled={uploadingDoc === field} />
                        </label>
                        {auctionDocs[field].length > 0 && (
                          <span style={{ fontSize: 11, color: '#27ae60' }}>
                            <i className="fas fa-check-circle"></i> {auctionDocs[field].length} ไฟล์
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* เอกสารคู่สมรส */}
              <div>
                <div style={{ fontWeight: 700, fontSize: 13, color: '#555', marginBottom: 12,
                  borderBottom: '1px solid #eee', paddingBottom: 6 }}>
                  เอกสารคู่สมรส (ถ้ามีคู่สมรสหรือสมรสไม่จดทะเบียน)
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  {AUCTION_DOCS.filter(d => d.spouse).map(({ field, label }) => (
                    <div key={field}>
                      <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>
                        {label}
                      </label>
                      {auctionDocs[field].map((fp, i) => {
                        const ext = fp.split('.').pop().toLowerCase()
                        const isImage = ['jpg','jpeg','png','gif','webp','bmp'].includes(ext)
                        const isPdf = ext === 'pdf'
                        return (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px',
                            background: '#f8f9fa', borderRadius: 8, border: '1px solid #e0e0e0', marginTop: 6 }}>
                            {isImage ? (
                              <a href={`/${fp}`} target="_blank" rel="noreferrer">
                                <img src={`/${fp}`} alt="doc" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 4, border: '1px solid #ccc' }}
                                  onError={e => { e.target.style.display = 'none' }} />
                              </a>
                            ) : (
                              <a href={`/${fp}`} target="_blank" rel="noreferrer"
                                style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#e74c3c', textDecoration: 'none' }}>
                                <i className={`fas ${isPdf ? 'fa-file-pdf' : 'fa-file'}`} style={{ fontSize: 22 }}></i>
                              </a>
                            )}
                            <a href={`/${fp}`} target="_blank" rel="noreferrer"
                              style={{ flex: 1, fontSize: 11, color: 'var(--primary)', wordBreak: 'break-all', textDecoration: 'none' }}>
                              {fp.split('/').pop()}
                            </a>
                            <button type="button" onClick={() => handleAuctionDocRemove(field, fp)}
                              style={{ background: '#e74c3c', color: '#fff', border: 'none', borderRadius: 4, padding: '3px 8px', fontSize: 11, cursor: 'pointer' }}>
                              <i className="fas fa-trash-alt"></i>
                            </button>
                          </div>
                        )
                      })}
                      <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <label style={{
                          display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px',
                          borderRadius: 8, border: '1px dashed #8e44ad', background: '#f8f0ff',
                          color: '#8e44ad', fontSize: 12, fontWeight: 600, cursor: 'pointer'
                        }}>
                          {uploadingDoc === field
                            ? <><i className="fas fa-spinner fa-spin"></i> กำลังอัพโหลด...</>
                            : <><i className="fas fa-upload"></i> อัพโหลดไฟล์</>
                          }
                          <input type="file" accept="image/*,.pdf" multiple style={{ display: 'none' }}
                            onChange={e => { handleAuctionDocUpload(field, e.target.files); e.target.value = '' }}
                            disabled={uploadingDoc === field} />
                        </label>
                        {auctionDocs[field].length > 0 && (
                          <span style={{ fontSize: 11, color: '#27ae60' }}>
                            <i className="fas fa-check-circle"></i> {auctionDocs[field].length} ไฟล์
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* สถานะเคส */}
            <div className="card" style={{ padding: 24, marginBottom: 20 }}>
              <h3 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 700, color: 'var(--primary)' }}>
                สถานะเคส
              </h3>

              <div className="form-group">
                <label>สถานะ (อัพเดทอัตโนมัติจากแต่ละฝ่าย)</label>
                <input
                  type="text"
                  value={statusLabelMap[form.status] || form.status || '-'}
                  readOnly
                  style={{ background: '#f5f5f5', fontWeight: 600, color: 'var(--primary)' }}
                />
              </div>

              <div className="form-group">
                <label>สถานะการชำระ</label>
                <select value={form.payment_status} onChange={e => set('payment_status', e.target.value)}>
                  {paymentStatusOptions.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>วงเงินอนุมัติ (บาท)</label>
                <input type="number" step="0.01" value={form.approved_amount} onChange={e => set('approved_amount', e.target.value)} placeholder="0" />
              </div>

              <div className="form-group">
                <label>หมายเหตุ</label>
                <textarea rows="3" value={form.note} onChange={e => set('note', e.target.value)} placeholder="บันทึกรายละเอียดเพิ่มเติม..." style={{ resize: 'vertical' }}></textarea>
              </div>
            </div>

            {/* ปุ่มบันทึก */}
            <div style={{ display: 'flex', gap: 12 }}>
              <button type="submit" className="btn btn-primary" disabled={saving} style={{ padding: '12px 32px', flex: 1 }}>
                {saving ? <><i className="fas fa-spinner fa-spin"></i> กำลังบันทึก...</> : <><i className="fas fa-save"></i> บันทึกข้อมูล</>}
              </button>
              <button type="button" className="btn btn-outline" onClick={() => navigate('/sales')} style={{ padding: '12px 24px' }}>
                ยกเลิก
              </button>
            </div>
            <div style={{ marginTop: 12 }}>
              <CancelCaseButton caseId={caseData.id} caseCode={caseData.case_code} caseStatus={caseData.status} onSuccess={() => window.location.reload()} />
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}