import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import '../styles/step-form.css'
import CancelCaseButton from '../components/CancelCaseButton'

const token = () => localStorage.getItem('loandd_admin')
const API = '/api/admin/issuing'

const appraisalTypeLabel = { outside: 'ประเมินนอก', inside: 'ประเมินใน', check_price: 'เช็คราคา' }
const appraisalResultLabel = { passed: 'ผ่านมาตรฐาน', not_passed: 'ไม่ผ่านมาตรฐาน', '': 'ยังไม่ประเมิน' }

const propertyTypeLabel = { land: 'ที่ดินเปล่า', house: 'บ้านเดี่ยว', condo: 'คอนโด', townhouse: 'ทาวน์เฮ้าส์', other: 'อื่นๆ' }

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

function DocUploadField({ label, fieldName, currentFile, fileRef, fileNameState, setFileNameState, onDelete }) {
  return (
    <div className="form-group">
      <label>{label}</label>
      <input type="file" accept="image/*,.pdf" ref={fileRef}
        onChange={e => setFileNameState(e.target.files[0]?.name || '')} />
      {fileNameState && (
        <small style={{ color: '#04AA6D', fontSize: 11 }}>
          {fileNameState}
          <button type="button" onClick={() => { if (fileRef.current) fileRef.current.value = ''; setFileNameState('') }}
            style={xBtnInline} title="ล้างไฟล์">
            <i className="fas fa-times"></i>
          </button>
        </small>
      )}
      {currentFile && (
        <div style={{ marginTop: 8, position: 'relative', display: 'inline-block' }}>
          <button type="button" onClick={() => onDelete(fieldName)} style={xBtnOverlay} title="ลบเอกสาร">
            <i className="fas fa-times"></i>
          </button>
          <a href={currentFile.startsWith('/') ? currentFile : `/${currentFile}`} target="_blank" rel="noreferrer">
            {/\.pdf$/i.test(currentFile) ? (
              <div style={{ width: 100, height: 100, borderRadius: 8, border: '2px solid #e74c3c', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#fff5f5', color: '#e74c3c' }}>
                <i className="fas fa-file-pdf" style={{ fontSize: 28 }}></i>
                <span style={{ fontSize: 10, marginTop: 4 }}>PDF</span>
              </div>
            ) : (
              <img src={currentFile.startsWith('/') ? currentFile : `/${currentFile}`} alt={label} style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: 8, border: '2px solid #e0e0e0' }}
                onError={e => { e.target.style.display = 'none' }} />
            )}
          </a>
        </div>
      )}
    </div>
  )
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

function toDateTimeInput(d) {
  if (!d) return ''
  const dt = new Date(d)
  if (isNaN(dt.getTime())) return ''
  return dt.toISOString().slice(0, 16)
}

export default function IssuingEditPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [caseData, setCaseData] = useState(null)
  const [msg, setMsg] = useState('')
  const [success, setSuccess] = useState('')

  const [form, setForm] = useState({
    contract_appointment: 0,
    contract_selling_pledge: 0,
    contract_mortgage: 0,
    reminder_selling_pledge: 0,
    reminder_mortgage: 0,
    email: '',
    note: '',
  })

  // ===== Document file refs =====
  const docSellingPledgeRef = useRef(null)
  const docMortgageRef = useRef(null)
  const [fileNames, setFileNames] = useState({ doc_selling_pledge: '', doc_mortgage: '' })
  const setFileName = (field, name) => setFileNames(prev => ({ ...prev, [field]: name }))

  useEffect(() => {
    fetch(`${API}/cases/${id}`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setCaseData(d.caseData)
          setForm({
            contract_appointment: d.caseData.contract_appointment || 0,
            contract_selling_pledge: d.caseData.contract_selling_pledge || 0,
            contract_mortgage: d.caseData.contract_mortgage || 0,
            reminder_selling_pledge: d.caseData.reminder_selling_pledge || 0,
            reminder_mortgage: d.caseData.reminder_mortgage || 0,
            email: d.caseData.email || d.caseData.tracking_no || '',
            note: d.caseData.issuing_note || '',
          })
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [id])

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }))

  // ลบเอกสารออกสัญญา
  const deleteDocument = async (column) => {
    if (!confirm('ต้องการลบเอกสารนี้?')) return
    try {
      const res = await fetch(`${API}/delete-document`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ case_id: id, column })
      })
      const data = await res.json()
      if (data.success) setCaseData(prev => ({ ...prev, [`issuing_${column}`]: null }))
      else alert(data.message || 'ลบไม่สำเร็จ')
    } catch { alert('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้') }
  }

  // บันทึกข้อมูล (FormData เพื่อรองรับไฟล์อัพโหลด)
  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setMsg('')
    setSuccess('')

    try {
      const fd = new FormData()
      Object.entries(form).forEach(([k, v]) => fd.append(k, v ?? ''))

      // แนบไฟล์เอกสาร
      const docRefs = { doc_selling_pledge: docSellingPledgeRef, doc_mortgage: docMortgageRef }
      Object.entries(docRefs).forEach(([k, ref]) => { if (ref.current?.files[0]) fd.append(k, ref.current.files[0]) })

      const res = await fetch(`${API}/cases/${id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token()}` },
        body: fd
      })
      const data = await res.json()
      if (data.success) {
        setSuccess('บันทึกข้อมูลสำเร็จ!')
        setTimeout(() => navigate('/issuing'), 1000)
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
        <button className="btn btn-outline" onClick={() => navigate('/issuing')} style={{ marginTop: 16 }}>
          <i className="fas fa-arrow-left"></i> กลับหน้าฝ่ายออกสัญญา
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
          <button className="btn btn-outline" onClick={() => navigate('/issuing')} style={{ padding: '8px 16px' }}>
            <i className="fas fa-arrow-left"></i>
          </button>
          <h2 style={{ margin: 0, fontSize: 20 }}>
            <i className="fas fa-file-contract" style={{ color: 'var(--primary)', marginRight: 8 }}></i>
            แก้ไขเคส (ฝ่ายออกสัญญา) — <span style={{ color: 'var(--primary)' }}>{caseData.case_code}</span>
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

            {/* ข้อมูลอนุมัติวงเงิน */}
            <div className="card" style={{ padding: 24, marginBottom: 20 }}>
              <h3 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 700, color: 'var(--primary)' }}>
                <i className="fas fa-check-circle" style={{ marginRight: 8 }}></i>
                ข้อมูลอนุมัติวงเงิน
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-group">
                  <label>วงเงินอนุมัติ (บาท)</label>
                  <input
                    type="text"
                    value={caseData.approved_credit || '-'}
                    readOnly
                    style={{ background: '#f5f5f5' }}
                  />
                </div>
                <div className="form-group">
                  <label>ดอกเบี้ยต่อปี (%)</label>
                  <input
                    type="text"
                    value={caseData.interest_per_year || '-'}
                    readOnly
                    style={{ background: '#f5f5f5' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
                <div className="form-group">
                  <label>ดอกเบี้ยต่อเดือน (%)</label>
                  <input
                    type="text"
                    value={caseData.interest_per_month || '-'}
                    readOnly
                    style={{ background: '#f5f5f5' }}
                  />
                </div>
                <div className="form-group">
                  <label>ค่าดำเนินการ (บาท)</label>
                  <input
                    type="text"
                    value={caseData.operation_fee || '-'}
                    readOnly
                    style={{ background: '#f5f5f5' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
                <div className="form-group">
                  <label>ค่าประมาณการจากกรมที่ดิน (บาท)</label>
                  <input
                    type="text"
                    value={caseData.land_tax_estimate || '-'}
                    readOnly
                    style={{ background: '#f5f5f5' }}
                  />
                </div>
                <div className="form-group">
                  <label>ดอกเบี้ยล่วงหน้า (บาท)</label>
                  <input
                    type="text"
                    value={caseData.advance_interest || '-'}
                    readOnly
                    style={{ background: '#f5f5f5' }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ===== คอลัมน์ขวา: ออกสัญญา (แก้ไขได้) ===== */}
          <div>
            <div className="card" style={{ padding: 24, marginBottom: 20 }}>
              <h3 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 700, color: 'var(--primary)' }}>
                <i className="fas fa-file-contract" style={{ marginRight: 8 }}></i>
                ข้อมูลออกสัญญา
              </h3>

              {/* ประเภทสัญญา */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontWeight: 600, fontSize: 13, display: 'block', marginBottom: 12 }}>ประเภทสัญญา</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      type="checkbox"
                      checked={form.contract_appointment === 1 || form.contract_appointment === '1'}
                      onChange={e => set('contract_appointment', e.target.checked ? 1 : 0)}
                      style={{ width: 18, height: 18, cursor: 'pointer' }}
                    />
                    <span>สัญญาแต่งตั้งนายหน้า</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      type="checkbox"
                      checked={form.contract_selling_pledge === 1 || form.contract_selling_pledge === '1'}
                      onChange={e => set('contract_selling_pledge', e.target.checked ? 1 : 0)}
                      style={{ width: 18, height: 18, cursor: 'pointer' }}
                    />
                    <span>สัญญาขายฝาก</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      type="checkbox"
                      checked={form.contract_mortgage === 1 || form.contract_mortgage === '1'}
                      onChange={e => set('contract_mortgage', e.target.checked ? 1 : 0)}
                      style={{ width: 18, height: 18, cursor: 'pointer' }}
                    />
                    <span>สัญญาจำนอง</span>
                  </label>
                </div>
              </div>

              {/* จดหมายแจ้งเตือน */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontWeight: 600, fontSize: 13, display: 'block', marginBottom: 12 }}>จดหมายแจ้งเตือน</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      type="checkbox"
                      checked={form.reminder_selling_pledge === 1 || form.reminder_selling_pledge === '1'}
                      onChange={e => set('reminder_selling_pledge', e.target.checked ? 1 : 0)}
                      style={{ width: 18, height: 18, cursor: 'pointer' }}
                    />
                    <span>จดหมายแจ้งเตือนขายฝาก</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      type="checkbox"
                      checked={form.reminder_mortgage === 1 || form.reminder_mortgage === '1'}
                      onChange={e => set('reminder_mortgage', e.target.checked ? 1 : 0)}
                      style={{ width: 18, height: 18, cursor: 'pointer' }}
                    />
                    <span>จดหมายแจ้งเตือนจำนอง</span>
                  </label>
                </div>
              </div>

              {/* อีเมล */}
              <div className="form-group">
                <label>อีเมล</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => set('email', e.target.value)}
                  placeholder="เช่น customer@email.com"
                />
              </div>

              {/* หมายเหตุ */}
              <div className="form-group">
                <label>หมายเหตุ</label>
                <textarea
                  value={form.note}
                  onChange={e => set('note', e.target.value)}
                  placeholder="ระบุหมายเหตุเพิ่มเติม"
                  style={{ minHeight: 120, resize: 'vertical' }}
                />
              </div>
            </div>

            {/* ===== เอกสารออกสัญญา ===== */}
            <div className="card" style={{ padding: 24, marginBottom: 20 }}>
              <h3 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 700, color: 'var(--primary)' }}>
                <i className="fas fa-folder-open" style={{ marginRight: 8 }}></i>
                เอกสารออกสัญญา
              </h3>

              <DocUploadField
                label="สัญญาธุรกรรมขายฝาก"
                fieldName="doc_selling_pledge"
                currentFile={caseData.issuing_doc_selling_pledge}
                fileRef={docSellingPledgeRef}
                fileNameState={fileNames.doc_selling_pledge}
                setFileNameState={(name) => setFileName('doc_selling_pledge', name)}
                onDelete={deleteDocument}
              />

              <DocUploadField
                label="สัญญาธุรกรรมจำนอง"
                fieldName="doc_mortgage"
                currentFile={caseData.issuing_doc_mortgage}
                fileRef={docMortgageRef}
                fileNameState={fileNames.doc_mortgage}
                setFileNameState={(name) => setFileName('doc_mortgage', name)}
                onDelete={deleteDocument}
              />
            </div>

            {/* ปุ่มบันทึก */}
            <div style={{ display: 'flex', gap: 12 }}>
              <button type="submit" className="btn btn-primary" disabled={saving} style={{ padding: '12px 32px', flex: 1 }}>
                {saving ? <><i className="fas fa-spinner fa-spin"></i> กำลังบันทึก...</> : <><i className="fas fa-save"></i> บันทึกข้อมูล</>}
              </button>
              <button type="button" className="btn btn-outline" onClick={() => navigate('/issuing')} style={{ padding: '12px 24px' }}>
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