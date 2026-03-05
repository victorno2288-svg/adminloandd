import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import '../styles/sales.css'

const token = () => localStorage.getItem('loandd_admin')
const API = '/api/admin/appraisal'

const typeLabel = { outside: 'ประเมินนอก', inside: 'ประเมินใน', check_price: 'รอเช็คราคา' }
const typeBadge = { outside: 'badge-approve', inside: 'badge-auction', check_price: 'badge-pending' }

const resultLabel = { passed: 'ผ่านมาตรฐาน', not_passed: 'ไม่ผ่านมาตรฐาน' }
const resultBadge = { passed: 'badge-paid', not_passed: 'badge-cancelled' }
const allResults = Object.entries(resultLabel)

// ========== Helper: ตรวจสอบว่าไฟล์เป็น PDF ไหม ==========
const isPdf = (src) => src && src.toLowerCase().includes('.pdf')

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

// ========== Modal ดูรูป ==========
function ImageModal({ src, onClose }) {
  if (!src) return null
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
      }} title="ปิด">
        <i className="fas fa-times"></i>
      </button>
      <img src={src} alt="preview" onClick={e => e.stopPropagation()}
        style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: 8, boxShadow: '0 8px 32px rgba(0,0,0,0.5)', cursor: 'default' }} />
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
        {value ? (labelMap[value] || value) : 'ยังไม่ประเมิน'} <i className="fas fa-caret-down" style={{ fontSize: 10, marginLeft: 3 }}></i>
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

// ========== Upload เอกสารพร้อมปุ่ม X ลบ ==========
function DocUpload({ caseId, currentFile, onUploaded, onDeleted }) {
  const fileRef = useRef(null)
  const [uploading, setUploading] = useState(false)

  const handleUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('appraisal_book_image', file)
      const res = await fetch(`${API}/upload/${caseId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}` },
        body: fd
      })
      const r = await res.json()
      if (r.success) onUploaded(r.filePath)
      else alert(r.message || 'อัพโหลดล้มเหลว')
    } catch {
      alert('อัพโหลดล้มเหลว')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const handleDelete = async () => {
    if (!confirm('ต้องการลบเอกสารนี้?')) return
    try {
      const res = await fetch(`${API}/delete-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ table: 'cases', id: caseId, column: 'appraisal_book_image' })
      })
      const r = await res.json()
      if (r.success) onDeleted()
      else alert(r.message || 'ลบล้มเหลว')
    } catch {
      alert('ลบล้มเหลว')
    }
  }

  if (currentFile) {
    return (
      <div style={{ position: 'relative', display: 'inline-block' }}>
        <button onClick={handleDelete} style={{
          position: 'absolute', top: -6, right: -6, width: 22, height: 22, borderRadius: '50%',
          background: '#e74c3c', border: '2px solid #fff', color: '#fff', fontSize: 11,
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 1px 4px rgba(0,0,0,0.3)', zIndex: 2
        }} title="ลบเอกสาร">
          <i className="fas fa-times"></i>
        </button>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          padding: '4px 10px', borderRadius: 6, background: '#e8f5e9',
          color: '#27ae60', fontSize: 12, fontWeight: 600
        }}>
          <i className="fas fa-file-check"></i> มีเอกสาร
        </span>
      </div>
    )
  }

  return (
    <div>
      <input ref={fileRef} type="file" accept="image/*,.pdf" style={{ display: 'none' }}
        onChange={handleUpload} />
      <button onClick={() => fileRef.current?.click()} disabled={uploading} style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        padding: '4px 10px', borderRadius: 6, border: '1px solid #f39c12',
        background: '#fffbe6', color: '#f39c12', fontSize: 12, fontWeight: 600,
        cursor: uploading ? 'not-allowed' : 'pointer', opacity: uploading ? 0.7 : 1,
        transition: 'all 0.15s'
      }}>
        <i className={uploading ? 'fas fa-spinner fa-spin' : 'fas fa-upload'}></i>
        {uploading ? 'อัพโหลด...' : 'อัพโหลด'}
      </button>
    </div>
  )
}

// ========== Popup ดูเอกสารทั้งหมดของเคส ==========
function DocsPopup({ caseData, onClose }) {
  const [preview, setPreview] = useState(null)
  if (!caseData) return null

  const files = [
    { label: 'สลิปค่าประเมิน', src: caseData.slip_image },
    { label: 'เอกสารประเมิน', src: caseData.appraisal_book_image },
  ].filter(f => f.src)

  const handleFileClick = (f) => {
    if (isPdf(f.src)) {
      window.open(f.src, '_blank')
    } else {
      setPreview(f.src)
    }
  }

  return (
    <>
      <div onClick={onClose} style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.4)', zIndex: 9998
      }}></div>
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
            {files.map((f, i) => (
              <div key={i} style={{
                border: '1px solid #e0e0e0', borderRadius: 8, padding: 8, textAlign: 'center',
                cursor: 'pointer', transition: 'all 0.15s'
              }}
                onClick={() => handleFileClick(f)}
                onMouseEnter={e => e.currentTarget.style.borderColor = isPdf(f.src) ? '#e53935' : 'var(--primary)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = '#e0e0e0'}
              >
                {isPdf(f.src) ? (
                  <div style={{
                    width: '100%', height: 80, display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', background: '#fff5f5',
                    borderRadius: 4, marginBottom: 6, gap: 4
                  }}>
                    <i className="fas fa-file-pdf" style={{ fontSize: 32, color: '#e53935' }}></i>
                    <span style={{ fontSize: 10, color: '#e53935', fontWeight: 600 }}>คลิกเพื่อเปิด</span>
                  </div>
                ) : (
                  <img src={f.src} alt={f.label}
                    style={{ width: '100%', height: 80, objectFit: 'cover', borderRadius: 4, marginBottom: 6 }}
                    onError={e => { e.target.style.display = 'none' }}
                  />
                )}
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

// ==================== MAIN APPRAISAL PAGE ====================
export default function AppraisalPage() {
  const navigate = useNavigate()
  const [data, setData] = useState([])
  const [stats, setStats] = useState({})
  const [search, setSearch] = useState('')
  const [searchField, setSearchField] = useState('')
  const [filterType, setFilterType] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [viewDocs, setViewDocs] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)

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
    if (filterType) params.push(`type=${filterType}`)
    if (dateFilter) params.push(`date=${dateFilter}`)
    if (params.length > 0) url += '?' + params.join('&')

    fetch(url, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json())
      .then(d => { if (d.success) setData(d.data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [refreshKey, filterType, dateFilter])

  const filtered = data.filter(d => {
    if (!search) return true
    if (searchField === 'debtor_name') return d.debtor_name?.includes(search)
    if (searchField === 'debtor_phone') return d.debtor_phone?.includes(search)
    if (searchField === 'debtor_code') return d.debtor_code?.includes(search)
    return d.debtor_code?.includes(search) || d.debtor_name?.includes(search) || d.debtor_phone?.includes(search)
  })
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  useEffect(() => { setPage(1) }, [search, filterType])

  // อัปเดทผลประเมิน
  const handleResultChange = async (caseId, result) => {
    try {
      const res = await fetch(`${API}/result/${caseId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ appraisal_result: result })
      })
      const r = await res.json()
      if (r.success) {
        setData(prev => prev.map(x => x.case_id === caseId ? { ...x, appraisal_result: result } : x))
      }
    } catch {}
  }

  // stat card click → filter
  const statCards = [
    { key: 'outside', label: 'ประเมินนอก', value: stats.outside_count || 0, color: '#888', icon: 'fa-file-alt' },
    { key: 'inside', label: 'ประเมินใน', value: stats.inside_count || 0, color: '#27ae60', icon: 'fa-file-alt' },
    { key: 'check_price', label: 'รอเช็คราคา', value: stats.check_price_count || 0, color: '#f39c12', icon: 'fa-file-alt' },
    { key: '', label: 'ประวัติงาน', value: stats.total_count || 0, color: '#e74c3c', icon: 'fa-file-alt' },
  ]

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#333' }}>ฝ่ายประเมิน/ประเมินนอก</h2>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: '#888' }}>แสดงทั้งหมด</p>
      </div>

      {/* Stat Cards */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        {statCards.map((c, i) => (
          <div key={i}
            onClick={() => setFilterType(c.key)}
            style={{
              flex: '1 1 200px', maxWidth: 260, padding: '16px 20px',
              borderRadius: 10, background: '#fff', border: `1px solid ${filterType === c.key ? 'var(--primary)' : '#e0e0e0'}`,
              cursor: 'pointer', transition: 'all 0.15s',
              boxShadow: filterType === c.key ? '0 2px 8px rgba(39,174,96,0.2)' : 'none'
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
          <option value="debtor_code">รหัสลูกหนี้</option>
        </select>
        <div className="search-wrapper">
          <i className="fas fa-search"></i>
          <input className="search-input" type="text" placeholder="ค้นหาชื่อ, เบอร์โทร, รหัสลูกหนี้..."
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
              <th>ที่ตั้งทรัพย์</th>
              <th>สถานะประเมิน</th>
              <th>ผ่านมาตรฐาน</th>
              <th>วันที่อัพเดท</th>
              <th>จัดการ</th>
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
                  <i className="fas fa-inbox"></i>
                  <p>ยังไม่มีข้อมูล</p>
                </div>
              </td></tr>
            ) : paged.map((d, i) => {
              const location = [d.province, d.district].filter(Boolean).join(', ')
              return (
                <tr key={d.case_id || i}>
                  <td>{String((page - 1) * PER_PAGE + i + 1).padStart(2, '0')}</td>
                  <td><strong style={{ color: 'var(--primary)' }}>{d.debtor_code || '-'}</strong></td>
                  <td>{d.debtor_name || '-'}</td>
                  <td>{d.debtor_phone || '-'}</td>
                  <td style={{ maxWidth: 200, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                    title={d.property_address || location}>
                    {d.property_address || location || '-'}
                  </td>
                  <td>
                    <span className={`badge ${typeBadge[d.appraisal_type] || 'badge-pending'}`}>
                      {typeLabel[d.appraisal_type] || d.appraisal_type || '-'}
                    </span>
                  </td>
                  <td>
                    <StatusDropdown
                      value={d.appraisal_result}
                      options={allResults}
                      badgeMap={resultBadge}
                      labelMap={resultLabel}
                      onChange={(val) => handleResultChange(d.case_id, val)}
                    />
                  </td>
                  <td>{formatDate(d.updated_at)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
                      {/* ปุ่มแก้ไข */}
                      <button
                        onClick={() => navigate(`/appraisal/edit/${d.loan_request_id}`)}
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
                      {/* ดูเอกสาร */}
                      <button
                        onClick={() => setViewDocs(d)}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          padding: '5px 10px', borderRadius: 6, border: '1px solid #2980b9',
                          background: '#eaf4fc', color: '#2980b9', fontSize: 12, fontWeight: 600,
                          cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s'
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#2980b9'; e.currentTarget.style.color = '#fff' }}
                        onMouseLeave={e => { e.currentTarget.style.background = '#eaf4fc'; e.currentTarget.style.color = '#2980b9' }}
                        title="ดูเอกสาร"
                      >
                        <i className="fas fa-file-alt"></i> ดูเอกสาร
                      </button>
                      {/* อัพโหลดเอกสาร (ถ้าเป็นประเมินใน หรือยังไม่มีเอกสาร) */}
                      <DocUpload
                        caseId={d.case_id}
                        currentFile={d.appraisal_book_image}
                        onUploaded={(path) => {
                          setData(prev => prev.map(x => x.case_id === d.case_id ? { ...x, appraisal_book_image: path } : x))
                        }}
                        onDeleted={() => {
                          setData(prev => prev.map(x => x.case_id === d.case_id ? { ...x, appraisal_book_image: null } : x))
                        }}
                      />
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <Pagination total={filtered.length} page={page} setPage={setPage} />

      {/* Popup ดูเอกสาร */}
      {viewDocs && <DocsPopup caseData={viewDocs} onClose={() => setViewDocs(null)} />}
    </div>
  )
}