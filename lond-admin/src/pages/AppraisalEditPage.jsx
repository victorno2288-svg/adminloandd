import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import '../styles/step-form.css'
import CancelCaseButton from '../components/CancelCaseButton'

const token = () => localStorage.getItem('loandd_admin')
const API = '/api/admin/appraisal'

const appraisalTypeOptions = [
  { value: 'outside', label: 'ประเมินนอก' },
  { value: 'inside', label: 'ประเมินใน' },
  { value: 'check_price', label: 'เช็คราคา' },
]

const appraisalResultOptions = [
  { value: '', label: '-- ยังไม่ประเมิน --' },
  { value: 'passed', label: 'ผ่านมาตรฐาน' },
  { value: 'not_passed', label: 'ไม่ผ่านมาตรฐาน' },
]

// สถานะเคส (แสดงอย่างเดียว — auto จาก appraisal_result)
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

const propertyTypeLabel = { land: 'ที่ดินเปล่า', house: 'บ้านเดี่ยว', condo: 'คอนโด', townhouse: 'ทาวน์เฮ้าส์', other: 'อื่นๆ' }

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

const xBtnOverlay = {
  position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: '50%',
  background: '#e74c3c', border: '2px solid #fff', color: '#fff', fontSize: 11,
  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
  boxShadow: '0 1px 4px rgba(0,0,0,0.3)', zIndex: 2, padding: 0, lineHeight: 1
}

const xBtnInline = {
  background: '#e74c3c', color: '#fff', border: 'none', borderRadius: '50%',
  width: 18, height: 18, fontSize: 9, cursor: 'pointer', display: 'inline-flex',
  alignItems: 'center', justifyContent: 'center', padding: 0, lineHeight: 1,
  verticalAlign: 'middle', marginLeft: 6
}

export default function AppraisalEditPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [caseData, setCaseData] = useState(null)
  const [msg, setMsg] = useState('')
  const [success, setSuccess] = useState('')

  const slipRef = useRef(null)
  const bookRef = useRef(null)
  const propImgRef = useRef(null)
  const [editSlipName, setEditSlipName] = useState('')
  const [editBookName, setEditBookName] = useState('')
  const [propUploadNames, setPropUploadNames] = useState([])
  const [propUploading, setPropUploading] = useState(false)
  const [propMsg, setPropMsg] = useState('')

  const [form, setForm] = useState({
    appraisal_type: 'outside',
    appraisal_result: '',
    appraisal_date: '',
    appraisal_fee: '',
    payment_date: '',
    payment_status: 'unpaid',
    status: 'pending_approve',
    approved_amount: '',
    note: '',
    recorded_by: '',
    recorded_at: '',
    outside_result: '',
    outside_reason: '',
    inside_result: '',
    inside_reason: '',
    check_price_value: '',
    check_price_detail: '',
  })

  useEffect(() => {
    fetch(`${API}/cases/${id}`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setCaseData(d.caseData)
          setForm({
            appraisal_type: d.caseData.appraisal_type || 'outside',
            appraisal_result: d.caseData.appraisal_result || '',
            appraisal_date: toDateInput(d.caseData.appraisal_date),
            appraisal_fee: d.caseData.appraisal_fee || '',
            payment_date: toDateInput(d.caseData.payment_date),
            payment_status: d.caseData.payment_status || 'unpaid',
            status: d.caseData.status || 'pending_approve',
            approved_amount: d.caseData.approved_amount || '',
            note: d.caseData.note || '',
            recorded_by: d.caseData.recorded_by || '',
            recorded_at: d.caseData.recorded_at || '',
            outside_result: d.caseData.outside_result || '',
            outside_reason: d.caseData.outside_reason || '',
            inside_result: d.caseData.inside_result || '',
            inside_reason: d.caseData.inside_reason || '',
            check_price_value: d.caseData.check_price_value || '',
            check_price_detail: d.caseData.check_price_detail || '',
          })
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [id])

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }))

  const clearFileRef = (ref, setName) => {
    if (ref.current) ref.current.value = ''
    setName('')
  }

  // ลบสลิป/เล่มประเมิน
  const deleteCaseImage = async (column) => {
    if (!confirm('ต้องการลบรูปนี้?')) return
    try {
      const res = await fetch(`${API}/delete-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ table: 'loan_requests', id, column })
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

  // อัพโหลดรูปทรัพย์ใหม่ (บันทึกลง loan_requests.images)
  const handleUploadPropertyImages = async () => {
    const files = propImgRef.current?.files
    if (!files || files.length === 0) {
      setPropMsg('กรุณาเลือกรูปภาพก่อน')
      return
    }
    setPropUploading(true)
    setPropMsg('')
    try {
      const fd = new FormData()
      Array.from(files).forEach(f => fd.append('appraisal_property_image', f))
      const res = await fetch(`${API}/property-images/${id}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}` },
        body: fd
      })
      const data = await res.json()
      if (data.success) {
        // อัพเดทรูปฝ่ายประเมินใน caseData ทันที (appraisal_images แยกจาก images)
        setCaseData(prev => ({ ...prev, appraisal_images: JSON.stringify(data.allImages) }))
        propImgRef.current.value = ''
        setPropUploadNames([])
        setPropMsg('อัพโหลดรูปสำเร็จ!')
        setTimeout(() => setPropMsg(''), 3000)
      } else {
        setPropMsg(data.message || 'อัพโหลดไม่สำเร็จ')
      }
    } catch {
      setPropMsg('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้')
    }
    setPropUploading(false)
  }

  // ลบรูปทรัพย์ฝ่ายประเมินจาก loan_requests.appraisal_images
  const handleDeletePropertyImage = async (imgPath) => {
    if (!confirm('ต้องการลบรูปนี้?')) return
    try {
      const res = await fetch(`${API}/delete-property-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ loanRequestId: id, imagePath: imgPath })
      })
      const data = await res.json()
      if (data.success) {
        setCaseData(prev => ({ ...prev, appraisal_images: JSON.stringify(data.updatedImages) }))
      } else {
        alert(data.message || 'ลบไม่สำเร็จ')
      }
    } catch {
      alert('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้')
    }
  }

  // บันทึกข้อมูล
  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setMsg('')
    setSuccess('')

    try {
      const fd = new FormData()
      Object.entries(form).forEach(([k, v]) => {
        if (k === 'recorded_at') return // ไม่ส่ง recorded_at
        fd.append(k, v !== null && v !== undefined ? v : '')
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
        setTimeout(() => navigate('/appraisal'), 1000)
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

  if (!caseData) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0' }}>
        <i className="fas fa-exclamation-triangle" style={{ fontSize: 32, color: '#e74c3c' }}></i>
        <p style={{ marginTop: 12 }}>ไม่พบข้อมูลเคส</p>
        <button className="btn btn-outline" onClick={() => navigate('/appraisal')} style={{ marginTop: 16 }}>
          <i className="fas fa-arrow-left"></i> กลับหน้าฝ่ายประเมิน
        </button>
      </div>
    )
  }

  // ==================== Helper ====================
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
                  onError={(e) => { e.target.style.display = 'none' }} />
              )}
            </a>
          )
        })}
      </div>
    )
  }

  // ==================== RENDER ====================
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn btn-outline" onClick={() => navigate('/appraisal')} style={{ padding: '8px 16px' }}>
            <i className="fas fa-arrow-left"></i>
          </button>
          <h2 style={{ margin: 0, fontSize: 20 }}>
            <i className="fas fa-clipboard-check" style={{ color: 'var(--primary)', marginRight: 8 }}></i>
            แก้ไขเคส (ฝ่ายประเมิน) — <span style={{ color: 'var(--primary)' }}>{caseData.case_code}</span>
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

          {/* ===== คอลัมน์ซ้าย: ข้อมูลลูกหนี้ (read-only) ===== */}
          <div>
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

              {/* บัตรประชาชน */}
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
                  <a href={caseData.location_url} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: 'var(--primary)', wordBreak: 'break-all' }}>
                    <i className="fas fa-map-marker-alt"></i> {caseData.location_url}
                  </a>
                ) : (
                  <input type="text" value="-" readOnly style={{ background: '#f5f5f5' }} />
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                <div className="form-group">
                  <label>เลขโฉนด</label>
                  <input type="text" value={caseData.deed_number || '-'} readOnly style={{ background: '#f5f5f5' }} />
                </div>
                <div className="form-group">
                  <label>ประเภทโฉนด</label>
                  <input type="text" value={{ ns4: 'โฉนดที่ดิน (น.ส.4)', ns3: 'น.ส.3', ns3k: 'น.ส.3ก', spk: 'ส.ป.ก.', ns2k: 'น.ส.2ก' }[caseData.deed_type] || caseData.deed_type || '-'} readOnly style={{ background: '#f5f5f5' }} />
                </div>
                <div className="form-group">
                  <label>พื้นที่</label>
                  <input type="text" value={caseData.land_area ? `${caseData.land_area} ตร.วา` : '-'} readOnly style={{ background: '#f5f5f5' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginTop: 16 }}>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600 }}>รูปโฉนด</label>
                  <ImageGrid imgList={deedImages} label="deed" />
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600 }}>รูปทรัพย์จากลูกค้า</label>
                  <ImageGrid imgList={images.filter(img => img.includes('properties'))} label="prop" />
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600 }}>ใบอนุญาตสิ่งปลูกสร้าง</label>
                  <ImageGrid imgList={images.filter(img => img.includes('permits'))} label="permit" />
                </div>
              </div>

              {/* ===== อัพโหลดรูปทรัพย์ใหม่ (รูปหลัก — ทุกฝ่ายเห็น) ===== */}
              <div style={{ marginTop: 20, padding: 16, background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 10 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#15803d', marginBottom: 8 }}>
                  <i className="fas fa-camera" style={{ marginRight: 8 }}></i>
                  อัพโหลดรูปทรัพย์จากลงพื้นที่
                </div>
                <p style={{ fontSize: 12, color: '#555', margin: '0 0 12px' }}>
                  รูปที่อัพโหลดที่นี่จะกลายเป็น <strong>รูปหลักของเคส</strong> — ทุกฝ่ายมองเห็น
                </p>

                {/* แสดงรูปทรัพย์จากฝ่ายประเมิน พร้อมปุ่มลบ */}
                {appraisalImages.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                    {appraisalImages.map((img, i) => (
                      <div key={i} style={{ position: 'relative', display: 'inline-block' }}>
                        <button type="button" onClick={() => handleDeletePropertyImage(img)} style={xBtnOverlay} title="ลบรูป">
                          <i className="fas fa-times"></i>
                        </button>
                        <a href={img.startsWith('/') ? img : `/${img}`} target="_blank" rel="noreferrer">
                          <img src={img.startsWith('/') ? img : `/${img}`} alt={`prop-${i}`}
                            style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8, border: '2px solid #86efac' }}
                            onError={e => { e.target.style.display = 'none' }} />
                        </a>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <input type="file" accept="image/*,.pdf" multiple ref={propImgRef}
                      onChange={e => setPropUploadNames(Array.from(e.target.files).map(f => f.name))}
                      style={{ fontSize: 13 }} />
                    {propUploadNames.length > 0 && (
                      <small style={{ color: '#15803d', fontSize: 11 }}>
                        เลือก {propUploadNames.length} ไฟล์
                      </small>
                    )}
                  </div>
                  <button type="button" onClick={handleUploadPropertyImages} disabled={propUploading}
                    style={{
                      background: '#15803d', color: '#fff', border: 'none', borderRadius: 8,
                      padding: '8px 18px', fontWeight: 600, fontSize: 13,
                      cursor: propUploading ? 'not-allowed' : 'pointer', opacity: propUploading ? 0.7 : 1,
                      whiteSpace: 'nowrap'
                    }}>
                    {propUploading ? <><i className="fas fa-spinner fa-spin"></i> กำลังอัพโหลด...</> : <><i className="fas fa-upload"></i> อัพโหลดรูป</>}
                  </button>
                </div>
                {propMsg && (
                  <div style={{ marginTop: 8, fontSize: 12, fontWeight: 600,
                    color: propMsg.includes('สำเร็จ') ? '#15803d' : '#e74c3c' }}>
                    <i className={`fas fa-${propMsg.includes('สำเร็จ') ? 'check-circle' : 'exclamation-circle'}`}></i> {propMsg}
                  </div>
                )}
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

            {/* ===== Fact Finding ===== */}
            <div className="card" style={{ padding: 24, marginBottom: 20, borderLeft: '3px solid #e67e22' }}>
              <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: '#e67e22' }}>
                <i className="fas fa-clipboard-list" style={{ marginRight: 8 }}></i>ข้อมูลประกอบ (Fact Finding)
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div className="form-group"><label>วงเงินที่ต้องการ (บาท)</label>
                  <input type="text" value={caseData.desired_amount || '-'} readOnly style={{ background: '#f5f5f5' }} /></div>
                <div className="form-group"><label>ดอกเบี้ย (%/เดือน)</label>
                  <input type="text" value={caseData.interest_rate || '-'} readOnly style={{ background: '#f5f5f5' }} /></div>
                <div className="form-group"><label>ต้องการเหลือถึงมือ (บาท)</label>
                  <input type="text" value={caseData.net_desired_amount || '-'} readOnly style={{ background: '#f5f5f5' }} /></div>
                <div className="form-group"><label>แพลนสัญญา (ปี)</label>
                  <input type="text" value={caseData.contract_years || '-'} readOnly style={{ background: '#f5f5f5' }} /></div>
                <div className="form-group"><label>อาชีพลูกค้า</label>
                  <input type="text" value={caseData.occupation || '-'} readOnly style={{ background: '#f5f5f5' }} /></div>
                <div className="form-group"><label>รายได้ต่อเดือน</label>
                  <input type="text" value={caseData.monthly_income || '-'} readOnly style={{ background: '#f5f5f5' }} /></div>
              </div>
              <div className="form-group"><label>สาเหตุที่ต้องการเงิน / วัตถุประสงค์</label>
                <textarea readOnly value={caseData.loan_purpose || '-'} rows={2}
                  style={{ background: '#f5f5f5', width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e0e0e0', fontSize: 13, fontFamily: 'inherit', resize: 'none', boxSizing: 'border-box' }} />
              </div>
              <div className="form-group"><label>รายละเอียดเพิ่มเติม (ห้องนอน ห้องน้ำ ชั้น จำนวนห้อง ฯลฯ)</label>
                <textarea readOnly value={caseData.additional_details || '-'} rows={2}
                  style={{ background: '#f5f5f5', width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e0e0e0', fontSize: 13, fontFamily: 'inherit', resize: 'none', boxSizing: 'border-box' }} />
              </div>
            </div>
          </div>

          {/* ===== คอลัมน์ขวา: สถานะประเมิน (แก้ไขได้) ===== */}
          <div>
            <div className="card" style={{ padding: 24, marginBottom: 20 }}>
              <h3 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 700, color: 'var(--primary)' }}>
                <i className="fas fa-clipboard-check" style={{ marginRight: 8 }}></i>
                สถานะประเมิน
              </h3>

              {/* สถานะประเมิน */}
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

              {/* ผลประเมิน */}
              <div className="form-group" style={{ marginTop: 16 }}>
                <label style={{ fontWeight: 600 }}>ผลประเมิน</label>
                <select
                  value={form.appraisal_result}
                  onChange={e => set('appraisal_result', e.target.value)}
                  style={{
                    borderColor: form.appraisal_result === 'passed' ? '#27ae60' : form.appraisal_result === 'not_passed' ? '#e74c3c' : undefined,
                    fontWeight: form.appraisal_result ? 600 : 400,
                    color: form.appraisal_result === 'passed' ? '#27ae60' : form.appraisal_result === 'not_passed' ? '#e74c3c' : undefined
                  }}
                >
                  {appraisalResultOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
                <div className="form-group">
                  <label>วันที่นัดประเมิน</label>
                  <input type="date" value={form.appraisal_date} onChange={e => set('appraisal_date', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>ค่าประเมิน (บาท)</label>
                  <input type="number" step="0.01" value={form.appraisal_fee} onChange={e => set('appraisal_fee', e.target.value)} placeholder="2900" />
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

            {/* สถานะเคส */}
            <div className="card" style={{ padding: 24, marginBottom: 20 }}>
              <h3 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 700, color: 'var(--primary)' }}>
                สถานะเคส
              </h3>

              <div className="form-group">
                <label>สถานะเคส (อัพเดทอัตโนมัติจากผลประเมิน)</label>
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

            {/* ผลประเมินจากฝ่ายประเมิน */}
            <div className="card" style={{ padding: 24, marginBottom: 20, borderTop: '3px solid #e67e22' }}>
              <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700, color: '#e67e22' }}>
                <i className="fas fa-chart-bar" style={{ marginRight: 8 }}></i>
                ผลประเมินจากฝ่ายประเมิน
              </h3>
              <p style={{ margin: '0 0 16px', fontSize: 12, color: '#888' }}>
                กรอกเฉพาะประเภทที่ดำเนินการ — ฝ่ายอนุมัติและนิติจะเห็นข้อมูลนี้
              </p>

              {/* ผลประเมินนอก */}
              <div style={{ background: '#fafafa', border: '1px solid #eee', borderRadius: 8, padding: 16, marginBottom: 12 }}>
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 12, color: '#555' }}>
                  <i className="fas fa-map-marker-alt" style={{ marginRight: 6, color: '#e67e22' }}></i>
                  ผลประเมินนอก
                </div>
                <div className="form-group">
                  <label>ผลประเมิน</label>
                  <select value={form.outside_result} onChange={e => set('outside_result', e.target.value)}
                    style={{ borderColor: form.outside_result === 'passed' ? '#27ae60' : form.outside_result === 'not_passed' ? '#e74c3c' : undefined }}>
                    <option value="">-- ยังไม่ประเมิน --</option>
                    <option value="passed">ผ่านมาตรฐาน</option>
                    <option value="not_passed">ไม่ผ่านมาตรฐาน</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>เหตุผล</label>
                  <textarea rows="2" value={form.outside_reason} onChange={e => set('outside_reason', e.target.value)}
                    placeholder="เหตุผลประกอบผลประเมิน..." style={{ resize: 'vertical' }}></textarea>
                </div>
              </div>

              {/* ผลประเมินใน */}
              <div style={{ background: '#fafafa', border: '1px solid #eee', borderRadius: 8, padding: 16, marginBottom: 12 }}>
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 12, color: '#555' }}>
                  <i className="fas fa-home" style={{ marginRight: 6, color: '#3498db' }}></i>
                  ผลประเมินใน
                </div>
                <div className="form-group">
                  <label>ผลประเมิน</label>
                  <select value={form.inside_result} onChange={e => set('inside_result', e.target.value)}
                    style={{ borderColor: form.inside_result === 'passed' ? '#27ae60' : form.inside_result === 'not_passed' ? '#e74c3c' : undefined }}>
                    <option value="">-- ยังไม่ประเมิน --</option>
                    <option value="passed">ผ่านมาตรฐาน</option>
                    <option value="not_passed">ไม่ผ่านมาตรฐาน</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>เหตุผล</label>
                  <textarea rows="2" value={form.inside_reason} onChange={e => set('inside_reason', e.target.value)}
                    placeholder="เหตุผลประกอบผลประเมิน..." style={{ resize: 'vertical' }}></textarea>
                </div>
              </div>

              {/* ผลเช็คราคา */}
              <div style={{ background: '#fafafa', border: '1px solid #eee', borderRadius: 8, padding: 16 }}>
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 12, color: '#555' }}>
                  <i className="fas fa-tags" style={{ marginRight: 6, color: '#9b59b6' }}></i>
                  ผลเช็คราคา
                </div>
                <div className="form-group">
                  <label>ราคา (บาท)</label>
                  <input type="number" value={form.check_price_value} onChange={e => set('check_price_value', e.target.value)}
                    placeholder="ระบุราคา" />
                </div>
                <div className="form-group">
                  <label>รายละเอียด</label>
                  <textarea rows="2" value={form.check_price_detail} onChange={e => set('check_price_detail', e.target.value)}
                    placeholder="รายละเอียดเพิ่มเติม..." style={{ resize: 'vertical' }}></textarea>
                </div>
              </div>
            </div>

            {/* ปุ่มบันทึก */}
            <div style={{ display: 'flex', gap: 12 }}>
              <button type="submit" className="btn btn-primary" disabled={saving} style={{ padding: '12px 32px', flex: 1 }}>
                {saving ? <><i className="fas fa-spinner fa-spin"></i> กำลังบันทึก...</> : <><i className="fas fa-save"></i> บันทึกข้อมูล</>}
              </button>
              <button type="button" className="btn btn-outline" onClick={() => navigate('/appraisal')} style={{ padding: '12px 24px' }}>
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