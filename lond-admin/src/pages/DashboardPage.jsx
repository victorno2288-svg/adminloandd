import { useState, useEffect, useRef } from 'react'

const COLORS = {
  green: '#22c55e', blue: '#3b82f6', orange: '#f59e0b', red: '#ef4444',
  purple: '#8b5cf6', teal: '#14b8a6', pink: '#ec4899', indigo: '#6366f1'
}

const PROPERTY_TYPE_LABELS = {
  house: 'บ้านเดี่ยว',
  condo: 'คอนโด',
  townhouse: 'ทาวน์เฮาส์',
  land: 'ที่ดิน',
  factory: 'โรงงาน',
  commercial: 'อาคารพาณิชย์',
  apartment: 'อพาร์ทเม้นท์',
  unknown: 'อื่นๆ'
}

const PROPERTY_TYPE_COLORS = {
  house: '#3b82f6',
  condo: '#ef4444',
  townhouse: '#f59e0b',
  land: '#f97316',
  factory: '#8b5cf6',
  commercial: '#14b8a6',
  apartment: '#ec4899',
  unknown: '#9ca3af'
}

const STATUS_LABELS = {
  pending: 'รอดำเนินการ',
  reviewing: 'กำลังตรวจสอบ',
  appraising: 'กำลังประเมิน',
  approved: 'อนุมัติแล้ว',
  matched: 'จับคู่นายทุนแล้ว',
  rejected: 'ปฏิเสธ',
  cancelled: 'ยกเลิก'
}

const STATUS_COLORS = {
  pending: '#f59e0b',
  reviewing: '#3b82f6',
  appraising: '#8b5cf6',
  approved: '#22c55e',
  matched: '#14b8a6',
  rejected: '#ef4444',
  cancelled: '#9ca3af'
}

function formatMoney(num) {
  if (!num) return '0'
  return Number(num).toLocaleString('th-TH')
}

function formatDate(dateStr) {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })
}

// ===== Simple Donut Chart (SVG) =====
function DonutChart({ data, size = 200 }) {
  if (!data || data.length === 0) {
    return <p style={{ color: '#999', textAlign: 'center', padding: 40 }}>ยังไม่มีข้อมูล</p>
  }
  const total = data.reduce((s, d) => s + d.count, 0)
  if (total === 0) return <p style={{ color: '#999', textAlign: 'center', padding: 40 }}>ยังไม่มีข้อมูล</p>

  const cx = size / 2, cy = size / 2, r = size * 0.35, strokeW = size * 0.18
  let cumAngle = -90

  const arcs = data.map((d, i) => {
    const angle = (d.count / total) * 360
    const startRad = (cumAngle * Math.PI) / 180
    const endRad = ((cumAngle + angle) * Math.PI) / 180
    cumAngle += angle
    const largeArc = angle > 180 ? 1 : 0
    const x1 = cx + r * Math.cos(startRad)
    const y1 = cy + r * Math.sin(startRad)
    const x2 = cx + r * Math.cos(endRad)
    const y2 = cy + r * Math.sin(endRad)
    const color = PROPERTY_TYPE_COLORS[d.type] || Object.values(COLORS)[i % 8]
    return (
      <path key={i}
        d={`M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`}
        fill="none" stroke={color} strokeWidth={strokeW}
      />
    )
  })

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 20, justifyContent: 'center', flexWrap: 'wrap' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {arcs}
        <text x={cx} y={cy - 6} textAnchor="middle" fontSize="22" fontWeight="bold" fill="#333">{total}</text>
        <text x={cx} y={cy + 14} textAnchor="middle" fontSize="11" fill="#999">ทรัพย์ทั้งหมด</text>
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {data.map((d, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
            <span style={{
              width: 12, height: 12, borderRadius: 3,
              background: PROPERTY_TYPE_COLORS[d.type] || Object.values(COLORS)[i % 8],
              display: 'inline-block', flexShrink: 0
            }}></span>
            <span style={{ color: '#555' }}>{PROPERTY_TYPE_LABELS[d.type] || d.type}</span>
            <span style={{ fontWeight: 600, color: '#333' }}>{d.count}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ===== Simple Bar Chart (SVG) =====
function BarChart({ data, height = 200 }) {
  if (!data || data.length === 0) {
    return <p style={{ color: '#999', textAlign: 'center', padding: 40 }}>ยังไม่มีข้อมูล</p>
  }
  const maxVal = Math.max(...data.map(d => d.count), 1)
  const barW = Math.min(50, 600 / data.length - 10)
  const chartW = data.length * (barW + 10) + 40
  const dayNames = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']

  return (
    <svg width="100%" height={height + 30} viewBox={`0 0 ${chartW} ${height + 30}`}>
      {data.map((d, i) => {
        const barH = (d.count / maxVal) * (height - 30)
        const x = 30 + i * (barW + 10)
        const y = height - 20 - barH
        const dayOfWeek = new Date(d.date).getDay()
        const label = dayNames[dayOfWeek] || d.date?.slice(5)
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={barH} rx={4} fill="#3b82f6" opacity={0.8} />
            {d.count > 0 && (
              <text x={x + barW / 2} y={y - 5} textAnchor="middle" fontSize="11" fill="#333" fontWeight="600">{d.count}</text>
            )}
            <text x={x + barW / 2} y={height + 5} textAnchor="middle" fontSize="11" fill="#888">{label}</text>
          </g>
        )
      })}
    </svg>
  )
}

export default function DashboardPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const token = localStorage.getItem('loandd_admin')

  useEffect(() => {
    fetch('/api/admin/dashboard', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(d => {
        if (d.success) setData(d)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <div style={{ textAlign: 'center' }}>
          <i className="fas fa-spinner fa-spin" style={{ fontSize: 32, color: '#1a8c5b' }}></i>
          <p style={{ color: '#888', marginTop: 12 }}>กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div style={{ textAlign: 'center', padding: 60, color: '#999' }}>
        <i className="fas fa-exclamation-circle" style={{ fontSize: 48, marginBottom: 12 }}></i>
        <p>ไม่สามารถโหลดข้อมูลได้</p>
      </div>
    )
  }

  const { stats, auctionStats, propertyTypes, casesPerDay, recentCases, topInvestors, casesPerMonth, loanTypeBreakdown } = data

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto' }}>

      {/* ===== Row 1: Stat Cards ===== */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        <StatCard icon="fas fa-folder-open" color="#3b82f6" value={stats.totalCases} label="เคสทั้งหมด" />
        <StatCard icon="fas fa-clock" color="#f59e0b" value={stats.pendingCases} label="รอดำเนินการ" />
        <StatCard icon="fas fa-eye" color="#3b82f6" value={stats.reviewingCases} label="กำลังตรวจสอบ" />
        <StatCard icon="fas fa-search" color="#8b5cf6" value={stats.appraisingCases} label="กำลังประเมิน" />
        <StatCard icon="fas fa-check-circle" color="#22c55e" value={stats.approvedCases} label="อนุมัติแล้ว" />
        <StatCard icon="fas fa-handshake" color="#14b8a6" value={stats.matchedCases} label="จับคู่นายทุนแล้ว" />
        <StatCard icon="fas fa-times-circle" color="#ef4444" value={stats.rejectedCases} label="ปฏิเสธ" />
        <StatCard icon="fas fa-ban" color="#9ca3af" value={stats.cancelledCases} label="ยกเลิก" />
      </div>

      {/* ===== Row 2: Auction Stats ===== */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        <StatCard icon="fas fa-gavel" color="#22c55e" value={auctionStats.auctioning} label="ทรัพย์ที่กำลังประมูล" />
        <StatCard icon="fas fa-check-double" color="#3b82f6" value={auctionStats.completed} label="ทรัพย์ที่จบการประมูล" />
        <StatCard icon="fas fa-exclamation-circle" color="#f59e0b" value={auctionStats.noBids} label="ไม่มีใครเสนอราคา" />
        <StatCard icon="fas fa-coins" color="#14b8a6" value={formatMoney(stats.totalLoanAmount)} label="ยอดสินเชื่อรวม (บาท)" small />
        <StatCard icon="fas fa-gem" color="#8b5cf6" value={formatMoney(stats.totalEstimatedValue)} label="มูลค่าประเมินรวม (บาท)" small />
      </div>

      {/* ===== Row 3: Charts ===== */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, marginBottom: 24 }}>
        {/* Property Popularity Donut */}
        <Card title="PROPERTY POPULARITY" icon="fas fa-chart-pie" subtitle="ความนิยมของอสังหา">
          <DonutChart data={propertyTypes} />
        </Card>

        {/* Cases per day Bar */}
        <Card title="CASES — จำนวนเคสรายวัน" icon="fas fa-chart-bar" subtitle="7 วันล่าสุด">
          <BarChart data={casesPerDay} />
        </Card>
      </div>

      {/* ===== Row 4: Recent Cases + Top Investors ===== */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, marginBottom: 24 }}>
        {/* Recent Cases Table */}
        <Card title="เคสล่าสุด" icon="fas fa-list-alt">
          {recentCases.length === 0 ? (
            <p style={{ color: '#999', textAlign: 'center', padding: 30 }}>ยังไม่มีเคสในระบบ</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #e5e7eb' }}>
                    <th style={thStyle}>ID</th>
                    <th style={thStyle}>รหัสลูกหนี้</th>
                    <th style={thStyle}>ประเภท</th>
                    <th style={thStyle}>วงเงิน</th>
                    <th style={thStyle}>จังหวัด</th>
                    <th style={thStyle}>สถานะ</th>
                    <th style={thStyle}>วันที่</th>
                  </tr>
                </thead>
                <tbody>
                  {recentCases.map(c => (
                    <tr key={c.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                      <td style={tdStyle}>{c.id}</td>
                      <td style={tdStyle}><code style={{ background: '#f0f0f0', padding: '2px 6px', borderRadius: 4, fontSize: 12 }}>{c.debtor_code || '-'}</code></td>
                      <td style={tdStyle}>{PROPERTY_TYPE_LABELS[c.property_type] || c.property_type || '-'}</td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600, color: '#1a8c5b' }}>{formatMoney(c.loan_amount)}</td>
                      <td style={tdStyle}>{c.province || '-'}</td>
                      <td style={tdStyle}>
                        <span style={{
                          padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600,
                          background: (STATUS_COLORS[c.status] || '#999') + '20',
                          color: STATUS_COLORS[c.status] || '#999'
                        }}>
                          {STATUS_LABELS[c.status] || c.status || '-'}
                        </span>
                      </td>
                      <td style={tdStyle}>{formatDate(c.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Top Investors */}
        <Card title="อันดับนายทุน" icon="fas fa-trophy">
          {topInvestors.length === 0 ? (
            <p style={{ color: '#999', textAlign: 'center', padding: 30 }}>ยังไม่มีข้อมูลนายทุน</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {topInvestors.map((inv, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px',
                  background: i === 0 ? '#fffbeb' : '#f9fafb', borderRadius: 10, border: '1px solid #f0f0f0'
                }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: i === 0 ? '#f59e0b' : i === 1 ? '#9ca3af' : i === 2 ? '#b45309' : '#e5e7eb',
                    color: i < 3 ? '#fff' : '#666', fontWeight: 700, fontSize: 14
                  }}>
                    #{i + 1}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, color: '#333' }}>{inv.name || '-'}</div>
                    <div style={{ fontSize: 11, color: '#999' }}>ID: {inv.code || inv.id}</div>
                  </div>
                  <div style={{ fontWeight: 700, color: '#1a8c5b', fontSize: 13 }}>
                    {formatMoney(inv.totalInvested)} ฿
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* ===== Row 5: Loan Type + Monthly Trend ===== */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, marginBottom: 24 }}>
        {/* Loan Type */}
        <Card title="ประเภทสินเชื่อ" icon="fas fa-file-invoice-dollar">
          {(!loanTypeBreakdown || loanTypeBreakdown.length === 0) ? (
            <p style={{ color: '#999', textAlign: 'center', padding: 30 }}>ยังไม่มีข้อมูล</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '10px 0' }}>
              {loanTypeBreakdown.map((lt, i) => {
                const total = loanTypeBreakdown.reduce((s, l) => s + l.count, 0)
                const pct = total > 0 ? (lt.count / total * 100).toFixed(1) : 0
                return (
                  <div key={i}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                      <span style={{ color: '#555' }}>{lt.type === 'mortgage' ? 'จำนอง' : lt.type === 'selling_pledge' ? 'ขายฝาก' : lt.type || '-'}</span>
                      <span style={{ fontWeight: 600 }}>{lt.count} ({pct}%)</span>
                    </div>
                    <div style={{ background: '#f0f0f0', borderRadius: 6, height: 10, overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: i === 0 ? '#3b82f6' : '#f59e0b', borderRadius: 6, transition: 'width 0.5s' }}></div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>

        {/* Monthly Trend */}
        <Card title="แนวโน้มเคสรายเดือน" icon="fas fa-chart-line" subtitle="6 เดือนล่าสุด">
          {(!casesPerMonth || casesPerMonth.length === 0) ? (
            <p style={{ color: '#999', textAlign: 'center', padding: 30 }}>ยังไม่มีข้อมูล</p>
          ) : (
            <MonthlyChart data={casesPerMonth} />
          )}
        </Card>
      </div>

    </div>
  )
}

// ===== Monthly Line Chart (SVG) =====
function MonthlyChart({ data, height = 180 }) {
  const maxVal = Math.max(...data.map(d => d.count), 1)
  const w = 500, h = height
  const padL = 40, padR = 20, padT = 20, padB = 30
  const chartW = w - padL - padR
  const chartH = h - padT - padB
  const monthNames = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']

  const points = data.map((d, i) => {
    const x = padL + (i / Math.max(data.length - 1, 1)) * chartW
    const y = padT + chartH - (d.count / maxVal) * chartH
    return { x, y, ...d }
  })

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  const areaD = pathD + ` L ${points[points.length - 1].x} ${padT + chartH} L ${points[0].x} ${padT + chartH} Z`

  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`}>
      <defs>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={areaD} fill="url(#areaGrad)" />
      <path d={pathD} fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinejoin="round" />
      {points.map((p, i) => {
        const mIdx = parseInt(p.month?.split('-')[1]) - 1
        return (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={4} fill="#fff" stroke="#3b82f6" strokeWidth="2" />
            <text x={p.x} y={p.y - 10} textAnchor="middle" fontSize="11" fill="#333" fontWeight="600">{p.count}</text>
            <text x={p.x} y={padT + chartH + 16} textAnchor="middle" fontSize="10" fill="#888">{monthNames[mIdx] || p.month}</text>
          </g>
        )
      })}
    </svg>
  )
}

// ===== Reusable Components =====
function StatCard({ icon, color, value, label, small }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 12, padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14,
      boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #f0f0f0', transition: 'transform 0.2s',
      cursor: 'default'
    }}
      onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
      onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
    >
      <div style={{
        width: 48, height: 48, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: color + '18', color: color, fontSize: 20
      }}>
        <i className={icon}></i>
      </div>
      <div>
        <div style={{ fontSize: small ? 18 : 26, fontWeight: 700, color: '#1a1a2e', lineHeight: 1.1 }}>{value}</div>
        <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{label}</div>
      </div>
    </div>
  )
}

function Card({ title, icon, subtitle, children }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      border: '1px solid #f0f0f0', overflow: 'hidden'
    }}>
      <div style={{
        padding: '14px 20px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', gap: 10
      }}>
        {icon && <i className={icon} style={{ color: '#1a8c5b', fontSize: 16 }}></i>}
        <div>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#1a1a2e' }}>{title}</h3>
          {subtitle && <span style={{ fontSize: 11, color: '#999' }}>{subtitle}</span>}
        </div>
      </div>
      <div style={{ padding: 20 }}>
        {children}
      </div>
    </div>
  )
}

// Table styles
const thStyle = { padding: '10px 12px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#666', whiteSpace: 'nowrap' }
const tdStyle = { padding: '10px 12px', fontSize: 13, color: '#333', whiteSpace: 'nowrap' }