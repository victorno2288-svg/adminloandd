import { useState, useEffect } from 'react'
import '../styles/sales.css'

const token = () => localStorage.getItem('loandd_admin')
const API = '/api/admin/sales-management'

function formatDate(d) {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ==================== Modal Popup ====================
function AgentModal({ show, onClose, onSave, editData }) {
  const [form, setForm] = useState({
    full_name: '', nickname: '', phone: '', email: '', line_id: '', commission_rate: '', status: 'active'
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (editData) {
      setForm({
        full_name: editData.full_name || '',
        nickname: editData.nickname || '',
        phone: editData.phone || '',
        email: editData.email || '',
        line_id: editData.line_id || '',
        commission_rate: editData.commission_rate ?? '',
        status: editData.status || 'active'
      })
    } else {
      setForm({ full_name: '', nickname: '', phone: '', email: '', line_id: '', commission_rate: '', status: 'active' })
    }
  }, [editData, show])

  const handleSubmit = async () => {
    if (!form.full_name.trim()) return alert('กรุณากรอกชื่อ-สกุล')
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
        width: '90%', maxWidth: 520, maxHeight: '85vh', overflow: 'auto',
        boxShadow: '0 8px 32px rgba(0,0,0,0.25)'
      }}>
        <div style={{ padding: '16px 24px', background: 'var(--primary)', color: '#fff', borderRadius: '12px 12px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{editData ? 'แก้ไขนายหน้า' : 'เพิ่มนายหน้า'}</h3>
          <span onClick={onClose} style={{ cursor: 'pointer', fontSize: 20 }}>&times;</span>
        </div>
        <div style={{ padding: 24 }}>
          {editData && (
            <div className="form-group">
              <label>รหัสนายหน้า</label>
              <input type="text" value={editData.agent_code || ''} disabled style={{ background: '#f5f5f5' }} />
            </div>
          )}
          <div className="form-group" style={{ marginTop: editData ? 16 : 0 }}>
            <label>ชื่อ-สกุล</label>
            <input type="text" value={form.full_name} onChange={e => setForm(prev => ({ ...prev, full_name: e.target.value }))} placeholder="ชื่อ-สกุลนายหน้า" />
          </div>
          <div className="form-group" style={{ marginTop: 16 }}>
            <label>ชื่อเล่น</label>
            <input type="text" value={form.nickname} onChange={e => setForm(prev => ({ ...prev, nickname: e.target.value }))} placeholder="ชื่อเล่น (ถ้ามี)" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
            <div className="form-group">
              <label>เบอร์โทร</label>
              <input type="text" value={form.phone} onChange={e => setForm(prev => ({ ...prev, phone: e.target.value }))} placeholder="0xx-xxx-xxxx" />
            </div>
            <div className="form-group">
              <label>อีเมล</label>
              <input type="text" value={form.email} onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))} placeholder="email@example.com" />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
            <div className="form-group">
              <label>ชื่อไลน์</label>
              <input type="text" value={form.line_id} onChange={e => setForm(prev => ({ ...prev, line_id: e.target.value }))} placeholder="Line ID" />
            </div>
            <div className="form-group">
              <label>ค่าคอมมิชชั่น (%)</label>
              <input type="number" step="0.01" min="0" max="100" value={form.commission_rate} onChange={e => setForm(prev => ({ ...prev, commission_rate: e.target.value }))} placeholder="เช่น 2.5" />
            </div>
          </div>

          <div className="form-group" style={{ marginTop: 16 }}>
            <label>สถานะ</label>
            <select value={form.status} onChange={e => setForm(prev => ({ ...prev, status: e.target.value }))} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14, width: '100%' }}>
              <option value="active">ใช้งาน</option>
              <option value="inactive">ไม่ใช้งาน</option>
            </select>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
            <button type="button" onClick={onClose} style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid #ddd', background: '#f5f5f5', cursor: 'pointer', fontWeight: 600 }}>ยกเลิก</button>
            <button type="button" onClick={handleSubmit} disabled={saving} style={{ padding: '10px 24px', borderRadius: 8, border: 'none', background: 'var(--primary)', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
              {saving ? 'กำลังบันทึก...' : 'บันทึก'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// ==================== MAIN PAGE ====================
export default function AgentsManagePage() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)

  // modal
  const [showForm, setShowForm] = useState(false)
  const [editData, setEditData] = useState(null)

  const loadData = () => {
    setLoading(true)
    fetch(`${API}/agents`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json())
      .then(d => { if (d.success) setData(d.data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadData() }, [])

  const handleCreate = () => { setEditData(null); setShowForm(true) }

  const handleEdit = (agent) => {
    setEditData(agent)
    setShowForm(true)
  }

  const handleSave = async (payload) => {
    const url = editData ? `${API}/agents/${editData.id}` : `${API}/agents`
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

  const handleDelete = async (agentId) => {
    if (!confirm('ยืนยันลบนายหน้าคนนี้?')) return
    const res = await fetch(`${API}/agents/${agentId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token()}` }
    })
    const d = await res.json()
    if (d.success) loadData()
  }

  const statusBadge = (status) => {
    const map = {
      active: { label: 'ใช้งาน', bg: '#e6f9ee', color: '#27ae60' },
      inactive: { label: 'ไม่ใช้งาน', bg: '#fff0f0', color: '#e74c3c' }
    }
    const s = map[status] || { label: status, bg: '#f5f5f5', color: '#999' }
    return <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: s.bg, color: s.color }}>{s.label}</span>
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#333' }}>
            <i className="fas fa-handshake" style={{ marginRight: 10, color: 'var(--primary)' }}></i>
            จัดการนายหน้า
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#888' }}>แสดงทั้งหมด {data.length} คน</p>
        </div>
        <button onClick={handleCreate} style={{ padding: '10px 20px', borderRadius: 8, border: 'none', background: 'var(--primary)', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
          <i className="fas fa-plus"></i> เพิ่มนายหน้า
        </button>
      </div>

      <div>
        <table className="table-green" style={{ width: '100%' }}>
          <thead>
            <tr>
              <th>ลำดับ</th>
              <th>รหัสนายหน้า</th>
              <th>ชื่อ-สกุล</th>
              <th>ชื่อเล่น</th>
              <th>เบอร์โทร</th>
              <th>อีเมล</th>
              <th>ไลน์</th>
              <th>ค่าคอม%</th>
              <th>สถานะ</th>
              <th>วันที่อัพเดท</th>
              <th>จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="11"><div style={{ textAlign: 'center', padding: 40, color: '#aaa' }}><i className="fas fa-spinner fa-spin" style={{ fontSize: 24 }}></i><p>กำลังโหลด...</p></div></td></tr>
            ) : data.length === 0 ? (
              <tr><td colSpan="11"><div className="empty-state"><i className="fas fa-inbox"></i><p>ยังไม่มีนายหน้า</p></div></td></tr>
            ) : data.map((d, i) => (
              <tr key={d.id}>
                <td>{i + 1}</td>
                <td><strong>{d.agent_code}</strong></td>
                <td>{d.full_name}</td>
                <td>{d.nickname || '-'}</td>
                <td>{d.phone || '-'}</td>
                <td>{d.email || '-'}</td>
                <td>{d.line_id || '-'}</td>
                <td>{d.commission_rate != null ? `${d.commission_rate}%` : '-'}</td>
                <td>{statusBadge(d.status)}</td>
                <td>{formatDate(d.updated_at)}</td>
                <td>
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                    <button onClick={() => handleEdit(d)} style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid #f39c12', background: '#fffbe6', color: '#f39c12', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
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

      <AgentModal show={showForm} onClose={() => setShowForm(false)} onSave={handleSave} editData={editData} />
    </div>
  )
}