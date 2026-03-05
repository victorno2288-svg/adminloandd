import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import '../styles/step-form.css'
import CancelCaseButton from '../components/CancelCaseButton'

const token = () => localStorage.getItem('loandd_admin')
const LEGAL_API = '/api/admin/legal'

const appraisalTypeLabel = { outside: 'ประเมินนอก', inside: 'ประเมินใน', check_price: 'เช็คราคา' }
const appraisalResultLabel = { passed: 'ผ่านมาตรฐาน', not_passed: 'ไม่ผ่านมาตรฐาน', '': 'ยังไม่ประเมิน' }
const propertyTypeLabel = { land: 'ที่ดินเปล่า', house: 'บ้านเดี่ยว', condo: 'คอนโด', townhouse: 'ทาวน์เฮ้าส์', other: 'อื่นๆ' }

const legalStatusOptions = [
  { value: 'pending', label: 'รอทำนิติกรรม' },
  { value: 'completed', label: 'ทำนิติกรรมเสร็จสิ้น' },
  { value: 'cancelled', label: 'ยกเลิก' },
]

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
          <a href={`/${currentFile}`} target="_blank" rel="noreferrer">
            {/\.pdf$/i.test(currentFile) ? (
              <div style={{ width: 100, height: 100, borderRadius: 8, border: '2px solid #e74c3c', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#fff5f5', color: '#e74c3c' }}>
                <i className="fas fa-file-pdf" style={{ fontSize: 28 }}></i>
                <span style={{ fontSize: 10, marginTop: 4 }}>PDF</span>
              </div>
            ) : (
              <img src={`/${currentFile}`} alt={label} style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: 8, border: '2px solid #e0e0e0' }}
                onError={e => { e.target.style.display = 'none' }} />
            )}
          </a>
        </div>
      )}
    </div>
  )
}

export default function LegalEditPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [caseData, setCaseData] = useState(null)
  const [msg, setMsg] = useState('')
  const [success, setSuccess] = useState('')

  // ===== Legal form state =====
  const [legalForm, setLegalForm] = useState({
    officer_name: '', visit_date: '', land_office: '', time_slot: '',
    legal_status: 'pending', note: '',
  })

  // ===== Document file refs =====
  const attachmentRef = useRef(null)
  const docSellingPledgeRef = useRef(null)
  const deedSellingPledgeRef = useRef(null)
  const docExtensionRef = useRef(null)
  const deedExtensionRef = useRef(null)
  const docRedemptionRef = useRef(null)
  const deedRedemptionRef = useRef(null)
  const commissionSlipRef = useRef(null)  // ★ สลิปค่าคอมมิชชั่น

  const [fileNames, setFileNames] = useState({
    attachment: '', doc_selling_pledge: '', deed_selling_pledge: '',
    doc_extension: '', deed_extension: '', doc_redemption: '', deed_redemption: '',
    commission_slip: '',  // ★
  })
  const setFileName = (field, name) => setFileNames(prev => ({ ...prev, [field]: name }))

  const setL = (k, v) => setLegalForm(prev => ({ ...prev, [k]: v }))

  useEffect(() => {
    const headers = { Authorization: `Bearer ${token()}` }
    fetch(`${LEGAL_API}/cases/${id}`, { headers })
      .then(r => r.json())
      .then(legalData => {
        if (legalData.success) {
          const c = legalData.caseData
          setCaseData(c)
          setLegalForm({
            officer_name: c.officer_name || '',
            visit_date: toDateInput(c.visit_date),
            land_office: c.land_office || '',
            time_slot: c.time_slot || '',
            legal_status: c.legal_status || 'pending',
            note: c.note || '',
          })
        }
        setLoading(false)
      }).catch(() => setLoading(false))
  }, [id])

  // ลบเอกสารนิติกรรม
  const deleteDocument = async (column) => {
    if (!confirm('ต้องการลบเอกสารนี้?')) return
    try {
      const res = await fetch(`${LEGAL_API}/delete-document`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ case_id: id, column })
      })
      const data = await res.json()
      if (data.success) setCaseData(prev => ({ ...prev, [column]: null }))
      else alert(data.message || 'ลบไม่สำเร็จ')
    } catch { alert('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้') }
  }

  // บันทึกข้อมูลฝ่ายนิติกรรม
  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setMsg('')
    setSuccess('')
    try {
      const fd = new FormData()
      Object.entries(legalForm).forEach(([k, v]) => fd.append(k, v ?? ''))
      const docRefs = {
        attachment: attachmentRef, doc_selling_pledge: docSellingPledgeRef, deed_selling_pledge: deedSellingPledgeRef,
        doc_extension: docExtensionRef, deed_extension: deedExtensionRef,
        doc_redemption: docRedemptionRef, deed_redemption: deedRedemptionRef,
        commission_slip: commissionSlipRef,  // ★ สลิปค่าคอม
      }
      Object.entries(docRefs).forEach(([k, ref]) => { if (ref.current?.files[0]) fd.append(k, ref.current.files[0]) })

      const legalRes = await fetch(`${LEGAL_API}/cases/${id}`, { method: 'PUT', headers: { Authorization: `Bearer ${token()}` }, body: fd })
      const lData = await legalRes.json()

      if (lData.success) {
        setSuccess('บันทึกข้อมูลสำเร็จ!')
        // อัพเดท commission_slip ใน state ถ้าเพิ่งอัพโหลด
        if (commissionSlipRef.current?.files[0]) {
          setCaseData(prev => ({ ...prev, commission_slip: 'uploaded' }))
        }
        setTimeout(() => navigate('/legal'), 1000)
      } else {
        setMsg(lData.message || 'เกิดข้อผิดพลาด')
      }
    } catch { setMsg('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้') }
    setSaving(false)
  }

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '60px 0' }}>
      <i className="fas fa-spinner fa-spin" style={{ fontSize: 32, color: 'var(--primary)' }}></i>
      <p style={{ marginTop: 12 }}>กำลังโหลดข้อมูล...</p>
    </div>
  )

  if (!caseData) return (
    <div style={{ textAlign: 'center', padding: '60px 0' }}>
      <i className="fas fa-exclamation-triangle" style={{ fontSize: 32, color: '#e74c3c' }}></i>
      <p style={{ marginTop: 12 }}>ไม่พบข้อมูลเคส</p>
      <button className="btn btn-outline" onClick={() => navigate('/legal')} style={{ marginTop: 16 }}>
        <i className="fas fa-arrow-left"></i> กลับ
      </button>
    </div>
  )

  const parseImages = (jsonStr) => { try { return JSON.parse(jsonStr) || [] } catch { return [] } }
  const images = parseImages(caseData.images)
  const deedImages = parseImages(caseData.deed_images)
  const appraisalImages = parseImages(caseData.appraisal_images)

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

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn btn-outline" onClick={() => navigate('/legal')} style={{ padding: '8px 16px' }}>
            <i className="fas fa-arrow-left"></i>
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h2 style={{ margin: 0, fontSize: 20 }}>
              <i className="fas fa-gavel" style={{ color: 'var(--primary)', marginRight: 8 }}></i>
              แก้ไขเคส (ฝ่ายนิติกรรม) — <span style={{ color: 'var(--primary)' }}>{caseData.case_code}</span>
              {caseData.contact_name && <span style={{ color: '#64748b', fontSize: 15, fontWeight: 500, marginLeft: 4 }}>({caseData.contact_name})</span>}
            </h2>
            {(caseData.legal_approval_type || caseData.loan_type_detail) && (
              <span style={{
                fontSize: 13, fontWeight: 700, padding: '4px 14px', borderRadius: 20,
                background: (caseData.legal_approval_type || caseData.loan_type_detail) === 'mortgage' ? '#e3f2fd' : '#f3e5f5',
                color: (caseData.legal_approval_type || caseData.loan_type_detail) === 'mortgage' ? '#1565c0' : '#6a1b9a',
                border: `1.5px solid ${(caseData.legal_approval_type || caseData.loan_type_detail) === 'mortgage' ? '#1565c0' : '#6a1b9a'}40`,
              }}>
                <i className="fas fa-tag" style={{ marginRight: 5 }}></i>
                {(caseData.legal_approval_type || caseData.loan_type_detail) === 'mortgage' ? 'จำนอง' : 'ขายฝาก'}
              </span>
            )}
          </div>
        </div>
        <span style={{ fontSize: 13, color: 'var(--gray)' }}>สร้างเมื่อ: {formatDate(caseData.created_at)}</span>
      </div>

      {msg && <div className="error-msg" style={{ marginBottom: 16 }}>{msg}</div>}
      {success && <div className="success-msg" style={{ marginBottom: 16 }}>{success}</div>}

      <form onSubmit={handleSubmit}>
        <div className="edit-page-grid">

          {/* ===== LEFT: read-only ===== */}
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
                <div className="form-group"><label>จังหวัด</label><input type="text" value={caseData.province || '-'} readOnly style={{ background: '#f5f5f5' }} /></div>
                <div className="form-group"><label>อำเภอ</label><input type="text" value={caseData.district || '-'} readOnly style={{ background: '#f5f5f5' }} /></div>
                <div className="form-group"><label>ตำบล</label><input type="text" value={caseData.subdistrict || '-'} readOnly style={{ background: '#f5f5f5' }} /></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div className="form-group"><label>บ้านเลขที่</label><input type="text" value={caseData.house_no || '-'} readOnly style={{ background: '#f5f5f5' }} /></div>
                <div className="form-group"><label>ชื่อหมู่บ้าน / โครงการ</label><input type="text" value={caseData.village_name || '-'} readOnly style={{ background: '#f5f5f5' }} /></div>
              </div>
              <div className="form-group">
                <label>โลเคชั่น</label>
                {caseData.location_url
                  ? <a href={caseData.location_url} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: 'var(--primary)', wordBreak: 'break-all' }}><i className="fas fa-map-marker-alt"></i> {caseData.location_url}</a>
                  : <input type="text" value="-" readOnly style={{ background: '#f5f5f5' }} />}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                <div className="form-group"><label>เลขโฉนด</label><input type="text" value={caseData.deed_number || '-'} readOnly style={{ background: '#f5f5f5' }} /></div>
                <div className="form-group"><label>ประเภทโฉนด</label><input type="text" value={{ ns4: 'โฉนดที่ดิน (น.ส.4)', ns3: 'น.ส.3', ns3k: 'น.ส.3ก', spk: 'ส.ป.ก.', ns2k: 'น.ส.2ก' }[caseData.deed_type] || caseData.deed_type || '-'} readOnly style={{ background: '#f5f5f5' }} /></div>
                <div className="form-group"><label>พื้นที่</label><input type="text" value={caseData.land_area ? `${caseData.land_area} ตร.วา` : '-'} readOnly style={{ background: '#f5f5f5' }} /></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginTop: 16 }}>
                <div><label style={{ fontSize: 13, fontWeight: 600 }}>รูปโฉนด</label><ImageGrid imgList={deedImages} label="deed" /></div>
                <div><label style={{ fontSize: 13, fontWeight: 600 }}>รูปทรัพย์จากลูกค้า</label><ImageGrid imgList={images.filter(img => img.includes('properties'))} label="prop" /></div>
                <div><label style={{ fontSize: 13, fontWeight: 600 }}>ใบอนุญาตสิ่งปลูกสร้าง</label><ImageGrid imgList={images.filter(img => img.includes('permits'))} label="permit" /></div>
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

            {/* สถานะประเมิน */}
            <div className="card" style={{ padding: 24, marginBottom: 20 }}>
              <h3 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 700, color: 'var(--primary)' }}>
                <i className="fas fa-clipboard-check" style={{ marginRight: 8 }}></i>สถานะประเมิน
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-group"><label>ประเภทประเมิน</label><input type="text" value={appraisalTypeLabel[caseData.appraisal_type] || caseData.appraisal_type || '-'} readOnly style={{ background: '#f5f5f5' }} /></div>
                <div className="form-group"><label>ผลประเมิน</label><input type="text" value={appraisalResultLabel[caseData.appraisal_result] || caseData.appraisal_result || '-'} readOnly style={{ background: '#f5f5f5' }} /></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 12 }}>
                <div className="form-group"><label>วันที่นัดประเมิน</label><input type="text" value={formatDate(caseData.appraisal_date)} readOnly style={{ background: '#f5f5f5' }} /></div>
                <div className="form-group"><label>ค่าประเมิน (บาท)</label><input type="text" value={caseData.appraisal_fee || '-'} readOnly style={{ background: '#f5f5f5' }} /></div>
              </div>
            </div>

            {/* ผลประเมินจากฝ่ายประเมิน */}
            <div className="card" style={{ padding: 24, marginBottom: 20, borderTop: '3px solid #e67e22' }}>
              <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700, color: '#e67e22' }}>
                <i className="fas fa-chart-bar" style={{ marginRight: 8 }}></i>ผลประเมินจากฝ่ายประเมิน
              </h3>
              <p style={{ margin: '0 0 16px', fontSize: 12, color: '#888' }}>ข้อมูลจากฝ่ายประเมิน — ดูอ้างอิงเท่านั้น</p>
              {[
                { label: 'ผลประเมินนอก', icon: 'fa-map-marker-alt', color: '#e67e22', result: caseData.outside_result, reason: caseData.outside_reason, at: caseData.outside_recorded_at },
                { label: 'ผลประเมินใน', icon: 'fa-home', color: '#3498db', result: caseData.inside_result, reason: caseData.inside_reason, at: caseData.inside_recorded_at },
              ].map(({ label, icon, color, result, reason, at }) => (
                <div key={label} style={{ background: '#fafafa', border: '1px solid #eee', borderRadius: 8, padding: 14, marginBottom: 10 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10, color: '#555' }}>
                    <i className={`fas ${icon}`} style={{ marginRight: 6, color }}></i> {label}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div className="form-group">
                      <label>ผลประเมิน</label>
                      <input type="text" readOnly style={{ background: '#f5f5f5' }}
                        value={result === 'passed' ? 'ผ่านมาตรฐาน' : result === 'not_passed' ? 'ไม่ผ่านมาตรฐาน' : '-'} />
                    </div>
                    <div className="form-group">
                      <label>วันเวลาบันทึก</label>
                      <input type="text" readOnly style={{ background: '#f5f5f5' }}
                        value={at ? new Date(at).toLocaleString('th-TH') : '-'} />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>เหตุผล</label>
                    <input type="text" readOnly style={{ background: '#f5f5f5' }} value={reason || '-'} />
                  </div>
                </div>
              ))}
              <div style={{ background: '#fafafa', border: '1px solid #eee', borderRadius: 8, padding: 14 }}>
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10, color: '#555' }}>
                  <i className="fas fa-tags" style={{ marginRight: 6, color: '#9b59b6' }}></i> ผลเช็คราคา
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="form-group"><label>ราคา (บาท)</label><input type="text" readOnly style={{ background: '#f5f5f5' }} value={caseData.check_price_value ? Number(caseData.check_price_value).toLocaleString() : '-'} /></div>
                  <div className="form-group"><label>วันเวลาบันทึก</label><input type="text" readOnly style={{ background: '#f5f5f5' }} value={caseData.check_price_recorded_at ? new Date(caseData.check_price_recorded_at).toLocaleString('th-TH') : '-'} /></div>
                </div>
                <div className="form-group"><label>รายละเอียด</label><input type="text" readOnly style={{ background: '#f5f5f5' }} value={caseData.check_price_detail || '-'} /></div>
              </div>
            </div>

            {/* ข้อมูลอนุมัติวงเงิน */}
            <div className="card" style={{ padding: 24, marginBottom: 20, borderTop: '3px solid #27ae60' }}>
              <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700, color: '#27ae60' }}>
                <i className="fas fa-money-check-alt" style={{ marginRight: 8 }}></i>ข้อมูลอนุมัติวงเงิน
              </h3>
              <p style={{ margin: '0 0 16px', fontSize: 12, color: '#888' }}>ข้อมูลจากฝ่ายอนุมัติวงเงิน — ดูอ้างอิงเท่านั้น</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-group"><label>ประเภทสินเชื่อ</label>
                  <input type="text" readOnly style={{
                    background: '#f5f5f5',
                    fontWeight: 700,
                    color: (caseData.legal_approval_type || caseData.loan_type_detail) === 'selling_pledge' ? '#6a1b9a' : (caseData.legal_approval_type || caseData.loan_type_detail) === 'mortgage' ? '#1565c0' : '#999'
                  }}
                    value={(caseData.legal_approval_type || caseData.loan_type_detail) === 'selling_pledge' ? 'ขายฝาก' : (caseData.legal_approval_type || caseData.loan_type_detail) === 'mortgage' ? 'จำนอง' : '-'} /></div>
                <div className="form-group"><label>วงเงินที่อนุมัติ (บาท)</label>
                  <input type="text" readOnly style={{ background: '#f5f5f5' }}
                    value={caseData.approved_credit ? Number(caseData.approved_credit).toLocaleString() : '-'} /></div>
              </div>
              <div className="form-group"><label>วันที่อนุมัติ</label>
                <input type="text" readOnly style={{ background: '#f5f5f5' }}
                  value={caseData.approval_date ? formatDate(caseData.approval_date) : '-'} /></div>
            </div>

            {/* ข้อมูลการทำธุรกรรม */}
            <div className="card" style={{ padding: 24, marginBottom: 20, borderTop: '3px solid var(--primary)' }}>
              <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700, color: 'var(--primary)' }}>
                <i className="fas fa-handshake" style={{ marginRight: 8 }}></i>
                ข้อมูลการทำธุรกรรม (ฝ่ายขาย → ฝ่ายนิติกรรม)
              </h3>
              <p style={{ margin: '0 0 16px', fontSize: 12, color: '#888' }}>ข้อมูลที่ฝ่ายขายกรอกไว้เป็นอ้างอิง — แก้ไขได้ที่ฝ่ายขายเท่านั้น</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-group"><label>วันที่ธุรกรรม</label>
                  <input type="text" readOnly style={{ background: '#f5f5f5' }}
                    value={caseData.transaction_date ? formatDate(caseData.transaction_date) : '-'} /></div>
                <div className="form-group"><label>เวลา</label>
                  <input type="text" readOnly style={{ background: '#f5f5f5' }} value={caseData.transaction_time || '-'} /></div>
              </div>
              <div className="form-group"><label>สำนักงานที่ดิน</label>
                <input type="text" readOnly style={{ background: '#f5f5f5' }} value={caseData.transaction_land_office || '-'} /></div>
              <div className="form-group"><label>หมายเหตุ</label>
                <textarea rows="3" readOnly style={{ background: '#f5f5f5', resize: 'none' }} value={caseData.transaction_note || '-'}></textarea></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-group"><label>ผู้บันทึก</label>
                  <input type="text" readOnly style={{ background: '#f5f5f5' }} value={caseData.transaction_recorded_by || '-'} /></div>
                <div className="form-group"><label>วันเวลาที่บันทึก</label>
                  <input type="text" readOnly style={{ background: '#f5f5f5' }}
                    value={caseData.transaction_recorded_at ? new Date(caseData.transaction_recorded_at).toLocaleString('th-TH') : '-'} /></div>
              </div>
            </div>
          </div>

          {/* ===== RIGHT: editable ===== */}
          <div>

            {/* ---- นิติกรรม ---- */}
            <div className="card" style={{ padding: 24, marginBottom: 20 }}>
              <h3 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 700, color: 'var(--primary)' }}>
                <i className="fas fa-gavel" style={{ marginRight: 8 }}></i>นิติกรรม (นัดที่ดิน)
              </h3>

              <div className="form-group">
                <label>เจ้าหน้าที่</label>
                <input type="text" value={legalForm.officer_name} onChange={e => setL('officer_name', e.target.value)} placeholder="ชื่อเจ้าหน้าที่" />
              </div>
              <div className="form-group">
                <label>วันที่ไป</label>
                <input type="date" value={legalForm.visit_date} onChange={e => setL('visit_date', e.target.value)} />
              </div>
              <div className="form-group">
                <label>สำนักงานที่ดิน</label>
                <input type="text" value={legalForm.land_office} onChange={e => setL('land_office', e.target.value)} placeholder="สำนักงานที่ดิน" />
              </div>
              <div className="form-group">
                <label>ช่วงเวลา</label>
                <input type="text" value={legalForm.time_slot} onChange={e => setL('time_slot', e.target.value)} placeholder="เช่น 09:00 - 12:00" />
              </div>
              <div className="form-group">
                <label>สถานะนิติกรรม</label>
                <select value={legalForm.legal_status} onChange={e => setL('legal_status', e.target.value)}>
                  {legalStatusOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>หมายเหตุ (นิติกรรม)</label>
                <textarea rows="3" value={legalForm.note} onChange={e => setL('note', e.target.value)}
                  placeholder="บันทึกรายละเอียดเพิ่มเติม..." style={{ resize: 'vertical' }}></textarea>
              </div>
            </div>

            {/* ---- เอกสารนิติกรรม ---- */}
            <div className="card" style={{ padding: 24, marginBottom: 20 }}>
              <h3 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 700, color: 'var(--primary)' }}>
                <i className="fas fa-file-upload" style={{ marginRight: 8 }}></i>เอกสารนิติกรรม
              </h3>
              {[
                { key: 'attachment', label: 'เอกสารแนบท้าย', ref: attachmentRef },
                { key: 'doc_selling_pledge', label: 'เอกสารขายฝาก/จำนอง', ref: docSellingPledgeRef },
                { key: 'deed_selling_pledge', label: 'โฉนดขายฝาก/จำนอง', ref: deedSellingPledgeRef },
                { key: 'doc_extension', label: 'เอกสารขยาย', ref: docExtensionRef },
                { key: 'deed_extension', label: 'โฉนดขยาย', ref: deedExtensionRef },
                { key: 'doc_redemption', label: 'เอกสารไถ่ถอน', ref: docRedemptionRef },
                { key: 'deed_redemption', label: 'โฉนดไถ่ถอน', ref: deedRedemptionRef },
              ].map(({ key, label, ref }) => (
                <DocUploadField key={key} label={label} fieldName={key} currentFile={caseData[key]}
                  fileRef={ref} fileNameState={fileNames[key]}
                  setFileNameState={(name) => setFileName(key, name)} onDelete={deleteDocument} />
              ))}
            </div>

            {/* ---- ★ สลิปค่าคอมมิชชั่น (บังคับก่อนปิดเคส) ---- */}
            <div className="card" style={{
              padding: 24, marginBottom: 20,
              borderTop: '3px solid #e65100',
              background: caseData.commission_slip ? '#f1f8e9' : legalForm.legal_status === 'completed' ? '#fff3e0' : '#fff'
            }}>
              <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 700, color: '#e65100' }}>
                <i className="fas fa-file-invoice-dollar" style={{ marginRight: 8 }}></i>
                สลิปค่าคอมมิชชั่น
                <span style={{
                  marginLeft: 10, fontSize: 12, fontWeight: 600, padding: '2px 10px', borderRadius: 12,
                  background: caseData.commission_slip ? '#c8e6c9' : '#ffccbc',
                  color: caseData.commission_slip ? '#2e7d32' : '#bf360c',
                }}>
                  {caseData.commission_slip ? '✅ อัพโหลดแล้ว' : '⚠️ ยังไม่มีสลิป'}
                </span>
              </h3>
              <p style={{ margin: '0 0 14px', fontSize: 12, color: '#888' }}>
                ตามคำสั่งบอส: ต้องอัพโหลดสลิปค่าคอมก่อนจึงจะสามารถปิดเคส (สถานะ "ทำนิติกรรมเสร็จสิ้น") ได้
              </p>

              {!caseData.commission_slip && legalForm.legal_status === 'completed' && (
                <div style={{
                  background: '#fff3e0', border: '2px solid #ff9800', borderRadius: 8,
                  padding: '10px 14px', marginBottom: 14, fontSize: 13, color: '#e65100', fontWeight: 600,
                }}>
                  <i className="fas fa-exclamation-triangle" style={{ marginRight: 6 }}></i>
                  คุณเลือกสถานะ "ทำนิติกรรมเสร็จสิ้น" — กรุณาอัพโหลดสลิปก่อนบันทึก
                </div>
              )}

              <DocUploadField
                label="อัพโหลดสลิปค่าคอมมิชชั่น"
                fieldName="commission_slip"
                currentFile={caseData.commission_slip}
                fileRef={commissionSlipRef}
                fileNameState={fileNames.commission_slip}
                setFileNameState={(name) => setFileName('commission_slip', name)}
                onDelete={deleteDocument}
              />
            </div>

            {/* ปุ่มบันทึก */}
            <div style={{ display: 'flex', gap: 12 }}>
              <button type="submit" className="btn btn-primary" disabled={saving} style={{ padding: '12px 32px', flex: 1 }}>
                {saving
                  ? <><i className="fas fa-spinner fa-spin"></i> กำลังบันทึก...</>
                  : <><i className="fas fa-save"></i> บันทึกข้อมูลทั้งหมด</>}
              </button>
              <button type="button" className="btn btn-outline" onClick={() => navigate('/legal')} style={{ padding: '12px 24px' }}>
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
