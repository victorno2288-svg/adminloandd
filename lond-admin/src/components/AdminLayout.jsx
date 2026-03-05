import { useState, useEffect } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { getCurrentUser, isTokenExpired, logout } from '../utils/auth'
import { hasAccess } from '../utils/permissions'
import bigLogo from '../pic/big-logo.png'
import NotificationBell from './NotificationBell'

// ========== Dropdown Menu Component ==========
function DropdownMenu({ icon, label, children, sidebarOpen }) {
  const [open, setOpen] = useState(false)
  const location = useLocation()
  const isChildActive = children.some(c => location.pathname === c.path)

  if (!sidebarOpen) {
    return children.map(c => (
      <NavLink key={c.path} to={c.path} className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
        <i className={c.icon}></i>
      </NavLink>
    ))
  }

  return (
    <div>
      <div
        onClick={() => setOpen(!open)}
        className={`sidebar-link ${isChildActive ? 'active' : ''}`}
        style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <i className={icon}></i>
          <span>{label}</span>
        </span>
        <i className={`fas fa-chevron-${open ? 'up' : 'down'}`} style={{
          fontSize: 11, opacity: 0.8,
          background: 'rgba(255,255,255,0.15)', borderRadius: 4,
          padding: '3px 6px', transition: 'transform 0.2s'
        }}></i>
      </div>
      {open && (
        <div style={{ paddingLeft: 18 }}>
          {children.map(c => (
            <NavLink
              key={c.path}
              to={c.path}
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              style={{ fontSize: 13, padding: '8px 16px' }}
            >
              <i className={c.icon} style={{ fontSize: 12 }}></i>
              <span>{c.label}</span>
            </NavLink>
          ))}
        </div>
      )}
    </div>
  )
}

// ========== ฟังก์ชั่นกรอง menu ตาม department ==========
function filterMenuByDepartment(menuItems, department) {
  if (!department) return []

  // กรองรายการก่อน แล้วค่อยเอา section ที่ไม่มีเมนูออก
  const filtered = menuItems
    .map(item => {
      // dropdown: กรอง children ก่อน
      if (item.type === 'dropdown') {
        const allowedChildren = item.children.filter(c => hasAccess(department, c.path))
        if (allowedChildren.length === 0) return null
        return { ...item, children: allowedChildren }
      }
      // section/divider: ไว้ก่อน จะ clean ทีหลัง
      if (item.type === 'section' || item.type === 'divider') return item
      // ปกติ: เช็คสิทธิ์
      if (!hasAccess(department, item.path)) return null
      return item
    })
    .filter(Boolean)

  // ลบ section ที่ไม่มีเมนูตามหลัง (section อยู่ติดกับ section อื่น หรืออยู่ท้ายสุด)
  return filtered.filter((item, idx) => {
    if (item.type !== 'section') return true
    // หา item ถัดไปที่ไม่ใช่ section
    const next = filtered.slice(idx + 1).find(n => n.type !== 'section')
    return !!next // ถ้าไม่มีเมนูตามมาเลย → ซ่อน section นี้
  })
}

export default function AdminLayout() {
  const isMobile = () => window.innerWidth < 1024
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    const saved = localStorage.getItem('loandd_sidebar_open')
    if (isMobile()) return false
    return saved !== null ? JSON.parse(saved) : true
  })

  const navigate = useNavigate()
  // ดึงข้อมูล user จาก JWT + localStorage (fallback)
  const jwtUser = getCurrentUser() || {}
  const lsUser = JSON.parse(localStorage.getItem('loandd_admin_user') || '{}')
  const user = { ...lsUser, ...jwtUser }
  // ถ้ายังไม่มี department ใน JWT → ถือเป็น super_admin (เข้าได้ทุกหน้า) เพื่อไม่ให้เมนูหาย
  const department = user.department || 'super_admin'

  const handleLogout = () => {
    logout()
  }

  // ========== Auto-logout เมื่อ token หมดอายุ ==========
  useEffect(() => {
    // เช็คทันทีตอน mount
    if (isTokenExpired()) {
      logout('session_expired')
      return
    }

    // เช็คทุก 60 วินาที
    const timer = setInterval(() => {
      if (isTokenExpired()) {
        clearInterval(timer)
        logout('session_expired')
      }
    }, 60 * 1000)

    // Intercept fetch → ถ้าได้ 401 ให้ logout ทันที
    const originalFetch = window.fetch
    window.fetch = async (...args) => {
      const res = await originalFetch(...args)
      if (res.status === 401) {
        clearInterval(timer)
        logout('session_expired')
      }
      return res
    }

    return () => {
      clearInterval(timer)
      window.fetch = originalFetch // คืน fetch ต้นฉบับตอน unmount
    }
  }, [])

  const toggleSidebar = () => {
    const newVal = !sidebarOpen
    setSidebarOpen(newVal)
    if (!isMobile()) {
      localStorage.setItem('loandd_sidebar_open', JSON.stringify(newVal))
    }
  }


  // ========== เมนูทั้งหมด (ก่อนกรอง) ==========
  const allMenuItems = [
    // — ภาพรวม —
    { type: 'section', label: 'ภาพรวม' },
    { path: '/dashboard', icon: 'fas fa-chart-pie', label: 'Dashboard' },
    { path: '/ai-summary', icon: 'fas fa-robot', label: 'AI สรุปข้อมูล' },

    // — ฝ่ายขาย —
    { type: 'section', label: 'ฝ่ายขาย' },
    { path: '/chat', icon: 'fas fa-comments', label: 'แชทลูกค้า' },
    { path: '/sales', icon: 'fas fa-headset', label: 'ฝ่ายขาย' },
    { path: '/agents', icon: 'fas fa-id-badge', label: 'นายหน้า' },

    // — ฝ่ายงาน —
    { type: 'section', label: 'ฝ่ายงาน' },
    { path: '/appraisal', icon: 'fas fa-search-dollar', label: 'ฝ่ายประเมิน' },
    { path: '/approval', icon: 'fas fa-money-check-alt', label: 'ฝ่ายอนุมัติสินเชื่อ' },
    { path: '/legal', icon: 'fas fa-balance-scale', label: 'ฝ่ายนิติกรรม' },
    { path: '/issuing', icon: 'fas fa-file-signature', label: 'ฝ่ายออกสัญญา' },
    { path: '/auction', icon: 'fas fa-gavel', label: 'ฝ่ายประมูลทรัพย์' },

    // — จัดการ —
    { type: 'section', label: 'จัดการ' },
    {
      type: 'dropdown',
      icon: 'fas fa-hand-holding-usd',
      label: 'นายทุน',
      children: [
        { path: '/investors', icon: 'fas fa-users-cog', label: 'จัดการนายทุน' },
        { path: '/investor-auction-history', icon: 'fas fa-history', label: 'History ประมูล' },
        { path: '/withdrawal-history', icon: 'fas fa-money-bill-wave', label: 'History ถอนเงิน' },
      ]
    },
    { path: '/cancellation', icon: 'fas fa-times-circle', label: 'ยกเลิกเคส' },
    { path: '/account-user', icon: 'fas fa-shield-alt', label: 'จัดการแอคเคาท์' },
  ]

  // กรองตามสิทธิ์ department
  const menuItems = filterMenuByDepartment(allMenuItems, department)

  return (
    <div className="admin-layout">
      {/* Sidebar - non-blocking popup on mobile */}
      {/* Overlay backdrop for mobile */}
      {sidebarOpen && (
        <div
          onClick={toggleSidebar}
          style={{
            display: 'block',
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.4)',
            zIndex: 99,
          }}
          className="sidebar-overlay"
        />
      )}

      <aside className={`sidebar ${sidebarOpen ? '' : 'collapsed'}`}>
        <div className="sidebar-header" style={{ padding: '15px 10px' }}>
          {sidebarOpen ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
              <img src={bigLogo} alt="LoanDD" style={{ width: 32, height: 32, borderRadius: '50%', background: '#fff', padding: 2 }} />
              <span style={{ fontWeight: 800, fontSize: 18, color: '#fff', letterSpacing: 1 }}>
                LoanDD
              </span>
            </div>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
              <img src={bigLogo} alt="LD" style={{ width: 32, height: 32, borderRadius: '50%', background: '#fff', padding: 2 }} />
            </div>
          )}
        </div>

        <nav className="sidebar-nav">
          {menuItems.map((item, idx) => {
            if (item.type === 'section') {
              return sidebarOpen ? (
                <div key={idx} className="sidebar-section-label">{item.label}</div>
              ) : <div key={idx} style={{ height: 8 }} />
            }

            if (item.type === 'divider') {
              return sidebarOpen ? (
                <div key={idx} className="sidebar-section-label">{item.label}</div>
              ) : null
            }

            if (item.type === 'dropdown') {
              return (
                <DropdownMenu
                  key={item.label}
                  icon={item.icon}
                  label={item.label}
                  sidebarOpen={sidebarOpen}
                  children={item.children}
                />
              )
            }

            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              >
                <i className={item.icon}></i>
                {sidebarOpen && <span>{item.label}</span>}
              </NavLink>
            )
          })}
        </nav>

        {/* User footer */}
        <div style={{
          padding: sidebarOpen ? '12px 14px' : '10px 8px',
          borderTop: '1px solid rgba(255,255,255,0.07)',
          flexShrink: 0
        }}>
          {sidebarOpen ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {/* Avatar */}
              <div style={{
                width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                background: 'linear-gradient(135deg, #04AA6D, #038a58)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontWeight: 700, fontSize: 14
              }}>
                {(user.full_name || user.username || 'U')[0].toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, color: '#f1f5f9', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user.full_name || user.username || '-'}
                </div>
                <div style={{ fontSize: 11, color: 'rgba(148,163,184,0.7)' }}>{department || '-'}</div>
              </div>
              <button
                onClick={handleLogout}
                title="ออกจากระบบ"
                style={{
                  background: 'none', border: 'none', color: 'rgba(148,163,184,0.6)',
                  cursor: 'pointer', fontSize: 15, padding: 4, borderRadius: 6,
                  transition: 'color 0.18s', flexShrink: 0
                }}
                onMouseEnter={e => e.currentTarget.style.color = '#f87171'}
                onMouseLeave={e => e.currentTarget.style.color = 'rgba(148,163,184,0.6)'}
              >
                <i className="fas fa-sign-out-alt"></i>
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <button
                onClick={handleLogout}
                title="ออกจากระบบ"
                style={{
                  background: 'none', border: 'none', color: 'rgba(148,163,184,0.5)',
                  cursor: 'pointer', fontSize: 16, padding: 8, borderRadius: 8,
                  transition: 'color 0.18s'
                }}
                onMouseEnter={e => e.currentTarget.style.color = '#f87171'}
                onMouseLeave={e => e.currentTarget.style.color = 'rgba(148,163,184,0.5)'}
              >
                <i className="fas fa-sign-out-alt"></i>
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main */}
      <div className={`main-area ${sidebarOpen ? '' : 'expanded'}`}>
        {/* Topbar */}
        <header className="topbar">
          <button
            className="topbar-toggle"
            onClick={toggleSidebar}
            title={sidebarOpen ? 'ย่อเมนู' : 'ขยายเมนู'}
            style={{
              background: '#eff6ff',
              border: '1px solid #dbeafe',
              borderRadius: 8,
              padding: '6px 12px',
              color: '#3b82f6',
              cursor: 'pointer',
              fontSize: 16,
              boxShadow: '0 2px 4px rgba(59,130,246,0.1)',
              display: 'flex', alignItems: 'center', gap: 6,
              transition: 'all 0.2s',
              flexShrink: 0,
            }}
          >
            <i className={`fas fa-${sidebarOpen ? 'times' : 'bars'}`}></i>
          </button>

          <div className="topbar-right" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <NotificationBell />
            <span className="topbar-user">
              <i className="fas fa-user-circle"></i>
              {user.nickname || user.username || '-'}
            </span>
            <button className="topbar-logout" onClick={handleLogout}>
              <i className="fas fa-sign-out-alt"></i> ออก
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}