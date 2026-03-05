import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import '../styles/sales.css'

const token = () => localStorage.getItem('loandd_admin')
const API = '/api/admin/accounting'

// สถานะบัญชี (ตรง reference)
const statusLabel = {
  appraisal: 'ค่าประเมิน',
  bag_fee: 'ค่าปากถุง',
  contract_sale: 'ขายสัญญา',
  redemption: 'ไถ่ถอน',
  additional_service: 'ค่าบริการเพิ่มเติม',
  property_forfeited: 'ทรัพย์หลุด',
  cancelled: 'ยกเลิก'
}

const statusBadge = {
  appraisal: 'badge-approve',
  bag_fee: 'badge-auction',
  contract_sale: 'badge-paid',
  redemption: 'badge-transaction',
  additional_service: 'badge-pending',
  property_forfeited: 'badge-cancelled',
  cancelled: 'badge-cancelled'
}

const paymentLabel = { paid: 'ชำระแล้ว', unpaid: 'ยังไม่ชำระ' }
const paymentBadge = { paid: 'badge-paid', unpaid: 'badge-unpaid' }

const allStatuses = Object.entries(statusLabel)
const allPayments = Object.entries(paymentLabel)

function formatMoney(n) {
  if (!n) return '0'
  return Number(n).toLocaleString('th-TH')
}

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

// ========== Modal ดูรูปใหญ่ ==========
function ImageModal({ src, onClose }) {
  if (!src) return null
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.75)', zIndex: 99999,
        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out'
      }}
    >
      <button
        onClick={e => { e.stopPropagation(); onClose() }}
        style={{
          position: 'fixed', top: 16, right: 16,
          width: 40, height: 40, borderRadius: '50%',
          background: 'rgba(255,255,255,0.9)', border: 'none',
          fontSize: 22, color: '#333', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)', zIndex: 100000
        }}
        title="ปิด"
      >
        <i className="fas fa-times"></i>
      </button>
      <img
        src={src} alt="preview"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: 8, boxShadow: '0 8px 32px rgba(0,0,0,0.5)', cursor: 'default' }}
      />
    </div>
  )
}

// ========== Popup ดูไฟล์ทั้งหมดของเคส ==========
function FilesPopup({ data, onClose }) {
  const [preview, setPreview] = useState(null)
  if (!data) return null

  const files = [
    { label: 'สลิปค่าประเมิน', src: data.appraisal_slip },
    { label: 'สลิปค่าปากถุง', src: data.bag_fee_slip },
    { label: 'สลิปค่าขายสัญญา', src: data.contract_sale_slip },
    { label: 'สลิปค่าไถ่ถอน', src: data.redemption_slip },
    { label: 'สลิปทรัพย์หลุด', src: data.property_forfeited_slip },
    { label: 'รูปบัตรเจ้าของทรัพย์', src: data.id_card_image },
  ].filter(f => f.src)

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', zIndex: 9998 }}></div>
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 9999,
        background: '#fff', borderRadius: 12, padding: 24, minWidth: 360, maxWidth: 600,
        boxShadow: '0 8px 32px rgba(0,0,0,0.25)', maxHeight: '80vh', overflowY: 'auto'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>
            <i className="fas fa-images" style={{ marginRight: 8, color: 'var(--primary)' }}></i>
            ไฟล์แนบ — {data.debtor_code || data.case_code}
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#999' }}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        {files.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 24, color: '#aaa' }}>
            <i className="fas fa-folder-open" style={{ fontSize: 36, marginBottom: 8 }}></i>
            <p>ยังไม่มีไฟล์แนบ</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 }}>
            {files.map((f, i) => (
              <div key={i} style={{
                border: '1px solid #e0e0e0', borderRadius: 8, padding: 8, textAlign: 'center',
                cursor: 'pointer', transition: 'all 0.15s'
              }}
                onClick={() => setPreview(f.src)}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = '#e0e0e0'}
              >
                <img src={f.src} alt={f.label} style={{ width: '100%', height: 80, objectFit: 'cover', borderRadius: 4, marginBottom: 6 }} />
                <div style={{ fontSize: 11, color: '#555', fontWeight: 600 }}>{f.label}</div>
              </div>
            ))}
          </div>
        )}
      </div>
      <ImageModal src={preview} onClose={() => setPreview(null)} />
    </>
  )
}

// ========== StatusDropdown (คลิกเปลี่ยนสถานะ) ==========
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
      <span
        ref={badgeRef}
        className={`badge ${badgeMap[value] || 'badge-pending'}`}
        style={{ cursor: 'pointer', userSelect: 'none' }}
        onClick={handleOpen}
        title="คลิกเพื่อเปลี่ยนสถานะ"
      >
        {labelMap[value] || value || '-'} <i className="fas fa-caret-down" style={{ fontSize: 10, marginLeft: 3 }}></i>
      </span>
      {open && (
        <>
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9998 }} onClick={() => setOpen(false)}></div>
          <div style={{
            position: 'fixed', top: pos.top, left: pos.left, zIndex: 9999,
            background: '#fff', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
            minWidth: 180, padding: '6px 0', border: '1px solid #e0e0e0'
          }}>
            {options.map(([key, label]) => (
              <div key={key}
                style={{
                  padding: '8px 14px', cursor: 'pointer', fontSize: 13,
                  background: key === value ? '#f0faf5' : '#fff',
                  fontWeight: key === value ? 700 : 400,
                  color: key === value ? 'var(--primary)' : '#333',
                  transition: 'background 0.1s'
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#f5f5f5'}
                onMouseLeave={e => e.currentTarget.style.background = key === value ? '#f0faf5' : '#fff'}
                onClick={() => { onChange(key); setOpen(false) }}
              >
                <span className={`badge ${badgeMap[key]}`} style={{ fontSize: 11 }}>{label}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ========== Stat Cards สำหรับแต่ละ tab ==========
function DebtorStats({ stats }) {
  const cards = [
    { label: 'ค่าประเมิน', value: stats.appraisal || 0, icon: 'fa-file-invoice-dollar', color: 'green' },
    { label: 'ค่าปากถุง', value: stats.bag_fee || 0, icon: 'fa-hand-holding-usd', color: 'blue' },
    { label: 'ขายสัญญา', value: stats.contract_sale || 0, icon: 'fa-file-signature', color: 'yellow' },
    { label: 'ไถ่ถอน', value: stats.redemption || 0, icon: 'fa-undo-alt', color: 'red' },
    { label: 'ค่าบริการเพิ่มเติม', value: stats.additional_service || 0, icon: 'fa-concierge-bell', color: 'cyan' },
    { label: 'ทรัพย์หลุด', value: stats.property_forfeited || 0, icon: 'fa-house-damage', color: 'primary' },
  ]
  return (
    <>
      <div className="stat-cards-6">
        {cards.map((c, i) => (
          <div className="stat-card-mini" key={i}>
            <div className={`stat-mini-icon ${c.color}`}>
              <i className={`fas ${c.icon}`}></i>
            </div>
            <div className="stat-info">
              <div className="stat-number">{c.value}</div>
              <div className="stat-label">{c.label}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
        <div className="stat-card-mini" style={{ maxWidth: 200 }}>
          <div className="stat-mini-icon red">
            <i className="fas fa-times-circle"></i>
          </div>
          <div className="stat-info">
            <div className="stat-number">{stats.cancelled || 0}</div>
            <div className="stat-label">ยกเลิก</div>
          </div>
        </div>
      </div>
      <div className="total-amount-bar">
        <span className="label"><i className="fas fa-coins"></i> ค่าประเมินรวม</span>
        <span className="amount">฿ {formatMoney(stats.total_appraisal_fee)}</span>
      </div>
    </>
  )
}

function InvestorStats({ stats }) {
  const cards = [
    { label: 'มัดจำประมูล', value: formatMoney(stats.auction_deposit_total || 0), icon: 'fa-gavel', color: 'green' },
    { label: 'ค่าคอมนายทุน', value: formatMoney(stats.auction_deposit_total || 0), icon: 'fa-hand-holding-usd', color: 'yellow' },
    { label: 'แจ้งถอนเงิน', value: stats.withdrawal_request || 0, icon: 'fa-money-check-alt', color: 'red' },
  ]
  return (
    <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
      {cards.map((c, i) => (
        <div className="stat-card-mini" key={i} style={{ minWidth: 200 }}>
          <div className={`stat-mini-icon ${c.color}`}>
            <i className={`fas ${c.icon}`}></i>
          </div>
          <div className="stat-info">
            <div className="stat-number">{c.value}</div>
            <div className="stat-label">{c.label}</div>
          </div>
        </div>
      ))}
    </div>
  )
}

function AgentStats({ stats }) {
  const cards = [
    { label: 'ค่าคอมนายหน้า', value: stats.agent_commission || 0, icon: 'fa-hand-holding-usd', color: 'yellow' },
    { label: 'แจ้งถอนเงินค่าคอม', value: stats.commission_withdrawal || 0, icon: 'fa-money-check-alt', color: 'red' },
  ]
  return (
    <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
      {cards.map((c, i) => (
        <div className="stat-card-mini" key={i} style={{ minWidth: 200 }}>
          <div className={`stat-mini-icon ${c.color}`}>
            <i className={`fas ${c.icon}`}></i>
          </div>
          <div className="stat-info">
            <div className="stat-number">{c.value}</div>
            <div className="stat-label">{c.label}</div>
          </div>
        </div>
      ))}
    </div>
  )
}


// ========== Quick update helper ==========
async function quickUpdate(caseId, field, value) {
  try {
    const body = {}
    body[field] = value
    const res = await fetch(`/api/admin/sales/cases/${caseId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
      body: JSON.stringify(body)
    })
    return await res.json()
  } catch { return { success: false } }
}

// ========== TAB 1: ฝ่ายบัญชีลูกหนี้ ==========
function DebtorAccountingTab({ search, searchField, setSearch, setSearchField, dateFilter, setDateFilter, refreshKey, stats, onReload }) {
  const navigate = useNavigate()
  const [data, setData] = useState([])
  const [page, setPage] = useState(1)
  const [viewFiles, setViewFiles] = useState(null)

  useEffect(() => {
    let url = `${API}/debtors`
    const params = []
    if (dateFilter) params.push(`date=${dateFilter}`)
    if (params.length > 0) url += '?' + params.join('&')

    fetch(url, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json())
      .then(d => { if (d.success) setData(d.data) })
      .catch(() => {})
  }, [refreshKey, dateFilter])

  const filtered = data.filter(d => {
    if (!search) return true
    if (searchField === 'debtor_name') return d.debtor_name?.includes(search)
    if (searchField === 'debtor_code') return d.debtor_code?.includes(search)
    if (searchField === 'case_code') return d.case_code?.includes(search)
    return d.case_code?.includes(search) || d.debtor_name?.includes(search) || d.debtor_code?.includes(search)
  })
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  useEffect(() => { setPage(1) }, [search])

  return (
    <div>
      <DebtorStats stats={stats} />
      <div className="sales-filter-row" style={{ marginBottom: 12 }}>
        <select value={searchField} onChange={e => setSearchField(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14, minWidth: 140 }}>
          <option value="">ทั้งหมด</option>
          <option value="debtor_name">ชื่อ</option>
          <option value="debtor_code">รหัสลูกหนี้</option>
          <option value="case_code">รหัสเคส</option>
        </select>
        <div className="search-wrapper">
          <i className="fas fa-search"></i>
          <input className="search-input" type="text" placeholder="ค้นหาชื่อ, รหัสลูกหนี้, รหัสเคส..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <input type="date" value={dateFilter} onChange={e => { setDateFilter(e.target.value); onReload() }}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14 }} />
        <button
          onClick={() => navigate('/accounting/debtor/create')}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '8px 14px', borderRadius: 8, border: 'none',
            background: 'var(--primary)', color: '#fff', fontSize: 13, fontWeight: 600,
            cursor: 'pointer', transition: 'all 0.15s', boxShadow: '0 2px 8px rgba(39,174,96,0.3)',
            whiteSpace: 'nowrap'
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
        >
          <i className="fas fa-plus"></i> เพิ่มรายการ
        </button>
      </div>
      <div className="table-responsive">
        <table className="table-green">
          <thead>
            <tr>
              <th>ลำดับ</th>
              <th>ID ลูกหนี้</th>
              <th>ID เคส</th>
              <th>ชื่อ-สกุล</th>
              <th>วันชำระ</th>
              <th>ค่าประเมิน</th>
              <th>สถานะชำระ</th>
              <th>สถานะค่าประเมิน</th>
              <th>วันที่อัพเดท</th>
              <th>จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan="10">
                <div className="empty-state">
                  <i className="fas fa-inbox"></i>
                  <p>ยังไม่มีข้อมูล</p>
                </div>
              </td></tr>
            ) : paged.map((d, i) => (
              <tr key={d.case_id || i}>
                <td>{String((page - 1) * PER_PAGE + i + 1).padStart(2, '0')}</td>
                <td><strong style={{ color: 'var(--primary)' }}>{d.debtor_code || '-'}</strong></td>
                <td><strong>{d.case_code || '-'}</strong></td>
                <td>{d.debtor_name || '-'}</td>
                <td>{formatDate(d.payment_date)}</td>
                <td>฿{formatMoney(d.appraisal_fee)}</td>
                <td>
                  {d.case_id ? (
                    <StatusDropdown
                      value={d.payment_status || 'unpaid'}
                      options={allPayments}
                      badgeMap={paymentBadge}
                      labelMap={paymentLabel}
                      onChange={async (val) => {
                        try {
                          const res = await fetch(`${API}/debtor-master-status/${d.case_id}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
                            body: JSON.stringify({ status: val })
                          })
                          const r = await res.json()
                          if (r.success) setData(prev => prev.map(x => x.case_id === d.case_id ? { ...x, payment_status: val, appraisal_status: val } : x))
                        } catch {}
                      }}
                    />
                  ) : <span style={{ color: '#ccc' }}>-</span>}
                </td>
                <td>
                  {d.case_id ? (
                    <StatusDropdown
                      value={d.appraisal_status || 'unpaid'}
                      options={allPayments}
                      badgeMap={paymentBadge}
                      labelMap={paymentLabel}
                      onChange={async (val) => {
                        try {
                          const res = await fetch(`${API}/debtor-master-status/${d.case_id}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
                            body: JSON.stringify({ status: val })
                          })
                          const r = await res.json()
                          if (r.success) setData(prev => prev.map(x => x.case_id === d.case_id ? { ...x, payment_status: val, appraisal_status: val } : x))
                        } catch {}
                      }}
                    />
                  ) : <span style={{ color: '#ccc' }}>-</span>}
                </td>
                <td>{formatDate(d.updated_at)}</td>
                <td>
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                    <button
                      onClick={() => navigate(`/accounting/debtor/edit/${d.case_id}`)}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        padding: '5px 10px', borderRadius: 6, border: '1px solid #27ae60',
                        background: '#f0fff4', color: '#27ae60', fontSize: 12, fontWeight: 600,
                        cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s'
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#27ae60'; e.currentTarget.style.color = '#fff' }}
                      onMouseLeave={e => { e.currentTarget.style.background = '#f0fff4'; e.currentTarget.style.color = '#27ae60' }}
                    >
                      <i className="fas fa-edit"></i> แก้ไข
                    </button>
                    <button
                      onClick={() => setViewFiles(d)}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        padding: '5px 10px', borderRadius: 6, border: '1px solid #2980b9',
                        background: '#eaf4fc', color: '#2980b9', fontSize: 12, fontWeight: 600,
                        cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s'
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#2980b9'; e.currentTarget.style.color = '#fff' }}
                      onMouseLeave={e => { e.currentTarget.style.background = '#eaf4fc'; e.currentTarget.style.color = '#2980b9' }}
                      title="ดูไฟล์แนบ"
                    >
                      <i className="fas fa-images"></i> ดูไฟล์
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination total={filtered.length} page={page} setPage={setPage} />
      {viewFiles && <FilesPopup data={viewFiles} onClose={() => setViewFiles(null)} />}
    </div>
  )
}

// ========== TAB 2: ฝ่ายบัญชีนายทุน ==========
function InvestorAccountingTab({ search, searchField, setSearch, setSearchField, dateFilter, setDateFilter, refreshKey, stats, onReload }) {
  const navigate = useNavigate()
  const [data, setData] = useState([])
  const [page, setPage] = useState(1)

  useEffect(() => {
    let url = `${API}/investors`
    const params = []
    if (dateFilter) params.push(`date=${dateFilter}`)
    if (params.length > 0) url += '?' + params.join('&')

    fetch(url, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json())
      .then(d => { if (d.success) setData(d.data) })
      .catch(() => {})
  }, [refreshKey, dateFilter])

  const filtered = data.filter(d => {
    if (!search) return true
    if (searchField === 'investor_name') return d.investor_name?.includes(search)
    if (searchField === 'investor_code') return d.investor_code?.includes(search)
    return d.investor_name?.includes(search) || d.investor_code?.includes(search)
  })
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  useEffect(() => { setPage(1) }, [search])

  return (
    <div>
      <InvestorStats stats={stats} />
      <div className="sales-filter-row" style={{ marginBottom: 12 }}>
        <select value={searchField} onChange={e => setSearchField(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14, minWidth: 140 }}>
          <option value="">ทั้งหมด</option>
          <option value="investor_name">ชื่อนายทุน</option>
          <option value="investor_code">รหัสนายทุน</option>
        </select>
        <div className="search-wrapper">
          <i className="fas fa-search"></i>
          <input className="search-input" type="text" placeholder="ค้นหาชื่อนายทุน, รหัสนายทุน..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <input type="date" value={dateFilter} onChange={e => { setDateFilter(e.target.value); onReload() }}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14 }} />
        <button
          onClick={() => navigate('/accounting/investor/create')}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '8px 14px', borderRadius: 8, border: 'none',
            background: 'var(--primary)', color: '#fff', fontSize: 13, fontWeight: 600,
            cursor: 'pointer', transition: 'all 0.15s', boxShadow: '0 2px 8px rgba(39,174,96,0.3)',
            whiteSpace: 'nowrap'
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
        >
          <i className="fas fa-plus"></i> เพิ่มรายการ
        </button>
      </div>
      <div className="table-responsive">
        <table className="table-green">
          <thead>
            <tr>
              <th>ลำดับ</th>
              <th>ID นายทุน</th>
              <th>ชื่อ-สกุล</th>
              <th>วันที่อัพเดท</th>
              <th>จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan="5">
                <div className="empty-state">
                  <i className="fas fa-user-slash"></i>
                  <p>ยังไม่มีข้อมูลนายทุน</p>
                </div>
              </td></tr>
            ) : paged.map((d, i) => (
              <tr key={d.investor_id || i}>
                <td>{String((page - 1) * PER_PAGE + i + 1).padStart(2, '0')}</td>
                <td><strong style={{ color: 'var(--primary)' }}>{d.investor_code || '-'}</strong></td>
                <td><strong>{d.investor_name || '-'}</strong></td>
                <td>{formatDate(d.updated_at)}</td>
                <td>
                  <button
                    onClick={() => navigate(`/accounting/investor/edit/${d.investor_id}`)}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      padding: '5px 10px', borderRadius: 6, border: '1px solid #27ae60',
                      background: '#f0fff4', color: '#27ae60', fontSize: 12, fontWeight: 600,
                      cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#27ae60'; e.currentTarget.style.color = '#fff' }}
                    onMouseLeave={e => { e.currentTarget.style.background = '#f0fff4'; e.currentTarget.style.color = '#27ae60' }}
                  >
                    <i className="fas fa-edit"></i> แก้ไข
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination total={filtered.length} page={page} setPage={setPage} />
    </div>
  )
}

// ========== TAB 3: ฝ่ายบัญชีนายหน้า ==========
function AgentAccountingTab({ search, searchField, setSearch, setSearchField, dateFilter, setDateFilter, refreshKey, stats, onReload }) {
  const navigate = useNavigate()
  const [data, setData] = useState([])
  const [page, setPage] = useState(1)
  const [slipPreview, setSlipPreview] = useState(null)

  useEffect(() => {
    let url = `${API}/agents`
    const params = []
    if (dateFilter) params.push(`date=${dateFilter}`)
    if (params.length > 0) url += '?' + params.join('&')

    fetch(url, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json())
      .then(d => { if (d.success) setData(d.data) })
      .catch(() => {})
  }, [refreshKey, dateFilter])

  const filtered = data.filter(d => {
    if (!search) return true
    if (searchField === 'agent_name') return d.agent_name?.includes(search)
    if (searchField === 'agent_code') return d.agent_code?.includes(search)
    return d.agent_name?.includes(search) || d.agent_code?.includes(search)
  })
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  useEffect(() => { setPage(1) }, [search])

  return (
    <div>
      <AgentStats stats={stats} />
      <div className="sales-filter-row" style={{ marginBottom: 12 }}>
        <select value={searchField} onChange={e => setSearchField(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14, minWidth: 140 }}>
          <option value="">ทั้งหมด</option>
          <option value="agent_name">ชื่อนายหน้า</option>
          <option value="agent_code">รหัสนายหน้า</option>
        </select>
        <div className="search-wrapper">
          <i className="fas fa-search"></i>
          <input className="search-input" type="text" placeholder="ค้นหาชื่อนายหน้า, รหัสนายหน้า..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <input type="date" value={dateFilter} onChange={e => { setDateFilter(e.target.value); onReload() }}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14 }} />
        <button
          onClick={() => navigate('/accounting/agent/create')}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '8px 14px', borderRadius: 8, border: 'none',
            background: 'var(--primary)', color: '#fff', fontSize: 13, fontWeight: 600,
            cursor: 'pointer', transition: 'all 0.15s', boxShadow: '0 2px 8px rgba(39,174,96,0.3)',
            whiteSpace: 'nowrap'
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
        >
          <i className="fas fa-plus"></i> เพิ่มรายการ
        </button>
      </div>
      <div className="table-responsive">
        <table className="table-green">
          <thead>
            <tr>
              <th>ลำดับ</th>
              <th>รหัสนายหน้า</th>
              <th>ชื่อ-นามสกุล</th>
              <th>วันที่อัพเดท</th>
              <th>จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan="5">
                <div className="empty-state">
                  <i className="fas fa-user-slash"></i>
                  <p>ยังไม่มีข้อมูลนายหน้า</p>
                </div>
              </td></tr>
            ) : paged.map((a, i) => (
              <tr key={a.agent_id || i}>
                <td>{String((page - 1) * PER_PAGE + i + 1).padStart(2, '0')}</td>
                <td><strong style={{ color: 'var(--primary)' }}>{a.agent_code || '-'}</strong></td>
                <td><strong>{a.agent_name}</strong></td>
                <td>{formatDate(a.updated_at)}</td>
                <td>
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                    <button
                      onClick={() => navigate(`/accounting/agent/edit/${a.agent_id}`)}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        padding: '5px 10px', borderRadius: 6, border: '1px solid #27ae60',
                        background: '#f0fff4', color: '#27ae60', fontSize: 12, fontWeight: 600,
                        cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s'
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#27ae60'; e.currentTarget.style.color = '#fff' }}
                      onMouseLeave={e => { e.currentTarget.style.background = '#f0fff4'; e.currentTarget.style.color = '#27ae60' }}
                    >
                      <i className="fas fa-edit"></i> แก้ไข
                    </button>
                    {a.commission_slip && (
                      <button
                        onClick={() => setSlipPreview(a.commission_slip)}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          padding: '5px 10px', borderRadius: 6, border: '1px solid #2980b9',
                          background: '#eaf4fc', color: '#2980b9', fontSize: 12, fontWeight: 600,
                          cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s'
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#2980b9'; e.currentTarget.style.color = '#fff' }}
                        onMouseLeave={e => { e.currentTarget.style.background = '#eaf4fc'; e.currentTarget.style.color = '#2980b9' }}
                        title="ดูสลิปค่าคอมมิชชั่น"
                      >
                        <i className="fas fa-receipt"></i> ดูสลิป
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination total={filtered.length} page={page} setPage={setPage} />
      {slipPreview && <ImageModal src={slipPreview} onClose={() => setSlipPreview(null)} />}
    </div>
  )
}


// ==================== MAIN ACCOUNTING PAGE ====================
export default function AccountingPage() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('debtors')
  const [search, setSearch] = useState('')
  const [searchField, setSearchField] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [stats, setStats] = useState({})
  const [refreshKey, setRefreshKey] = useState(0)

  const reload = () => setRefreshKey(k => k + 1)

  useEffect(() => {
    fetch(`${API}/stats`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json())
      .then(d => { if (d.success) setStats(d.stats) })
      .catch(() => {})
  }, [refreshKey])

  const tabs = [
    { key: 'debtors', label: 'ฝ่ายบัญชีลูกหนี้', icon: 'fa-user-tag' },
    { key: 'investors', label: 'ฝ่ายบัญชีนายทุน', icon: 'fa-hand-holding-usd' },
    { key: 'agents', label: 'ฝ่ายบัญชีนายหน้า', icon: 'fa-user-tie' },
  ]

  return (
    <div>
      <div className="sales-tabs">
        {tabs.map(tab => (
          <button
            key={tab.key}
            className={`sales-tab ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => { setActiveTab(tab.key); setSearchField('') }}
          >
            <i className={`fas ${tab.icon}`}></i> {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'debtors' && <DebtorAccountingTab search={search} searchField={searchField} setSearch={setSearch} setSearchField={setSearchField} dateFilter={dateFilter} setDateFilter={setDateFilter} refreshKey={refreshKey} stats={stats} onReload={reload} />}
      {activeTab === 'investors' && <InvestorAccountingTab search={search} searchField={searchField} setSearch={setSearch} setSearchField={setSearchField} dateFilter={dateFilter} setDateFilter={setDateFilter} refreshKey={refreshKey} stats={stats} onReload={reload} />}
      {activeTab === 'agents' && <AgentAccountingTab search={search} searchField={searchField} setSearch={setSearch} setSearchField={setSearchField} dateFilter={dateFilter} setDateFilter={setDateFilter} refreshKey={refreshKey} stats={stats} onReload={reload} />}
    </div>
  )
}