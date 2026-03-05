import { useState, useEffect } from 'react'
import '../styles/sales.css'

const token = () => localStorage.getItem('loandd_admin')
const API = '/api/admin/sales-management'

function formatDate(d) {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ==================== Modal Popup (แบบ Register) ====================
function UserModal({ show, onClose, onSave, editData }) {
  const [form, setForm] = useState({
    username: '', password: '', full_name: '', nickname: '',
    email: '', phone: '', position: '', status: 'active'
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (editData) {
      setForm({
        username: editData.username || '',
        password: '',
        full_name: editData.full_name || '',
        nickname: editData.nickname || '',
        email: editData.email || '',
        phone: editData.phone || '',
        position: editData.position || '',
        status: editData.status || 'active'
      })
    } else {
      setForm({
        username: '', password: '', full_name: '', nickname: '',
        email: '', phone: '', position: '', status: 'active'
      })
    }
  }, [editData, show])

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async () => {
    if (!form.username.trim()) return alert('กรุณากรอกชื่อผู้ใช้')
    if (!editData && !form.password.trim()) return alert('กรุณากรอกรหัสผ่าน')
    if (!editData && form.password.length < 6) return alert('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร')
    setSaving(true)
    await onSave(form)
    setSaving(false)
  }

  if (!show) return null

  return (
    <>
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', zIndex: 9998 }} onClick={onClose}></div>
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        background: '#fff', borderRadius: 12, padding: 0, zIndex: 9999,
        width: '90%', maxWidth: 520, maxHeight: '90vh', overflow: 'auto',
        boxShadow: '0 8px 32px rgba(0,0,0,0.25)'
      }}>
        <div style={{ padding: '16px 24px', background: 'var(--primary)', color: '#fff', borderRadius: '12px 12px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{editData ? 'แก้ไขฝ่ายขาย' : 'เพิ่มฝ่ายขาย'}</h3>
          <span onClick={onClose} style={{ cursor: 'pointer', fontSize: 20 }}>&times;</span>
        </div>
        <div style={{ padding: 24 }}>
          {/* ชื่อผู้ใช้ */}
          <div className="form-group">
            <label>ชื่อผู้ใช้ *</label>
            <input type="text" name="username" value={form.username} onChange={handleChange} placeholder="username" disabled={!!editData} style={editData ? { background: '#f5f5f5' } : {}} />
          </div>

          {/* รหัสผ่าน - แสดงเฉพาะตอนเพิ่มใหม่ หรือแก้ไขก็ได้ (ถ้ากรอกจะเปลี่ยน) */}
          <div className="form-group" style={{ marginTop: 16 }}>
            <label>{editData ? 'รหัสผ่านใหม่ (เว้นว่างถ้าไม่เปลี่ยน)' : 'รหัสผ่าน *'}</label>
            <input type="password" name="password" value={form.password} onChange={handleChange} placeholder={editData ? 'เว้นว่างถ้าไม่ต้องการเปลี่ยน' : 'อย่างน้อย 6 ตัวอักษร'} />
          </div>

          {/* ชื่อ-สกุล + ชื่อเล่น */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
            <div className="form-group">
              <label>ชื่อ-นามสกุล</label>
              <input type="text" name="full_name" value={form.full_name} onChange={handleChange} placeholder="ชื่อจริง นามสกุล" />
            </div>
            <div className="form-group">
              <label>ชื่อเล่น</label>
              <input type="text" name="nickname" value={form.nickname} onChange={handleChange} placeholder="ชื่อเล่น" />
            </div>
          </div>

          {/* แผนก (ล็อค sales) + ตำแหน่ง */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
            <div className="form-group">
              <label>แผนก</label>
              <select disabled style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14, width: '100%', background: '#f5f5f5' }}>
                <option value="sales">ฝ่ายขาย</option>
              </select>
            </div>
            <div className="form-group">
              <label>ตำแหน่ง</label>
              <input type="text" name="position" value={form.position} onChange={handleChange} placeholder="ตำแหน่ง" />
            </div>
          </div>

          {/* อีเมล + เบอร์โทร */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
            <div className="form-group">
              <label>อีเมล</label>
              <input type="email" name="email" value={form.email} onChange={handleChange} placeholder="email@example.com" />
            </div>
            <div className="form-group">
              <label>เบอร์โทร</label>
              <input type="text" name="phone" value={form.phone} onChange={handleChange} placeholder="0xx-xxx-xxxx" />
            </div>
          </div>

          {/* สถานะ - แสดงเฉพาะตอนแก้ไข */}
          {editData && (
            <div className="form-group" style={{ marginTop: 16 }}>
              <label>สถานะ</label>
              <select name="status" value={form.status} onChange={handleChange} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14, width: '100%' }}>
                <option value="active">ใช้งาน</option>
                <option value="suspended">ระงับ</option>
                <option value="banned">แบน</option>
              </select>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
            <button type="button" onClick={onClose} style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid #ddd', background: '#f5f5f5', cursor: 'pointer', fontWeight: 600 }}>ยกเลิก</button>
            <button type="button" onClick={handleSubmit} disabled={saving} style={{ padding: '10px 24px', borderRadius: 8, border: 'none', background: 'var(--primary)', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
              {saving ? 'กำลังบันทึก...' : editData ? 'บันทึก' : 'ลงทะเบียน'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// ==================== MAIN PAGE ====================
export default function SalesUsersPage() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)

  // modal
  const [showForm, setShowForm] = useState(false)
  const [editData, setEditData] = useState(null)

  const loadData = () => {
    setLoading(true)
    fetch(`${API}/sales-users`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json())
      .then(d => { if (d.success) setData(d.data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadData() }, [])

  const handleCreate = () => { setEditData(null); setShowForm(true) }

  const handleEdit = (user) => {
    setEditData(user)
    setShowForm(true)
  }

  const handleSave = async (payload) => {
    const url = editData ? `${API}/sales-users/${editData.id}` : `${API}/sales-users`
    const method = editData ? 'PUT' : 'POST'
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
      body: JSON.stringify(payload)
    })
    const d = await res.json()
    if (d.success) {
      setShowForm(false)
      loadData()
    } else {
      alert(d.message || 'เกิดข้อผิดพลาด')
    }
  }

  const handleDelete = async (userId) => {
    if (!confirm('ยืนยันลบฝ่ายขายคนนี้? จะไม่สามารถเข้าสู่ระบบได้อีก')) return
    const res = await fetch(`${API}/sales-users/${userId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token()}` }
    })
    const d = await res.json()
    if (d.success) loadData()
  }

  const handleToggleStatus = async (user) => {
    const newStatus = user.status === 'active' ? 'suspended' : 'active'
    const label = newStatus === 'suspended' ? 'ระงับการใช้งาน' : 'เปิดใช้งาน'
    if (!confirm(`ยืนยัน${label} "${user.full_name || user.username}"?`)) return

    const res = await fetch(`${API}/sales-users/${user.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
      body: JSON.stringify({ status: newStatus })
    })
    const d = await res.json()
    if (d.success) loadData()
  }

  const statusBadge = (status) => {
    const map = {
      active: { label: 'ใช้งาน', bg: '#e6f9ee', color: '#27ae60' },
      suspended: { label: 'ระงับ', bg: '#fff8e1', color: '#f39c12' },
      banned: { label: 'แบน', bg: '#fff0f0', color: '#e74c3c' }
    }
    const s = map[status] || { label: status, bg: '#f5f5f5', color: '#999' }
    return <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: s.bg, color: s.color }}>{s.label}</span>
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#333' }}>
            <i className="fas fa-user-tie" style={{ marginRight: 10, color: 'var(--primary)' }}></i>
            จัดการฝ่ายขาย
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#888' }}>จัดการบัญชีฝ่ายขายทั้งหมด {data.length} คน</p>
        </div>
        <button onClick={handleCreate} style={{ padding: '10px 20px', borderRadius: 8, border: 'none', background: 'var(--primary)', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
          <i className="fas fa-plus"></i> เพิ่มฝ่ายขาย
        </button>
      </div>

      <div className="table-responsive">
        <table className="table-green">
          <thead>
            <tr>
              <th>ลำดับ</th>
              <th>ชื่อผู้ใช้</th>
              <th>ชื่อ-สกุล</th>
              <th>ชื่อเล่น</th>
              <th>ตำแหน่ง</th>
              <th>เบอร์โทร</th>
              <th>อีเมล</th>
              <th>สถานะ</th>
              <th>วันที่อัพเดท</th>
              <th>จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="10"><div style={{ textAlign: 'center', padding: 40, color: '#aaa' }}><i className="fas fa-spinner fa-spin" style={{ fontSize: 24 }}></i><p>กำลังโหลด...</p></div></td></tr>
            ) : data.length === 0 ? (
              <tr><td colSpan="10"><div className="empty-state"><i className="fas fa-inbox"></i><p>ยังไม่มีฝ่ายขาย</p></div></td></tr>
            ) : data.map((d, i) => (
              <tr key={d.id} style={d.status !== 'active' ? { opacity: 0.6 } : {}}>
                <td>{i + 1}</td>
                <td><strong>{d.username}</strong></td>
                <td>{d.full_name || '-'}</td>
                <td>{d.nickname || '-'}</td>
                <td>{d.position || '-'}</td>
                <td>{d.phone || '-'}</td>
                <td>{d.email || '-'}</td>
                <td>{statusBadge(d.status)}</td>
                <td>{formatDate(d.updated_at)}</td>
                <td>
                  <div style={{ display: 'flex', gap: 5, justifyContent: 'center', flexWrap: 'wrap' }}>
                    <button onClick={() => handleEdit(d)} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #f39c12', background: '#fffbe6', color: '#f39c12', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                      <i className="fas fa-edit"></i> แก้ไข
                    </button>
                    <button onClick={() => handleToggleStatus(d)} style={{
                      padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                      border: d.status === 'active' ? '1px solid #e67e22' : '1px solid #27ae60',
                      background: d.status === 'active' ? '#fff8e1' : '#e6f9ee',
                      color: d.status === 'active' ? '#e67e22' : '#27ae60'
                    }}>
                      <i className={d.status === 'active' ? 'fas fa-ban' : 'fas fa-check'}></i>
                      {d.status === 'active' ? ' ระงับ' : ' เปิดใช้'}
                    </button>
                    <button onClick={() => handleDelete(d.id)} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #e74c3c', background: '#fff0f0', color: '#e74c3c', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                      <i className="fas fa-trash"></i> ลบ
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <UserModal show={showForm} onClose={() => setShowForm(false)} onSave={handleSave} editData={editData} />
    </div>
  )
}