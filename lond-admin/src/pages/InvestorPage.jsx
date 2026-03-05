import { useState, useEffect } from 'react'
import '../styles/sales.css'

const token = () => localStorage.getItem('loandd_admin')
const API = '/api/admin/investors'

const statusLabel = { active: 'ใช้งาน', inactive: 'ไม่ใช้งาน' }
const statusBadge = { active: 'badge-paid', inactive: 'badge-cancelled' }
const levelLabel = { 1: 'ระดับ 1', 2: 'ระดับ 2', 3: 'ระดับ 3' }

function formatDate(d) {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' })
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

// ========== Modal ฟอร์มเพิ่ม/แก้ไขนายทุน ==========
function InvestorModal({ isOpen, onClose, onSaved, editData }) {
  const isEdit = !!editData
  const [form, setForm] = useState({
    investor_code: '',
    full_name: '',
    phone: '',
    line_id: '',
    email: '',
    status: 'active',
    investor_level: '',
    sort_order: '',
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (isOpen) {
      if (editData) {
        setForm({
          investor_code: editData.investor_code || '',
          full_name: editData.full_name || '',
          phone: editData.phone || '',
          line_id: editData.line_id || '',
          email: editData.email || '',
          status: editData.status || 'active',
          investor_level: editData.investor_level || '',
          sort_order: editData.sort_order || '',
        })
      } else {
        // สร้างใหม่ — ดึงรหัสถัดไป
        setForm({
          investor_code: '',
          full_name: '',
          phone: '',
          line_id: '',
          email: '',
          status: 'active',
          investor_level: '',
          sort_order: '',
        })
        fetch(`${API}/next-code`, { headers: { Authorization: `Bearer ${token()}` } })
          .then(r => r.json())
          .then(d => { if (d.success) setForm(prev => ({ ...prev, investor_code: d.code })) })
          .catch(() => {})
      }
    }
  }, [isOpen, editData])

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const handleSave = async () => {
    if (!form.full_name) return alert('กรุณากรอกชื่อ-สกุล')
    setSaving(true)
    try {
      const url = isEdit ? `${API}/${editData.id}` : API
      const method = isEdit ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify(form)
      })
      const r = await res.json()
      if (r.success) {
        onSaved()
        onClose()
      } else {
        alert(r.message || 'เกิดข้อผิดพลาด')
      }
    } catch {
      alert('เกิดข้อผิดพลาด')
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  const labelStyle = { fontSize: 14, fontWeight: 600, color: '#333', marginBottom: 4 }
  const inputStyle = {
    width: '100%', padding: '10px 12px', borderRadius: 8,
    border: '1px solid #ddd', fontSize: 14, outline: 'none',
    transition: 'border-color 0.15s', boxSizing: 'border-box'
  }
  const readonlyStyle = { ...inputStyle, background: '#f5f5f5', color: '#888' }

  return (
    <>
      <div onClick={onClose} style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.4)', zIndex: 9998
      }}></div>
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        zIndex: 9999, background: '#fff', borderRadius: 12,
        width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 8px 32px rgba(0,0,0,0.25)'
      }}>
        {/* Header */}
        <div style={{
          background: 'var(--primary)', color: '#fff', padding: '16px 24px',
          borderRadius: '12px 12px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>
            {isEdit ? 'แก้ไขนายทุน' : 'เพิ่มนายทุน'}
          </h3>
          <button onClick={onClose} style={{
            background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff',
            width: 32, height: 32, borderRadius: '50%', fontSize: 16,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* ID ของนายทุน */}
          <div>
            <label style={labelStyle}>ID ของนายทุน</label>
            <input style={readonlyStyle} value={form.investor_code} readOnly />
          </div>

          {/* ชื่อ-สกุล */}
          <div>
            <label style={labelStyle}>ชื่อ-สกุล</label>
            <input
              style={inputStyle}
              value={form.full_name}
              onChange={e => handleChange('full_name', e.target.value)}
              placeholder="กรอกชื่อ-สกุล"
              onFocus={e => e.target.style.borderColor = 'var(--primary)'}
              onBlur={e => e.target.style.borderColor = '#ddd'}
            />
          </div>

          {/* เบอร์โทร */}
          <div>
            <label style={labelStyle}>เบอร์โทร</label>
            <input
              style={inputStyle}
              value={form.phone}
              onChange={e => handleChange('phone', e.target.value)}
              placeholder="กรอกเบอร์โทร"
              onFocus={e => e.target.style.borderColor = 'var(--primary)'}
              onBlur={e => e.target.style.borderColor = '#ddd'}
            />
          </div>

          {/* ชื่อไลน์ */}
          <div>
            <label style={labelStyle}>ชื่อไลน์</label>
            <input
              style={inputStyle}
              value={form.line_id}
              onChange={e => handleChange('line_id', e.target.value)}
              placeholder="กรอกชื่อไลน์"
              onFocus={e => e.target.style.borderColor = 'var(--primary)'}
              onBlur={e => e.target.style.borderColor = '#ddd'}
            />
          </div>

          {/* Email */}
          <div>
            <label style={labelStyle}>Email</label>
            <input
              style={inputStyle}
              type="email"
              value={form.email}
              onChange={e => handleChange('email', e.target.value)}
              placeholder="กรอก Email"
              onFocus={e => e.target.style.borderColor = 'var(--primary)'}
              onBlur={e => e.target.style.borderColor = '#ddd'}
            />
          </div>

          {/* สถานะ */}
          <div>
            <label style={labelStyle}>สถานะ</label>
            <select
              style={inputStyle}
              value={form.status}
              onChange={e => handleChange('status', e.target.value)}
            >
              <option value="">-- เลือกสถานะ --</option>
              <option value="active">ใช้งาน</option>
              <option value="inactive">ไม่ใช้งาน</option>
            </select>
          </div>

          {/* ระดับ */}
          <div>
            <label style={labelStyle}>ระดับ</label>
            <select
              style={inputStyle}
              value={form.investor_level}
              onChange={e => handleChange('investor_level', e.target.value)}
            >
              <option value="">-- เลือกระดับ --</option>
              <option value="1">ระดับ 1</option>
              <option value="2">ระดับ 2</option>
              <option value="3">ระดับ 3</option>
            </select>
          </div>

          {/* ลำดับ */}
          <div>
            <label style={labelStyle}>ลำดับ</label>
            <input
              style={inputStyle}
              type="number"
              value={form.sort_order}
              onChange={e => handleChange('sort_order', e.target.value)}
              placeholder="เช่น 1, 2, 3..."
              onFocus={e => e.target.style.borderColor = 'var(--primary)'}
              onBlur={e => e.target.style.borderColor = '#ddd'}
            />
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px', borderTop: '1px solid #eee',
          display: 'flex', justifyContent: 'flex-end', gap: 10
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 24px', borderRadius: 8, border: '1px solid #ddd',
              background: '#fff', color: '#555', fontSize: 14, fontWeight: 600, cursor: 'pointer'
            }}
          >
            ยกเลิก
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: '10px 24px', borderRadius: 8, border: 'none',
              background: 'var(--primary)', color: '#fff', fontSize: 14, fontWeight: 600,
              cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1,
              transition: 'all 0.15s'
            }}
          >
            {saving ? 'กำลังบันทึก...' : 'บันทึก'}
          </button>
        </div>
      </div>
    </>
  )
}

// ==================== MAIN INVESTOR PAGE ====================
export default function InvestorPage() {
  const [data, setData] = useState([])
  const [search, setSearch] = useState('')
  const [searchField, setSearchField] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editData, setEditData] = useState(null)

  const loadData = () => {
    setLoading(true)
    fetch(API, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json())
      .then(d => {
        if (d.success) setData(d.data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadData() }, [])

  const filtered = data.filter(d => {
    if (!search) return true
    if (searchField === 'full_name') return d.full_name?.includes(search)
    if (searchField === 'phone') return d.phone?.includes(search)
    if (searchField === 'investor_code') return d.investor_code?.toLowerCase().includes(search.toLowerCase())
    if (searchField === 'email') return d.email?.toLowerCase().includes(search.toLowerCase())
    if (searchField === 'line_id') return d.line_id?.toLowerCase().includes(search.toLowerCase())
    return d.investor_code?.toLowerCase().includes(search.toLowerCase()) || d.full_name?.includes(search) || d.phone?.includes(search) || d.email?.toLowerCase().includes(search.toLowerCase()) || d.line_id?.toLowerCase().includes(search.toLowerCase())
  })
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  useEffect(() => { setPage(1) }, [search])

  const openCreate = () => { setEditData(null); setModalOpen(true) }
  const openEdit = (investor) => { setEditData(investor); setModalOpen(true) }

  const handleDelete = async (investor) => {
    if (!confirm(`ยืนยันลบนายทุน "${investor.full_name || investor.investor_code}"?`)) return
    const res = await fetch(`${API}/${investor.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token()}` }
    })
    const d = await res.json()
    if (d.success) loadData()
    else alert(d.message || 'ลบไม่สำเร็จ')
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#333' }}>นายทุน</h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#888' }}>แสดงทั้งหมด</p>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <select
            value={searchField}
            onChange={e => setSearchField(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14, minWidth: 140 }}
          >
            <option value="">ทั้งหมด</option>
            <option value="full_name">ชื่อ</option>
            <option value="phone">เบอร์โทร</option>
            <option value="investor_code">รหัสนายทุน</option>
            <option value="email">อีเมล</option>
            <option value="line_id">Line ID</option>
          </select>
          <div style={{ position: 'relative' }}>
            <i className="fas fa-search" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#aaa', fontSize: 13 }}></i>
            <input
              type="text"
              placeholder="ค้นหา..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                padding: '8px 12px 8px 34px', borderRadius: 8, border: '1px solid #ddd',
                fontSize: 14, width: 220, outline: 'none'
              }}
            />
          </div>
          <button
            onClick={openCreate}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '8px 18px', borderRadius: 8, border: 'none',
              background: 'var(--primary)', color: '#fff', fontSize: 14, fontWeight: 600,
              cursor: 'pointer', transition: 'all 0.15s', boxShadow: '0 2px 8px rgba(39,174,96,0.3)',
              whiteSpace: 'nowrap'
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >
            <i className="fas fa-plus"></i> เพิ่มนายทุน
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="table-responsive">
        <table className="table-green">
          <thead>
            <tr>
              <th>ลำดับ</th>
              <th>ID นายทุน</th>
              <th>ชื่อ-สกุล</th>
              <th>เบอร์โทร</th>
              <th>ไลน์</th>
              <th>Email</th>
              <th>สถานะ</th>
              <th>วันที่อัพเดท</th>
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
                  <i className="fas fa-user-slash"></i>
                  <p>ยังไม่มีข้อมูลนายทุน</p>
                </div>
              </td></tr>
            ) : paged.map((d, i) => (
              <tr key={d.id}>
                <td>{(page - 1) * PER_PAGE + i + 1}</td>
                <td><strong style={{ color: 'var(--primary)' }}>{d.investor_code || '-'}</strong></td>
                <td>{d.full_name || '-'}</td>
                <td>{d.phone || '-'}</td>
                <td>{d.line_id || '-'}</td>
                <td>{d.email || '-'}</td>
                <td>
                  <span className={`badge ${statusBadge[d.status] || 'badge-pending'}`}>
                    {statusLabel[d.status] || d.status || '-'}
                  </span>
                </td>
                <td>{formatDate(d.updated_at)}</td>
                <td>
                  <div style={{ display: 'flex', gap: 5, justifyContent: 'center', flexWrap: 'wrap' }}>
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

      {/* Modal เพิ่ม/แก้ไข */}
      <InvestorModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditData(null) }}
        onSaved={loadData}
        editData={editData}
      />

    </div>
  )
}