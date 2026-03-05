import { useState, useEffect } from 'react'
import '../styles/sales.css'

const token = () => localStorage.getItem('loandd_admin')
const API = '/api/admin/account-user'

const deptLabel = {
  super_admin: 'Super Admin',
  admin: 'ผู้ดูแลระบบ',
  sales: 'ฝ่ายขาย',
  appraisal: 'ฝ่ายประเมิน',
  approval: 'ฝ่ายอนุมัติวงเงิน',
  legal: 'ฝ่ายนิติกรรม',
}
const deptOptions = Object.entries(deptLabel)

const statusLabel = { active: 'ใช้งาน', suspended: 'ระงับ', banned: 'แบน' }
const statusBadge = { active: 'badge-paid', suspended: 'badge-pending', banned: 'badge-cancelled' }

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

// ========== Modal ==========
function UserModal({ isOpen, onClose, onSaved, editData }) {
  const isEdit = !!editData
  const [form, setForm] = useState({
    username: '', full_name: '', nickname: '', email: '', phone: '', position: '',
    department: '', status: 'active', password: ''
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (isOpen) {
      if (editData) {
        setForm({
          username: editData.username || '',
          full_name: editData.full_name || '',
          nickname: editData.nickname || '',
          email: editData.email || '',
          phone: editData.phone || '',
          position: editData.position || '',
          department: editData.department || '',
          status: editData.status || 'active',
          password: ''
        })
      } else {
        setForm({ username: '', full_name: '', nickname: '', email: '', phone: '', position: '', department: '', status: 'active', password: '' })
      }
    }
  }, [isOpen, editData])

  const handleChange = (field, value) => setForm(prev => ({ ...prev, [field]: value }))

  const handleSave = async () => {
    if (!form.username) return alert('กรุณากรอก Username')
    if (!form.full_name) return alert('กรุณากรอกชื่อ-สกุล')
    setSaving(true)
    try {
      const url = isEdit ? `${API}/${editData.id}` : API
      const method = isEdit ? 'PUT' : 'POST'
      const body = { ...form }
      if (!body.password) delete body.password
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify(body)
      })
      const r = await res.json()
      if (r.success) { onSaved(); onClose() }
      else alert(r.message || 'เกิดข้อผิดพลาด')
    } catch { alert('เกิดข้อผิดพลาด') }
    finally { setSaving(false) }
  }

  if (!isOpen) return null

  const labelStyle = { fontSize: 14, fontWeight: 600, color: '#333', marginBottom: 4, display: 'block' }
  const inputStyle = {
    width: '100%', padding: '10px 12px', borderRadius: 8,
    border: '1px solid #ddd', fontSize: 16, outline: 'none',
    transition: 'border-color 0.15s', boxSizing: 'border-box',
    fontFamily: 'Prompt, sans-serif'
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', zIndex: 9998 }}></div>
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        zIndex: 9999, background: '#fff', borderRadius: 12,
        width: '100%', maxWidth: 620, maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 8px 32px rgba(0,0,0,0.25)'
      }}>
        <div style={{
          background: 'var(--primary)', color: '#fff', padding: '16px 24px',
          borderRadius: '12px 12px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>
            {isEdit ? 'แก้ไขผู้ใช้' : 'เพิ่มผู้ใช้ใหม่'}
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
          {/* Username + ชื่อเล่น */}
          <div className="form-grid-2">
            <div>
              <label style={labelStyle}>Username (ใช้ล็อกอิน)</label>
              <input style={inputStyle} value={form.username} onChange={e => handleChange('username', e.target.value)} placeholder="username"
                onFocus={e => e.target.style.borderColor = 'var(--primary)'} onBlur={e => e.target.style.borderColor = '#ddd'} />
            </div>
            <div>
              <label style={labelStyle}>ชื่อเล่น</label>
              <input style={inputStyle} value={form.nickname} onChange={e => handleChange('nickname', e.target.value)} placeholder="ชื่อเล่น"
                onFocus={e => e.target.style.borderColor = 'var(--primary)'} onBlur={e => e.target.style.borderColor = '#ddd'} />
            </div>
          </div>

          {/* ชื่อ-สกุล + อีเมล */}
          <div className="form-grid-2">
            <div>
              <label style={labelStyle}>ชื่อ-สกุล</label>
              <input style={inputStyle} value={form.full_name} onChange={e => handleChange('full_name', e.target.value)} placeholder="ชื่อ-สกุล"
                onFocus={e => e.target.style.borderColor = 'var(--primary)'} onBlur={e => e.target.style.borderColor = '#ddd'} />
            </div>
            <div>
              <label style={labelStyle}>อีเมล</label>
              <input style={inputStyle} type="email" value={form.email} onChange={e => handleChange('email', e.target.value)} placeholder="email@example.com"
                onFocus={e => e.target.style.borderColor = 'var(--primary)'} onBlur={e => e.target.style.borderColor = '#ddd'} />
            </div>
          </div>

          {/* เบอร์โทร + ตำแหน่ง */}
          <div className="form-grid-2">
            <div>
              <label style={labelStyle}>เบอร์โทร</label>
              <input style={inputStyle} value={form.phone} onChange={e => handleChange('phone', e.target.value)} placeholder="0xx-xxx-xxxx"
                onFocus={e => e.target.style.borderColor = 'var(--primary)'} onBlur={e => e.target.style.borderColor = '#ddd'} />
            </div>
            <div>
              <label style={labelStyle}>ตำแหน่ง</label>
              <input style={inputStyle} value={form.position} onChange={e => handleChange('position', e.target.value)} placeholder="ตำแหน่ง"
                onFocus={e => e.target.style.borderColor = 'var(--primary)'} onBlur={e => e.target.style.borderColor = '#ddd'} />
            </div>
          </div>

          {/* สิทธิ์/ฝ่ายงาน + สถานะ */}
          <div className="form-grid-2">
            <div>
              <label style={labelStyle}>สิทธิ์ / ฝ่ายงาน</label>
              <select style={inputStyle} value={form.department} onChange={e => handleChange('department', e.target.value)}>
                <option value="">-- เลือกสิทธิ์ / ฝ่ายงาน --</option>
                {deptOptions.map(([val, lbl]) => (
                  <option key={val} value={val}>{lbl}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>สถานะ</label>
              <select style={inputStyle} value={form.status} onChange={e => handleChange('status', e.target.value)}>
                <option value="active">ใช้งาน</option>
                <option value="suspended">ระงับ</option>
                <option value="banned">แบน</option>
              </select>
            </div>
          </div>

          {/* รหัสผ่าน */}
          <div>
            <label style={labelStyle}>รหัสผ่าน {isEdit ? '(เว้นว่างถ้าไม่เปลี่ยน)' : '(เว้นว่างเพื่อใช้ค่าเริ่มต้น)'}</label>
            <input style={inputStyle} type="password" value={form.password} onChange={e => handleChange('password', e.target.value)}
              placeholder={isEdit ? 'เว้นว่างถ้าไม่ต้องการเปลี่ยน' : 'เว้นว่าง = Password123!'}
              onFocus={e => e.target.style.borderColor = 'var(--primary)'} onBlur={e => e.target.style.borderColor = '#ddd'} />
            {!isEdit && (
              <p style={{ fontSize: 12, color: '#e67e22', margin: '4px 0 0' }}>
                ถ้าเพิ่มผู้ใช้ใหม่แล้วไม่กรอกรหัสผ่าน ระบบจะตั้งค่าเริ่มต้นให้ (เช่น <b>Password123!</b>)
              </p>
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
export default function AccountUserPage() {
  const [data, setData] = useState([])
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editData, setEditData] = useState(null)

  const loadData = () => {
    setLoading(true)
    fetch(API, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json())
      .then(d => { if (d.success) setData(d.data) })
      .catch(() => { })
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadData() }, [])

  const filtered = data.filter(d =>
    !search ||
    d.username?.toLowerCase().includes(search.toLowerCase()) ||
    d.full_name?.includes(search) ||
    d.nickname?.includes(search) ||
    d.email?.toLowerCase().includes(search.toLowerCase()) ||
    d.phone?.includes(search) ||
    d.department?.toLowerCase().includes(search.toLowerCase())
  )
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)
  useEffect(() => { setPage(1) }, [search])

  const openCreate = () => { setEditData(null); setModalOpen(true) }
  const openEdit = (item) => { setEditData(item); setModalOpen(true) }

  const handleDelete = async (item) => {
    if (!confirm(`ยืนยันลบผู้ใช้ "${item.full_name}"?`)) return
    const res = await fetch(`${API}/${item.id}`, {
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
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#333' }}>Account User</h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#888' }}>จัดการบัญชีผู้ใช้ระบบ</p>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <i className="fas fa-search" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#aaa', fontSize: 13 }}></i>
            <input type="text" placeholder="ค้นหา username/ชื่อ/อีเมล" value={search} onChange={e => setSearch(e.target.value)}
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
            <i className="fas fa-plus"></i> เพิ่มผู้ใช้
          </button>
        </div>
      </div>

      <div className="table-responsive">
        <table className="table-green">
          <thead>
            <tr>
              <th>Username</th>
              <th>ชื่อ-สกุล</th>
              <th>ชื่อเล่น</th>
              <th>อีเมล</th>
              <th>เบอร์โทร</th>
              <th>ตำแหน่ง</th>
              <th>สิทธิ์ / ฝ่ายงาน</th>
              <th>สถานะ</th>
              <th>Action</th>
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
                  <i className="fas fa-users"></i>
                  <p>ยังไม่มีผู้ใช้</p>
                </div>
              </td></tr>
            ) : paged.map((d) => (
              <tr key={d.id}>
                <td><code style={{ background: '#f0f0f0', padding: '2px 6px', borderRadius: 4, fontSize: 13 }}>{d.username || '-'}</code></td>
                <td><strong>{d.full_name || '-'}</strong></td>
                <td>{d.nickname || '-'}</td>
                <td>{d.email || '-'}</td>
                <td>{d.phone || '-'}</td>
                <td>{d.position || '-'}</td>
                <td>
                  <span className={`badge ${d.department === 'super_admin' ? 'badge-cancelled' : 'badge-paid'}`}>
                    {deptLabel[d.department] || d.department || '-'}
                  </span>
                </td>
                <td>
                  <span className={`badge ${statusBadge[d.status] || 'badge-pending'}`}>
                    {statusLabel[d.status] || d.status || '-'}
                  </span>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 5, justifyContent: 'center' }}>
                    <button onClick={() => openEdit(d)} style={{
                      padding: '4px 10px', borderRadius: 6, border: '1px solid #27ae60',
                      background: '#f0fff4', color: '#27ae60', fontSize: 11, fontWeight: 600, cursor: 'pointer'
                    }}>
                      <i className="fas fa-edit"></i>
                    </button>
                    <button onClick={() => handleDelete(d)} style={{
                      padding: '4px 10px', borderRadius: 6, border: '1px solid #e74c3c',
                      background: '#fff0f0', color: '#e74c3c', fontSize: 11, fontWeight: 600, cursor: 'pointer'
                    }}>
                      <i className="fas fa-trash"></i>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination total={filtered.length} page={page} setPage={setPage} />

      <UserModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditData(null) }}
        onSaved={loadData}
        editData={editData}
      />
    </div>
  )
}