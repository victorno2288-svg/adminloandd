import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import '../styles/step-form.css'
import CancelCaseButton from '../components/CancelCaseButton'

const token = () => localStorage.getItem('loandd_admin')
const API = '/api/admin/auction'
const INV_API = '/api/admin/investors'

const appraisalTypeLabel = { outside: 'ประเมินนอก', inside: 'ประเมินใน', check_price: 'เช็คราคา' }
const appraisalResultLabel = { passed: 'ผ่านมาตรฐาน', not_passed: 'ไม่ผ่านมาตรฐาน', '': 'ยังไม่ประเมิน' }
const propertyTypeLabel = { land: 'ที่ดินเปล่า', house: 'บ้านเดี่ยว', condo: 'คอนโด', townhouse: 'ทาวน์เฮ้าส์', other: 'อื่นๆ' }

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

function formatDate(d) {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatMoney(n) {
  if (!n && n !== 0) return '-'
  return Number(n).toLocaleString('th-TH')
}

function toDateTimeInput(d) {
  if (!d) return ''
  const dt = new Date(d)
  if (isNaN(dt.getTime())) return ''
  return dt.toISOString().slice(0, 16)
}

const xBtnStyle = {
  position: 'absolute', top: 3, right: 3, width: 20, height: 20, borderRadius: '50%',
  background: '#e74c3c', border: '2px solid #fff', color: '#fff', fontSize: 9,
  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
  zIndex: 2, padding: 0, lineHeight: 1
}

export default function AuctionEditPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [caseData, setCaseData] = useState(null)
  const [msg, setMsg] = useState('')
  const [success, setSuccess] = useState('')
  const [investorList, setInvestorList] = useState([])

  // เอกสารประมูล (state แยกตาม field)
  const [auctionDocs, setAuctionDocs] = useState({
    house_reg_book: [], house_reg_book_legal: [], name_change_doc: [], divorce_doc: [],
    spouse_consent_doc: [], spouse_id_card: [], spouse_reg_copy: [],
    marriage_cert: [], spouse_name_change_doc: []
  })
  const [uploadingDoc, setUploadingDoc] = useState(null) // field ที่กำลัง upload

  // ประวัติการเสนอราคา
  const [bids, setBids] = useState([])
  const [bidForm, setBidForm] = useState({
    investor_id: '', investor_name: '', investor_code: '', investor_phone: '',
    bid_amount: '', bid_date: '', note: '', recorded_by: ''
  })
  const [showBidForm, setShowBidForm] = useState(false)
  const [savingBid, setSavingBid] = useState(false)
  const [deletingBid, setDeletingBid] = useState(null)

  const [form, setForm] = useState({
    investor_id: '', investor_name: '', investor_code: '', investor_phone: '',
    investor_type: '', property_value: '', selling_pledge_amount: '', interest_rate: '',
    auction_land_area: '', contract_years: '',
    auction_status: 'pending', is_cancelled: 0,
    recorded_by: '', recorded_at: '',
  })

  // ดึงรายชื่อนายทุนสำหรับ dropdown
  useEffect(() => {
    fetch(INV_API, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json())
      .then(d => { if (d.success) setInvestorList(d.data || []) })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!id) return
    fetch(`${API}/cases/${id}`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setCaseData(d.caseData)
          setForm({
            investor_id: d.caseData.investor_id || '',
            investor_name: d.caseData.investor_name || '',
            investor_code: d.caseData.investor_code || '',
            investor_phone: d.caseData.investor_phone || '',
            investor_type: d.caseData.investor_type || '',
            property_value: d.caseData.property_value || '',
            selling_pledge_amount: d.caseData.selling_pledge_amount || '',
            interest_rate: d.caseData.interest_rate || '',
            auction_land_area: d.caseData.auction_land_area || '',
            contract_years: d.caseData.contract_years || '',
            auction_status: d.caseData.auction_status || 'pending',
            is_cancelled: d.caseData.is_cancelled || 0,
            recorded_by: d.caseData.recorded_by || '',
            recorded_at: toDateTimeInput(d.caseData.recorded_at),
          })
          // โหลดเอกสารประมูล
          const docs = {}
          AUCTION_DOCS.forEach(({ field }) => {
            try { docs[field] = JSON.parse(d.caseData[field] || '[]') || [] } catch { docs[field] = [] }
          })
          setAuctionDocs(docs)
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))

    // โหลดประวัติการเสนอราคา
    fetch(`${API}/cases/${id}/bids`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json())
      .then(d => { if (d.success) setBids(d.bids || []) })
      .catch(() => {})
  }, [id])

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }))

  // เมื่อเลือกนายทุน → auto-fill
  const handleInvestorSelect = (investorId) => {
    if (!investorId) {
      setForm(prev => ({ ...prev, investor_id: '', investor_name: '', investor_code: '', investor_phone: '' }))
      return
    }
    const inv = investorList.find(i => String(i.id) === String(investorId))
    if (inv) {
      setForm(prev => ({
        ...prev,
        investor_id: inv.id,
        investor_name: inv.full_name || '',
        investor_code: inv.investor_code || '',
        investor_phone: inv.phone || ''
      }))
    }
  }

  // เมื่อเลือกนายทุนใน bid form → auto-fill
  const handleBidInvestorSelect = (investorId) => {
    if (!investorId) {
      setBidForm(prev => ({ ...prev, investor_id: '', investor_name: '', investor_code: '', investor_phone: '' }))
      return
    }
    const inv = investorList.find(i => String(i.id) === String(investorId))
    if (inv) {
      setBidForm(prev => ({
        ...prev,
        investor_id: inv.id,
        investor_name: inv.full_name || '',
        investor_code: inv.investor_code || '',
        investor_phone: inv.phone || ''
      }))
    }
  }

  // อัพโหลดเอกสารทันทีเมื่อเลือกไฟล์
  const handleDocUpload = async (field, files) => {
    if (!files || files.length === 0) return
    setUploadingDoc(field)
    try {
      const fd = new FormData()
      for (const f of Array.from(files)) fd.append(field, f)
      const res = await fetch(`${API}/cases/${id}/docs`, {
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

  // ลบเอกสารทีละไฟล์
  const handleDocRemove = async (field, filePath) => {
    if (!confirm('ต้องการลบไฟล์นี้?')) return
    try {
      const res = await fetch(`${API}/cases/${id}/docs/remove`, {
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

  // เพิ่มการเสนอราคา
  const handleAddBid = async (e) => {
    e.preventDefault()
    setSavingBid(true)
    try {
      const res = await fetch(`${API}/cases/${id}/bids`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify(bidForm)
      })
      const data = await res.json()
      if (data.success) {
        // โหลดใหม่
        const r2 = await fetch(`${API}/cases/${id}/bids`, { headers: { Authorization: `Bearer ${token()}` } })
        const d2 = await r2.json()
        if (d2.success) setBids(d2.bids || [])
        setBidForm({ investor_id: '', investor_name: '', investor_code: '', investor_phone: '', bid_amount: '', bid_date: '', note: '', recorded_by: '' })
        setShowBidForm(false)
      }
    } catch {}
    setSavingBid(false)
  }

  // ลบการเสนอราคา
  const handleDeleteBid = async (bidId) => {
    if (!confirm('ต้องการลบรายการเสนอราคานี้?')) return
    setDeletingBid(bidId)
    try {
      await fetch(`${API}/bids/${bidId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token()}` }
      })
      setBids(prev => prev.filter(b => b.id !== bidId))
    } catch {}
    setDeletingBid(null)
  }

  // บันทึกข้อมูลประมูล
  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setMsg('')
    setSuccess('')
    try {
      const payload = { ...form }
      if (Number(payload.is_cancelled) === 1) payload.auction_status = 'cancelled'
      const res = await fetch(`${API}/cases/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify(payload)
      })
      const data = await res.json()
      if (data.success) {
        setSuccess('บันทึกข้อมูลสำเร็จ!')
        setTimeout(() => navigate('/auction'), 1000)
      } else {
        setMsg(data.message || 'เกิดข้อผิดพลาด')
      }
    } catch {
      setMsg('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้')
    }
    setSaving(false)
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0' }}>
        <i className="fas fa-spinner fa-spin" style={{ fontSize: 32, color: 'var(--primary)' }}></i>
        <p style={{ marginTop: 12 }}>กำลังโหลดข้อมูล...</p>
      </div>
    )
  }

  if (!caseData) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0' }}>
        <i className="fas fa-exclamation-triangle" style={{ fontSize: 32, color: '#e74c3c' }}></i>
        <p style={{ marginTop: 12 }}>ไม่พบข้อมูลเคส</p>
        <button className="btn btn-outline" onClick={() => navigate('/auction')} style={{ marginTop: 16 }}>
          <i className="fas fa-arrow-left"></i> กลับหน้าฝ่ายประมูลทรัพย์
        </button>
      </div>
    )
  }

  const parseImages = (jsonStr) => {
    try { return JSON.parse(jsonStr) || [] } catch { return [] }
  }

  let images = parseImages(caseData.images)
  let deedImages = parseImages(caseData.deed_images)
  let appraisalImages = parseImages(caseData.appraisal_images)

  const ImageGrid = ({ imgList, label }) => {
    if (!imgList || imgList.length === 0) return <span style={{ fontSize: 12, color: '#999' }}>ไม่มีรูป</span>
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
        {imgList.map((img, i) => {
          const src = img.startsWith('/') ? img : `/${img}`
          const isFilePdf = img.toLowerCase().includes('.pdf')
          return (
            <a key={i} href={src} target="_blank" rel="noreferrer"
              style={{ display: 'inline-block', textDecoration: 'none' }}>
              {isFilePdf ? (
                <div style={{ width: 60, height: 60, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRadius: 6, border: '1px solid #f5c6c6', background: '#fff5f5', gap: 2 }}>
                  <i className="fas fa-file-pdf" style={{ fontSize: 20, color: '#e53935' }}></i>
                  <span style={{ fontSize: 8, color: '#e53935', fontWeight: 600 }}>PDF</span>
                </div>
              ) : (
                <img src={src} alt={`${label}-${i}`}
                  style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 6, border: '1px solid #ddd' }}
                  onError={e => { e.target.style.display = 'none' }} />
              )}
            </a>
          )
        })}
      </div>
    )
  }

  // Component: แสดงไฟล์เอกสารพร้อม Preview + ลบ
  const DocFileRow = ({ filePath, onDelete }) => {
    const ext = filePath.split('.').pop().toLowerCase()
    const isImage = ['jpg','jpeg','png','gif','webp','bmp'].includes(ext)
    const isPdf = ext === 'pdf'
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px',
        background: '#f8f9fa', borderRadius: 8, border: '1px solid #e0e0e0', marginTop: 6 }}>
        {isImage ? (
          <a href={`/${filePath}`} target="_blank" rel="noreferrer">
            <img src={`/${filePath}`} alt="doc" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 4, border: '1px solid #ccc' }}
              onError={e => { e.target.style.display = 'none' }} />
          </a>
        ) : (
          <a href={`/${filePath}`} target="_blank" rel="noreferrer"
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#e74c3c', textDecoration: 'none' }}>
            <i className={`fas ${isPdf ? 'fa-file-pdf' : 'fa-file'}`} style={{ fontSize: 22 }}></i>
          </a>
        )}
        <a href={`/${filePath}`} target="_blank" rel="noreferrer"
          style={{ flex: 1, fontSize: 11, color: 'var(--primary)', wordBreak: 'break-all', textDecoration: 'none' }}>
          {filePath.split('/').pop()}
        </a>
        <button type="button" onClick={onDelete}
          style={{ background: '#e74c3c', color: '#fff', border: 'none', borderRadius: 4, padding: '3px 8px', fontSize: 11, cursor: 'pointer' }}>
          <i className="fas fa-trash-alt"></i>
        </button>
      </div>
    )
  }

  // ==================== RENDER ====================
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn btn-outline" onClick={() => navigate('/auction')} style={{ padding: '8px 16px' }}>
            <i className="fas fa-arrow-left"></i>
          </button>
          <h2 style={{ margin: 0, fontSize: 20 }}>
            <i className="fas fa-gavel" style={{ color: 'var(--primary)', marginRight: 8 }}></i>
            แก้ไขเคส (ฝ่ายประมูลทรัพย์) — <span style={{ color: 'var(--primary)' }}>{caseData.case_code}</span>
            {caseData.contact_name && <span style={{ color: '#64748b', fontSize: 15, fontWeight: 500, marginLeft: 4 }}>({caseData.contact_name})</span>}
          </h2>
        </div>
        <span style={{ fontSize: 13, color: 'var(--gray)' }}>
          สร้างเมื่อ: {formatDate(caseData.created_at)}
        </span>
      </div>

      {msg && <div className="error-msg" style={{ marginBottom: 16 }}>{msg}</div>}
      {success && <div className="success-msg" style={{ marginBottom: 16 }}>{success}</div>}

      <form onSubmit={handleSubmit}>
        <div className="edit-page-grid">

          {/* ===== คอลัมน์ซ้าย ===== */}
          <div>
            {/* ข้อมูลลูกหนี้ */}
            <div className="card" style={{ padding: 24, marginBottom: 20 }}>
              <h3 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 700 }}>
                {caseData.case_code}{caseData.contact_name ? ` — ${caseData.contact_name}` : ' — ข้อมูลลูกหนี้'}
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-group">
                  <label>ชื่อ-สกุล (เจ้าของทรัพย์)</label>
                  <input type="text" value={caseData.contact_name || ''} readOnly style={{ background: '#f5f5f5' }} />
                </div>
                <div className="form-group">
                  <label>เบอร์โทร</label>
                  <input type="text" value={caseData.contact_phone || ''} readOnly style={{ background: '#f5f5f5' }} />
                </div>
              </div>
              {images.filter(img => img.includes('id-cards')).length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <label style={{ fontSize: 13, fontWeight: 600 }}>รูปหน้าบัตรประชาชน</label>
                  <ImageGrid imgList={images.filter(img => img.includes('id-cards'))} label="id" />
                </div>
              )}
              <div className="form-group" style={{ marginTop: 16 }}>
                <label>ลักษณะทรัพย์</label>
                <input type="text" value={propertyTypeLabel[caseData.property_type] || caseData.property_type || '-'} readOnly style={{ background: '#f5f5f5' }} />
              </div>
            </div>

            {/* ข้อมูลทรัพย์ */}
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
                <div className="form-group"><label>จังหวัด</label>
                  <input type="text" value={caseData.province || '-'} readOnly style={{ background: '#f5f5f5' }} /></div>
                <div className="form-group"><label>อำเภอ</label>
                  <input type="text" value={caseData.district || '-'} readOnly style={{ background: '#f5f5f5' }} /></div>
                <div className="form-group"><label>ตำบล</label>
                  <input type="text" value={caseData.subdistrict || '-'} readOnly style={{ background: '#f5f5f5' }} /></div>
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
                <div className="form-group"><label>เลขโฉนด</label>
                  <input type="text" value={caseData.deed_number || '-'} readOnly style={{ background: '#f5f5f5' }} /></div>
                <div className="form-group"><label>พื้นที่</label>
                  <input type="text" value={caseData.land_area ? `${caseData.land_area} ตร.วา` : '-'} readOnly style={{ background: '#f5f5f5' }} /></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginTop: 16 }}>
                <div><label style={{ fontSize: 13, fontWeight: 600 }}>รูปโฉนด</label>
                  <ImageGrid imgList={deedImages} label="deed" /></div>
                <div><label style={{ fontSize: 13, fontWeight: 600 }}>รูปทรัพย์จากลูกค้า</label>
                  <ImageGrid imgList={images.filter(img => img.includes('properties'))} label="prop" /></div>
                <div><label style={{ fontSize: 13, fontWeight: 600 }}>ใบอนุญาตสิ่งปลูกสร้าง</label>
                  <ImageGrid imgList={images.filter(img => img.includes('permits'))} label="permit" /></div>
              </div>

              <div style={{ marginTop: 16 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#15803d' }}>
                  <i className="fas fa-search-location" style={{ marginRight: 4 }}></i>
                  รูปทรัพย์จากฝ่ายประเมิน (ลงพื้นที่)
                </label>
                <ImageGrid imgList={appraisalImages} label="appraisal-prop" />
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
            </div>

            {/* ===== เอกสารประกอบการประมูล ===== */}
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
                  {AUCTION_DOCS.filter(d => !d.spouse && ['house_reg_book','house_reg_book_legal','name_change_doc','divorce_doc'].includes(d.field)).map(({ field, label, required }) => (
                    <div key={field}>
                      <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>
                        {label} {required && <span style={{ color: '#e74c3c' }}>*</span>}
                      </label>
                      {auctionDocs[field].map((fp, i) => (
                        <DocFileRow key={i} filePath={fp} onDelete={() => handleDocRemove(field, fp)} />
                      ))}
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
                            onChange={e => { handleDocUpload(field, e.target.files); e.target.value = '' }}
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
                      {auctionDocs[field].map((fp, i) => (
                        <DocFileRow key={i} filePath={fp} onDelete={() => handleDocRemove(field, fp)} />
                      ))}
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
                            onChange={e => { handleDocUpload(field, e.target.files); e.target.value = '' }}
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

            {/* ===== ประวัติการเสนอราคา ===== */}
            <div className="card" style={{ padding: 24, marginBottom: 20, borderLeft: '3px solid #e67e22' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#e67e22' }}>
                  <i className="fas fa-history" style={{ marginRight: 8 }}></i>
                  ประวัติการเสนอราคา ({bids.length})
                </h3>
                <button
                  type="button"
                  onClick={() => setShowBidForm(v => !v)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 16px',
                    borderRadius: 8, border: '1px solid #e67e22', background: showBidForm ? '#e67e22' : '#fff8f0',
                    color: showBidForm ? '#fff' : '#e67e22', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                  <i className={`fas ${showBidForm ? 'fa-times' : 'fa-plus'}`}></i>
                  {showBidForm ? 'ปิด' : 'เพิ่มการเสนอราคา'}
                </button>
              </div>

              {/* ฟอร์มเพิ่ม bid */}
              {showBidForm && (
                <div style={{ background: '#fffbf0', border: '1px solid #fde', borderRadius: 10, padding: 16, marginBottom: 16 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: '#e67e22', marginBottom: 12 }}>เพิ่มการเสนอราคาใหม่</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div className="form-group">
                      <label>เลือกนายทุน</label>
                      <select value={bidForm.investor_id} onChange={e => handleBidInvestorSelect(e.target.value)}>
                        <option value="">-- เลือกนายทุน --</option>
                        {investorList.map(inv => (
                          <option key={inv.id} value={inv.id}>{inv.investor_code} — {inv.full_name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>ชื่อนายทุน</label>
                      <input type="text" value={bidForm.investor_name}
                        onChange={e => setBidForm(p => ({ ...p, investor_name: e.target.value }))}
                        placeholder="กรอกชื่อนายทุน" />
                    </div>
                    <div className="form-group">
                      <label>ยอดเสนอราคา (บาท)</label>
                      <input type="number" value={bidForm.bid_amount}
                        onChange={e => setBidForm(p => ({ ...p, bid_amount: e.target.value }))}
                        placeholder="ระบุยอดเงิน" />
                    </div>
                    <div className="form-group">
                      <label>วันที่เสนอราคา</label>
                      <input type="date" value={bidForm.bid_date}
                        onChange={e => setBidForm(p => ({ ...p, bid_date: e.target.value }))} />
                    </div>
                    <div className="form-group">
                      <label>ผู้บันทึก</label>
                      <input type="text" value={bidForm.recorded_by}
                        onChange={e => setBidForm(p => ({ ...p, recorded_by: e.target.value }))}
                        placeholder="ชื่อผู้บันทึก" />
                    </div>
                    <div className="form-group">
                      <label>หมายเหตุ</label>
                      <input type="text" value={bidForm.note}
                        onChange={e => setBidForm(p => ({ ...p, note: e.target.value }))}
                        placeholder="หมายเหตุเพิ่มเติม" />
                    </div>
                  </div>
                  <button type="button" onClick={handleAddBid} disabled={savingBid}
                    className="btn btn-primary" style={{ marginTop: 8, padding: '8px 24px' }}>
                    {savingBid ? <><i className="fas fa-spinner fa-spin"></i> กำลังบันทึก...</> : <><i className="fas fa-save"></i> บันทึกการเสนอราคา</>}
                  </button>
                </div>
              )}

              {/* ตารางประวัติ bids */}
              {bids.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px 0', color: '#bbb', fontSize: 13 }}>
                  <i className="fas fa-inbox" style={{ fontSize: 24, display: 'block', marginBottom: 6 }}></i>
                  ยังไม่มีประวัติการเสนอราคา
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: '#fff8f0' }}>
                        <th style={{ padding: '8px 10px', textAlign: 'left', borderBottom: '2px solid #fde' }}>ลำดับ</th>
                        <th style={{ padding: '8px 10px', textAlign: 'left', borderBottom: '2px solid #fde' }}>นายทุน</th>
                        <th style={{ padding: '8px 10px', textAlign: 'right', borderBottom: '2px solid #fde' }}>ยอดเสนอ (บาท)</th>
                        <th style={{ padding: '8px 10px', textAlign: 'left', borderBottom: '2px solid #fde' }}>วันที่</th>
                        <th style={{ padding: '8px 10px', textAlign: 'left', borderBottom: '2px solid #fde' }}>หมายเหตุ</th>
                        <th style={{ padding: '8px 10px', textAlign: 'left', borderBottom: '2px solid #fde' }}>ผู้บันทึก</th>
                        <th style={{ padding: '8px 10px', textAlign: 'center', borderBottom: '2px solid #fde' }}>ลบ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bids.map((bid, i) => (
                        <tr key={bid.id} style={{ borderBottom: '1px solid #f5f5f5' }}>
                          <td style={{ padding: '8px 10px', color: '#888', fontSize: 12 }}>{i + 1}</td>
                          <td style={{ padding: '8px 10px', fontWeight: 600 }}>
                            {bid.investor_name || '-'}
                            {bid.investor_code && <span style={{ color: '#888', fontSize: 11, marginLeft: 4 }}>({bid.investor_code})</span>}
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: '#27ae60' }}>
                            {bid.bid_amount ? `฿${formatMoney(bid.bid_amount)}` : '-'}
                          </td>
                          <td style={{ padding: '8px 10px' }}>
                            {bid.bid_date ? new Date(bid.bid_date).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                          </td>
                          <td style={{ padding: '8px 10px', color: '#666', fontSize: 12 }}>{bid.note || '-'}</td>
                          <td style={{ padding: '8px 10px', color: '#888', fontSize: 11 }}>{bid.recorded_by || '-'}</td>
                          <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                            <button type="button" onClick={() => handleDeleteBid(bid.id)} disabled={deletingBid === bid.id}
                              style={{ background: '#e74c3c', color: '#fff', border: 'none', borderRadius: 6,
                                padding: '4px 10px', fontSize: 12, cursor: 'pointer', opacity: deletingBid === bid.id ? 0.5 : 1 }}>
                              <i className={`fas ${deletingBid === bid.id ? 'fa-spinner fa-spin' : 'fa-trash-alt'}`}></i>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* นายหน้า */}
            <div className="card" style={{ padding: 24, marginBottom: 20 }}>
              <h3 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 700, color: 'var(--primary)' }}>
                <i className="fas fa-user-tie" style={{ marginRight: 8 }}></i>นายหน้า
              </h3>
              <div className="form-group">
                <label>ชื่อนายหน้า</label>
                <input type="text" value={caseData.agent_name || ''} readOnly style={{ background: '#f5f5f5' }} />
              </div>
            </div>

            {/* สถานะประเมิน */}
            <div className="card" style={{ padding: 24, marginBottom: 20 }}>
              <h3 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 700, color: 'var(--primary)' }}>
                <i className="fas fa-clipboard-check" style={{ marginRight: 8 }}></i>สถานะประเมิน
              </h3>
              <div className="form-group">
                <label>สถานะประเมิน</label>
                <input type="text" value={appraisalTypeLabel[caseData.appraisal_type] || caseData.appraisal_type || '-'} readOnly style={{ background: '#f5f5f5' }} />
              </div>
              <div className="form-group" style={{ marginTop: 16 }}>
                <label>ผลประเมิน</label>
                <input type="text" value={appraisalResultLabel[caseData.appraisal_result || ''] || caseData.appraisal_result || '-'} readOnly style={{ background: '#f5f5f5' }} />
              </div>
              {caseData.appraisal_book_image && (() => {
                const ext = caseData.appraisal_book_image.split('.').pop().toLowerCase()
                const isImage = ['jpg','jpeg','png','gif','webp','bmp'].includes(ext)
                const isPdf = ext === 'pdf'
                return (
                  <div className="form-group" style={{ marginTop: 16 }}>
                    <label>ไฟล์เล่มประเมิน</label>
                    <div>
                      <a href={`/${caseData.appraisal_book_image}`} target="_blank" rel="noreferrer"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8,
                          border: '1px solid var(--primary)', background: '#f0faf5', color: 'var(--primary)', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
                        <i className={`fas ${isPdf ? 'fa-file-pdf' : isImage ? 'fa-file-image' : 'fa-file'}`}></i> ดูไฟล์เล่มประเมิน
                      </a>
                    </div>
                    {isImage && (
                      <div style={{ marginTop: 8 }}>
                        <img src={`/${caseData.appraisal_book_image}`} alt="เล่มประเมิน"
                          style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 8, border: '1px solid #ddd' }}
                          onError={e => { e.target.style.display = 'none' }} />
                      </div>
                    )}
                  </div>
                )
              })()}
            </div>
          </div>

          {/* ===== คอลัมน์ขวา: แก้ไขได้ ===== */}
          <div>
            {/* ผู้ชนะการประมูล */}
            <div className="card" style={{ padding: 24, marginBottom: 20 }}>
              <h3 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 700, color: 'var(--primary)' }}>
                <i className="fas fa-trophy" style={{ marginRight: 8 }}></i>ผู้ชนะการประมูล (นายทุน)
              </h3>
              <div className="form-group">
                <label>เลือกนายทุน</label>
                <select value={form.investor_id || ''} onChange={e => handleInvestorSelect(e.target.value)}>
                  <option value="">-- เลือกนายทุน --</option>
                  {investorList.map(inv => (
                    <option key={inv.id} value={inv.id}>{inv.investor_code} — {inv.full_name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>ชื่อนายทุน</label>
                <input type="text" value={form.investor_name} readOnly style={{ background: '#f5f5f5' }} placeholder="ระบุชื่อนายทุน" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-group">
                  <label>รหัสนายทุน</label>
                  <input type="text" value={form.investor_code} readOnly style={{ background: '#f5f5f5' }} />
                </div>
                <div className="form-group">
                  <label>เบอร์โทรนายทุน</label>
                  <input type="text" value={form.investor_phone} readOnly style={{ background: '#f5f5f5' }} />
                </div>
              </div>
              <div style={{ marginTop: 16 }}>
                <label style={{ fontWeight: 600, fontSize: 13, display: 'block', marginBottom: 10 }}>ประเภทนายทุน</label>
                <div style={{ display: 'flex', gap: 24 }}>
                  {[{ value: 'corporate', label: 'นิติบุคคล' }, { value: 'individual', label: 'บุคคลธรรมดา' }].map(opt => (
                    <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                      <input type="radio" name="investor_type" value={opt.value}
                        checked={form.investor_type === opt.value}
                        onChange={e => set('investor_type', e.target.value)}
                        style={{ width: 18, height: 18 }} />
                      <span>{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* ข้อมูลทรัพย์ (ฝ่ายประมูล) */}
            <div className="card" style={{ padding: 24, marginBottom: 20 }}>
              <h3 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 700, color: 'var(--primary)' }}>
                <i className="fas fa-building" style={{ marginRight: 8 }}></i>ข้อมูลทรัพย์
              </h3>
              <div className="form-group">
                <label>มูลค่าทรัพย์ (บาท)</label>
                <input type="number" value={form.property_value} onChange={e => set('property_value', e.target.value)} placeholder="ระบุมูลค่าทรัพย์" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-group">
                  <label>วงเงินขายฝาก (บาท)</label>
                  <input type="number" value={form.selling_pledge_amount} onChange={e => set('selling_pledge_amount', e.target.value)} placeholder="วงเงินขายฝาก" />
                </div>
                <div className="form-group">
                  <label>ดอกเบี้ย (%)</label>
                  <input type="number" step="0.01" value={form.interest_rate} onChange={e => set('interest_rate', e.target.value)} placeholder="ดอกเบี้ย" />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-group">
                  <label>ขนาดพื้นที่</label>
                  <input type="text" value={form.auction_land_area} onChange={e => set('auction_land_area', e.target.value)} placeholder="เช่น 100 ตร.วา" />
                </div>
                <div className="form-group">
                  <label>ปีสัญญา</label>
                  <input type="number" value={form.contract_years} onChange={e => set('contract_years', e.target.value)} placeholder="จำนวนปี" />
                </div>
              </div>
            </div>

            {/* สถานะประมูล */}
            <div className="card" style={{ padding: 24, marginBottom: 20 }}>
              <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 700, color: 'var(--primary)' }}>
                <i className="fas fa-flag" style={{ marginRight: 8 }}></i>สถานะประมูล
              </h3>
              <p style={{ fontSize: 12, color: '#888', margin: '0 0 16px' }}>เลือกสถานะแล้วกดบันทึก จะเชื่อมไปที่ฝ่ายขายอัตโนมัติ</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { value: 'pending', label: 'รอประมูล', badgeClass: 'badge-pending' },
                  { value: 'auctioned', label: 'ประมูลเสร็จสิ้น', badgeClass: 'badge-paid' },
                ].map(opt => (
                  <label key={opt.value} style={{
                    display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '10px 16px', borderRadius: 8,
                    border: form.auction_status === opt.value ? `2px solid var(--primary)` : '1px solid #ddd',
                    background: form.auction_status === opt.value ? '#f0faf5' : '#fff', transition: 'all 0.15s'
                  }}>
                    <input type="radio" name="auction_status" value={opt.value}
                      checked={form.auction_status === opt.value}
                      onChange={e => set('auction_status', e.target.value)}
                      style={{ width: 18, height: 18 }} />
                    <div>
                      <span style={{ fontWeight: 600 }}>{opt.label}</span>
                      <span className={`badge ${opt.badgeClass}`} style={{ marginLeft: 8, fontSize: 11 }}>{opt.value}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* ข้อมูลเพิ่มเติม + ผู้บันทึก */}
            <div className="card" style={{ padding: 24, marginBottom: 20 }}>
              <h3 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 700, color: 'var(--primary)' }}>
                <i className="fas fa-cog" style={{ marginRight: 8 }}></i>ข้อมูลเพิ่มเติม
              </h3>
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                  <input type="checkbox" checked={Number(form.is_cancelled) === 1}
                    onChange={e => set('is_cancelled', e.target.checked ? 1 : 0)}
                    style={{ width: 18, height: 18 }} />
                  <span style={{ fontWeight: 600, color: '#e74c3c' }}>ยกเลิกเคส</span>
                </label>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-group">
                  <label>ผู้บันทึก</label>
                  <input type="text" value={form.recorded_by} onChange={e => set('recorded_by', e.target.value)} placeholder="ชื่อผู้บันทึก" />
                </div>
                <div className="form-group">
                  <label>วันเวลาที่บันทึก</label>
                  <input type="datetime-local" value={form.recorded_at} onChange={e => set('recorded_at', e.target.value)} />
                </div>
              </div>
            </div>

            {/* ปุ่มบันทึก */}
            <div style={{ display: 'flex', gap: 12 }}>
              <button type="submit" className="btn btn-primary" disabled={saving} style={{ padding: '12px 32px', flex: 1 }}>
                {saving ? <><i className="fas fa-spinner fa-spin"></i> กำลังบันทึก...</> : <><i className="fas fa-save"></i> บันทึกข้อมูล</>}
              </button>
              <button type="button" className="btn btn-outline" onClick={() => navigate('/auction')} style={{ padding: '12px 24px' }}>
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
