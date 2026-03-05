import { useState, useEffect } from 'react'
import '../styles/sales.css'

const token = () => localStorage.getItem('loandd_admin')
const API = '/api/admin/sales-management'

function formatDate(d) {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ==================== Modal Popup ====================
function TeamModal({ show, onClose, onSave, editData, salesUsers }) {
  const [form, setForm] = useState({ team_name: '', description: '' })
  const [members, setMembers] = useState([])
  const [selectedUser, setSelectedUser] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (editData) {
      setForm({ team_name: editData.team_name || '', description: editData.description || '' })
      setMembers(editData.members || [])
    } else {
      setForm({ team_name: '', description: '' })
      setMembers([])
    }
    setSelectedUser('')
  }, [editData, show])

  const addMember = () => {
    if (!selectedUser) return
    const uid = Number(selectedUser)
    if (members.find(m => m.admin_user_id === uid)) return
    const user = salesUsers.find(u => u.id === uid)
    if (user) {
      setMembers(prev => [...prev, { admin_user_id: user.id, full_name: user.full_name, username: user.username }])
      setSelectedUser('')
    }
  }

  const removeMember = (uid) => {
    setMembers(prev => prev.filter(m => m.admin_user_id !== uid))
  }

  const handleSubmit = async () => {
    if (!form.team_name.trim()) return alert('กรุณากรอกชื่อทีม')
    setSaving(true)
    const payload = {
      ...form,
      member_ids: members.map(m => m.admin_user_id)
    }
    await onSave(payload)
    setSaving(false)
  }

  if (!show) return null

  // กรอง sales users ที่ยังไม่ได้เพิ่มในทีม
  const availableUsers = salesUsers.filter(u => !members.find(m => m.admin_user_id === u.id))

  return (
    <>
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', zIndex: 9998 }} onClick={onClose}></div>
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        background: '#fff', borderRadius: 12, padding: 0, zIndex: 9999,
        width: '90%', maxWidth: 560, maxHeight: '85vh', overflow: 'auto',
        boxShadow: '0 8px 32px rgba(0,0,0,0.25)'
      }}>
        <div style={{ padding: '16px 24px', background: 'var(--primary)', color: '#fff', borderRadius: '12px 12px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{editData ? 'แก้ไขทีม' : 'สร้างทีมใหม่'}</h3>
          <span onClick={onClose} style={{ cursor: 'pointer', fontSize: 20 }}>&times;</span>
        </div>
        <div style={{ padding: 24 }}>
          <div className="form-group">
            <label>ชื่อทีม</label>
            <input type="text" value={form.team_name} onChange={e => setForm(prev => ({ ...prev, team_name: e.target.value }))} placeholder="เช่น ทีม A" />
          </div>
          <div className="form-group" style={{ marginTop: 16 }}>
            <label>รายละเอียดทีม</label>
            <textarea value={form.description} onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))} placeholder="รายละเอียด (ถ้ามี)" style={{ minHeight: 80, resize: 'vertical' }} />
          </div>

          <div style={{ marginTop: 20 }}>
            <label style={{ fontWeight: 600, fontSize: 13 }}>เพิ่มสมาชิกในทีม (เฉพาะฝ่ายขาย)</label>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <select value={selectedUser} onChange={e => setSelectedUser(e.target.value)} style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14 }}>
                <option value="">-- เลือกสมาชิกทีม --</option>
                {availableUsers.map(u => (
                  <option key={u.id} value={u.id}>{u.full_name} ({u.username})</option>
                ))}
              </select>
              <button type="button" onClick={addMember} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--primary)', background: 'var(--primary)', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>เพิ่ม</button>
            </div>
          </div>

          {members.length > 0 && (
            <table className="table-green" style={{ marginTop: 12, fontSize: 13 }}>
              <thead><tr><th>ชื่อสมาชิก</th><th style={{ width: 80 }}>จัดการ</th></tr></thead>
              <tbody>
                {members.map(m => (
                  <tr key={m.admin_user_id}>
                    <td>{m.full_name}</td>
                    <td style={{ textAlign: 'center' }}>
                      <button type="button" onClick={() => removeMember(m.admin_user_id)} style={{ padding: '2px 8px', borderRadius: 4, border: '1px solid #e74c3c', background: '#fff0f0', color: '#e74c3c', fontSize: 11, cursor: 'pointer' }}>ลบ</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
            <button type="button" onClick={onClose} style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid #ddd', background: '#f5f5f5', cursor: 'pointer', fontWeight: 600 }}>ยกเลิก</button>
            <button type="button" onClick={handleSubmit} disabled={saving} style={{ padding: '10px 24px', borderRadius: 8, border: 'none', background: 'var(--primary)', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
              {saving ? 'กำลังบันทึก...' : 'บันทึกทีม'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// ==================== Detail Modal ====================
function DetailModal({ show, onClose, team, members }) {
  if (!show || !team) return null
  return (
    <>
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', zIndex: 9998 }} onClick={onClose}></div>
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        background: '#fff', borderRadius: 12, padding: 0, zIndex: 9999,
        width: '90%', maxWidth: 500, maxHeight: '80vh', overflow: 'auto',
        boxShadow: '0 8px 32px rgba(0,0,0,0.25)'
      }}>
        <div style={{ padding: '16px 24px', background: 'var(--primary)', color: '#fff', borderRadius: '12px 12px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>รายละเอียดทีม: {team.team_name}</h3>
          <span onClick={onClose} style={{ cursor: 'pointer', fontSize: 20 }}>&times;</span>
        </div>
        <div style={{ padding: 24 }}>
          <p style={{ fontSize: 14, color: '#555', marginBottom: 16 }}>{team.description || 'ไม่มีรายละเอียด'}</p>
          <label style={{ fontWeight: 600, fontSize: 13 }}>สมาชิก ({members.length} คน)</label>
          {members.length === 0 ? (
            <p style={{ color: '#999', fontSize: 13, marginTop: 8 }}>ยังไม่มีสมาชิก</p>
          ) : (
            <table className="table-green" style={{ marginTop: 8, fontSize: 13 }}>
              <thead><tr><th>ชื่อ</th><th>Username</th><th>เบอร์โทร</th></tr></thead>
              <tbody>
                {members.map(m => (
                  <tr key={m.member_id}>
                    <td>{m.full_name}</td>
                    <td>{m.username}</td>
                    <td>{m.phone || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
            <button onClick={onClose} style={{ padding: '10px 24px', borderRadius: 8, border: '1px solid #ddd', background: '#f5f5f5', cursor: 'pointer', fontWeight: 600 }}>ปิด</button>
          </div>
        </div>
      </div>
    </>
  )
}

// ==================== MAIN PAGE ====================
export default function SalesTeamsPage() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [salesUsers, setSalesUsers] = useState([])

  // modals
  const [showForm, setShowForm] = useState(false)
  const [editData, setEditData] = useState(null)
  const [showDetail, setShowDetail] = useState(false)
  const [detailTeam, setDetailTeam] = useState(null)
  const [detailMembers, setDetailMembers] = useState([])

  const loadData = () => {
    setLoading(true)
    fetch(`${API}/teams`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json())
      .then(d => { if (d.success) setData(d.data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  const loadSalesUsers = () => {
    fetch(`${API}/sales-users`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json())
      .then(d => { if (d.success) setSalesUsers(d.data.filter(u => u.status === 'active')) })
      .catch(() => {})
  }

  useEffect(() => { loadData(); loadSalesUsers() }, [])

  const handleCreate = () => { setEditData(null); setShowForm(true) }

  const handleEdit = async (teamId) => {
    const res = await fetch(`${API}/teams/${teamId}`, { headers: { Authorization: `Bearer ${token()}` } })
    const d = await res.json()
    if (d.success) {
      setEditData({ ...d.team, members: d.members })
      setShowForm(true)
    }
  }

  const handleSave = async (payload) => {
    const url = editData ? `${API}/teams/${editData.id}` : `${API}/teams`
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

  const handleDetail = async (teamId) => {
    const res = await fetch(`${API}/teams/${teamId}`, { headers: { Authorization: `Bearer ${token()}` } })
    const d = await res.json()
    if (d.success) {
      setDetailTeam(d.team)
      setDetailMembers(d.members)
      setShowDetail(true)
    }
  }

  const handleDelete = async (teamId) => {
    if (!confirm('ยืนยันลบทีมนี้?')) return
    const res = await fetch(`${API}/teams/${teamId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token()}` }
    })
    const d = await res.json()
    if (d.success) loadData()
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#333' }}>
            <i className="fas fa-users" style={{ marginRight: 10, color: 'var(--primary)' }}></i>
            ทีมฝ่ายขาย
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#888' }}>แสดงทั้งหมด</p>
        </div>
        <button onClick={handleCreate} style={{ padding: '10px 20px', borderRadius: 8, border: 'none', background: 'var(--primary)', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
          <i className="fas fa-plus"></i> เพิ่มทีม
        </button>
      </div>

      <div className="table-responsive">
        <table className="table-green">
          <thead>
            <tr>
              <th>ลำดับ</th>
              <th>ชื่อทีม</th>
              <th>จำนวนสมาชิก</th>
              <th>จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="4"><div style={{ textAlign: 'center', padding: 40, color: '#aaa' }}><i className="fas fa-spinner fa-spin" style={{ fontSize: 24 }}></i><p>กำลังโหลด...</p></div></td></tr>
            ) : data.length === 0 ? (
              <tr><td colSpan="4"><div className="empty-state"><i className="fas fa-inbox"></i><p>ยังไม่มีทีม</p></div></td></tr>
            ) : data.map((d, i) => (
              <tr key={d.id}>
                <td>{i + 1}</td>
                <td><strong>{d.team_name}</strong></td>
                <td>{d.member_count} คน</td>
                <td>
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                    <button onClick={() => handleDetail(d.id)} style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid var(--primary)', background: '#f0faf5', color: 'var(--primary)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>ดูรายละเอียด</button>
                    <button onClick={() => handleEdit(d.id)} style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid #f39c12', background: '#fffbe6', color: '#f39c12', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                      <i className="fas fa-edit"></i> แก้ไข
                    </button>
                    <button onClick={() => handleDelete(d.id)} style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid #e74c3c', background: '#fff0f0', color: '#e74c3c', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>ลบ</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <TeamModal show={showForm} onClose={() => setShowForm(false)} onSave={handleSave} editData={editData} salesUsers={salesUsers} />
      <DetailModal show={showDetail} onClose={() => setShowDetail(false)} team={detailTeam} members={detailMembers} />
    </div>
  )
}