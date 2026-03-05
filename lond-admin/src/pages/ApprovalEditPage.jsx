import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import '../styles/step-form.css'
import CancelCaseButton from '../components/CancelCaseButton'

// ========== PreviewModal ==========
function PreviewModal({ src, onClose }) {
  if (!src) return null
  const isPdf = /\.pdf$/i.test(src)
  const isHttp = /^https?:\/\//.test(src)
  const fullSrc = isHttp ? src : `/${src}`
  return (
    <div onClick={onClose} style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.78)', zIndex: 99999,
      display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out'
    }}>
      <button onClick={e => { e.stopPropagation(); onClose() }} style={{
        position: 'fixed', top: 16, right: 16, width: 40, height: 40, borderRadius: '50%',
        background: 'rgba(255,255,255,0.9)', border: 'none', fontSize: 22, color: '#333',
        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 2px 8px rgba(0,0,0,0.3)', zIndex: 100000
      }}>
        <i className="fas fa-times"></i>
      </button>
      {isPdf ? (
        <iframe src={fullSrc} onClick={e => e.stopPropagation()}
          style={{ width: '80vw', height: '85vh', borderRadius: 8, border: 'none', boxShadow: '0 8px 32px rgba(0,0,0,0.5)', cursor: 'default' }}
          title="PDF Preview" />
      ) : (
        <img src={fullSrc} alt="preview" onClick={e => e.stopPropagation()}
          style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: 8, boxShadow: '0 8px 32px rgba(0,0,0,0.5)', cursor: 'default' }} />
      )}
    </div>
  )
}

const token = () => localStorage.getItem('loandd_admin')
const API = '/api/admin/approval'

const appraisalTypeLabel = { outside: 'ประเมินนอก', inside: 'ประเมินใน', check_price: 'เช็คราคา' }
const appraisalResultLabel = { passed: 'ผ่านมาตรฐาน', not_passed: 'ไม่ผ่านมาตรฐาน', '': 'ยังไม่ประเมิน' }

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

function toDateTimeInput(d) {
  if (!d) return ''
  const dt = new Date(d)
  if (isNaN(dt.getTime())) return ''
  return dt.toISOString().slice(0, 16)
}

export default function ApprovalEditPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [caseData, setCaseData] = useState(null)
  const [msg, setMsg] = useState('')
  const [success, setSuccess] = useState('')

  const [form, setForm] = useState({
    approval_type: '',
    approved_credit: '',
    interest_per_year: '',
    interest_per_month: '',
    operation_fee: '',
    land_tax_estimate: '',
    advance_interest: '',
    is_cancelled: 0,
    recorded_by: '',
    recorded_at: '',
    approval_date: '',
  })
  const [creditTableFile, setCreditTableFile] = useState(null)
  const [creditTableUploading, setCreditTableUploading] = useState(false)
  const [creditTableDeleting, setCreditTableDeleting] = useState(false)
  const [creditTableMsg, setCreditTableMsg] = useState('')
  const [previewSrc, setPreviewSrc] = useState(null)

  useEffect(() => {
    fetch(`${API}/cases/${id}`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          const caseInfo = d.caseData
          setForm({
            approval_type: caseInfo.loan_type_detail || caseInfo.approval_type || '',
            approved_credit: caseInfo.approved_credit || '',
            interest_per_year: caseInfo.interest_per_year || '',
            interest_per_month: caseInfo.interest_per_month || '',
            operation_fee: caseInfo.operation_fee || '',
            land_tax_estimate: caseInfo.land_tax_estimate || '',
            advance_interest: caseInfo.advance_interest || '',
            is_cancelled: caseInfo.is_cancelled || 0,
            recorded_by: caseInfo.recorded_by || '',
            recorded_at: toDateTimeInput(caseInfo.recorded_at),
            approval_date: toDateInput(caseInfo.approval_date),
          })

          // ถ้า credit_table_file ไม่ถูกส่งมาจาก detail endpoint (server เก่า)
          // ดึงจาก list endpoint แทน
          if (caseInfo.credit_table_file !== undefined) {
            setCaseData(caseInfo)
            setLoading(false)
          } else {
            fetch(`${API}/cases`, { headers: { Authorization: `Bearer ${token()}` } })
              .then(r => r.json())
              .then(list => {
                const match = list.data?.find(c => String(c.case_id) === String(id))
                setCaseData({ ...caseInfo, credit_table_file: match?.credit_table_file || null })
              })
              .catch(() => setCaseData(caseInfo))
              .finally(() => setLoading(false))
          }
        } else {
          setLoading(false)
        }
      })
      .catch(() => setLoading(false))
  }, [id])

  const handleDeleteCreditTable = async () => {
    if (!window.confirm('ต้องการลบไฟล์ตารางวงเงินนี้หรือไม่?')) return
    setCreditTableDeleting(true)
    setCreditTableMsg('')
    try {
      const res = await fetch(`${API}/cases/${id}/credit-table`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token()}` }
      })
      const data = await res.json()
      if (data.success) {
        setCaseData(prev => ({ ...prev, credit_table_file: null }))
        setCreditTableMsg('ลบไฟล์สำเร็จ')
      } else {
        setCreditTableMsg(data.message || 'เกิดข้อผิดพลาด')
      }
    } catch {
      setCreditTableMsg('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์')
    }
    setCreditTableDeleting(false)
  }

  const handleCreditTableUpload = async () => {
    if (!creditTableFile) return
    setCreditTableUploading(true)
    setCreditTableMsg('')
    const formData = new FormData()
    formData.append('credit_table_file', creditTableFile)
    try {
      const res = await fetch(`${API}/cases/${id}/upload-credit-table`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}` },
        body: formData
      })
      const data = await res.json()
      if (data.success) {
        setCreditTableMsg('อัพโหลดสำเร็จ!')
        setCaseData(prev => ({ ...prev, credit_table_file: data.file_path }))
        setCreditTableFile(null)
      } else {
        setCreditTableMsg(data.message || 'เกิดข้อผิดพลาด')
      }
    } catch {
      setCreditTableMsg('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์')
    }
    setCreditTableUploading(false)
  }

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }))

  // บันทึกข้อมูล
  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setMsg('')
    setSuccess('')

    try {
      const res = await fetch(`${API}/cases/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify(form)
      })
      const data = await res.json()
      if (data.success) {
        setSuccess('บันทึกข้อมูลสำเร็จ!')
        setTimeout(() => navigate('/approval'), 1000)
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
        <button className="btn btn-outline" onClick={() => navigate('/approval')} style={{ marginTop: 16 }}>
          <i className="fas fa-arrow-left"></i> กลับหน้าฝ่ายอนุมัติสินเชื่อ
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
          <button className="btn btn-outline" onClick={() => navigate('/approval')} style={{ padding: '8px 16px' }}>
            <i className="fas fa-arrow-left"></i>
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h2 style={{ margin: 0, fontSize: 20 }}>
              <i className="fas fa-money-check-alt" style={{ color: 'var(--primary)', marginRight: 8 }}></i>
              แก้ไขเคส (ฝ่ายอนุมัติสินเชื่อ) — <span style={{ color: 'var(--primary)' }}>{caseData.case_code}</span>
              {caseData.contact_name && <span style={{ color: '#64748b', fontSize: 15, fontWeight: 500, marginLeft: 4 }}>({caseData.contact_name})</span>}
            </h2>
            {(form.approval_type || caseData.loan_type_detail) && (
              <span style={{
                fontSize: 13, fontWeight: 700, padding: '4px 14px', borderRadius: 20,
                background: (form.approval_type || caseData.loan_type_detail) === 'mortgage' ? '#e3f2fd' : '#f3e5f5',
                color: (form.approval_type || caseData.loan_type_detail) === 'mortgage' ? '#1565c0' : '#6a1b9a',
                border: `1.5px solid ${(form.approval_type || caseData.loan_type_detail) === 'mortgage' ? '#1565c0' : '#6a1b9a'}40`,
              }}>
                <i className="fas fa-tag" style={{ marginRight: 5 }}></i>
                {(form.approval_type || caseData.loan_type_detail) === 'mortgage' ? 'จำนอง' : 'ขายฝาก'}
              </span>
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

          {/* ===== คอลัมน์ซ้าย: ข้อมูลลูกหนี้ + ทรัพย์ + ประเมิน (read-only) ===== */}
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

              <div style={{ marginTop: 16 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#15803d' }}>
                  <i className="fas fa-search-location" style={{ marginRight: 4 }}></i>
                  รูปทรัพย์จากฝ่ายประเมิน (ลงพื้นที่)
                </label>
                <ImageGrid imgList={appraisalImages} label="appraisal-prop" />
              </div>

              {caseData.appraisal_book_image && (
                <div style={{ marginTop: 12 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#e65100' }}>
                    <i className="fas fa-book" style={{ marginRight: 4 }}></i>
                    เล่มประเมิน
                  </label>
                  <div style={{ marginTop: 6 }}>
                    <a href={caseData.appraisal_book_image.startsWith('/') ? caseData.appraisal_book_image : `/${caseData.appraisal_book_image}`}
                      target="_blank" rel="noreferrer"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', background: '#e65100', color: '#fff', borderRadius: 6, fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>
                      <i className="fas fa-file-alt"></i> เปิดดูเล่มประเมิน
                    </a>
                  </div>
                </div>
              )}

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
                <div className="form-group"><label>วงเงินที่ต้องการ</label>
                  <input type="text" value={caseData.desired_amount || '-'} readOnly style={{ background: '#f5f5f5' }} /></div>
                <div className="form-group"><label>ดอกเบี้ย (%/เดือน)</label>
                  <input type="text" value={caseData.interest_rate || '-'} readOnly style={{ background: '#f5f5f5' }} /></div>
                <div className="form-group"><label>ต้องการเหลือถึงมือ</label>
                  <input type="text" value={caseData.net_desired_amount || '-'} readOnly style={{ background: '#f5f5f5' }} /></div>
                <div className="form-group"><label>แพลนสัญญา (ปี)</label>
                  <input type="text" value={caseData.contract_years || '-'} readOnly style={{ background: '#f5f5f5' }} /></div>
                <div className="form-group"><label>อาชีพลูกค้า</label>
                  <input type="text" value={caseData.occupation || '-'} readOnly style={{ background: '#f5f5f5' }} /></div>
                <div className="form-group"><label>รายได้ต่อเดือน</label>
                  <input type="text" value={caseData.monthly_income || '-'} readOnly style={{ background: '#f5f5f5' }} /></div>
              </div>
              <div className="form-group"><label>สาเหตุที่ต้องการเงิน</label>
                <textarea readOnly value={caseData.loan_purpose || '-'} rows={2}
                  style={{ background: '#f5f5f5', width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e0e0e0', fontSize: 13, fontFamily: 'inherit', resize: 'none', boxSizing: 'border-box' }} /></div>
              <div className="form-group"><label>รายละเอียดทรัพย์เพิ่มเติม</label>
                <textarea readOnly value={caseData.additional_details || '-'} rows={2}
                  style={{ background: '#f5f5f5', width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e0e0e0', fontSize: 13, fontFamily: 'inherit', resize: 'none', boxSizing: 'border-box' }} />
              </div>
            </div>

            {/* นายหน้า */}
            <div className="card" style={{ padding: 24, marginBottom: 20 }}>
              <h3 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 700, color: 'var(--primary)' }}>
                <i className="fas fa-user-tie" style={{ marginRight: 8 }}></i>
                นายหน้า
              </h3>

              <div className="form-group">
                <label>ชื่อนายหน้า</label>
                <input
                  type="text"
                  value={caseData.agent_name || ''}
                  readOnly
                  style={{ background: '#f5f5f5' }}
                />
              </div>
            </div>

            {/* ผลประเมินจากฝ่ายประเมิน — read-only */}
            <div className="card" style={{ padding: 24, marginBottom: 20, borderTop: '3px solid #e67e22' }}>
              <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700, color: '#e67e22' }}>
                <i className="fas fa-chart-bar" style={{ marginRight: 8 }}></i>
                ผลประเมินจากฝ่ายประเมิน
              </h3>
              <p style={{ margin: '0 0 16px', fontSize: 12, color: '#888' }}>ข้อมูลจากฝ่ายประเมิน — ดูอ้างอิงเท่านั้น</p>

              {/* ผลประเมินนอก */}
              <div style={{ background: '#fafafa', border: '1px solid #eee', borderRadius: 8, padding: 14, marginBottom: 10 }}>
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10, color: '#555' }}>
                  <i className="fas fa-map-marker-alt" style={{ marginRight: 6, color: '#e67e22' }}></i> ผลประเมินนอก
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="form-group">
                    <label>ผลประเมิน</label>
                    <input type="text" readOnly style={{ background: '#f5f5f5' }}
                      value={caseData.outside_result === 'passed' ? 'ผ่านมาตรฐาน' : caseData.outside_result === 'not_passed' ? 'ไม่ผ่านมาตรฐาน' : '-'} />
                  </div>
                  <div className="form-group">
                    <label>วันเวลาบันทึก</label>
                    <input type="text" readOnly style={{ background: '#f5f5f5' }}
                      value={caseData.outside_recorded_at ? new Date(caseData.outside_recorded_at).toLocaleString('th-TH') : '-'} />
                  </div>
                </div>
                <div className="form-group">
                  <label>เหตุผล</label>
                  <input type="text" readOnly style={{ background: '#f5f5f5' }} value={caseData.outside_reason || '-'} />
                </div>
              </div>

              {/* ผลประเมินใน */}
              <div style={{ background: '#fafafa', border: '1px solid #eee', borderRadius: 8, padding: 14, marginBottom: 10 }}>
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10, color: '#555' }}>
                  <i className="fas fa-home" style={{ marginRight: 6, color: '#3498db' }}></i> ผลประเมินใน
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="form-group">
                    <label>ผลประเมิน</label>
                    <input type="text" readOnly style={{ background: '#f5f5f5' }}
                      value={caseData.inside_result === 'passed' ? 'ผ่านมาตรฐาน' : caseData.inside_result === 'not_passed' ? 'ไม่ผ่านมาตรฐาน' : '-'} />
                  </div>
                  <div className="form-group">
                    <label>วันเวลาบันทึก</label>
                    <input type="text" readOnly style={{ background: '#f5f5f5' }}
                      value={caseData.inside_recorded_at ? new Date(caseData.inside_recorded_at).toLocaleString('th-TH') : '-'} />
                  </div>
                </div>
                <div className="form-group">
                  <label>เหตุผล</label>
                  <input type="text" readOnly style={{ background: '#f5f5f5' }} value={caseData.inside_reason || '-'} />
                </div>
              </div>

              {/* ผลเช็คราคา */}
              <div style={{ background: '#fafafa', border: '1px solid #eee', borderRadius: 8, padding: 14 }}>
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10, color: '#555' }}>
                  <i className="fas fa-tags" style={{ marginRight: 6, color: '#9b59b6' }}></i> ผลเช็คราคา
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="form-group">
                    <label>ราคา (บาท)</label>
                    <input type="text" readOnly style={{ background: '#f5f5f5' }} value={caseData.check_price_value ? Number(caseData.check_price_value).toLocaleString() : '-'} />
                  </div>
                  <div className="form-group">
                    <label>วันเวลาบันทึก</label>
                    <input type="text" readOnly style={{ background: '#f5f5f5' }}
                      value={caseData.check_price_recorded_at ? new Date(caseData.check_price_recorded_at).toLocaleString('th-TH') : '-'} />
                  </div>
                </div>
                <div className="form-group">
                  <label>รายละเอียด</label>
                  <input type="text" readOnly style={{ background: '#f5f5f5' }} value={caseData.check_price_detail || '-'} />
                </div>
              </div>
            </div>

            {/* สถานะประเมิน */}
            <div className="card" style={{ padding: 24, marginBottom: 20 }}>
              <h3 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 700, color: 'var(--primary)' }}>
                <i className="fas fa-clipboard-check" style={{ marginRight: 8 }}></i>
                สถานะประเมิน
              </h3>

              <div className="form-group">
                <label>สถานะประเมิน</label>
                <input
                  type="text"
                  value={appraisalTypeLabel[caseData.appraisal_type] || caseData.appraisal_type || '-'}
                  readOnly
                  style={{ background: '#f5f5f5' }}
                />
              </div>

              <div className="form-group" style={{ marginTop: 16 }}>
                <label>ผลประเมิน</label>
                <input
                  type="text"
                  value={appraisalResultLabel[caseData.appraisal_result] || caseData.appraisal_result || '-'}
                  readOnly
                  style={{ background: '#f5f5f5' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
                <div className="form-group">
                  <label>วันที่นัดประเมิน</label>
                  <input
                    type="text"
                    value={formatDate(caseData.appraisal_date)}
                    readOnly
                    style={{ background: '#f5f5f5' }}
                  />
                </div>
                <div className="form-group">
                  <label>ค่าประเมิน (บาท)</label>
                  <input
                    type="text"
                    value={caseData.appraisal_fee || '-'}
                    readOnly
                    style={{ background: '#f5f5f5' }}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginTop: 16 }}>
                <label>วันที่ชำระ</label>
                <input
                  type="text"
                  value={formatDate(caseData.payment_date)}
                  readOnly
                  style={{ background: '#f5f5f5' }}
                />
              </div>
            </div>
          </div>

          {/* ===== คอลัมน์ขวา: อนุมัติวงเงิน (แก้ไขได้) ===== */}
          <div>
            <div className="card" style={{ padding: 24, marginBottom: 20 }}>
              <h3 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 700, color: 'var(--primary)' }}>
                <i className="fas fa-money-check-alt" style={{ marginRight: 8 }}></i>
                อนุมัติวงเงิน
              </h3>

              {/* ประเภทสินเชื่อ — อ่านอย่างเดียว, กำหนดโดยฝ่ายขาย (loan_requests.loan_type_detail) */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontWeight: 600, fontSize: 13, display: 'block', marginBottom: 10 }}>
                  ประเภทสินเชื่อ
                  <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 400, color: '#aaa' }}>(กำหนดโดยฝ่ายขาย)</span>
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {caseData.loan_type_detail === 'selling_pledge' || caseData.loan_type_detail === 'mortgage' ? (
                    <span style={{
                      fontSize: 15, fontWeight: 700, padding: '8px 22px', borderRadius: 10,
                      background: caseData.loan_type_detail === 'mortgage' ? '#e3f2fd' : '#f3e5f5',
                      color: caseData.loan_type_detail === 'mortgage' ? '#1565c0' : '#6a1b9a',
                      border: `2px solid ${caseData.loan_type_detail === 'mortgage' ? '#1565c0' : '#6a1b9a'}50`,
                    }}>
                      <i className={`fas ${caseData.loan_type_detail === 'mortgage' ? 'fa-home' : 'fa-handshake'}`} style={{ marginRight: 8 }}></i>
                      {caseData.loan_type_detail === 'mortgage' ? 'จำนอง' : 'ขายฝาก'}
                    </span>
                  ) : (
                    <span style={{ fontSize: 13, color: '#aaa', fontStyle: 'italic', padding: '8px 12px', background: '#f9f9f9', borderRadius: 8, border: '1px dashed #ddd' }}>
                      <i className="fas fa-exclamation-circle" style={{ marginRight: 6, color: '#f39c12' }}></i>
                      ยังไม่ระบุ — ให้ฝ่ายขายอัพเดทประเภทสินเชื่อก่อน
                    </span>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label>วงเงินอนุมัติ (บาท)</label>
                <input
                  type="number"
                  value={form.approved_credit}
                  onChange={e => set('approved_credit', e.target.value)}
                  placeholder="ระบุวงเงินอนุมัติ"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-group">
                  <label>ดอกเบี้ยต่อปี (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.interest_per_year}
                    onChange={e => set('interest_per_year', e.target.value)}
                    placeholder="เช่น 5.50"
                  />
                </div>
                <div className="form-group">
                  <label>ดอกเบี้ยต่อเดือน (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.interest_per_month}
                    onChange={e => set('interest_per_month', e.target.value)}
                    placeholder="เช่น 0.50"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>ค่าดำเนินการ (บาท)</label>
                <input
                  type="number"
                  value={form.operation_fee}
                  onChange={e => set('operation_fee', e.target.value)}
                  placeholder="ระบุค่าดำเนินการ"
                />
              </div>

              <div className="form-group">
                <label>ค่าประมาณการภาษีจากกรมที่ดิน (บาท)</label>
                <input
                  type="number"
                  value={form.land_tax_estimate}
                  onChange={e => set('land_tax_estimate', e.target.value)}
                  placeholder="ระบุค่าประมาณการภาษี"
                />
              </div>

              <div className="form-group">
                <label>ดอกเบี้ยล่วงหน้า (บาท)</label>
                <input
                  type="number"
                  value={form.advance_interest}
                  onChange={e => set('advance_interest', e.target.value)}
                  placeholder="ระบุดอกเบี้ยล่วงหน้า"
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, padding: '12px', background: '#f9f9f9', borderRadius: 6 }}>
                <input
                  type="checkbox"
                  id="is_cancelled"
                  checked={form.is_cancelled === 1 || form.is_cancelled === '1'}
                  onChange={e => set('is_cancelled', e.target.checked ? 1 : 0)}
                  style={{ width: 18, height: 18, cursor: 'pointer' }}
                />
                <label htmlFor="is_cancelled" style={{ margin: 0, cursor: 'pointer', fontWeight: 500 }}>
                  ยกเลิกรายการเคสนี้
                </label>
              </div>

              <div className="form-group">
                <label>วันที่อนุมัติ</label>
                <input
                  type="date"
                  value={form.approval_date}
                  onChange={e => set('approval_date', e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>ผู้บันทึก</label>
                <input
                  type="text"
                  value={form.recorded_by}
                  onChange={e => set('recorded_by', e.target.value)}
                  placeholder="ชื่อผู้บันทึก"
                />
              </div>

              <div className="form-group">
                <label>วันเวลาที่บันทึก</label>
                <input
                  type="datetime-local"
                  value={form.recorded_at}
                  onChange={e => set('recorded_at', e.target.value)}
                />
              </div>
            </div>

            {/* ===== ตารางวงเงิน (Credit Table Upload) ===== */}
            <div className="card" style={{ padding: 24, marginBottom: 20 }}>
              <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: 'var(--primary)' }}>
                <i className="fas fa-table" style={{ marginRight: 8 }}></i>ตารางวงเงิน
              </h3>

              {caseData.credit_table_file && (
                <div style={{ marginBottom: 16, padding: '12px 16px', background: '#f0f9ff', borderRadius: 8, border: '1px solid #b3d9f7', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <i className="fas fa-file-alt" style={{ color: '#1565c0', fontSize: 18 }}></i>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, color: '#555', marginBottom: 2 }}>ไฟล์ตารางวงเงินปัจจุบัน</div>
                    <div style={{ fontSize: 12, color: '#888', wordBreak: 'break-all' }}>{caseData.credit_table_file.split('/').pop()}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button type="button" onClick={() => setPreviewSrc(caseData.credit_table_file)}
                      style={{ padding: '6px 14px', background: '#1565c0', color: '#fff', borderRadius: 6, fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                      <i className="fas fa-eye"></i> ดูไฟล์
                    </button>
                    <button type="button" onClick={handleDeleteCreditTable} disabled={creditTableDeleting}
                      style={{ padding: '6px 12px', background: '#fff', color: '#e74c3c', borderRadius: 6, fontSize: 12, fontWeight: 600, border: '1px solid #e74c3c', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                      {creditTableDeleting ? <i className="fas fa-spinner fa-spin"></i> : <><i className="fas fa-trash"></i> ลบ</>}
                    </button>
                  </div>
                </div>
              )}

              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>
                  {caseData.credit_table_file ? 'เปลี่ยนไฟล์ตารางวงเงิน' : 'อัพโหลดตารางวงเงิน'}
                </label>
                <input
                  type="file"
                  accept=".pdf,.xlsx,.xls,.doc,.docx,.png,.jpg,.jpeg"
                  onChange={e => { setCreditTableFile(e.target.files[0] || null); setCreditTableMsg('') }}
                  style={{ fontSize: 13, display: 'block', marginBottom: 8 }}
                />
                {creditTableFile && (
                  <div style={{ fontSize: 12, color: '#555', marginBottom: 8 }}>
                    <i className="fas fa-file" style={{ marginRight: 4 }}></i>{creditTableFile.name}
                  </div>
                )}
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleCreditTableUpload}
                  disabled={!creditTableFile || creditTableUploading}
                  style={{ padding: '8px 20px', fontSize: 13 }}
                >
                  {creditTableUploading
                    ? <><i className="fas fa-spinner fa-spin"></i> กำลังอัพโหลด...</>
                    : <><i className="fas fa-upload"></i> อัพโหลด</>}
                </button>
              </div>
              {creditTableMsg && (
                <div style={{ fontSize: 12, padding: '6px 10px', borderRadius: 6,
                  background: creditTableMsg.includes('สำเร็จ') ? '#e8f5e9' : '#fdecea',
                  color: creditTableMsg.includes('สำเร็จ') ? '#2e7d32' : '#c62828' }}>
                  {creditTableMsg}
                </div>
              )}
            </div>

            {/* ปุ่มบันทึก */}
            <div style={{ display: 'flex', gap: 12 }}>
              <button type="submit" className="btn btn-primary" disabled={saving} style={{ padding: '12px 32px', flex: 1 }}>
                {saving ? <><i className="fas fa-spinner fa-spin"></i> กำลังบันทึก...</> : <><i className="fas fa-save"></i> บันทึกข้อมูล</>}
              </button>
              <button type="button" className="btn btn-outline" onClick={() => navigate('/approval')} style={{ padding: '12px 24px' }}>
                ยกเลิก
              </button>
            </div>
            <div style={{ marginTop: 12 }}>
              <CancelCaseButton caseId={caseData.id} caseCode={caseData.case_code} caseStatus={caseData.status} onSuccess={() => window.location.reload()} />
            </div>
          </div>
        </div>
      </form>

      {/* Preview Modal สำหรับดูเอกสารแบบ popup */}
      <PreviewModal src={previewSrc} onClose={() => setPreviewSrc(null)} />
    </div>
  )
}