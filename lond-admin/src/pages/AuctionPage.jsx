import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import '../styles/sales.css'

const token = () => localStorage.getItem('loandd_admin')
const API = '/api/admin/auction'

// ==================== DocViewerModal ====================
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
                    const ext = filePath.split('.').pop().toLowerCase()
                    const isPdf = ext === 'pdf'
                    const fileName = filePath.split('/').pop()
                    const url = filePath.startsWith('http') ? filePath : `/${filePath}`
                    if (isPdf) return (
                      <a key={i} href={url} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', textAlign: 'center', width: 100 }} title={fileName}>
                        <div style={{ width: 100, height: 100, borderRadius: 8, border: '2px solid #e74c3c', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#fff5f5', color: '#e74c3c', gap: 4, cursor: 'pointer', transition: 'transform 0.15s' }} onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}><i className="fas fa-file-pdf" style={{ fontSize: 30 }}></i><span style={{ fontSize: 10, fontWeight: 600 }}>PDF</span></div>
                        <div style={{ fontSize: 10, color: '#666', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 100 }}>{fileName}</div>
                      </a>
                    )
                    return (
                      <a key={i} href={url} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', textAlign: 'center', width: 100 }} title={fileName}>
                        <div style={{ width: 100, height: 100, borderRadius: 8, border: '2px solid #e0e0e0', overflow: 'hidden', cursor: 'pointer', transition: 'transform 0.15s', background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
                          <img src={url} alt={`doc-${i}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.target.style.display = 'none'; e.target.parentElement.innerHTML = '<i class="fas fa-image" style="font-size:28px;color:#ccc"></i>' }} />
                        </div>
                        <div style={{ fontSize: 10, color: '#666', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 100 }}>{fileName}</div>
                      </a>
                    )
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

const statusLabel = { pending: 'รอประมูล', auctioned: 'ประมูลแล้ว', cancelled: 'ยกเลิก' }
const statusBadge = { pending: 'badge-pending', auctioned: 'badge-paid', cancelled: 'badge-cancelled' }
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
      <span ref={badgeRef}
        className={`badge ${value ? (badgeMap[value] || 'badge-pending') : 'badge-pending'}`}
        style={{ cursor: 'pointer', userSelect: 'none' }}
        onClick={handleOpen} title="คลิกเพื่อเปลี่ยน"
      >
        {value ? (labelMap[value] || value) : 'รอประมูล'} <i className="fas fa-caret-down" style={{ fontSize: 10, marginLeft: 3 }}></i>
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

// ==================== MAIN AUCTION PAGE ====================
export default function AuctionPage() {
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
  const [docModal, setDocModal] = useState({ show: false, title: '', documents: [] })

  const parseJSON = (val) => {
    if (!val) return []
    try { const r = JSON.parse(val); return Array.isArray(r) ? r : [] } catch { return [] }
  }

  const openDocModal = (row) => {
    const allImages = parseJSON(row.images)
    const deedImages = parseJSON(row.deed_images)

    const docs = [
      {
        label: 'โฉนด / เอกสารสิทธิ์',
        icon: 'fa-file-contract',
        color: '#8e44ad',
        items: deedImages
      },
      {
        label: 'บัตรประชาชนเจ้าของทรัพย์',
        icon: 'fa-id-card',
        color: '#2980b9',
        items: allImages.filter(p => p.includes('id-cards'))
      },
      {
        label: 'รูปภาพทรัพย์',
        icon: 'fa-home',
        color: '#27ae60',
        items: allImages.filter(p => p.includes('properties'))
      },
      {
        label: 'วิดีโอทรัพย์',
        icon: 'fa-video',
        color: '#e67e22',
        items: allImages.filter(p => p.includes('videos'))
      },
      {
        label: 'เล่มประเมิน',
        icon: 'fa-book',
        color: '#8e44ad',
        items: row.appraisal_book_image ? [row.appraisal_book_image] : []
      },
      {
        label: 'เล่มทะเบียนบ้าน',
        icon: 'fa-book-open',
        color: '#16a085',
        items: parseJSON(row.house_reg_book)
      },
      {
        label: 'เล่มทะเบียนบ้าน (นิติกรรม)',
        icon: 'fa-book-open',
        color: '#1abc9c',
        items: parseJSON(row.house_reg_book_legal)
      },
      {
        label: 'ใบเปลี่ยนชื่อนามสกุล',
        icon: 'fa-file-alt',
        color: '#7f8c8d',
        items: parseJSON(row.name_change_doc)
      },
      {
        label: 'ใบหย่า',
        icon: 'fa-file-alt',
        color: '#95a5a6',
        items: parseJSON(row.divorce_doc)
      },
      {
        label: 'หนังสือยินยอมคู่สมรส',
        icon: 'fa-heart',
        color: '#e91e63',
        items: parseJSON(row.spouse_consent_doc)
      },
      {
        label: 'บัตรประชาชนคู่สมรส',
        icon: 'fa-id-card',
        color: '#ad1457',
        items: parseJSON(row.spouse_id_card)
      },
      {
        label: 'สำเนาทะเบียนคู่สมรส',
        icon: 'fa-copy',
        color: '#c2185b',
        items: parseJSON(row.spouse_reg_copy)
      },
      {
        label: 'ทะเบียนสมรส',
        icon: 'fa-rings-wedding',
        color: '#d81b60',
        items: parseJSON(row.marriage_cert)
      },
      {
        label: 'ใบเปลี่ยนชื่อนามสกุลคู่สมรส',
        icon: 'fa-file-alt',
        color: '#880e4f',
        items: parseJSON(row.spouse_name_change_doc)
      },
    ]
    setDocModal({
      show: true,
      title: row.debtor_name || row.case_code || 'เอกสาร',
      documents: docs
    })
  }

  const countDocs = (row) => {
    const allImages = parseJSON(row.images)
    const deedImages = parseJSON(row.deed_images)
    let count = deedImages.length
    count += allImages.filter(p => p.includes('id-cards')).length
    count += allImages.filter(p => p.includes('properties')).length
    count += allImages.filter(p => p.includes('videos')).length
    if (row.appraisal_book_image) count += 1
    const docFields = ['house_reg_book','house_reg_book_legal','name_change_doc','divorce_doc',
      'spouse_consent_doc','spouse_id_card','spouse_reg_copy','marriage_cert','spouse_name_change_doc']
    docFields.forEach(f => { count += parseJSON(row[f]).length })
    return count
  }

  const reload = () => setRefreshKey(k => k + 1)

  // โหลดสถิติ
  useEffect(() => {
    fetch(`${API}/stats`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json())
      .then(d => { if (d.success) setStats(d.stats) })
      .catch(() => { })
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
      .catch(() => { })
      .finally(() => setLoading(false))
  }, [refreshKey, filterStatus, dateFilter])

  const filtered = data.filter(d => {
    if (!search) return true
    if (searchField === 'debtor_name') return d.debtor_name?.includes(search)
    if (searchField === 'debtor_phone') return d.debtor_phone?.includes(search)
    if (searchField === 'case_code') return d.case_code?.includes(search)
    if (searchField === 'investor_name') return d.investor_name?.includes(search)
    if (searchField === 'investor_code') return d.investor_code?.includes(search)
    return d.debtor_code?.includes(search) || d.debtor_name?.includes(search) || d.debtor_phone?.includes(search) || d.case_code?.includes(search) || d.investor_name?.includes(search) || d.investor_code?.includes(search)
  })
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  useEffect(() => { setPage(1) }, [search, filterStatus])

  // อัปเดทสถานะประมูล (เชื่อม cases.status อัตโนมัติจาก backend)
  const handleStatusChange = async (caseId, status) => {
    try {
      const res = await fetch(`${API}/cases/${caseId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ auction_status: status })
      })
      const r = await res.json()
      if (r.success) {
        setData(prev => prev.map(x => x.case_id === caseId ? { ...x, auction_status: status } : x))
        reload()
      }
    } catch { }
  }

  // stat card click → filter
  const statCards = [
    { key: 'pending', label: 'ทรัพย์รอการประมูล', value: stats.pending_count || 0, color: '#3498db', icon: 'fa-hourglass-half' },
    { key: 'auctioned', label: 'ทรัพย์ที่ประมูลแล้ว', value: stats.auctioned_count || 0, color: '#27ae60', icon: 'fa-gavel' },
    { key: 'cancelled', label: 'เคสยกเลิก', value: stats.cancelled_count || 0, color: '#e74c3c', icon: 'fa-times-circle' },
  ]

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#333' }}>
          <i className="fas fa-gavel" style={{ marginRight: 10, color: 'var(--primary)' }}></i>
          ฝ่ายประมูลทรัพย์
        </h2>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: '#888' }}>แสดงทั้งหมด {stats.total_count || 0} รายการ</p>
      </div>

      {/* Stat Cards */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        {statCards.map((c, i) => (
          <div key={i}
            onClick={() => setFilterStatus(filterStatus === c.key ? '' : c.key)}
            style={{
              flex: '1 1 200px', maxWidth: 260, padding: '16px 20px',
              borderRadius: 10, background: '#fff', border: `1px solid ${filterStatus === c.key ? 'var(--primary)' : '#e0e0e0'}`,
              cursor: 'pointer', transition: 'all 0.15s',
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
          <option value="debtor_name">ชื่อลูกหนี้</option>
          <option value="debtor_phone">เบอร์โทร</option>
          <option value="case_code">รหัสเคส</option>
          <option value="investor_name">ชื่อนายทุน</option>
          <option value="investor_code">รหัสนายทุน</option>
        </select>
        <div className="search-wrapper">
          <i className="fas fa-search"></i>
          <input className="search-input" type="text" placeholder="ค้นหาชื่อ, เบอร์โทร, รหัสเคส, นายทุน..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <input type="date" value={dateFilter}
          onChange={e => { setDateFilter(e.target.value); reload() }}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14 }} />
      </div>

      {/* Table */}
      <div className="table-responsive">
        <table className="table-green">
          <thead>
            <tr>
              <th>ลำดับ</th>
              <th>ID ลูกหนี้</th>
              <th>ชื่อ-สกุล</th>
              <th>เบอร์โทร</th>
              <th>ID นายทุน</th>
              <th>ชื่อนายทุน</th>
              <th>เบอร์โทรนายทุน</th>
              <th>ที่ตั้งทรัพย์</th>
              <th>เอกสาร</th>
              <th>สถานะ</th>
              <th>วันที่อัพเดท</th>
              <th>จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="12">
                <div style={{ textAlign: 'center', padding: 40, color: '#aaa' }}>
                  <i className="fas fa-spinner fa-spin" style={{ fontSize: 24, marginBottom: 8 }}></i>
                  <p>กำลังโหลด...</p>
                </div>
              </td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan="12">
                <div className="empty-state">
                  <i className="fas fa-inbox"></i>
                  <p>ยังไม่มีข้อมูล</p>
                </div>
              </td></tr>
            ) : paged.map((d, i) => (
              <tr key={d.case_id || i}>
                <td>{String((page - 1) * PER_PAGE + i + 1).padStart(2, '0')}</td>
                <td><strong style={{ color: 'var(--primary)' }}>{d.debtor_code || '-'}</strong></td>
                <td>{d.debtor_name || '-'}</td>
                <td>{d.debtor_phone || '-'}</td>
                <td>{d.investor_code || '-'}</td>
                <td>{d.investor_name || '-'}</td>
                <td>{d.investor_phone || '-'}</td>
                <td style={{ maxWidth: 160, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {d.province && d.district ? `${d.province} ${d.district}` : d.property_address || '-'}
                </td>
                <td>
                  {(() => {
                    const total = countDocs(d)
                    return (
                      <button
                        onClick={() => openDocModal(d)}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                          padding: '4px 10px', borderRadius: 6,
                          border: `1px solid ${total > 0 ? 'var(--primary)' : '#ccc'}`,
                          background: total > 0 ? '#f0faf5' : '#fafafa',
                          color: total > 0 ? 'var(--primary)' : '#aaa',
                          fontSize: 12, fontWeight: 600,
                          cursor: 'pointer', transition: 'all 0.15s'
                        }}
                        onMouseEnter={e => {
                          if (total > 0) { e.currentTarget.style.background = 'var(--primary)'; e.currentTarget.style.color = '#fff' }
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.background = total > 0 ? '#f0faf5' : '#fafafa'
                          e.currentTarget.style.color = total > 0 ? 'var(--primary)' : '#aaa'
                        }}
                      >
                        <i className="fas fa-folder-open"></i>
                        {total > 0 ? (
                          <>ดูเอกสาร <span style={{
                            background: 'var(--primary)', color: '#fff',
                            borderRadius: '50%', width: 18, height: 18,
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 10, fontWeight: 700
                          }}>{total}</span></>
                        ) : 'ยังไม่มีเอกสาร'}
                      </button>
                    )
                  })()}
                </td>
                <td>
                  <StatusDropdown
                    value={d.auction_status || 'pending'}
                    options={allStatuses}
                    badgeMap={statusBadge}
                    labelMap={statusLabel}
                    onChange={(val) => handleStatusChange(d.case_id, val)}
                  />
                </td>
                <td>{formatDate(d.auction_updated_at)}</td>
                <td>
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
                    <button
                      onClick={() => navigate(`/auction/edit/${d.case_id}`)}
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

      <DocViewerModal
        show={docModal.show}
        title={docModal.title}
        documents={docModal.documents}
        onClose={() => setDocModal({ show: false, title: '', documents: [] })}
      />
    </div>
  )
}