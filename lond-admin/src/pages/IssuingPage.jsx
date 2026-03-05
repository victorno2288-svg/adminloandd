import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import '../styles/sales.css'

const token = () => localStorage.getItem('loandd_admin')
const API = '/api/admin/issuing'

const statusLabel = { pending: 'ยังไม่ส่ง', sent: 'ส่งแล้ว', cancelled: 'ยกเลิก' }
const statusBadge = { pending: 'badge-pending', sent: 'badge-paid', cancelled: 'badge-cancelled' }
const allStatuses = Object.entries(statusLabel)


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

// ========== StatusDropdown ==========
function StatusDropdown({ value, options, badgeMap, labelMap, defaultLabel, onChange }) {
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
      <span ref={badgeRef}
        className={`badge ${value ? (badgeMap[value] || 'badge-pending') : 'badge-pending'}`}
        style={{ cursor: 'pointer', userSelect: 'none' }}
        onClick={handleOpen} title="คลิกเพื่อเปลี่ยน"
      >
        {value ? (labelMap[value] || value) : (defaultLabel || 'ยังไม่ส่ง')} <i className="fas fa-caret-down" style={{ fontSize: 10, marginLeft: 3 }}></i>
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
              <div key={key} style={{
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

// ========== PreviewModal ==========
function PreviewModal({ src, onClose }) {
  if (!src) return null
  const isPdf = /\.pdf$/i.test(src)
  return (
    <div onClick={onClose} style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.75)', zIndex: 99999,
      display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out'
    }}>
      <button onClick={e => { e.stopPropagation(); onClose() }} style={{
        position: 'fixed', top: 16, right: 16, width: 40, height: 40, borderRadius: '50%',
        background: 'rgba(255,255,255,0.9)', border: 'none', fontSize: 22, color: '#333',
        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 2px 8px rgba(0,0,0,0.3)', zIndex: 100000
      }}>
        <i className="fas fa-times"></i>
      </button>
      {isPdf ? (
        <iframe src={`/${src}`} onClick={e => e.stopPropagation()}
          style={{ width: '80vw', height: '85vh', borderRadius: 8, border: 'none', boxShadow: '0 8px 32px rgba(0,0,0,0.5)', cursor: 'default' }}
          title="PDF Preview" />
      ) : (
        <img src={`/${src}`} alt="preview" onClick={e => e.stopPropagation()}
          style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: 8, boxShadow: '0 8px 32px rgba(0,0,0,0.5)', cursor: 'default' }} />
      )}
    </div>
  )
}

// ========== DocsPopup ==========
function DocsPopup({ caseData, onClose }) {
  const [preview, setPreview] = useState(null)
  if (!caseData) return null
  const files = [
    { label: 'เอกสารแนบท้าย', src: caseData.attachment },
    { label: 'เอกสารขายฝาก/จำนอง', src: caseData.doc_selling_pledge },
    { label: 'โฉนดขายฝาก/จำนอง', src: caseData.deed_selling_pledge },
    { label: 'เอกสารขยาย', src: caseData.doc_extension },
    { label: 'โฉนดขยาย', src: caseData.deed_extension },
    { label: 'เอกสารไถ่ถอน', src: caseData.doc_redemption },
    { label: 'โฉนดไถ่ถอน', src: caseData.deed_redemption },
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
            เอกสาร — {caseData.debtor_code || caseData.case_code}
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#999' }}>
            <i className="fas fa-times"></i>
          </button>
        </div>
        {files.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 24, color: '#aaa' }}>
            <i className="fas fa-folder-open" style={{ fontSize: 36, marginBottom: 8 }}></i>
            <p>ยังไม่มีเอกสาร</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 }}>
            {files.map((f, i) => {
              const isPdf = /\.pdf$/i.test(f.src)
              return (
                <div key={i} style={{
                  border: '1px solid #e0e0e0', borderRadius: 8, padding: 8, textAlign: 'center',
                  cursor: 'pointer', transition: 'all 0.15s'
                }}
                  onClick={() => isPdf ? window.open(`/${f.src}`, '_blank') : setPreview(f.src)}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = '#e0e0e0'}
                >
                  {isPdf ? (
                    <div style={{ width: '100%', height: 80, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#fff5f5', borderRadius: 4, marginBottom: 6, color: '#e74c3c' }}>
                      <i className="fas fa-file-pdf" style={{ fontSize: 28 }}></i>
                      <span style={{ fontSize: 10, marginTop: 4 }}>PDF</span>
                    </div>
                  ) : (
                    <img src={`/${f.src}`} alt={f.label}
                      style={{ width: '100%', height: 80, objectFit: 'cover', borderRadius: 4, marginBottom: 6 }}
                      onError={e => { e.target.style.display = 'none' }} />
                  )}
                  <div style={{ fontSize: 11, color: '#555', fontWeight: 600 }}>{f.label}</div>
                </div>
              )
            })}
          </div>
        )}
      </div>
      <PreviewModal src={preview} onClose={() => setPreview(null)} />
    </>
  )
}

// ==================== MAIN ISSUING PAGE ====================
export default function IssuingPage() {
  const navigate = useNavigate()
  const [data, setData] = useState([])
  const [stats, setStats] = useState({})
  const [search, setSearch] = useState('')
  const [searchField, setSearchField] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)
  const [viewDocs, setViewDocs] = useState(null)

  const reload = () => setRefreshKey(k => k + 1)

  // โหลดสถิติ
  useEffect(() => {
    fetch(`${API}/stats`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json())
      .then(d => { if (d.success) setStats(d.stats) })
      .catch(() => {})
  }, [refreshKey])

  // โหลดข้อมูล
  useEffect(() => {
    setLoading(true)
    let url = `${API}/cases`
    const params = []
    if (filterStatus) params.push(`status=${filterStatus}`)
    if (dateFilter) params.push(`date=${dateFilter}`)
    if (params.length > 0) url += '?' + params.join('&')

    fetch(url, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json())
      .then(d => { if (d.success) setData(d.data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [refreshKey, filterStatus, dateFilter])

  const filtered = data.filter(d => {
    if (!search) return true
    if (searchField === 'debtor_name') return d.debtor_name?.includes(search)
    if (searchField === 'debtor_phone') return d.debtor_phone?.includes(search)
    if (searchField === 'case_code') return d.case_code?.includes(search)
    if (searchField === 'email') return d.email?.includes(search) || d.tracking_no?.includes(search)
    if (searchField === 'officer_name') return d.officer_name?.includes(search)
    if (searchField === 'land_office') return d.land_office?.includes(search)
    return d.debtor_code?.includes(search) || d.debtor_name?.includes(search) || d.debtor_phone?.includes(search) || d.case_code?.includes(search) || d.email?.includes(search) || d.tracking_no?.includes(search)
  })
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  useEffect(() => { setPage(1) }, [search, filterStatus])

  // อัปเดทสถานะออกสัญญา
  const handleStatusChange = async (caseId, status) => {
    try {
      const res = await fetch(`${API}/cases/${caseId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ issuing_status: status })
      })
      const r = await res.json()
      if (r.success) {
        setData(prev => prev.map(x => x.case_id === caseId ? { ...x, issuing_status: status } : x))
        reload()
      }
    } catch {}
  }

  // stat card click → filter
  const statCards = [
    { key: 'pending', label: 'ยังไม่ส่งสัญญา', value: stats.pending_count || 0, color: '#3498db', icon: 'fa-file-signature' },
    { key: 'sent', label: 'ส่งสัญญาแล้ว', value: stats.sent_count || 0, color: '#27ae60', icon: 'fa-file-contract' },
    { key: '', label: 'แต่งตั้งนายหน้า', value: stats.contract_appointment_count || 0, color: '#8e44ad', icon: 'fa-user-tie' },
    { key: '', label: 'จดหมายแจ้งเตือนรวม', value: (stats.reminder_selling_count || 0) + (stats.reminder_mortgage_count || 0), color: '#e67e22', icon: 'fa-envelope' },
  ]

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#333' }}>
          <i className="fas fa-file-contract" style={{ marginRight: 10, color: 'var(--primary)' }}></i>
          ฝ่ายออกสัญญา
        </h2>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: '#888' }}>แสดงทั้งหมด</p>
      </div>

      {/* Stat Cards */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        {statCards.map((c, i) => (
          <div key={i}
            onClick={() => c.key && setFilterStatus(c.key)}
            style={{
              flex: '1 1 180px', maxWidth: 240, padding: '16px 20px',
              borderRadius: 10, background: '#fff', border: `1px solid ${filterStatus === c.key ? 'var(--primary)' : '#e0e0e0'}`,
              cursor: c.key ? 'pointer' : 'default', transition: 'all 0.15s',
              boxShadow: filterStatus === c.key ? '0 2px 8px rgba(39,174,96,0.2)' : 'none'
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 600, color: '#555', marginBottom: 8 }}>{c.label}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 40, height: 40, borderRadius: '50%', background: c.color + '22',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <i className={`fas ${c.icon}`} style={{ color: c.color, fontSize: 16 }}></i>
              </div>
              <span style={{ fontSize: 28, fontWeight: 700, color: '#333' }}>{c.value}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Search + Date */}
      <div className="sales-filter-row" style={{ marginBottom: 16 }}>
        <select
          value={searchField}
          onChange={e => setSearchField(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14, minWidth: 140 }}
        >
          <option value="">ทั้งหมด</option>
          <option value="debtor_name">ชื่อ</option>
          <option value="debtor_phone">เบอร์โทร</option>
          <option value="case_code">รหัสเคส</option>
          <option value="email">อีเมล</option>
          <option value="officer_name">เจ้าหน้าที่</option>
          <option value="land_office">สำนักงานที่ดิน</option>
        </select>
        <div className="search-wrapper">
          <i className="fas fa-search"></i>
          <input className="search-input" type="text" placeholder="ค้นหาชื่อ, เบอร์โทร, รหัสเคส..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <input type="date" value={dateFilter}
          onChange={e => { setDateFilter(e.target.value); reload() }}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14 }} />
        {filterStatus && (
          <button onClick={() => setFilterStatus('')} style={{
            padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd',
            background: '#fff', cursor: 'pointer', fontSize: 13, color: '#666'
          }}>
            <i className="fas fa-times"></i> ล้างตัวกรอง
          </button>
        )}
      </div>

      {/* Table */}
      <div className="table-responsive">
        <table className="table-green">
          <thead>
            <tr>
              <th>ลำดับ</th>
              <th>ID เคส</th>
              <th>ชื่อลูกหนี้</th>
              <th>โทร</th>
              <th>เจ้าหน้าที่</th>
              <th>สำนักงานที่ดิน</th>
              <th>วันที่ไปที่ดิน</th>
              <th>สถานะออกสัญญา</th>
              <th>อีเมล</th>
              <th>จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="10">
                <div style={{ textAlign: 'center', padding: 40, color: '#aaa' }}>
                  <i className="fas fa-spinner fa-spin" style={{ fontSize: 24, marginBottom: 8 }}></i>
                  <p>กำลังโหลด...</p>
                </div>
              </td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan="10">
                <div className="empty-state">
                  <i className="fas fa-inbox"></i>
                  <p>ยังไม่มีข้อมูล</p>
                </div>
              </td></tr>
            ) : paged.map((d, i) => (
                <tr key={d.case_id || i}>
                  <td>{String((page - 1) * PER_PAGE + i + 1).padStart(2, '0')}</td>
                  <td><strong style={{ color: 'var(--primary)' }}>{d.case_code || '-'}</strong></td>
                  <td>{d.debtor_name || '-'}</td>
                  <td>{d.debtor_phone || '-'}</td>
                  <td>{d.officer_name || '-'}</td>
                  <td>{d.land_office || '-'}</td>
                  <td>{formatDate(d.visit_date)}</td>
                  <td>
                    <StatusDropdown
                      value={d.issuing_status || 'pending'}
                      options={allStatuses}
                      badgeMap={statusBadge}
                      labelMap={statusLabel}
                      defaultLabel="ยังไม่ส่ง"
                      onChange={(val) => handleStatusChange(d.case_id, val)}
                    />
                  </td>
                  <td>{d.email || d.tracking_no || '-'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
                      {/* ปุ่มเอกสาร */}
                      <button
                        onClick={() => setViewDocs(d)}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          padding: '5px 10px', borderRadius: 6, border: '1px solid #3498db',
                          background: '#ebf5fb', color: '#3498db', fontSize: 12, fontWeight: 600,
                          cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s'
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#3498db'; e.currentTarget.style.color = '#fff' }}
                        onMouseLeave={e => { e.currentTarget.style.background = '#ebf5fb'; e.currentTarget.style.color = '#3498db' }}
                        title="ดูเอกสาร"
                      >
                        <i className="fas fa-images"></i> เอกสาร
                      </button>
                      {/* ปุ่มแก้ไข */}
                      <button
                        onClick={() => navigate(`/issuing/edit/${d.case_id}`)}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          padding: '5px 10px', borderRadius: 6, border: '1px solid #f39c12',
                          background: '#fffbe6', color: '#f39c12', fontSize: 12, fontWeight: 600,
                          cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s'
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#f39c12'; e.currentTarget.style.color = '#fff' }}
                        onMouseLeave={e => { e.currentTarget.style.background = '#fffbe6'; e.currentTarget.style.color = '#f39c12' }}
                        title="แก้ไขเคส"
                      >
                        <i className="fas fa-edit"></i> แก้ไข
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <Pagination total={filtered.length} page={page} setPage={setPage} />

      {/* Docs Popup */}
      {viewDocs && <DocsPopup caseData={viewDocs} onClose={() => setViewDocs(null)} />}
    </div>
  )
}
