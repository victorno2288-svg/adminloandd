import { useState, useEffect } from 'react'
import '../styles/sales.css'

const token = () => localStorage.getItem('loandd_admin')
const API = '/api/admin/cancellation'

const statusLabel = { pending: 'รอการอนุมัติ', approved: 'อนุมัติ', rejected: 'ปฏิเสธ' }
const statusBadge = { pending: 'badge-pending', approved: 'badge-paid', rejected: 'badge-cancelled' }

const deptLabel = { sales: 'ฝ่ายขาย', accounting: 'ฝ่ายบัญชี', legal: 'ฝ่ายนิติกรรม', appraisal: 'ฝ่ายประเมิน' }

function formatDate(d) {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
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

// ========== Modal เพิ่มคำขอยกเลิกเคส ==========
function CancelModal({ isOpen, onClose, onSaved, caseList, staffList }) {
  const [form, setForm] = useState({ case_id: '', requested_by: '', reason: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (isOpen) setForm({ case_id: '', requested_by: '', reason: '' })
  }, [isOpen])

  const handleChange = (field, value) => setForm(prev => ({ ...prev, [field]: value }))

  const handleSave = async () => {
    if (!form.case_id) return alert('กรุณาเลือกเคส')
    if (!form.requested_by) return alert('กรุณาเลือกเจ้าหน้าที่')
    if (!form.reason.trim()) return alert('กรุณากรอกเหตุผล')
    setSaving(true)
    try {
      const res = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify(form)
      })
      const r = await res.json()
      if (r.success) { onSaved(); onClose() }
      else alert(r.message || 'เกิดข้อผิดพลาด')
    } catch { alert('เกิดข้อผิดพลาด') }
    finally { setSaving(false) }
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
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>ขอยกเลิกเคส</h3>
          <button onClick={onClose} style={{
            background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff',
            width: 32, height: 32, borderRadius: '50%', fontSize: 16,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* เลือกเคส */}
          <div>
            <label style={labelStyle}>เลือกเคส</label>
            <select style={inputStyle} value={form.case_id} onChange={e => handleChange('case_id', e.target.value)}>
              <option value="">-- เลือกเคส --</option>
              {caseList.map(c => (
                <option key={c.id} value={c.id}>
                  {c.case_code}{c.debtor_name ? ` (${c.debtor_name})` : ''}{c.property_address ? ` - ${c.property_address}` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* เลือกเจ้าหน้าที่ผู้ขอ */}
          <div>
            <label style={labelStyle}>เจ้าหน้าที่ผู้ขอยกเลิก</label>
            <select style={inputStyle} value={form.requested_by} onChange={e => handleChange('requested_by', e.target.value)}>
              <option value="">-- เลือกเจ้าหน้าที่ --</option>
              {staffList.map(s => (
                <option key={s.id} value={s.id}>
                  {s.full_name} ({deptLabel[s.department] || s.department || '-'})
                </option>
              ))}
            </select>
          </div>

          {/* เหตุผล */}
          <div>
            <label style={labelStyle}>เหตุผลที่ขอยกเลิก</label>
            <textarea style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }} value={form.reason} onChange={e => handleChange('reason', e.target.value)} placeholder="ระบุเหตุผล..."
              onFocus={e => e.target.style.borderColor = 'var(--primary)'} onBlur={e => e.target.style.borderColor = '#ddd'} />
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
          }}>{saving ? 'กำลังบันทึก...' : 'ส่งคำขอ'}</button>
        </div>
      </div>
    </>
  )
}

// ==================== MAIN PAGE ====================
export default function CancellationPage() {
  const [data, setData] = useState([])
  const [caseList, setCaseList] = useState([])
  const [staffList, setStaffList] = useState([])
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)

  const loadData = () => {
    setLoading(true)
    fetch(API, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json())
      .then(d => { if (d.success) setData(d.data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  const loadCases = () => {
    fetch(`${API}/cases`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json())
      .then(d => { if (d.success) setCaseList(d.data) })
      .catch(() => {})
  }

  const loadStaff = () => {
    fetch(`${API}/staff`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json())
      .then(d => { if (d.success) setStaffList(d.data) })
      .catch(() => {})
  }

  useEffect(() => { loadData(); loadCases(); loadStaff() }, [])

  const filtered = data.filter(d =>
    !search ||
    d.case_code?.toLowerCase().includes(search.toLowerCase()) ||
    d.property_address?.includes(search) ||
    d.requester_name?.includes(search) ||
    d.reason?.includes(search)
  )
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)
  useEffect(() => { setPage(1) }, [search])

  // อนุมัติ
  const handleApprove = async (item) => {
    if (!confirm(`ยืนยันอนุมัติยกเลิกเคส ${item.case_code}?`)) return
    try {
      const res = await fetch(`${API}/${item.id}/approve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ approved_by: null })
      })
      const d = await res.json()
      if (d.success) loadData()
      else alert(d.message || 'เกิดข้อผิดพลาด')
    } catch { alert('เกิดข้อผิดพลาด') }
  }

  // ปฏิเสธ
  const handleReject = async (item) => {
    if (!confirm(`ยืนยันปฏิเสธคำขอยกเลิกเคส ${item.case_code}?`)) return
    try {
      const res = await fetch(`${API}/${item.id}/reject`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ approved_by: null })
      })
      const d = await res.json()
      if (d.success) loadData()
      else alert(d.message || 'เกิดข้อผิดพลาด')
    } catch { alert('เกิดข้อผิดพลาด') }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#333' }}>รายการขอยกเลิกเคส</h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#888' }}>แสดงรายการเคสที่ลูกค้าหรือพนักงานขอให้ยกเลิก ต้องได้รับการพิจารณาก่อน</p>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <i className="fas fa-search" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#aaa', fontSize: 13 }}></i>
            <input type="text" placeholder="ค้นหา..." value={search} onChange={e => setSearch(e.target.value)}
              style={{ padding: '8px 12px 8px 34px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14, width: 220, outline: 'none' }} />
          </div>
          <button onClick={() => setModalOpen(true)} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '8px 18px', borderRadius: 8, border: 'none',
            background: 'var(--primary)', color: '#fff', fontSize: 14, fontWeight: 600,
            cursor: 'pointer', boxShadow: '0 2px 8px rgba(39,174,96,0.3)', whiteSpace: 'nowrap'
          }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >
            <i className="fas fa-plus"></i> ขอยกเลิกเคส
          </button>
        </div>
      </div>

      <div className="table-responsive">
        <table className="table-green">
          <thead>
            <tr>
              <th>ลำดับ</th>
              <th>ไอดีเคส</th>
              <th>ชื่อทรัพย์</th>
              <th>ผู้ขอยกเลิก</th>
              <th>เหตุผล</th>
              <th>วันที่ขอ</th>
              <th>สถานะ</th>
              <th>การจัดการ</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="8">
                <div style={{ textAlign: 'center', padding: 40, color: '#aaa' }}>
                  <i className="fas fa-spinner fa-spin" style={{ fontSize: 24, marginBottom: 8 }}></i>
                  <p>กำลังโหลด...</p>
                </div>
              </td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan="8">
                <div className="empty-state">
                  <i className="fas fa-ban"></i>
                  <p>ยังไม่มีรายการขอยกเลิกเคส</p>
                </div>
              </td></tr>
            ) : paged.map((d, i) => (
              <tr key={d.id}>
                <td>{(page - 1) * PER_PAGE + i + 1}</td>
                <td><strong style={{ color: 'var(--primary)' }}>{d.case_code || '-'}</strong></td>
                <td>{d.property_address || '-'}</td>
                <td>{d.requester_name || '-'}</td>
                <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={d.reason}>
                  {d.reason || '-'}
                </td>
                <td>{formatDate(d.created_at)}</td>
                <td>
                  <span className={`badge ${statusBadge[d.status] || 'badge-pending'}`}>
                    {statusLabel[d.status] || d.status || '-'}
                  </span>
                </td>
                <td>
                  {d.status === 'pending' ? (
                    <div style={{ display: 'flex', gap: 5, justifyContent: 'center' }}>
                      <button onClick={() => handleApprove(d)} style={{
                        padding: '4px 10px', borderRadius: 6, border: '1px solid #27ae60',
                        background: '#27ae60', color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer'
                      }}>
                        <i className="fas fa-check"></i> อนุมัติ
                      </button>
                      <button onClick={() => handleReject(d)} style={{
                        padding: '4px 10px', borderRadius: 6, border: '1px solid #e74c3c',
                        background: '#e74c3c', color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer'
                      }}>
                        <i className="fas fa-times"></i> ปฏิเสธ
                      </button>
                    </div>
                  ) : (
                    <span style={{ fontSize: 11, color: '#bbb' }}>-</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination total={filtered.length} page={page} setPage={setPage} />

      <CancelModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={loadData}
        caseList={caseList}
        staffList={staffList}
      />
    </div>
  )
}