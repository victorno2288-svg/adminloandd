import { useState, useEffect, useRef } from 'react'
import '../styles/sales.css'

const token = () => localStorage.getItem('loandd_admin')
const API = '/api/admin/investor-history'

// ==================== DocViewerModal ====================
function DocViewerModal({ show, onClose, title, documents }) {
  if (!show) return null
  const hasAny = documents.some(sec => sec.items.length > 0)
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 750 }}>
        <div className="modal-header">
          <h3><i className="fas fa-folder-open"></i> เอกสาร — {title}</h3>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          {!hasAny ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
              <i className="fas fa-file-image" style={{ fontSize: 40, marginBottom: 12, display: 'block' }}></i>
              <p>ไม่มีเอกสาร</p>
            </div>
          ) : documents.map((sec, si) => {
            if (sec.items.length === 0) return null
            return (
              <div key={si} style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, padding: '8px 12px', background: '#f8f9fa', borderRadius: 8, borderLeft: `4px solid ${sec.color || 'var(--primary)'}` }}>
                  <i className={`fas ${sec.icon}`} style={{ color: sec.color || 'var(--primary)', fontSize: 16 }}></i>
                  <strong style={{ fontSize: 14 }}>{sec.label}</strong>
                  <span style={{ fontSize: 12, color: '#999', marginLeft: 'auto' }}>({sec.items.length} ไฟล์)</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, paddingLeft: 4 }}>
                  {sec.items.map((filePath, i) => {
                    const ext = filePath.split('.').pop().toLowerCase()
                    const isPdf = ext === 'pdf'
                    const fileName = filePath.split('/').pop()
                    const url = filePath.startsWith('http') ? filePath : filePath.startsWith('/') ? filePath : `/${filePath}`
                    if (isPdf) return (
                      <a key={i} href={url} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', textAlign: 'center', width: 100 }} title={fileName}>
                        <div style={{ width: 100, height: 100, borderRadius: 8, border: '2px solid #e74c3c', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#fff5f5', color: '#e74c3c', gap: 4, cursor: 'pointer' }}>
                          <i className="fas fa-file-pdf" style={{ fontSize: 30 }}></i>
                          <span style={{ fontSize: 10, fontWeight: 600 }}>PDF</span>
                        </div>
                        <div style={{ fontSize: 10, color: '#666', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 100 }}>{fileName}</div>
                      </a>
                    )
                    return (
                      <a key={i} href={url} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', textAlign: 'center', width: 100 }} title={fileName}>
                        <div style={{ width: 100, height: 100, borderRadius: 8, border: '2px solid #e0e0e0', overflow: 'hidden', cursor: 'pointer', background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <img src={url} alt={`doc-${i}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.target.style.display = 'none'; e.target.parentElement.innerHTML = '<i class="fas fa-image" style="font-size:28px;color:#ccc"></i>' }} />
                        </div>
                        <div style={{ fontSize: 10, color: '#666', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 100 }}>{fileName}</div>
                      </a>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
        <div className="modal-footer"><button className="btn btn-outline" onClick={onClose}>ปิด</button></div>
      </div>
    </div>
  )
}

const statusLabel = { pending: 'รอดำเนินการ', transferred: 'โอนแล้ว', cancelled: 'ยกเลิก' }
const statusBadge = { pending: 'badge-pending', transferred: 'badge-paid', cancelled: 'badge-cancelled' }

function formatDate(d) {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatMoney(n) {
  if (!n && n !== 0) return '-'
  return Number(n).toLocaleString('th-TH', { minimumFractionDigits: 0 })
}

// ========== Pagination ==========
const PER_PAGE = 10

function Pagination({ total, page, setPage }) {
  const totalPages = Math.ceil(total / PER_PAGE)
  if (totalPages <= 1) return null
  const startItem = (page - 1) * PER_PAGE + 1
  const endItem = Math.min(page * PER_PAGE, total)

  let pages = []
  const maxShow = 5
  let startP = Math.max(1, page - Math.floor(maxShow / 2))
  let endP = Math.min(totalPages, startP + maxShow - 1)
  if (endP - startP < maxShow - 1) startP = Math.max(1, endP - maxShow + 1)
  for (let i = startP; i <= endP; i++) pages.push(i)

  const btnStyle = (active) => ({
    padding: '6px 12px', borderRadius: 6, border: '1px solid #ddd', cursor: 'pointer',
    fontSize: 13, fontWeight: active ? 700 : 400, minWidth: 36, textAlign: 'center',
    background: active ? 'var(--primary)' : '#fff', color: active ? '#fff' : '#333',
    transition: 'all 0.15s'
  })

  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', marginTop: 8 }}>
      <span style={{ fontSize: 13, color: '#888' }}>แสดง {startItem} ถึง {endItem} จาก {total} รายการ</span>
      <div style={{ display: 'flex', gap: 4 }}>
        <button style={btnStyle(false)} onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}>Previous</button>
        {pages.map(p => (
          <button key={p} style={btnStyle(p === page)} onClick={() => setPage(p)}>{p}</button>
        ))}
        <button style={btnStyle(false)} onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages}>Next</button>
      </div>
    </div>
  )
}

// ========== Modal เพิ่ม/แก้ไขรายการถอนเงิน ==========
function WithdrawalModal({ isOpen, onClose, onSaved, editData, investors, cases }) {
  const isEdit = !!editData
  const [form, setForm] = useState({
    investor_id: '', case_id: '', amount: '', withdrawal_date: '', status: 'pending', note: ''
  })
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [slipPath, setSlipPath] = useState(null)
  const [slipFile, setSlipFile] = useState(null) // สำหรับแนบสลิปตอนสร้างใหม่
  const fileRef = useRef(null)
  const newFileRef = useRef(null)

  useEffect(() => {
    if (isOpen) {
      if (editData) {
        setForm({
          investor_id: editData.investor_id || '',
          case_id: editData.case_id || '',
          amount: editData.amount || '',
          withdrawal_date: editData.withdrawal_date ? editData.withdrawal_date.substring(0, 10) : '',
          status: editData.status || 'pending',
          note: editData.note || ''
        })
        setSlipPath(editData.slip_path || null)
        setSlipFile(null)
      } else {
        setForm({ investor_id: '', case_id: '', amount: '', withdrawal_date: '', status: 'pending', note: '' })
        setSlipPath(null)
        setSlipFile(null)
      }
    }
  }, [isOpen, editData])

  const handleChange = (field, value) => setForm(prev => ({ ...prev, [field]: value }))

  const handleSave = async () => {
    if (!form.investor_id) return alert('กรุณาเลือกนายทุน')
    if (!form.amount || Number(form.amount) <= 0) return alert('กรุณากรอกจำนวนเงิน')
    setSaving(true)
    try {
      if (isEdit) {
        // แก้ไข — ส่ง JSON ธรรมดา
        const res = await fetch(`${API}/withdrawals/${editData.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
          body: JSON.stringify(form)
        })
        const r = await res.json()
        if (r.success) { onSaved(); onClose() }
        else alert(r.message || 'เกิดข้อผิดพลาด')
      } else {
        // สร้างใหม่ — ส่ง FormData (รองรับแนบสลิป)
        const fd = new FormData()
        fd.append('investor_id', form.investor_id)
        fd.append('case_id', form.case_id || '')
        fd.append('amount', form.amount)
        fd.append('withdrawal_date', form.withdrawal_date || '')
        fd.append('status', form.status)
        fd.append('note', form.note || '')
        if (slipFile) fd.append('slip', slipFile)

        const res = await fetch(`${API}/withdrawals`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token()}` },
          body: fd
        })
        const r = await res.json()
        if (r.success) { onSaved(); onClose() }
        else alert(r.message || 'เกิดข้อผิดพลาด')
      }
    } catch { alert('เกิดข้อผิดพลาด') }
    finally { setSaving(false) }
  }

  // อัพโหลดสลิป (ต้อง save รายการก่อนถึงจะมี id)
  const handleUploadSlip = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (!isEdit || !editData?.id) {
      alert('กรุณาบันทึกรายการก่อน แล้วค่อยอัพโหลดสลิป')
      e.target.value = ''
      return
    }
    setUploading(true)
    const formData = new FormData()
    formData.append('slip', file)
    try {
      const res = await fetch(`${API}/withdrawals/${editData.id}/slip`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}` },
        body: formData
      })
      const d = await res.json()
      if (d.success) {
        setSlipPath(d.slip_path)
        onSaved() // reload data ด้านนอก
      } else alert(d.message || 'อัพโหลดไม่สำเร็จ')
    } catch { alert('เกิดข้อผิดพลาด') }
    finally { setUploading(false); e.target.value = '' }
  }

  // ลบสลิป
  const handleDeleteSlip = async () => {
    if (!confirm('ยืนยันลบสลิปนี้?')) return
    if (!isEdit || !editData?.id) return
    try {
      const res = await fetch(`${API}/withdrawals/${editData.id}/slip`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token()}` }
      })
      const d = await res.json()
      if (d.success) {
        setSlipPath(null)
        onSaved()
      } else alert(d.message || 'ลบสลิปไม่สำเร็จ')
    } catch { alert('เกิดข้อผิดพลาด') }
  }

  if (!isOpen) return null

  const labelStyle = { fontSize: 14, fontWeight: 600, color: '#333', marginBottom: 4 }
  const inputStyle = {
    width: '100%', padding: '10px 12px', borderRadius: 8,
    border: '1px solid #ddd', fontSize: 14, outline: 'none',
    transition: 'border-color 0.15s', boxSizing: 'border-box'
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', zIndex: 9998 }}></div>
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        zIndex: 9999, background: '#fff', borderRadius: 12,
        width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 8px 32px rgba(0,0,0,0.25)'
      }}>
        <div style={{
          background: 'var(--primary)', color: '#fff', padding: '16px 24px',
          borderRadius: '12px 12px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>
            {isEdit ? 'แก้ไขรายการถอนเงิน' : 'เพิ่มรายการถอนเงิน'}
          </h3>
          <button onClick={onClose} style={{
            background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff',
            width: 32, height: 32, borderRadius: '50%', fontSize: 16,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* เลือกนายทุน */}
          <div>
            <label style={labelStyle}>นายทุน</label>
            <select style={inputStyle} value={form.investor_id} onChange={e => handleChange('investor_id', e.target.value)}>
              <option value="">-- เลือกนายทุน --</option>
              {investors.map(inv => (
                <option key={inv.id} value={inv.id}>{inv.investor_code} - {inv.full_name}</option>
              ))}
            </select>
          </div>

          {/* เลือกเคส */}
          <div>
            <label style={labelStyle}>ID เคส (ถอนจากเคสไหน)</label>
            <select style={inputStyle} value={form.case_id} onChange={e => handleChange('case_id', e.target.value)}>
              <option value="">-- ไม่ระบุเคส --</option>
              {cases.map(c => (
                <option key={c.id} value={c.id}>{c.case_code}{c.province ? ` — ${c.province}` : ''}</option>
              ))}
            </select>
          </div>

          {/* จำนวนเงิน + วันที่ */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={labelStyle}>จำนวนเงิน</label>
              <input style={inputStyle} type="number" value={form.amount} onChange={e => handleChange('amount', e.target.value)} placeholder="0"
                onFocus={e => e.target.style.borderColor = 'var(--primary)'} onBlur={e => e.target.style.borderColor = '#ddd'} />
            </div>
            <div>
              <label style={labelStyle}>วันที่ถอนเงิน</label>
              <input style={inputStyle} type="date" value={form.withdrawal_date} onChange={e => handleChange('withdrawal_date', e.target.value)} />
            </div>
          </div>

          {/* สถานะ */}
          <div>
            <label style={labelStyle}>สถานะ</label>
            <select style={inputStyle} value={form.status} onChange={e => handleChange('status', e.target.value)}>
              <option value="pending">รอดำเนินการ</option>
              <option value="transferred">โอนแล้ว</option>
              <option value="cancelled">ยกเลิก</option>
            </select>
          </div>

          {/* หมายเหตุ */}
          <div>
            <label style={labelStyle}>หมายเหตุ</label>
            <textarea style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }} value={form.note} onChange={e => handleChange('note', e.target.value)} placeholder="หมายเหตุ (ถ้ามี)"
              onFocus={e => e.target.style.borderColor = 'var(--primary)'} onBlur={e => e.target.style.borderColor = '#ddd'} />
          </div>

          {/* สลิป — อัพโหลด / ดู / ลบ */}
          <div>
            <label style={labelStyle}>สลิปการโอน</label>
            {slipPath ? (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                borderRadius: 8, border: '1px solid #ddd', background: '#f9f9f9'
              }}>
                <button
                  onClick={() => {
                    // เปิด DocViewerModal แบบ popup แทนเปิด tab ใหม่
                    window.__showSlipPopup && window.__showSlipPopup(slipPath)
                  }}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '6px 14px', borderRadius: 6, background: '#f0f8ff',
                    color: '#3498db', fontSize: 13, fontWeight: 600,
                    border: '1px solid #3498db', cursor: 'pointer'
                  }}
                >
                  <i className="fas fa-image"></i> ดูสลิป
                </button>
                <button onClick={handleDeleteSlip} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '6px 14px', borderRadius: 6, border: '1px solid #e74c3c',
                  background: '#fff0f0', color: '#e74c3c', fontSize: 13, fontWeight: 600, cursor: 'pointer'
                }}>
                  <i className="fas fa-trash"></i> ลบสลิป
                </button>
              </div>
            ) : isEdit ? (
              <label style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '10px 18px', borderRadius: 8, border: '1px dashed #aaa',
                background: '#fafafa', color: '#666', fontSize: 14, fontWeight: 600,
                cursor: uploading ? 'not-allowed' : 'pointer'
              }}>
                <i className={uploading ? 'fas fa-spinner fa-spin' : 'fas fa-upload'}></i>
                {uploading ? 'กำลังอัพโหลด...' : 'อัพโหลดสลิป'}
                <input ref={fileRef} type="file" accept=".jpg,.jpeg,.png,.pdf" onChange={handleUploadSlip}
                  style={{ display: 'none' }} disabled={uploading} />
              </label>
            ) : (
              <div>
                <label style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '10px 18px', borderRadius: 8,
                  border: slipFile ? '2px solid var(--primary)' : '1px dashed #aaa',
                  background: slipFile ? '#f0faf5' : '#fafafa',
                  color: slipFile ? 'var(--primary)' : '#666',
                  fontSize: 14, fontWeight: 600, cursor: 'pointer'
                }}>
                  <i className={slipFile ? 'fas fa-check-circle' : 'fas fa-upload'}></i>
                  {slipFile ? slipFile.name : 'แนบสลิป (โอนแล้วปิดเคสอัตโนมัติ)'}
                  <input ref={newFileRef} type="file" accept=".jpg,.jpeg,.png,.pdf"
                    onChange={e => { setSlipFile(e.target.files[0] || null) }}
                    style={{ display: 'none' }} />
                </label>
                {slipFile && (
                  <button onClick={() => { setSlipFile(null); if (newFileRef.current) newFileRef.current.value = '' }}
                    style={{ marginLeft: 8, background: 'none', border: 'none', color: '#e74c3c', fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>
                    <i className="fas fa-times"></i> ยกเลิก
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        <div style={{ padding: '16px 24px', borderTop: '1px solid #eee', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button onClick={onClose} style={{
            padding: '10px 24px', borderRadius: 8, border: '1px solid #ddd',
            background: '#fff', color: '#555', fontSize: 14, fontWeight: 600, cursor: 'pointer'
          }}>ยกเลิก</button>
          <button onClick={handleSave} disabled={saving} style={{
            padding: '10px 24px', borderRadius: 8, border: 'none',
            background: 'var(--primary)', color: '#fff', fontSize: 14, fontWeight: 600,
            cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1
          }}>{saving ? 'กำลังบันทึก...' : 'บันทึก'}</button>
        </div>
      </div>
    </>
  )
}

// ==================== MAIN PAGE ====================
export default function WithdrawalHistoryPage() {
  const [data, setData] = useState([])
  const [investors, setInvestors] = useState([])
  const [cases, setCases] = useState([])
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editData, setEditData] = useState(null)
  const [docModal, setDocModal] = useState({ show: false, title: '', documents: [] })

  // expose popup fn สำหรับปุ่มใน WithdrawalModal
  useEffect(() => {
    window.__showSlipPopup = (slipPath) => {
      setDocModal({
        show: true,
        title: 'สลิปการโอน',
        documents: [{ label: 'สลิป', icon: 'fa-image', color: '#3498db', items: [slipPath] }]
      })
    }
    return () => { delete window.__showSlipPopup }
  }, [])

  const openDocModal = (d) => {
    if (!d.slip_path) return
    setDocModal({
      show: true,
      title: `สลิป — ${d.full_name || d.investor_code || ''}`,
      documents: [{ label: 'สลิปการโอน', icon: 'fa-image', color: '#3498db', items: [d.slip_path] }]
    })
  }

  const loadData = () => {
    setLoading(true)
    fetch(`${API}/withdrawals`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json())
      .then(d => { if (d.success) setData(d.data) })
      .catch(() => { })
      .finally(() => setLoading(false))
  }

  const loadInvestors = () => {
    fetch(`${API}/investor-list`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json())
      .then(d => { if (d.success) setInvestors(d.data) })
      .catch(() => { })
  }

  const loadCases = () => {
    fetch(`${API}/cases`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json())
      .then(d => { if (d.success) setCases(d.data) })
      .catch(() => { })
  }

  useEffect(() => { loadData(); loadInvestors(); loadCases() }, [])

  const filtered = data.filter(d =>
    !search ||
    d.investor_code?.toLowerCase().includes(search.toLowerCase()) ||
    d.full_name?.includes(search)
  )
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)
  useEffect(() => { setPage(1) }, [search])

  const openCreate = () => { setEditData(null); setModalOpen(true) }
  const openEdit = (item) => { setEditData(item); setModalOpen(true) }

  const handleDelete = async (item) => {
    if (!confirm('ยืนยันลบรายการถอนเงินนี้?')) return
    const res = await fetch(`${API}/withdrawals/${item.id}`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${token()}` }
    })
    const d = await res.json()
    if (d.success) loadData()
    else alert(d.message || 'ลบไม่สำเร็จ')
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#333' }}>History การถอนเงิน</h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#888' }}>แสดงทั้งหมด</p>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <i className="fas fa-search" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#aaa', fontSize: 13 }}></i>
            <input type="text" placeholder="ค้นหา..." value={search} onChange={e => setSearch(e.target.value)}
              style={{ padding: '8px 12px 8px 34px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14, width: 220, outline: 'none' }} />
          </div>
          <button onClick={openCreate} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '8px 18px', borderRadius: 8, border: 'none',
            background: 'var(--primary)', color: '#fff', fontSize: 14, fontWeight: 600,
            cursor: 'pointer', boxShadow: '0 2px 8px rgba(39,174,96,0.3)', whiteSpace: 'nowrap'
          }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >
            <i className="fas fa-plus"></i> เพิ่มรายการ
          </button>
        </div>
      </div>

      <div className="table-responsive">
        <table className="table-green">
          <thead>
            <tr>
              <th>ลำดับ</th>
              <th>ID นายทุน</th>
              <th>ชื่อ-สกุล</th>
              <th>ID เคส</th>
              <th>จำนวนเงิน</th>
              <th>วันที่ถอนเงิน</th>
              <th>สถานะ</th>
              <th>สลิป</th>
              <th>จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="9">
                <div style={{ textAlign: 'center', padding: 40, color: '#aaa' }}>
                  <i className="fas fa-spinner fa-spin" style={{ fontSize: 24, marginBottom: 8 }}></i>
                  <p>กำลังโหลด...</p>
                </div>
              </td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan="9">
                <div className="empty-state">
                  <i className="fas fa-money-bill-wave"></i>
                  <p>ยังไม่มีรายการถอนเงิน</p>
                </div>
              </td></tr>
            ) : paged.map((d, i) => (
              <tr key={d.id}>
                <td>{(page - 1) * PER_PAGE + i + 1}</td>
                <td><strong style={{ color: 'var(--primary)' }}>{d.investor_code || '-'}</strong></td>
                <td>{d.full_name || '-'}</td>
                <td><strong style={{ color: '#8e44ad' }}>{d.case_code || '-'}</strong></td>
                <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatMoney(d.amount)}</td>
                <td>{formatDate(d.withdrawal_date)}</td>
                <td>
                  <span className={`badge ${statusBadge[d.status] || 'badge-pending'}`}>
                    {statusLabel[d.status] || d.status || '-'}
                  </span>
                </td>
                <td>
                  {d.slip_path ? (
                    <button
                      onClick={() => openDocModal(d)}
                      style={{
                        padding: '3px 8px', borderRadius: 4, background: '#f0f8ff',
                        color: '#3498db', fontSize: 11, fontWeight: 600,
                        border: '1px solid #3498db', cursor: 'pointer'
                      }}
                    >
                      <i className="fas fa-image"></i> ดูสลิป
                    </button>
                  ) : (
                    <span style={{ fontSize: 11, color: '#bbb' }}>-</span>
                  )}
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 5, justifyContent: 'center' }}>
                    <button onClick={() => openEdit(d)} style={{
                      padding: '4px 10px', borderRadius: 6, border: '1px solid #27ae60',
                      background: '#f0fff4', color: '#27ae60', fontSize: 11, fontWeight: 600, cursor: 'pointer'
                    }}>
                      <i className="fas fa-edit"></i> แก้ไข
                    </button>
                    <button onClick={() => handleDelete(d)} style={{
                      padding: '4px 10px', borderRadius: 6, border: '1px solid #e74c3c',
                      background: '#fff0f0', color: '#e74c3c', fontSize: 11, fontWeight: 600, cursor: 'pointer'
                    }}>
                      <i className="fas fa-trash"></i> ลบ
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination total={filtered.length} page={page} setPage={setPage} />

      <WithdrawalModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditData(null) }}
        onSaved={loadData}
        editData={editData}
        investors={investors}
        cases={cases}
      />

      <DocViewerModal
        show={docModal.show}
        title={docModal.title}
        documents={docModal.documents}
        onClose={() => setDocModal({ show: false, title: '', documents: [] })}
      />
    </div>
  )
}