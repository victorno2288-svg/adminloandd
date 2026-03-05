import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import '../styles/sales.css'

const token = () => localStorage.getItem('loandd_admin')
const API = '/api/admin/accounting'

const statusOptions = [
  { value: 'pending_auction', label: 'รอประมูล' },
  { value: 'pending_approval', label: 'รออนุมัติ' },
  { value: 'pending_transaction', label: 'รอทำธุรกรรม' },
  { value: 'completed', label: 'เสร็จสิ้น' },
  { value: 'cancelled', label: 'ยกเลิก' },
]

const postAuctionOptions = [
  { value: 'refund_deposit', label: 'คืนเงินมัดจำประมูล' },
  { value: 'won_auction', label: 'ชนะประมูล' },
]

function formatDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

// ========== Radio Component ==========
function StatusRadio({ label, name, options, value, onChange }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <label style={{ fontWeight: 700, fontSize: 14, color: '#333', marginBottom: 8, display: 'block' }}>{label}</label>
      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
        {options.map(opt => (
          <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 14 }}>
            <input
              type="radio"
              name={name}
              value={opt.value}
              checked={value === opt.value}
              onChange={() => onChange(opt.value)}
              style={{ accentColor: 'var(--primary)', width: 18, height: 18 }}
            />
            {opt.label}
          </label>
        ))}
      </div>
    </div>
  )
}

export default function InvestorAccountingEditPage() {
  const { investorId } = useParams()
  const navigate = useNavigate()
  const isEdit = !!investorId

  const [form, setForm] = useState({
    investor_code: '',
    hid: '',
    investor_name: '',
    phone: '',
    line_name: '',
    email: '',
    auction_deposit: '',
    auction_date: '',
    status: 'pending_auction',
    post_auction_status: 'refund_deposit',
    recorded_by: '',
  })
  const [updatedAt, setUpdatedAt] = useState('')
  const [saving, setSaving] = useState(false)
  const [selectedInvestorId, setSelectedInvestorId] = useState(investorId || '')
  const [investorList, setInvestorList] = useState([])

  // โหลดรายชื่อนายทุนสำหรับ dropdown (ถ้าเป็นหน้า create)
  useEffect(() => {
    if (!isEdit) {
      fetch(`${API}/investor-list`, { headers: { Authorization: `Bearer ${token()}` } })
        .then(r => r.json())
        .then(d => { if (d.success) setInvestorList(d.data) })
        .catch(() => {})
    }
  }, [isEdit])

  // โหลดข้อมูลเมื่อเลือกนายทุน
  useEffect(() => {
    const id = isEdit ? investorId : selectedInvestorId
    if (!id) return

    fetch(`${API}/investor-detail/${id}`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          const inv = d.data
          setForm({
            investor_code: inv.investor_code || '',
            hid: inv.hid || '',
            investor_name: inv.investor_name || '',
            phone: inv.phone || '',
            line_name: inv.line_name || '',
            email: inv.email || '',
            auction_deposit: inv.auction_deposit || '',
            auction_date: inv.auction_date ? inv.auction_date.substring(0, 10) : '',
            status: inv.status || 'pending_auction',
            post_auction_status: inv.post_auction_status || 'refund_deposit',
            recorded_by: inv.recorded_by || '',
          })
          setUpdatedAt(inv.updated_at || '')
        }
      })
      .catch(() => {})
  }, [investorId, selectedInvestorId, isEdit])

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const handleSave = async () => {
    const id = isEdit ? investorId : selectedInvestorId
    if (!id) return alert('กรุณาเลือกนายทุน')

    setSaving(true)
    try {
      const res = await fetch(`${API}/investor-detail/${id}`, {
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

  // ========== Style helpers ==========
  const sectionStyle = {
    background: '#fff', borderRadius: 12, padding: 24,
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #e8e8e8',
    marginBottom: 20
  }
  const labelStyle = { fontWeight: 700, fontSize: 13, color: '#555', marginBottom: 4, display: 'block' }
  const inputStyle = {
    width: '100%', padding: '10px 14px', borderRadius: 8,
    border: '1px solid #ddd', fontSize: 14, transition: 'border 0.2s',
    outline: 'none', boxSizing: 'border-box'
  }
  const rowStyle = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 14 }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button
          onClick={() => navigate('/accounting')}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '8px 16px', borderRadius: 8, border: '1px solid #ddd',
            background: '#fff', fontSize: 14, cursor: 'pointer', color: '#555'
          }}
        >
          <i className="fas fa-arrow-left"></i> กลับ
        </button>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#1a1a2e' }}>
          <i className="fas fa-hand-holding-usd" style={{ color: 'var(--primary)', marginRight: 8 }}></i>
          {isEdit ? 'แก้ไขบัญชีนายทุน' : 'เพิ่ม/แก้ไขบัญชีนายทุน'}
        </h2>
      </div>

      {/* Dropdown เลือกนายทุน (ถ้าไม่ใช่ edit mode) */}
      {!isEdit && (
        <div style={sectionStyle}>
          <label style={labelStyle}>เลือกนายทุน</label>
          <select
            value={selectedInvestorId}
            onChange={e => setSelectedInvestorId(e.target.value)}
            style={{ ...inputStyle, background: '#fff' }}
          >
            <option value="">-- เลือกนายทุน --</option>
            {investorList.map(inv => (
              <option key={inv.investor_id} value={inv.investor_id}>
                {inv.investor_code} — {inv.investor_name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* ID นายทุน */}
      {(isEdit || selectedInvestorId) && (
        <div style={{
          background: '#f0faf5', borderRadius: 10, padding: '10px 20px',
          marginBottom: 16, fontWeight: 700, fontSize: 15, color: '#27ae60',
          borderLeft: '4px solid #27ae60'
        }}>
          ID นายทุน: {form.investor_code || '-'}
        </div>
      )}

      {/* ฟอร์ม */}
      <div style={sectionStyle}>
        <div style={rowStyle}>
          <div>
            <label style={labelStyle}>รหัส</label>
            <input style={inputStyle} value={form.investor_code} onChange={e => handleChange('investor_code', e.target.value)} placeholder="LDD10" />
          </div>
          <div>
            <label style={labelStyle}>HID</label>
            <input style={inputStyle} value={form.hid} onChange={e => handleChange('hid', e.target.value)} placeholder="LDD1234" />
          </div>
        </div>

        <div style={rowStyle}>
          <div>
            <label style={labelStyle}>ชื่อ-สกุล</label>
            <input style={inputStyle} value={form.investor_name} onChange={e => handleChange('investor_name', e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>เบอร์โทร</label>
            <input style={inputStyle} value={form.phone} onChange={e => handleChange('phone', e.target.value)} placeholder="087-789-4562" />
          </div>
        </div>

        <div style={rowStyle}>
          <div>
            <label style={labelStyle}>ชื่อไลน์</label>
            <input style={inputStyle} value={form.line_name} onChange={e => handleChange('line_name', e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Email</label>
            <input style={inputStyle} type="email" value={form.email} onChange={e => handleChange('email', e.target.value)} placeholder="email@email.com" />
          </div>
        </div>

        <div style={rowStyle}>
          <div>
            <label style={labelStyle}>ยอดเงินมัดจำประมูล</label>
            <input style={inputStyle} type="number" value={form.auction_deposit} onChange={e => handleChange('auction_deposit', e.target.value)} placeholder="0" />
          </div>
          <div>
            <label style={labelStyle}>วันที่ประมูล</label>
            <input style={inputStyle} type="date" value={form.auction_date} onChange={e => handleChange('auction_date', e.target.value)} />
          </div>
        </div>
      </div>

      {/* สถานะ */}
      <div style={sectionStyle}>
        <StatusRadio
          label="สถานะ"
          name="status"
          options={statusOptions}
          value={form.status}
          onChange={val => handleChange('status', val)}
        />

        <StatusRadio
          label="สถานะหลังจบการประมูล"
          name="post_auction_status"
          options={postAuctionOptions}
          value={form.post_auction_status}
          onChange={val => handleChange('post_auction_status', val)}
        />
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
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '12px 32px', borderRadius: 10, border: 'none',
            background: 'var(--primary)', color: '#fff', fontSize: 16, fontWeight: 700,
            cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1,
            transition: 'all 0.15s', boxShadow: '0 4px 12px rgba(39,174,96,0.3)'
          }}
        >
          <i className={`fas ${saving ? 'fa-spinner fa-spin' : 'fa-save'}`}></i>
          {saving ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
        </button>
        <button
          onClick={() => navigate('/accounting')}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '12px 24px', borderRadius: 10, border: '1px solid #ddd',
            background: '#f5f5f5', color: '#666', fontSize: 16, fontWeight: 600,
            cursor: 'pointer', transition: 'all 0.15s'
          }}
        >
          ยกเลิก
        </button>
      </div>
    </div>
  )
}