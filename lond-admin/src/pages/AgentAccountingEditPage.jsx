
import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import '../styles/sales.css'

const token = () => localStorage.getItem('loandd_admin')
const API = '/api/admin/accounting'

function formatDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

// ========== SlipUpload ==========
function SlipUpload({ label, value, onChange, fieldName = 'commission_slip' }) {
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState(null)

  const handleUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append(fieldName, file)
      const res = await fetch(`${API}/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}` },
        body: formData
      })
      const r = await res.json()
      if (r.success) onChange(r.filePath)
    } catch { }
    finally { setUploading(false) }
  }

  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ fontWeight: 700, fontSize: 13, color: '#555', marginBottom: 4, display: 'block' }}>{label}</label>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <label style={{
          display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px',
          borderRadius: 8, border: '1px dashed #27ae60', background: '#f0fff4',
          color: '#27ae60', fontSize: 13, fontWeight: 600, cursor: 'pointer'
        }}>
          <i className={`fas ${uploading ? 'fa-spinner fa-spin' : 'fa-cloud-upload-alt'}`}></i>
          {uploading ? 'กำลังอัพโหลด...' : 'เลือกไฟล์'}
          <input type="file" accept="image/*" onChange={handleUpload} style={{ display: 'none' }} />
        </label>
        {value && (
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <button
              type="button"
              onClick={() => { if (confirm('ต้องการลบรูปนี้?')) onChange(null) }}
              style={{
                position: 'absolute', top: -8, right: -8, width: 22, height: 22, borderRadius: '50%',
                background: '#e74c3c', border: '2px solid #fff', color: '#fff', fontSize: 11,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 1px 4px rgba(0,0,0,0.3)', zIndex: 2, padding: 0, lineHeight: 1
              }}
              title="ลบรูป"
            >
              <i className="fas fa-times"></i>
            </button>
            <img
              src={value} alt="slip"
              style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 6, border: '1px solid #ddd', cursor: 'pointer' }}
              onClick={() => setPreview(value)}
            />
          </div>
        )}
      </div>
      {/* Preview modal */}
      {preview && (
        <div onClick={() => setPreview(null)} style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.75)', zIndex: 99999,
          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out'
        }}>
          <button onClick={e => { e.stopPropagation(); setPreview(null) }} style={{
            position: 'fixed', top: 16, right: 16, width: 40, height: 40, borderRadius: '50%',
            background: 'rgba(255,255,255,0.9)', border: 'none', fontSize: 22, color: '#333',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)', zIndex: 100000
          }}><i className="fas fa-times"></i></button>
          <img src={preview} alt="preview" onClick={e => e.stopPropagation()}
            style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: 8, boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }} />
        </div>
      )}
    </div>
  )
}

export default function AgentAccountingEditPage() {
  const { agentId } = useParams()
  const navigate = useNavigate()
  const isEdit = !!agentId

  const [form, setForm] = useState({
    agent_code: '', team: '',
    agent_name: '', phone: '', line_name: '', email: '',
    case_id: '', debtor_code: '', debtor_name: '',
    commission_amount: '', payment_date: '',
    commission_slip: '',
    payment_status: 'unpaid',
    recorded_by: '',
  })
  const [updatedAt, setUpdatedAt] = useState('')
  const [saving, setSaving] = useState(false)
  const [selectedAgentId, setSelectedAgentId] = useState(agentId || '')
  const [agentList, setAgentList] = useState([])
  const [debtorList, setDebtorList] = useState([])

  // โหลดรายชื่อนายหน้า (create mode)
  useEffect(() => {
    if (!isEdit) {
      fetch(`${API}/agent-list`, { headers: { Authorization: `Bearer ${token()}` } })
        .then(r => r.json())
        .then(d => { if (d.success) setAgentList(d.data) })
        .catch(() => {})
    }
  }, [isEdit])

  // โหลดรายชื่อลูกหนี้ dropdown
  useEffect(() => {
    fetch(`${API}/debtor-list`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json())
      .then(d => { if (d.success) setDebtorList(d.data) })
      .catch(() => {})
  }, [])

  // โหลดข้อมูลเมื่อเลือกนายหน้า
  useEffect(() => {
    const id = isEdit ? agentId : selectedAgentId
    if (!id) return

    fetch(`${API}/agent-detail/${id}`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          const a = d.data
          setForm({
            agent_code: a.agent_code || '',
            team: a.team || '',
            agent_name: a.agent_name || '',
            phone: a.phone || '',
            line_name: a.line_name || '',
            email: a.email || '',
            case_id: a.case_id || '',
            debtor_code: a.debtor_code || '',
            debtor_name: a.debtor_name || '',
            commission_amount: a.commission_amount || '',
            payment_date: a.payment_date ? a.payment_date.substring(0, 10) : '',
            commission_slip: a.commission_slip || '',
            payment_status: a.payment_status || 'unpaid',
            recorded_by: a.recorded_by || '',
          })
          setUpdatedAt(a.updated_at || '')
        }
      })
      .catch(() => {})
  }, [agentId, selectedAgentId, isEdit])

  // เมื่อเลือก ID ลูกหนี้ → auto-fill ชื่อ
  const handleDebtorChange = (caseId) => {
    setForm(prev => ({ ...prev, case_id: caseId }))
    const debtor = debtorList.find(d => String(d.case_id) === String(caseId))
    if (debtor) {
      setForm(prev => ({
        ...prev,
        case_id: caseId,
        debtor_code: debtor.debtor_code || '',
        debtor_name: debtor.debtor_name || ''
      }))
    }
  }

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const handleSave = async () => {
    const id = isEdit ? agentId : selectedAgentId
    if (!id) return alert('กรุณาเลือกนายหน้า')

    setSaving(true)
    try {
      const res = await fetch(`${API}/agent-detail/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify(form)
      })
      const r = await res.json()
      if (r.success) {
        alert('บันทึกสำเร็จ')
        navigate('/accounting')
      } else {
        alert('เกิดข้อผิดพลาด: ' + (r.message || ''))
      }
    } catch {
      alert('เกิดข้อผิดพลาด')
    } finally {
      setSaving(false)
    }
  }

  // ========== Styles ==========
  const sectionStyle = {
    background: '#fff', borderRadius: 12, padding: 24,
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #e8e8e8',
    marginBottom: 20
  }
  const labelStyle = { fontWeight: 700, fontSize: 13, color: '#555', marginBottom: 4, display: 'block' }
  const inputStyle = {
    width: '100%', padding: '10px 14px', borderRadius: 8,
    border: '1px solid #ddd', fontSize: 14, outline: 'none', boxSizing: 'border-box'
  }
  const rowStyle = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 14 }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button onClick={() => navigate('/accounting')} style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '8px 16px', borderRadius: 8, border: '1px solid #ddd',
          background: '#fff', fontSize: 14, cursor: 'pointer', color: '#555'
        }}>
          <i className="fas fa-arrow-left"></i> กลับ
        </button>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#1a1a2e' }}>
          <i className="fas fa-user-tie" style={{ color: 'var(--primary)', marginRight: 8 }}></i>
          {isEdit ? 'แก้ไขบัญชีนายหน้า' : 'เพิ่ม/แก้ไขบัญชีนายหน้า'}
        </h2>
      </div>

      {/* Dropdown เลือกนายหน้า (create mode) */}
      {!isEdit && (
        <div style={sectionStyle}>
          <label style={labelStyle}>เลือกนายหน้า</label>
          <select value={selectedAgentId} onChange={e => setSelectedAgentId(e.target.value)} style={{ ...inputStyle, background: '#fff' }}>
            <option value="">-- เลือกนายหน้า --</option>
            {agentList.map(a => (
              <option key={a.agent_id} value={a.agent_id}>{a.agent_code} — {a.agent_name}</option>
            ))}
          </select>
        </div>
      )}

      {/* ID นายหน้า */}
      {(isEdit || selectedAgentId) && (
        <div style={{
          background: '#f0faf5', borderRadius: 10, padding: '10px 20px',
          marginBottom: 16, fontWeight: 700, fontSize: 15, color: '#27ae60',
          borderLeft: '4px solid #27ae60'
        }}>
          ID นายหน้า: {form.agent_code || '-'}
        </div>
      )}

      {/* ข้อมูลนายหน้า */}
      <div style={sectionStyle}>
        <div style={rowStyle}>
          <div>
            <label style={labelStyle}>รหัส</label>
            <input style={{ ...inputStyle, background: '#f5f5f5' }} value={form.agent_code} readOnly />
          </div>
          <div>
            <label style={labelStyle}>ทีม</label>
            <input style={inputStyle} value={form.team} onChange={e => handleChange('team', e.target.value)} placeholder="A" />
          </div>
        </div>

        <div style={rowStyle}>
          <div>
            <label style={labelStyle}>ชื่อ-สกุล</label>
            <input style={{ ...inputStyle, background: '#f5f5f5' }} value={form.agent_name} readOnly />
          </div>
          <div>
            <label style={labelStyle}>เบอร์โทร</label>
            <input style={{ ...inputStyle, background: '#f5f5f5' }} value={form.phone} readOnly />
          </div>
        </div>

        <div style={rowStyle}>
          <div>
            <label style={labelStyle}>ชื่อไลน์</label>
            <input style={{ ...inputStyle, background: '#f5f5f5' }} value={form.line_name} readOnly />
          </div>
          <div>
            <label style={labelStyle}>Email</label>
            <input style={{ ...inputStyle, background: '#f5f5f5' }} value={form.email} readOnly />
          </div>
        </div>
      </div>

      {/* เชื่อม ID ลูกหนี้ */}
      <div style={sectionStyle}>
        <div style={rowStyle}>
          <div>
            <label style={labelStyle}>ID ลูกหนี้</label>
            <select value={form.case_id} onChange={e => handleDebtorChange(e.target.value)} style={{ ...inputStyle, background: '#fff' }}>
              <option value="">-- เลือกลูกหนี้ --</option>
              {debtorList.map(d => (
                <option key={d.case_id} value={d.case_id}>{d.debtor_code} — {d.debtor_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>ชื่อ-สกุล(ลูกหนี้)</label>
            <input style={{ ...inputStyle, background: '#f5f5f5' }} value={form.debtor_name} readOnly />
          </div>
        </div>
      </div>

      {/* ค่าคอมมิชชั่น */}
      <div style={sectionStyle}>
        <div style={rowStyle}>
          <div>
            <label style={labelStyle}>ยอดเงินค่าคอมมิชชั่น</label>
            <input style={inputStyle} type="number" value={form.commission_amount} onChange={e => handleChange('commission_amount', e.target.value)} placeholder="0" />
          </div>
          <div>
            <label style={labelStyle}>วันที่จ่าย</label>
            <input style={inputStyle} type="date" value={form.payment_date} onChange={e => handleChange('payment_date', e.target.value)} />
          </div>
        </div>

        {/* อัพโหลดสลิป */}
        <SlipUpload
          label="สลิปค่าคอมมิชชั่น"
          value={form.commission_slip}
          onChange={val => handleChange('commission_slip', val)}
          fieldName="commission_slip"
        />
      </div>

      {/* สถานะ */}
      <div style={sectionStyle}>
        <label style={{ fontWeight: 700, fontSize: 14, color: '#333', marginBottom: 8, display: 'block' }}>สถานะ</label>
        <div style={{ display: 'flex', gap: 20 }}>
          {[
            { value: 'paid', label: 'ชำระแล้ว' },
            { value: 'unpaid', label: 'ยังไม่ชำระ' }
          ].map(opt => (
            <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 14 }}>
              <input
                type="radio" name="payment_status" value={opt.value}
                checked={form.payment_status === opt.value}
                onChange={() => handleChange('payment_status', opt.value)}
                style={{ accentColor: 'var(--primary)', width: 18, height: 18 }}
              />
              {opt.label}
            </label>
          ))}
        </div>
      </div>

      {/* ผู้บันทึก */}
      <div style={sectionStyle}>
        <div style={rowStyle}>
          <div>
            <label style={labelStyle}>ผู้บันทึก</label>
            <input style={inputStyle} value={form.recorded_by} onChange={e => handleChange('recorded_by', e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>วันเวลาที่บันทึก</label>
            <input style={{ ...inputStyle, background: '#f5f5f5' }} value={updatedAt ? formatDate(updatedAt) : '-'} readOnly />
          </div>
        </div>
      </div>

      {/* ปุ่มบันทึก */}
      <div style={{ display: 'flex', gap: 12, marginTop: 8, marginBottom: 40 }}>
        <button onClick={handleSave} disabled={saving} style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '12px 32px', borderRadius: 10, border: 'none',
          background: 'var(--primary)', color: '#fff', fontSize: 16, fontWeight: 700,
          cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1,
          boxShadow: '0 4px 12px rgba(39,174,96,0.3)'
        }}>
          <i className={`fas ${saving ? 'fa-spinner fa-spin' : 'fa-save'}`}></i>
          {saving ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
        </button>
        <button onClick={() => navigate('/accounting')} style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '12px 24px', borderRadius: 10, border: '1px solid #ddd',
          background: '#f5f5f5', color: '#666', fontSize: 16, fontWeight: 600, cursor: 'pointer'
        }}>
          ยกเลิก
        </button>
      </div>
    </div>
  )
}