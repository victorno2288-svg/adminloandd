import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import '../styles/sales.css'

const token = () => localStorage.getItem('loandd_admin')
const API = '/api/admin/sales'

// สถานะเคส (ครบทุก workflow — ฝ่ายขายดูอย่างเดียว)
const statusLabel = {
  new: 'เคสใหม่',
  contacting: 'กำลังติดต่อ',
  incomplete: 'ข้อมูลไม่ครบ',
  awaiting_appraisal_fee: 'รอชำระค่าประเมิน',
  appraisal_scheduled: 'นัดประเมินแล้ว',
  appraisal_passed: 'ผ่านประเมินแล้ว',
  appraisal_not_passed: 'ไม่ผ่านประเมิน',
  pending_approve: 'รออนุมัติวงเงิน',
  credit_approved: 'อนุมัติวงเงินแล้ว',
  pending_auction: 'รอประมูล',
  auction_completed: 'ประมูลเสร็จสิ้น',
  preparing_docs: 'ออกสัญญาแล้ว',
  legal_scheduled: 'นัดนิติกรรมแล้ว',
  legal_completed: 'ทำนิติกรรมเสร็จสิ้น',
  completed: 'เสร็จสมบูรณ์',
  pending_cancel: '⏳ รออนุมัติยกเลิก',
  cancelled: 'ยกเลิก'
}

const statusBadge = {
  new: 'badge-pending',
  contacting: 'badge-pending',
  incomplete: 'badge-pending',
  awaiting_appraisal_fee: 'badge-pending',
  appraisal_scheduled: 'badge-approve',
  appraisal_passed: 'badge-paid',
  appraisal_not_passed: 'badge-cancelled',
  pending_approve: 'badge-approve',
  credit_approved: 'badge-paid',
  pending_auction: 'badge-auction',
  auction_completed: 'badge-completed',
  preparing_docs: 'badge-approve',
  legal_scheduled: 'badge-transaction',
  legal_completed: 'badge-transaction',
  completed: 'badge-completed',
  pending_cancel: 'badge-cancelled',
  cancelled: 'badge-cancelled'
}

const paymentLabel = { paid: 'ชำระแล้ว', unpaid: 'ยังไม่ชำระ' }
const paymentBadge = { paid: 'badge-paid', unpaid: 'badge-unpaid' }

const allStatuses = Object.entries(statusLabel)
const allPayments = Object.entries(paymentLabel)

function StatusDropdown({ value, options, badgeMap, labelMap, onChange }) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const badgeRef = useRef(null)

  const handleOpen = () => {
    if (!open && badgeRef.current) {
      const rect = badgeRef.current.getBoundingClientRect()
      setPos({ top: rect.bottom + 4, left: rect.left })
    }
    setOpen(!open)
  }

  return (
    <div style={{ display: 'inline-block' }}>
      <span ref={badgeRef} className={`badge ${badgeMap[value] || 'badge-pending'}`}
        style={{ cursor: 'pointer', userSelect: 'none' }} onClick={handleOpen} title="คลิกเพื่อเปลี่ยนสถานะ">
        {labelMap[value] || value || '-'} <i className="fas fa-caret-down" style={{ fontSize: 10, marginLeft: 3 }}></i>
      </span>
      {open && (
        <>
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9998 }} onClick={() => setOpen(false)}></div>
          <div style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 9999, background: '#fff', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.18)', minWidth: 180, padding: '6px 0', border: '1px solid #e0e0e0' }}>
            {options.map(([key, label]) => (
              <div key={key} style={{ padding: '8px 14px', cursor: 'pointer', fontSize: 13, background: key === value ? '#f0faf5' : '#fff', fontWeight: key === value ? 700 : 400, color: key === value ? 'var(--primary)' : '#333', transition: 'background 0.1s' }}
                onMouseEnter={e => e.currentTarget.style.background = '#f5f5f5'}
                onMouseLeave={e => e.currentTarget.style.background = key === value ? '#f0faf5' : '#fff'}
                onClick={() => { onChange(key); setOpen(false) }}>
                <span className={`badge ${badgeMap[key]}`} style={{ fontSize: 11 }}>{label}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

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
    background: active ? 'var(--primary)' : '#fff', color: active ? '#fff' : '#333', transition: 'all 0.15s'
  })

  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', marginTop: 8 }}>
      <span style={{ fontSize: 13, color: '#888' }}>แสดง {startItem} ถึง {endItem} จาก {total} รายการ</span>
      <div style={{ display: 'flex', gap: 4 }}>
        <button style={btnStyle(false)} onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}>Previous</button>
        {pages.map(p => (<button key={p} style={btnStyle(p === page)} onClick={() => setPage(p)}>{p}</button>))}
        <button style={btnStyle(false)} onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages}>Next</button>
      </div>
    </div>
  )
}

const propertyTypeLabel = { land: 'ที่ดินเปล่า', house: 'บ้านเดี่ยว', condo: 'คอนโด', townhouse: 'ทาวน์เฮ้าส์', other: 'อื่นๆ' }
const deedTypeLabel = { chanote: 'โฉนด (น.ส.4)', ns4k: 'น.ส.4ก.', ns3: 'นส.3', ns3k: 'นส.3ก.', spk: 'ส.ป.ก.', other: 'อื่นๆ' }
const deedTypeOk = { chanote: true, ns4k: true, ns3: false, ns3k: false, spk: false }

// SOP Checklist: ตรวจว่าเคสมีเอกสารครบตาม SOP ไหม
function sopChecklistScore(debtor) {
  const images = (() => { try { return JSON.parse(debtor.images) || [] } catch { return [] } })()
  const deeds  = (() => { try { return JSON.parse(debtor.deed_images) || [] } catch { return [] } })()
  const checks = [
    { key: 'deed',     label: 'โฉนด',    ok: deeds.length > 0 },
    { key: 'photo',    label: 'รูปทรัพย์', ok: images.filter(p => p.includes('properties')).length > 0 },
    { key: 'gps',      label: 'GPS',      ok: Boolean(debtor.location_url) },
    { key: 'deedtype', label: 'ประเภทโฉนด', ok: ['chanote','ns4k'].includes(debtor.deed_type) },
  ]
  return checks
}

function SopBadge({ debtor }) {
  const checks = sopChecklistScore(debtor)
  const passed = checks.filter(c => c.ok).length
  const color = passed === checks.length ? '#27ae60' : passed >= 2 ? '#f39c12' : '#e74c3c'
  return (
    <span title={checks.map(c => `${c.ok ? '✅' : '❌'} ${c.label}`).join('\n')}
      style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'3px 8px', borderRadius:12,
        background: color+'22', color, fontWeight:700, fontSize:11, cursor:'help', border:`1px solid ${color}44` }}>
      {passed}/{checks.length}
    </span>
  )
}

function formatMoney(n) { if (!n) return '0'; return Number(n).toLocaleString('th-TH') }
function formatDate(d) { if (!d) return '-'; return new Date(d).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' }) }
function parseImages(jsonStr) { try { return JSON.parse(jsonStr) || [] } catch { return [] } }

function isPdf(filePath) { return /\.pdf$/i.test(filePath) }
function isVideo(filePath) { return /\.(mp4|mov|avi|webm|mkv)$/i.test(filePath) }
function getFileUrl(filePath) { if (!filePath) return ''; if (filePath.startsWith('http')) return filePath; return filePath.startsWith('/') ? filePath : `/${filePath}` }

// ==================== MODAL: ดูเอกสาร ====================
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
              <p>ไม่มีเอกสารที่อัพโหลด</p>
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
                    const url = getFileUrl(filePath)
                    const fileName = filePath.split('/').pop()
                    if (isPdf(filePath)) return (<a key={i} href={url} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', textAlign: 'center', width: 100 }} title={fileName}><div style={{ width: 100, height: 100, borderRadius: 8, border: '2px solid #e74c3c', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#fff5f5', color: '#e74c3c', gap: 4, cursor: 'pointer', transition: 'transform 0.15s' }} onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}><i className="fas fa-file-pdf" style={{ fontSize: 30 }}></i><span style={{ fontSize: 10, fontWeight: 600 }}>PDF</span></div><div style={{ fontSize: 10, color: '#666', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 100 }}>{fileName}</div></a>)
                    if (isVideo(filePath) || sec.type === 'video') return (<a key={i} href={url} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', textAlign: 'center', width: 100 }} title={fileName}><div style={{ width: 100, height: 100, borderRadius: 8, border: '2px solid #9b59b6', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f5f0ff', color: '#9b59b6', gap: 4, cursor: 'pointer', transition: 'transform 0.15s' }} onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}><i className="fas fa-play-circle" style={{ fontSize: 30 }}></i><span style={{ fontSize: 10, fontWeight: 600 }}>VIDEO</span></div><div style={{ fontSize: 10, color: '#666', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 100 }}>{fileName}</div></a>)
                    return (<a key={i} href={url} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', textAlign: 'center', width: 100 }} title={fileName}><div style={{ width: 100, height: 100, borderRadius: 8, border: '2px solid #e0e0e0', overflow: 'hidden', cursor: 'pointer', transition: 'transform 0.15s', background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}><img src={url} alt={`${sec.label}-${i}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.target.style.display = 'none'; e.target.parentElement.innerHTML = '<i class="fas fa-image" style="font-size:28px;color:#ccc"></i>' }} /></div><div style={{ fontSize: 10, color: '#666', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 100 }}>{fileName}</div></a>)
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

// ==================== STAT CARDS ====================
function SalesStats({ stats }) {
  const cards = [
    { label: 'รออนุมัติ', value: stats.pending_approve || 0, icon: 'fa-check-circle', color: 'green' },
    { label: 'ข้อมูลไม่ครบ', value: stats.incomplete || 0, icon: 'fa-exclamation-circle', color: 'yellow' },
    { label: 'รอประมูล', value: stats.pending_auction || 0, icon: 'fa-gavel', color: 'blue' },
    { label: 'ออกสัญญาแล้ว', value: stats.preparing_docs || 0, icon: 'fa-file-contract', color: 'purple' },
    { label: 'ทำนิติกรรมเสร็จสิ้น', value: stats.legal_completed || 0, icon: 'fa-file-signature', color: 'cyan' },
    { label: 'ทำเสร็จสิ้น', value: stats.completed || 0, icon: 'fa-check-double', color: 'primary' },
    { label: 'ยกเลิก', value: stats.cancelled || 0, icon: 'fa-times-circle', color: 'red' },
  ]
  return (
    <>
      <div className="stat-cards-6">
        {cards.map((c, i) => (<div className="stat-card-mini" key={i}><div className={`stat-mini-icon ${c.color}`}><i className={`fas ${c.icon}`}></i></div><div className="stat-info"><div className="stat-number">{c.value}</div><div className="stat-label">{c.label}</div></div></div>))}
      </div>
      <div className="total-amount-bar">
        <span className="label"><i className="fas fa-coins"></i> ยอดอนุมัติวงเงินรวม</span>
        <span className="amount">฿ {formatMoney(stats.total_approved)}</span>
      </div>
    </>
  )
}

// ==================== TAB: ID ลูกหนี้ ====================
function DebtorsTab({ search, searchField, refreshKey }) {
  const navigate = useNavigate()
  const [data, setData] = useState([])
  const [deleting, setDeleting] = useState(null)
  const [page, setPage] = useState(1)
  const [docModal, setDocModal] = useState({ show: false, title: '', documents: [] })

  useEffect(() => { fetch(`${API}/debtors`, { headers: { Authorization: `Bearer ${token()}` } }).then(r => r.json()).then(d => { if (d.success) setData(d.debtors) }).catch(() => {}) }, [refreshKey])

  const filtered = data.filter(d => {
    if (!search) return true
    if (searchField === 'contact_name') return d.contact_name?.includes(search)
    if (searchField === 'contact_phone') return d.contact_phone?.includes(search)
    if (searchField === 'debtor_code') return d.debtor_code?.includes(search)
    if (searchField === 'case_code') return d.case_code?.includes(search)
    if (searchField === 'agent_name') return d.agent_name?.includes(search)
    return d.contact_name?.includes(search) || d.contact_phone?.includes(search) || d.debtor_code?.includes(search) || d.case_code?.includes(search) || d.agent_name?.includes(search)
  })
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)
  useEffect(() => { setPage(1) }, [search])

  const handleDelete = async (debtor) => {
    if (!window.confirm(`ต้องการลบ "${debtor.contact_name}" จริงหรือไม่?\nรูปภาพที่อัพโหลดจะถูกลบออกด้วย`)) return
    setDeleting(debtor.id)
    try { const res = await fetch(`${API}/debtors/${debtor.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token()}` } }); const result = await res.json(); if (result.success) setData(prev => prev.filter(d => d.id !== debtor.id)); else alert(result.message || 'ลบไม่สำเร็จ') } catch { alert('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้') }
    setDeleting(null)
  }

  const openDocViewer = (debtor) => {
    const images = parseImages(debtor.images); const deedImages = parseImages(debtor.deed_images)
    const documents = [
      { label: 'รูปบัตรประชาชน', icon: 'fa-id-card', color: '#e67e22', type: 'image', items: images.filter(img => img.includes('id-cards')) },
      { label: 'รูปโฉนด', icon: 'fa-file-alt', color: '#2980b9', type: 'image', items: deedImages },
      { label: 'รูปภาพทรัพย์', icon: 'fa-home', color: '#27ae60', type: 'image', items: images.filter(img => img.includes('properties')) },
      { label: 'ใบอนุญาตสิ่งปลูกสร้าง', icon: 'fa-file-contract', color: '#8e44ad', type: 'image', items: images.filter(img => img.includes('permits')) },
      { label: 'วิดีโอทรัพย์', icon: 'fa-video', color: '#e74c3c', type: 'video', items: images.filter(img => img.includes('videos')) },
    ]
    setDocModal({ show: true, title: `${debtor.contact_name} (ID:${debtor.id})`, documents })
  }

  return (
    <div>
      <div className="table-responsive">
        <table className="table-green">
          <thead><tr><th>ลำดับ</th><th>IDลูกหนี้</th><th>ชื่อ-นามสกุล</th><th>เบอร์โทร</th><th>นายหน้า</th><th>ประเภททรัพย์</th><th>ประเภทสินเชื่อ</th><th>SOP</th><th>สถานะชำระ</th><th>สถานะ</th><th>วันที่สมัคร</th><th>จัดการ</th></tr></thead>
          <tbody>
            {filtered.length === 0 ? (<tr><td colSpan="12"><div className="empty-state"><i className="fas fa-inbox"></i><p>ยังไม่มีข้อมูลลูกหนี้</p></div></td></tr>) : paged.map((d, i) => (
              <tr key={d.id}>
                <td>{String((page - 1) * PER_PAGE + i + 1).padStart(2, '0')}</td>
                <td><strong style={{ color: 'var(--primary)' }}>{d.debtor_code || '-'}</strong></td>
                <td><strong>{d.contact_name}</strong></td>
                <td>{d.contact_phone}</td>
                <td>
                  {d.agent_name ? (
                    <div style={{ lineHeight: 1.4 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#333' }}>{d.agent_name}</div>
                      {d.agent_code && <div style={{ fontSize: 11, color: '#888' }}>{d.agent_code}</div>}
                    </div>
                  ) : <span style={{ color: '#ccc', fontSize: 12 }}>-</span>}
                </td>
                <td>{propertyTypeLabel[d.property_type] || d.property_type || '-'}</td>
                <td>
                  {d.loan_type_detail === 'mortgage' ? (
                    <span style={{ fontSize:11, fontWeight:700, color:'#1565c0', background:'#e3f2fd', padding:'2px 8px', borderRadius:10 }}>จำนอง</span>
                  ) : d.loan_type_detail === 'selling_pledge' ? (
                    <span style={{ fontSize:11, fontWeight:700, color:'#6a1b9a', background:'#f3e5f5', padding:'2px 8px', borderRadius:10 }}>ขายฝาก</span>
                  ) : (
                    <span style={{ color:'#bbb', fontSize:11 }}>-</span>
                  )}
                </td>
                <td><SopBadge debtor={d} /></td>
                <td>
                  <StatusDropdown
                    value={d.payment_status || 'unpaid'}
                    options={allPayments}
                    badgeMap={paymentBadge}
                    labelMap={paymentLabel}
                    onChange={async (val) => {
                      try {
                        let res
                        if (d.case_id) {
                          // มีเคสแล้ว → อัพเดทผ่าน accounting endpoint (cases table)
                          res = await fetch(`/api/admin/accounting/debtor-master-status/${d.case_id}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
                            body: JSON.stringify({ status: val })
                          })
                        } else {
                          // ยังไม่มีเคส → อัพเดทใน loan_requests โดยตรง
                          res = await fetch(`${API}/debtors/${d.id}/payment-status`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
                            body: JSON.stringify({ payment_status: val })
                          })
                        }
                        const r = await res.json()
                        if (r.success) setData(prev => prev.map(x => x.id === d.id ? { ...x, payment_status: val } : x))
                      } catch {}
                    }}
                  />
                </td>
                <td>{d.case_id ? (<span className={`badge ${statusBadge[d.case_status] || 'badge-pending'}`}>{statusLabel[d.case_status] || d.case_status || '-'}</span>) : <span style={{ color: '#ccc', fontSize: 12 }}>-</span>}</td>
                <td>{formatDate(d.created_at)}</td>
                <td>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
                    <button onClick={() => openDocViewer(d)} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 6, border: '1px solid #e67e22', background: '#fff8f0', color: '#e67e22', fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s' }} onMouseEnter={e => { e.currentTarget.style.background = '#e67e22'; e.currentTarget.style.color = '#fff' }} onMouseLeave={e => { e.currentTarget.style.background = '#fff8f0'; e.currentTarget.style.color = '#e67e22' }}><i className="fas fa-images"></i> เอกสาร</button>
                    <button onClick={() => navigate(`/sales/edit/${d.id}`)} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 6, border: '1px solid #27ae60', background: '#f0fff4', color: '#27ae60', fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s' }} onMouseEnter={e => { e.currentTarget.style.background = '#27ae60'; e.currentTarget.style.color = '#fff' }} onMouseLeave={e => { e.currentTarget.style.background = '#f0fff4'; e.currentTarget.style.color = '#27ae60' }}><i className="fas fa-edit"></i> แก้ไข</button>
                    <button onClick={() => handleDelete(d)} disabled={deleting === d.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 6, border: '1px solid #e74c3c', background: '#fff0f0', color: '#e74c3c', fontSize: 12, fontWeight: 600, cursor: deleting === d.id ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap', opacity: deleting === d.id ? 0.6 : 1, transition: 'all 0.15s' }} onMouseEnter={e => { if (deleting !== d.id) { e.currentTarget.style.background = '#e74c3c'; e.currentTarget.style.color = '#fff' } }} onMouseLeave={e => { e.currentTarget.style.background = '#fff0f0'; e.currentTarget.style.color = '#e74c3c' }}><i className={`fas ${deleting === d.id ? 'fa-spinner fa-spin' : 'fa-trash-alt'}`}></i> ลบ</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination total={filtered.length} page={page} setPage={setPage} />
      <DocViewerModal show={docModal.show} title={docModal.title} documents={docModal.documents} onClose={() => setDocModal({ show: false, title: '', documents: [] })} />
    </div>
  )
}

// ==================== TAB: ID เคส ====================
function CasesTab({ search, searchField, refreshKey, onReload }) {
  const navigate = useNavigate()
  const [data, setData] = useState([])
  const [deleting, setDeleting] = useState(null)
  const [docModal, setDocModal] = useState({ show: false, title: '', documents: [] })
  const [page, setPage] = useState(1)

  useEffect(() => { fetch(`${API}/cases`, { headers: { Authorization: `Bearer ${token()}` } }).then(r => r.json()).then(d => { if (d.success) setData(d.cases) }).catch(() => {}) }, [refreshKey])

  const filtered = data.filter(d => {
    if (!search) return true
    if (searchField === 'debtor_name') return d.debtor_name?.includes(search)
    if (searchField === 'debtor_phone') return d.debtor_phone?.includes(search)
    if (searchField === 'case_code') return d.case_code?.includes(search)
    if (searchField === 'debtor_code') return d.debtor_code?.includes(search)
    if (searchField === 'agent_name') return d.agent_name?.includes(search)
    if (searchField === 'sales_name') return d.sales_name?.includes(search)
    return d.case_code?.includes(search) || d.debtor_name?.includes(search) || d.debtor_phone?.includes(search) || d.debtor_code?.includes(search) || d.agent_name?.includes(search) || d.sales_name?.includes(search)
  })
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)
  useEffect(() => { setPage(1) }, [search])

  const handleDelete = async (c) => {
    if (!window.confirm(`ต้องการลบเคส "${c.case_code}" จริงหรือไม่?\nรูปสลิปและเล่มประเมินจะถูกลบออกด้วย`)) return
    setDeleting(c.id)
    try { const res = await fetch(`${API}/cases/${c.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token()}` } }); const result = await res.json(); if (result.success) { setData(prev => prev.filter(x => x.id !== c.id)); if (onReload) onReload() } else alert(result.message || 'ลบไม่สำเร็จ') } catch { alert('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้') }
    setDeleting(null)
  }

  const openDocViewer = (c) => {
    const debtorImages = parseImages(c.debtor_images); const debtorDeeds = parseImages(c.debtor_deed_images)
    const documents = [
      { label: 'รูปสลิป', icon: 'fa-receipt', color: '#e67e22', type: 'image', items: c.slip_image ? [c.slip_image] : [] },
      { label: 'เล่มประเมิน', icon: 'fa-book', color: '#8e44ad', type: 'image', items: c.appraisal_book_image ? [c.appraisal_book_image] : [] },
      { label: 'รูปบัตรประชาชน (ลูกหนี้)', icon: 'fa-id-card', color: '#2980b9', type: 'image', items: debtorImages.filter(img => img.includes('id-cards')) },
      { label: 'รูปโฉนด (ลูกหนี้)', icon: 'fa-file-alt', color: '#16a085', type: 'image', items: debtorDeeds },
      { label: 'รูปภาพทรัพย์ (ลูกหนี้)', icon: 'fa-home', color: '#27ae60', type: 'image', items: debtorImages.filter(img => img.includes('properties')) },
      { label: 'ใบอนุญาตสิ่งปลูกสร้าง (ลูกหนี้)', icon: 'fa-file-contract', color: '#c0392b', type: 'image', items: debtorImages.filter(img => img.includes('permits')) },
      { label: 'วิดีโอทรัพย์ (ลูกหนี้)', icon: 'fa-video', color: '#e74c3c', type: 'video', items: debtorImages.filter(img => img.includes('videos')) },
    ]
    setDocModal({ show: true, title: `${c.case_code} — ${c.debtor_name || 'ไม่ระบุ'}`, documents })
  }

  return (
    <div>
      <div className="table-responsive">
        <table className="table-green">
          <thead><tr><th>ลำดับ</th><th>IDลูกหนี้</th><th>ID Case</th><th>ประเภทสินเชื่อ</th><th>ชื่อ-สกุล</th><th>เบอร์โทร</th><th>นายหน้า</th><th>ค่าประเมิน</th><th>วงเงินอนุมัติ</th><th>สถานะชำระ</th><th>สถานะ</th><th>วันที่สร้าง</th><th>จัดการ</th></tr></thead>
          <tbody>
            {filtered.length === 0 ? (<tr><td colSpan="13"><div className="empty-state"><i className="fas fa-folder-open"></i><p>ยังไม่มีเคส</p></div></td></tr>) : paged.map((c, i) => (
              <tr key={c.id}>
                <td>{String((page - 1) * PER_PAGE + i + 1).padStart(2, '0')}</td>
                <td><strong style={{ color: 'var(--primary)' }}>{c.debtor_code || '-'}</strong></td>
                <td><strong>{c.case_code}</strong></td>
                <td>
                  {c.loan_type_detail === 'mortgage' ? (
                    <span style={{ fontSize:11, fontWeight:700, color:'#1565c0', background:'#e3f2fd', padding:'2px 8px', borderRadius:10 }}>จำนอง</span>
                  ) : c.loan_type_detail === 'selling_pledge' ? (
                    <span style={{ fontSize:11, fontWeight:700, color:'#6a1b9a', background:'#f3e5f5', padding:'2px 8px', borderRadius:10 }}>ขายฝาก</span>
                  ) : (
                    <span style={{ color:'#bbb', fontSize:11 }}>-</span>
                  )}
                </td>
                <td>{c.debtor_name || '-'}</td>
                <td>{c.debtor_phone || '-'}</td>
                <td>{c.agent_name || '-'}</td>
                <td>฿{formatMoney(c.appraisal_fee)}</td>
                <td>{c.approved_amount ? `฿${formatMoney(c.approved_amount)}` : '-'}</td>
                <td><StatusDropdown value={c.payment_status || 'unpaid'} options={allPayments} badgeMap={paymentBadge} labelMap={paymentLabel} onChange={async (val) => { try { const res = await fetch(`/api/admin/accounting/debtor-master-status/${c.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` }, body: JSON.stringify({ status: val }) }); const r = await res.json(); if (r.success) setData(prev => prev.map(x => x.id === c.id ? { ...x, payment_status: val } : x)) } catch {} }} /></td>
                <td><span className={`badge ${statusBadge[c.status] || 'badge-pending'}`}>{statusLabel[c.status] || c.status || '-'}</span></td>
                <td>{formatDate(c.created_at)}</td>
                <td>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
                    <button onClick={() => openDocViewer(c)} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 6, border: '1px solid #e67e22', background: '#fff8f0', color: '#e67e22', fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s' }} onMouseEnter={e => { e.currentTarget.style.background = '#e67e22'; e.currentTarget.style.color = '#fff' }} onMouseLeave={e => { e.currentTarget.style.background = '#fff8f0'; e.currentTarget.style.color = '#e67e22' }}><i className="fas fa-images"></i> เอกสาร</button>
                    <button onClick={() => navigate(`/sales/case/edit/${c.id}`)} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 6, border: '1px solid #27ae60', background: '#f0fff4', color: '#27ae60', fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s' }} onMouseEnter={e => { e.currentTarget.style.background = '#27ae60'; e.currentTarget.style.color = '#fff' }} onMouseLeave={e => { e.currentTarget.style.background = '#f0fff4'; e.currentTarget.style.color = '#27ae60' }}><i className="fas fa-edit"></i> แก้ไข</button>
                    <button onClick={() => handleDelete(c)} disabled={deleting === c.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 6, border: '1px solid #e74c3c', background: '#fff0f0', color: '#e74c3c', fontSize: 12, fontWeight: 600, cursor: deleting === c.id ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap', opacity: deleting === c.id ? 0.6 : 1, transition: 'all 0.15s' }} onMouseEnter={e => { if (deleting !== c.id) { e.currentTarget.style.background = '#e74c3c'; e.currentTarget.style.color = '#fff' } }} onMouseLeave={e => { e.currentTarget.style.background = '#fff0f0'; e.currentTarget.style.color = '#e74c3c' }}><i className={`fas ${deleting === c.id ? 'fa-spinner fa-spin' : 'fa-trash-alt'}`}></i> ลบ</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination total={filtered.length} page={page} setPage={setPage} />
      <DocViewerModal show={docModal.show} title={docModal.title} documents={docModal.documents} onClose={() => setDocModal({ show: false, title: '', documents: [] })} />
    </div>
  )
}

// ==================== TAB: ID นายหน้า ====================
function AgentsTab({ search, searchField, refreshKey, onReload }) {
  const navigate = useNavigate()
  const [data, setData] = useState([])
  const [deleting, setDeleting] = useState(null)
  const [docModal, setDocModal] = useState({ show: false, title: '', documents: [] })
  const [page, setPage] = useState(1)

  useEffect(() => { fetch(`${API}/agents`, { headers: { Authorization: `Bearer ${token()}` } }).then(r => r.json()).then(d => { if (d.success) setData(d.agents) }).catch(() => {}) }, [refreshKey])

  const filtered = data.filter(d => {
    if (!search) return true
    if (searchField === 'full_name') return d.full_name?.includes(search)
    if (searchField === 'phone') return d.phone?.includes(search)
    if (searchField === 'agent_code') return d.agent_code?.includes(search)
    if (searchField === 'email') return d.email?.toLowerCase().includes(search.toLowerCase())
    return d.full_name?.includes(search) || d.phone?.includes(search) || d.agent_code?.includes(search) || d.email?.toLowerCase().includes(search.toLowerCase())
  })
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)
  useEffect(() => { setPage(1) }, [search])

  const handleDelete = async (agent) => {
    if (!window.confirm(`ต้องการลบนายหน้า "${agent.full_name}" จริงหรือไม่?\nรูปที่อัพโหลดจะถูกลบออกด้วย`)) return
    setDeleting(agent.id)
    try { const res = await fetch(`${API}/agents/${agent.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token()}` } }); const result = await res.json(); if (result.success) { setData(prev => prev.filter(a => a.id !== agent.id)); if (onReload) onReload() } else alert(result.message || 'ลบไม่สำเร็จ') } catch { alert('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้') }
    setDeleting(null)
  }

  const openDocViewer = (agent) => {
    const documents = [{ label: 'รูปบัตรประชาชน', icon: 'fa-id-card', color: '#e67e22', type: 'image', items: agent.id_card_image ? [agent.id_card_image] : [] }]
    setDocModal({ show: true, title: `${agent.full_name} (${agent.agent_code || 'ID:' + agent.id})`, documents })
  }

  return (
    <div>
      <div className="table-responsive">
        <table className="table-green">
          <thead><tr><th>ลำดับ</th><th>รหัส</th><th>ชื่อ-นามสกุล</th><th>เบอร์โทร</th><th>อีเมล</th><th>ค่าคอม %</th><th>จำนวนเคส</th><th>สถานะ</th><th>อัพเดทล่าสุด</th><th>จัดการ</th></tr></thead>
          <tbody>
            {filtered.length === 0 ? (<tr><td colSpan="10"><div className="empty-state"><i className="fas fa-user-slash"></i><p>ยังไม่มีนายหน้า</p></div></td></tr>) : paged.map((a, i) => (
              <tr key={a.id}>
                <td>{String((page - 1) * PER_PAGE + i + 1).padStart(2, '0')}</td>
                <td><strong style={{ color: 'var(--primary)' }}>{a.agent_code || '-'}</strong></td>
                <td><strong>{a.full_name}</strong></td>
                <td>{a.phone}</td>
                <td>{a.email || '-'}</td>
                <td>{a.commission_rate}%</td>
                <td>{a.total_cases}</td>
                <td><span className={`badge ${a.status === 'active' ? 'badge-completed' : 'badge-cancelled'}`}>{a.status === 'active' ? 'ใช้งาน' : 'ปิดใช้งาน'}</span></td>
                <td>{formatDate(a.updated_at)}</td>
                <td>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
                    <button onClick={() => openDocViewer(a)} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 6, border: '1px solid #e67e22', background: '#fff8f0', color: '#e67e22', fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s' }} onMouseEnter={e => { e.currentTarget.style.background = '#e67e22'; e.currentTarget.style.color = '#fff' }} onMouseLeave={e => { e.currentTarget.style.background = '#fff8f0'; e.currentTarget.style.color = '#e67e22' }}><i className="fas fa-images"></i> เอกสาร</button>
                    <button onClick={() => navigate(`/sales/agent/edit/${a.id}`)} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 6, border: '1px solid #27ae60', background: '#f0fff4', color: '#27ae60', fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s' }} onMouseEnter={e => { e.currentTarget.style.background = '#27ae60'; e.currentTarget.style.color = '#fff' }} onMouseLeave={e => { e.currentTarget.style.background = '#f0fff4'; e.currentTarget.style.color = '#27ae60' }}><i className="fas fa-edit"></i> แก้ไข</button>
                    <button onClick={() => handleDelete(a)} disabled={deleting === a.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 6, border: '1px solid #e74c3c', background: '#fff0f0', color: '#e74c3c', fontSize: 12, fontWeight: 600, cursor: deleting === a.id ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap', opacity: deleting === a.id ? 0.6 : 1, transition: 'all 0.15s' }} onMouseEnter={e => { if (deleting !== a.id) { e.currentTarget.style.background = '#e74c3c'; e.currentTarget.style.color = '#fff' } }} onMouseLeave={e => { e.currentTarget.style.background = '#fff0f0'; e.currentTarget.style.color = '#e74c3c' }}><i className={`fas ${deleting === a.id ? 'fa-spinner fa-spin' : 'fa-trash-alt'}`}></i> ลบ</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination total={filtered.length} page={page} setPage={setPage} />
      <DocViewerModal show={docModal.show} title={docModal.title} documents={docModal.documents} onClose={() => setDocModal({ show: false, title: '', documents: [] })} />
    </div>
  )
}

// ==================== MODAL: เพิ่มนายหน้า ====================
function AddAgentModal({ show, onClose }) {
  const [form, setForm] = useState({ full_name: '', nickname: '', phone: '', email: '', line_id: '', commission_rate: '' })
  const [msg, setMsg] = useState('')
  const [success, setSuccess] = useState('')
  if (!show) return null

  const handleSubmit = async (e) => {
    e.preventDefault(); setMsg(''); setSuccess('')
    try { const res = await fetch(`${API}/agents`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` }, body: JSON.stringify(form) }); const data = await res.json(); if (data.success) { setSuccess('เพิ่มนายหน้าสำเร็จ!'); setTimeout(() => { onClose(true); setForm({ full_name: '', nickname: '', phone: '', email: '', line_id: '', commission_rate: '' }); setSuccess('') }, 800) } else setMsg(data.message || 'เกิดข้อผิดพลาด') } catch { setMsg('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้') }
  }

  return (
    <div className="modal-overlay" onClick={() => onClose(false)}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header"><h3><i className="fas fa-user-tie"></i> เพิ่มนายหน้า</h3><button className="modal-close" onClick={() => onClose(false)}>&times;</button></div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {msg && <div className="error-msg">{msg}</div>}
            {success && <div className="success-msg">{success}</div>}
            <div className="form-group"><label>ชื่อ-นามสกุล *</label><input type="text" value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} required /></div>
            <div className="form-group"><label>ชื่อเล่น</label><input type="text" value={form.nickname} onChange={e => setForm({ ...form, nickname: e.target.value })} /></div>
            <div className="form-group"><label>เบอร์โทร *</label><input type="text" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} required /></div>
            <div className="form-group"><label>อีเมล</label><input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
            <div className="form-group"><label>Line ID</label><input type="text" value={form.line_id} onChange={e => setForm({ ...form, line_id: e.target.value })} /></div>
            <div className="form-group"><label>ค่าคอมมิชชั่น (%)</label><input type="number" step="0.01" value={form.commission_rate} onChange={e => setForm({ ...form, commission_rate: e.target.value })} /></div>
          </div>
          <div className="modal-footer"><button type="button" className="btn btn-outline" onClick={() => onClose(false)}>ยกเลิก</button><button type="submit" className="btn btn-primary"><i className="fas fa-save"></i> บันทึก</button></div>
        </form>
      </div>
    </div>
  )
}

// ==================== MAIN SALES PAGE ====================
export default function SalesPage() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('debtors')
  const [search, setSearch] = useState('')
  const [searchField, setSearchField] = useState('')
  const [stats, setStats] = useState({})
  const [showAgentModal, setShowAgentModal] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const reload = () => {
    setRefreshKey(k => k + 1)
    fetch(`${API}/stats`, { headers: { Authorization: `Bearer ${token()}` } }).then(r => r.json()).then(d => { if (d.success) setStats(d.stats) }).catch(() => {})
  }

  useEffect(() => { fetch(`${API}/stats`, { headers: { Authorization: `Bearer ${token()}` } }).then(r => r.json()).then(d => { if (d.success) setStats(d.stats) }).catch(() => {}) }, [])

  const tabs = [
    { key: 'debtors', label: 'ID ลูกหนี้', icon: 'fa-user-tag' },
    { key: 'cases', label: 'ID เคส', icon: 'fa-id-card' },
    { key: 'agents', label: 'ID นายหน้า', icon: 'fa-user-tie' },
  ]

  const handleAgentModalClose = (refresh) => { setShowAgentModal(false); if (refresh) reload() }

  // ปุ่มเพิ่ม (เล็กลง) — แสดงตาม tab ที่เลือก
  const addBtnStyle = {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '8px 14px', borderRadius: 8, border: 'none',
    background: 'var(--primary)', color: '#fff', fontSize: 13, fontWeight: 600,
    cursor: 'pointer', transition: 'all 0.15s', boxShadow: '0 2px 8px rgba(39,174,96,0.3)',
    whiteSpace: 'nowrap'
  }

  return (
    <div>
      <SalesStats stats={stats} />

      <div className="sales-tabs">
        {tabs.map(tab => (
          <button key={tab.key} className={`sales-tab ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => { setActiveTab(tab.key); setSearchField('') }}>
            <i className={`fas ${tab.icon}`}></i> {tab.label}
          </button>
        ))}
      </div>

      {/* ===== Filter Row: dropdown + search + ปุ่มเพิ่ม (บรรทัดเดียวกัน) ===== */}
      <div className="sales-filter-row">
        <select value={searchField} onChange={e => setSearchField(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14, minWidth: 140 }}>
          <option value="">ทั้งหมด</option>
          {activeTab === 'debtors' && <><option value="contact_name">ชื่อ</option><option value="contact_phone">เบอร์โทร</option><option value="debtor_code">รหัสลูกหนี้</option><option value="case_code">รหัสเคส</option><option value="agent_name">นายหน้า</option></>}
          {activeTab === 'cases' && <><option value="debtor_name">ชื่อ</option><option value="debtor_phone">เบอร์โทร</option><option value="case_code">รหัสเคส</option><option value="debtor_code">รหัสลูกหนี้</option><option value="agent_name">นายหน้า</option></>}
          {activeTab === 'agents' && <><option value="full_name">ชื่อ</option><option value="phone">เบอร์โทร</option><option value="agent_code">รหัสนายหน้า</option><option value="email">อีเมล</option></>}
        </select>
        <div className="search-wrapper">
          <i className="fas fa-search"></i>
          <input className="search-input" type="text" placeholder="ค้นหาชื่อ, เบอร์โทร, รหัสเคส..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        {activeTab === 'debtors' && <button style={addBtnStyle} onClick={() => navigate('/sales/new')} onMouseEnter={e => e.currentTarget.style.opacity = '0.85'} onMouseLeave={e => e.currentTarget.style.opacity = '1'}><i className="fas fa-user-plus"></i> เพิ่มลูกหนี้</button>}
        {activeTab === 'cases' && <button style={addBtnStyle} onClick={() => navigate('/sales/case/new')} onMouseEnter={e => e.currentTarget.style.opacity = '0.85'} onMouseLeave={e => e.currentTarget.style.opacity = '1'}><i className="fas fa-folder-plus"></i> สร้างเคส</button>}
        {activeTab === 'agents' && <button style={addBtnStyle} onClick={() => navigate('/sales/agent/new')} onMouseEnter={e => e.currentTarget.style.opacity = '0.85'} onMouseLeave={e => e.currentTarget.style.opacity = '1'}><i className="fas fa-user-tie"></i> เพิ่มนายหน้า</button>}
      </div>

      {activeTab === 'debtors' && <DebtorsTab search={search} searchField={searchField} refreshKey={refreshKey} />}
      {activeTab === 'cases' && <CasesTab search={search} searchField={searchField} refreshKey={refreshKey} onReload={reload} />}
      {activeTab === 'agents' && <AgentsTab search={search} searchField={searchField} refreshKey={refreshKey} onReload={reload} />}

      <AddAgentModal show={showAgentModal} onClose={handleAgentModalClose} />
    </div>
  )
}