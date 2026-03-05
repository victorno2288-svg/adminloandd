// ============================================
// NotificationBell.jsx — กระดิ่งแจ้งเตือนภายใน (ฝ่ายต่อฝ่าย)
// วางใน AdminLayout.jsx topbar — UI v2 สวยงาม
// ============================================
import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { io } from 'socket.io-client'
import { getCurrentUser } from '../utils/auth'
import { hasAccess } from '../utils/permissions'

const API = '/api/admin/notifications'

function token() {
  return localStorage.getItem('loandd_admin') || ''
}

// ============================================
// Helper: format เวลา เช่น "3 นาทีที่แล้ว"
// ============================================
function timeAgo(dateStr) {
  if (!dateStr) return ''
  const now = new Date()
  const d = new Date(dateStr)
  const diff = Math.floor((now - d) / 1000)
  if (diff < 60) return 'เมื่อสักครู่'
  if (diff < 3600) return Math.floor(diff / 60) + ' นาทีที่แล้ว'
  if (diff < 86400) return Math.floor(diff / 3600) + ' ชม.ที่แล้ว'
  if (diff < 604800) return Math.floor(diff / 86400) + ' วันที่แล้ว'
  return new Date(dateStr).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })
}

// ============================================
// Status → Icon + Color config
// ============================================
function getStatusConfig(status) {
  if (!status) return { icon: 'fa-circle-info', color: '#6366f1', bg: '#eef2ff', label: 'อัพเดท' }
  // ขั้นตอน: สร้างลูกหนี้ใหม่
  if (status === 'new_from_chat') return { icon: 'fa-comment-dots', color: '#0ea5e9', bg: '#f0f9ff', label: 'ลูกหนี้ใหม่ (แชท)' }
  if (status === 'new_from_admin') return { icon: 'fa-user-plus', color: '#0ea5e9', bg: '#f0f9ff', label: 'ลูกหนี้ใหม่' }
  // ขั้นตอน: สร้างเคส
  if (status === 'reviewing') return { icon: 'fa-folder-plus', color: '#2563eb', bg: '#eff6ff', label: 'เคสใหม่' }
  // ขั้นตอน: ค่าประเมิน
  if (status === 'awaiting_appraisal_fee') return { icon: 'fa-money-bill-wave', color: '#d97706', bg: '#fffbeb', label: 'รอชำระค่าประเมิน' }
  // ขั้นตอน: ประเมินทรัพย์
  if (status === 'appraisal_scheduled') return { icon: 'fa-calendar-day', color: '#7c3aed', bg: '#f5f3ff', label: 'นัดประเมิน' }
  if (status.includes('appraisal_passed')) return { icon: 'fa-house-circle-check', color: '#059669', bg: '#ecfdf5', label: 'ประเมินผ่าน' }
  if (status.includes('not_passed')) return { icon: 'fa-house-circle-xmark', color: '#dc2626', bg: '#fef2f2', label: 'ไม่ผ่าน' }
  // ขั้นตอน: อนุมัติวงเงิน
  if (status === 'credit_approved') return { icon: 'fa-circle-check', color: '#059669', bg: '#ecfdf5', label: 'อนุมัติวงเงิน' }
  if (status === 'credit_rejected') return { icon: 'fa-ban', color: '#dc2626', bg: '#fef2f2', label: 'ไม่อนุมัติ' }
  // ขั้นตอน: เอกสารไม่ครบ
  if (status === 'incomplete') return { icon: 'fa-file-circle-exclamation', color: '#ea580c', bg: '#fff7ed', label: 'เอกสารไม่ครบ' }
  // ขั้นตอน: ประมูล
  if (status === 'auction_completed') return { icon: 'fa-gavel', color: '#059669', bg: '#ecfdf5', label: 'ประมูลสำเร็จ' }
  if (status === 'auction_failed') return { icon: 'fa-gavel', color: '#dc2626', bg: '#fef2f2', label: 'ประมูลไม่สำเร็จ' }
  if (status.includes('auction')) return { icon: 'fa-gavel', color: '#0891b2', bg: '#ecfeff', label: 'ประมูล' }
  // ขั้นตอน: ยกเลิก / เสร็จ
  if (status.includes('cancelled')) return { icon: 'fa-circle-xmark', color: '#dc2626', bg: '#fef2f2', label: 'ยกเลิก' }
  if (status.includes('completed')) return { icon: 'fa-flag-checkered', color: '#059669', bg: '#ecfdf5', label: 'เสร็จ' }
  // ขั้นตอน: รอดำเนินการ
  if (status.includes('pending')) return { icon: 'fa-clock', color: '#d97706', bg: '#fffbeb', label: 'รอดำเนินการ' }
  if (status.includes('scheduled')) return { icon: 'fa-calendar-check', color: '#7c3aed', bg: '#f5f3ff', label: 'นัดแล้ว' }
  // ขั้นตอน: เตรียมเอกสาร / ออกสัญญา
  if (status.includes('preparing') || status.includes('issuing')) return { icon: 'fa-file-signature', color: '#2563eb', bg: '#eff6ff', label: 'เตรียมเอกสาร' }
  // ขั้นตอน: นิติกรรม
  if (status.includes('legal')) return { icon: 'fa-scale-balanced', color: '#7c3aed', bg: '#f5f3ff', label: 'นิติกรรม' }
  return { icon: 'fa-bell', color: '#6366f1', bg: '#eef2ff', label: status.replace(/_/g, ' ') }
}

// ============================================
// Main Component
// ============================================
export default function NotificationBell() {
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [bellBounce, setBellBounce] = useState(false)
  const socketRef = useRef(null)
  const dropdownRef = useRef(null)
  const navigate = useNavigate()

  const user = getCurrentUser()

  // ============================================
  // Fetch unread count
  // ============================================
  const fetchUnreadCount = useCallback(function () {
    var t = token()
    if (!t) return
    fetch(API + '/unread-count', {
      headers: { Authorization: 'Bearer ' + t }
    })
      .then(function (r) { return r.json() })
      .then(function (data) {
        if (data.unread_count !== undefined) setUnreadCount(data.unread_count)
      })
      .catch(function () { })
  }, [])

  // ============================================
  // Fetch notifications list
  // ============================================
  const fetchNotifications = useCallback(function () {
    var t = token()
    if (!t) return
    setLoading(true)
    fetch(API + '?limit=20', {
      headers: { Authorization: 'Bearer ' + t }
    })
      .then(function (r) { return r.json() })
      .then(function (data) {
        if (data.notifications) setNotifications(data.notifications)
        setLoading(false)
      })
      .catch(function () { setLoading(false) })
  }, [])

  // ============================================
  // Socket.io: ฟัง new_notification event
  // ============================================
  useEffect(function () {
    var t = token()
    if (!t) return

    fetchUnreadCount()

    var socket = io(window.location.protocol + '//' + window.location.hostname + ':3000', {
      auth: { token: t },
      reconnectionAttempts: 5,
      reconnectionDelay: 3000
    })
    socketRef.current = socket

    socket.on('new_notification', function (data) {
      // ทุกฝ่ายเห็นทุกแจ้งเตือน
      {
        setUnreadCount(function (prev) { return prev + 1 })
        setNotifications(function (prev) { return [data].concat(prev).slice(0, 20) })

        // Bounce animation
        setBellBounce(true)
        setTimeout(function () { setBellBounce(false) }, 1000)

        // Browser Notification
        if ('Notification' in window && Notification.permission === 'granted') {
          try {
            new Notification('LOAN DD — ' + (data.title || 'แจ้งเตือนใหม่'), {
              body: data.message || '',
              icon: '/big-logo.png'
            })
          } catch (e) { }
        }
      }
    })

    return function () {
      if (socket) socket.disconnect()
    }
  }, [])

  // ============================================
  // Click outside → close dropdown
  // ============================================
  useEffect(function () {
    function handleClick(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return function () { document.removeEventListener('mousedown', handleClick) }
  }, [])

  // ============================================
  // Toggle dropdown
  // ============================================
  function handleToggle() {
    if (!open) {
      fetchNotifications()
      fetchUnreadCount()
    }
    setOpen(!open)
  }

  // ============================================
  // Mark as read + navigate (เฉพาะหน้าที่มีสิทธิ์)
  // ============================================
  function handleClickNotif(notif) {
    var t = token()
    if (!notif.is_read) {
      fetch(API + '/' + notif.id + '/read', {
        method: 'PUT',
        headers: { Authorization: 'Bearer ' + t }
      }).then(function () {
        setUnreadCount(function (prev) { return Math.max(0, prev - 1) })
        setNotifications(function (prev) {
          return prev.map(function (n) {
            return n.id === notif.id ? Object.assign({}, n, { is_read: 1 }) : n
          })
        })
      }).catch(function () { })
    }
    // navigate เฉพาะหน้าที่ฝ่ายตัวเองมีสิทธิ์เข้าถึง
    if (notif.link_url) {
      var dept = user && user.department
      var basePath = '/' + notif.link_url.split('/').filter(Boolean)[0]
      if (!dept || dept === 'super_admin' || hasAccess(dept, basePath) || hasAccess(dept, notif.link_url)) {
        navigate(notif.link_url)
      }
      // ถ้าไม่มีสิทธิ์ → แค่ mark as read ไม่ navigate (แจ้งเตือนเพื่อรับทราบเฉยๆ)
    }
    setOpen(false)
  }

  // ============================================
  // Mark all as read
  // ============================================
  function handleMarkAllRead() {
    var t = token()
    fetch(API + '/read-all', {
      method: 'PUT',
      headers: { Authorization: 'Bearer ' + t }
    }).then(function () {
      setUnreadCount(0)
      setNotifications(function (prev) {
        return prev.map(function (n) { return Object.assign({}, n, { is_read: 1 }) })
      })
    }).catch(function () { })
  }

  // ============================================
  // Request browser notification permission
  // ============================================
  useEffect(function () {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  // ============================================
  // Render
  // ============================================
  return (
    <div ref={dropdownRef} style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      {/* ===== Bell Button ===== */}
      <button
        onClick={handleToggle}
        title="แจ้งเตือน"
        className={bellBounce ? 'notif-bell-bounce' : ''}
        style={{
          background: open
            ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
            : unreadCount > 0
              ? 'linear-gradient(135deg, #f59e0b, #f97316)'
              : '#f1f5f9',
          border: 'none',
          borderRadius: 12,
          width: 42,
          height: 42,
          cursor: 'pointer',
          position: 'relative',
          fontSize: 18,
          color: (open || unreadCount > 0) ? '#fff' : '#64748b',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: open
            ? '0 4px 15px rgba(99,102,241,0.4)'
            : unreadCount > 0
              ? '0 4px 15px rgba(245,158,11,0.4)'
              : '0 1px 3px rgba(0,0,0,0.08)',
        }}
        onMouseEnter={function (e) {
          if (!open && unreadCount === 0) {
            e.currentTarget.style.background = 'linear-gradient(135deg, #e0e7ff, #c7d2fe)'
            e.currentTarget.style.color = '#6366f1'
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(99,102,241,0.2)'
          }
        }}
        onMouseLeave={function (e) {
          if (!open && unreadCount === 0) {
            e.currentTarget.style.background = '#f1f5f9'
            e.currentTarget.style.color = '#64748b'
            e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.08)'
          }
        }}
      >
        <i className="fa-solid fa-bell" style={{ fontSize: 19 }}></i>

        {/* Badge */}
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute',
            top: -4,
            right: -4,
            background: open ? '#f59e0b' : '#ef4444',
            color: '#fff',
            borderRadius: 20,
            minWidth: 22,
            height: 22,
            fontSize: 11,
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 5px',
            border: '2.5px solid #fff',
            lineHeight: 1,
            boxShadow: '0 2px 8px rgba(239,68,68,0.5)',
            animation: 'notifBadgePop 0.3s cubic-bezier(0.68, -0.55, 0.27, 1.55)',
          }}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* ===== Dropdown Panel ===== */}
      {open && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 10px)',
          right: -20,
          width: 400,
          maxHeight: 520,
          background: '#fff',
          borderRadius: 16,
          boxShadow: '0 20px 60px rgba(0,0,0,0.15), 0 8px 20px rgba(0,0,0,0.08)',
          border: '1px solid #e2e8f0',
          zIndex: 9999,
          overflow: 'hidden',
          animation: 'notifDropIn 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        }}>
          {/* Header */}
          <div style={{
            padding: '16px 20px',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: 'rgba(255,255,255,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                backdropFilter: 'blur(10px)',
              }}>
                <i className="fa-solid fa-bell" style={{ color: '#fff', fontSize: 16 }}></i>
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: '#fff', letterSpacing: 0.3 }}>
                  การแจ้งเตือน
                </div>
                {unreadCount > 0 && (
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 1 }}>
                    {unreadCount} รายการที่ยังไม่ได้อ่าน
                  </div>
                )}
              </div>
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  border: '1px solid rgba(255,255,255,0.3)',
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 600,
                  padding: '6px 12px',
                  borderRadius: 8,
                  transition: 'all 0.2s',
                  backdropFilter: 'blur(10px)',
                }}
                onMouseEnter={function (e) { e.currentTarget.style.background = 'rgba(255,255,255,0.35)' }}
                onMouseLeave={function (e) { e.currentTarget.style.background = 'rgba(255,255,255,0.2)' }}
              >
                <i className="fa-solid fa-check-double" style={{ marginRight: 4 }}></i>
                อ่านทั้งหมด
              </button>
            )}
          </div>

          {/* List */}
          <div style={{ maxHeight: 420, overflowY: 'auto' }}>
            {loading && (
              <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
                <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: 24, marginBottom: 8, display: 'block', color: '#6366f1' }}></i>
                <span style={{ fontSize: 13 }}>กำลังโหลด...</span>
              </div>
            )}

            {!loading && notifications.length === 0 && (
              <div style={{ padding: '50px 20px', textAlign: 'center' }}>
                <div style={{
                  width: 64, height: 64, borderRadius: 20,
                  background: 'linear-gradient(135deg, #f1f5f9, #e2e8f0)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 14px',
                }}>
                  <i className="fa-solid fa-bell-slash" style={{ fontSize: 26, color: '#94a3b8' }}></i>
                </div>
                <div style={{ color: '#64748b', fontSize: 14, fontWeight: 500 }}>ไม่มีแจ้งเตือน</div>
                <div style={{ color: '#94a3b8', fontSize: 12, marginTop: 4 }}>เมื่อมีการเปลี่ยนสถานะจะแสดงที่นี่</div>
              </div>
            )}

            {!loading && notifications.map(function (n, idx) {
              var cfg = getStatusConfig(n.status_to)
              return (
                <div
                  key={n.id || idx}
                  onClick={function () { handleClickNotif(n) }}
                  style={{
                    padding: '14px 18px',
                    borderBottom: '1px solid #f1f5f9',
                    cursor: 'pointer',
                    background: n.is_read ? '#fff' : '#fafbff',
                    transition: 'all 0.15s ease',
                    display: 'flex',
                    gap: 14,
                    alignItems: 'flex-start',
                    borderLeft: n.is_read ? '3px solid transparent' : ('3px solid ' + cfg.color),
                  }}
                  onMouseEnter={function (e) {
                    e.currentTarget.style.background = '#f8fafc'
                    e.currentTarget.style.transform = 'translateX(2px)'
                  }}
                  onMouseLeave={function (e) {
                    e.currentTarget.style.background = n.is_read ? '#fff' : '#fafbff'
                    e.currentTarget.style.transform = 'translateX(0)'
                  }}
                >
                  {/* Icon circle */}
                  <div style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    background: cfg.bg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    border: '1px solid ' + cfg.color + '20',
                  }}>
                    <i className={'fa-solid ' + cfg.icon} style={{
                      color: cfg.color,
                      fontSize: 16,
                    }}></i>
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: 8,
                      marginBottom: 3,
                    }}>
                      <span style={{
                        fontWeight: n.is_read ? 500 : 700,
                        fontSize: 13.5,
                        color: n.is_read ? '#475569' : '#1e293b',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        flex: 1,
                      }}>
                        {n.title || 'แจ้งเตือน'}
                      </span>
                      {n.debtor_name && (
                        <span style={{
                          fontSize: 11,
                          color: '#6366f1',
                          fontWeight: 600,
                          flexShrink: 0,
                          maxWidth: 120,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}>
                          {n.debtor_name}
                        </span>
                      )}
                      {!n.is_read && (
                        <div style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          background: cfg.color,
                          flexShrink: 0,
                          marginTop: 5,
                          boxShadow: '0 0 0 3px ' + cfg.color + '20',
                        }} />
                      )}
                    </div>
                    <div style={{
                      fontSize: 12.5,
                      color: '#64748b',
                      lineHeight: 1.5,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {n.message || ''}
                    </div>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      marginTop: 6,
                    }}>
                      <span style={{
                        fontSize: 10.5,
                        padding: '2px 8px',
                        borderRadius: 6,
                        background: cfg.bg,
                        color: cfg.color,
                        fontWeight: 700,
                        letterSpacing: 0.2,
                        border: '1px solid ' + cfg.color + '20',
                      }}>
                        {cfg.label}
                      </span>
                      <span style={{
                        fontSize: 11,
                        color: '#94a3b8',
                      }}>
                        <i className="fa-regular fa-clock" style={{ marginRight: 3, fontSize: 10 }}></i>
                        {timeAgo(n.created_at)}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div style={{
              padding: '10px 18px',
              borderTop: '1px solid #f1f5f9',
              background: '#fafbfc',
              textAlign: 'center',
            }}>
              <span style={{ fontSize: 12, color: '#94a3b8' }}>
                แสดง {notifications.length} รายการล่าสุด
              </span>
            </div>
          )}
        </div>
      )}

      {/* ===== Animations ===== */}
      <style>{`
        @keyframes notifDropIn {
          from { opacity: 0; transform: translateY(-10px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes notifBadgePop {
          0% { transform: scale(0.5); }
          70% { transform: scale(1.2); }
          100% { transform: scale(1); }
        }
        @keyframes notifBellBounce {
          0%, 100% { transform: rotate(0deg); }
          15% { transform: rotate(14deg); }
          30% { transform: rotate(-12deg); }
          45% { transform: rotate(10deg); }
          60% { transform: rotate(-8deg); }
          75% { transform: rotate(4deg); }
        }
        .notif-bell-bounce {
          animation: notifBellBounce 0.8s ease !important;
        }
      `}</style>
    </div>
  )
}
