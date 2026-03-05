// ============================================
// ChatNotification.jsx — Global Toast + Browser Notification
// วางใน App.jsx → ทำงานทุกหน้า ไม่ต้องเปิด ChatPage
// ============================================
import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { io } from 'socket.io-client'

function token() {
  return localStorage.getItem('loandd_admin') || ''
}

// ============================================
// Toast Item — การ์ดแจ้งเตือนแต่ละอัน
// ============================================
function ToastItem({ toast, onClose, onGoChat }) {
  const [exiting, setExiting] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setExiting(true)
      setTimeout(() => onClose(toast.id), 400)
    }, 6000)
    return () => clearTimeout(timer)
  }, [toast.id, onClose])

  function handleClose() {
    setExiting(true)
    setTimeout(() => onClose(toast.id), 400)
  }

  return (
    <div
      onClick={() => onGoChat(toast.convId)}
      style={{
        background: '#fff',
        borderRadius: 12,
        padding: '12px 16px',
        marginBottom: 8,
        boxShadow: '0 8px 30px rgba(0,0,0,0.15), 0 2px 8px rgba(0,0,0,0.1)',
        border: '1px solid #e5e7eb',
        borderLeft: '4px solid #8b5cf6',
        cursor: 'pointer',
        maxWidth: 340,
        minWidth: 280,
        animation: exiting ? 'toastOut 0.4s ease forwards' : 'toastIn 0.4s ease forwards',
        position: 'relative',
        transition: 'transform 0.15s ease',
      }}
      onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
      onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
    >
      {/* ปุ่มปิด */}
      <button
        onClick={e => { e.stopPropagation(); handleClose() }}
        style={{
          position: 'absolute', top: 6, right: 8,
          background: 'none', border: 'none', cursor: 'pointer',
          fontSize: 16, color: '#999', lineHeight: 1
        }}
      >×</button>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        {/* Avatar */}
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          background: toast.platform === 'facebook' ? '#1877f2' : toast.platform === 'line' ? '#06C755' : '#8b5cf6',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontSize: 13, fontWeight: 700, flexShrink: 0
        }}>
          {toast.platform === 'facebook' ? (
            <i className="fab fa-facebook-f"></i>
          ) : toast.platform === 'line' ? (
            <i className="fab fa-line"></i>
          ) : (
            (toast.customerName || '?')[0].toUpperCase()
          )}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: '#1f2937', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {toast.customerName || 'ลูกค้า'}
          </div>
          <div style={{ fontSize: 11, color: '#6b7280' }}>
            {toast.platform ? (toast.platform === 'facebook' ? 'Facebook' : 'LINE') : 'แชท'}
            {' • '}
            {new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>

      {/* Message preview */}
      <div style={{
        fontSize: 13, color: '#374151', lineHeight: 1.4,
        overflow: 'hidden', textOverflow: 'ellipsis',
        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
        marginTop: 4
      }}>
        {toast.message || 'ข้อความใหม่'}
      </div>

      {/* คลิกเพื่อดูแชท */}
      <div style={{ fontSize: 11, color: '#8b5cf6', marginTop: 6, fontWeight: 500 }}>
        คลิกเพื่อดูแชท →
      </div>
    </div>
  )
}

// ============================================
// Main: ChatNotification Component
// ============================================
export default function ChatNotification() {
  const [toasts, setToasts] = useState([])
  const socketRef = useRef(null)
  const toastIdRef = useRef(0)
  const navigateRef = useRef(null)
  const navigate = useNavigate()

  // เก็บ navigate ใน ref เพื่อไม่ให้ useEffect re-run
  useEffect(() => {
    navigateRef.current = navigate
  }, [navigate])

  // เล่นเสียง beep
  function playSound() {
    try {
      var ctx = new (window.AudioContext || window.webkitAudioContext)()
      var playBeep = function(time, freq) {
        var osc = ctx.createOscillator()
        var gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.frequency.value = freq
        osc.type = 'sine'
        gain.gain.setValueAtTime(0.3, time)
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.2)
        osc.start(time)
        osc.stop(time + 0.2)
      }
      playBeep(ctx.currentTime, 880)
      playBeep(ctx.currentTime + 0.25, 1100)
    } catch (e) {}
  }

  // เพิ่ม toast (ใช้ function ธรรมดา ไม่ใช้ useCallback)
  function addToast(data) {
    toastIdRef.current += 1
    var id = toastIdRef.current

    setToasts(function(prev) {
      var updated = prev.concat([{
        id: id,
        customerName: data.customerName || data.customer_name || 'ลูกค้า',
        message: data.message || data.last_message || 'ข้อความใหม่',
        platform: data.platform || '',
        convId: data.convId || data.conversation_id || null
      }])
      return updated.slice(-5)
    })

    playSound()

    // Browser Notification (ถ้า tab ไม่ได้ focus)
    if (document.hidden && 'Notification' in window && Notification.permission === 'granted') {
      try {
        var notif = new Notification(data.customerName || data.customer_name || 'แชทใหม่', {
          body: data.message || data.last_message || 'มีข้อความใหม่เข้ามา',
          icon: '/favicon.ico',
          requireInteraction: false
        })
        notif.onclick = function() {
          window.focus()
          if (navigateRef.current) navigateRef.current('/chat')
          notif.close()
        }
        setTimeout(function() { notif.close() }, 8000)
      } catch (e) {}
    }
  }

  // ลบ toast
  var removeToast = useCallback(function(id) {
    setToasts(function(prev) { return prev.filter(function(t) { return t.id !== id }) })
  }, [])

  // กดไปหน้าแชท
  var goToChat = useCallback(function(convId) {
    if (navigateRef.current) navigateRef.current('/chat')
  }, [])

  // ขอ Notification Permission
  useEffect(function() {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  // Socket.io Global Connection — [] dependency เท่านั้น ไม่ให้ re-run
  useEffect(function() {
    var t = token()
    if (!t) return

    // ถ้ามี socket อยู่แล้ว ไม่สร้างใหม่
    if (socketRef.current) return

    var socket = io('http://localhost:3000', {
      auth: { token: t },
      reconnectionAttempts: 5,
      reconnectionDelay: 3000
    })
    socketRef.current = socket

    socket.on('connect', function() {
      console.log('🔔 Global notification socket connected:', socket.id)
    })

    // === ข้อความใหม่ใน conversation ที่กำลังเปิดดู ===
    socket.on('new_message', function(data) {
      if (data && data.message && data.message.sender_type === 'customer') {
        addToast({
          customerName: data.message.sender_name || 'ลูกค้า',
          message: data.message.message_text || 'ส่งข้อความใหม่',
          platform: data.platform || '',
          convId: data.conversation_id || null
        })
      }
    })

    // === Conversation อัพเดท — server ส่ง customer_name + platform มาแล้ว ===
    socket.on('conversation_updated', function(data) {
      // เด้งเฉพาะข้อความจากลูกค้า (ไม่เด้งตอน admin ตอบ)
      if (data && data.sender_type !== 'admin') {
        addToast({
          customerName: data.customer_name || 'ลูกค้า',
          message: data.last_message || 'มีข้อความใหม่เข้ามา',
          platform: data.platform || '',
          convId: data.conversation_id || null
        })
      }
    })

    // === ได้รับ assign เคสใหม่ ===
    socket.on('assigned_to_you', function(data) {
      addToast({
        customerName: '📩 มอบหมายเคสใหม่',
        message: (data && data.customer_name) ? ('ลูกค้า: ' + data.customer_name) : 'คุณได้รับเคสใหม่',
        platform: (data && data.platform) || '',
        convId: (data && data.conversation_id) || null
      })
    })

    socket.on('connect_error', function(err) {
      console.log('🔔 Notification socket error:', err.message)
    })

    return function() {
      if (socketRef.current) {
        socketRef.current.disconnect()
        socketRef.current = null
      }
    }
  }, []) // ← [] เท่านั้น! ไม่ใส่ addToast

  // ไม่มี toast → ไม่ render อะไร
  if (toasts.length === 0) return null

  return (
    <>
      {/* CSS Animation */}
      <style>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translateX(100px) scale(0.8); }
          to { opacity: 1; transform: translateX(0) scale(1); }
        }
        @keyframes toastOut {
          from { opacity: 1; transform: translateX(0) scale(1); }
          to { opacity: 0; transform: translateX(100px) scale(0.8); }
        }
      `}</style>

      {/* Toast Container — มุมขวาบน */}
      <div style={{
        position: 'fixed',
        top: 16,
        right: 16,
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        pointerEvents: 'auto'
      }}>
        {toasts.map(function(t) {
          return (
            <ToastItem
              key={t.id}
              toast={t}
              onClose={removeToast}
              onGoChat={goToChat}
            />
          )
        })}
      </div>
    </>
  )
}
