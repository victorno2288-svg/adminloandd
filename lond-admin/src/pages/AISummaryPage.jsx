import { useState, useRef, useEffect } from 'react'

const API = '/api/admin/ai-summary'
const token = () => localStorage.getItem('loandd_admin')

// คำถามที่ตั้งล่วงหน้า
const PRESET_QUESTIONS = [
  { icon: 'fas fa-chart-line', label: 'สรุปรายได้เดือนนี้', q: 'สรุปรายได้และวงเงินสินเชื่อเดือนนี้ให้หน่อย เปรียบกับภาพรวมทั้งหมดได้เลย' },
  { icon: 'fas fa-exclamation-triangle', label: 'เคสค้างทุกฝ่าย', q: 'ตอนนี้มีเคสค้างในแต่ละฝ่ายเท่าไหร่บ้าง ฝ่ายไหนมีงานเยอะสุด?' },
  { icon: 'fas fa-check-circle', label: 'เคสเสร็จสิ้น', q: 'มีเคสที่เสร็จสมบูรณ์แล้วกี่เคส คิดเป็นกี่เปอร์เซ็นต์ของทั้งหมด?' },
  { icon: 'fas fa-times-circle', label: 'วิเคราะห์ยกเลิก', q: 'มีเคสที่ถูกยกเลิกเท่าไหร่ คิดว่าอาจมาจากสาเหตุอะไรได้บ้าง?' },
  { icon: 'fas fa-tachometer-alt', label: 'ภาพรวมทั้งหมด', q: 'สรุปภาพรวมทั้งหมดของธุรกิจให้หน่อย ทั้งเคส วงเงิน และ pipeline ในแต่ละฝ่าย' },
  { icon: 'fas fa-comments', label: 'สถานะแชท', q: 'ตอนนี้มีแชทลูกค้าค้างกี่คน ควรให้ความสำคัญกับอะไรบ้าง?' },
]

function MarkdownText({ text }) {
  // simple markdown: **bold**, \n → br, - list
  const lines = text.split('\n')
  return (
    <div style={{ lineHeight: 1.75, fontSize: 14 }}>
      {lines.map((line, i) => {
        // Bold **text**
        const parts = line.split(/\*\*(.*?)\*\*/g)
        const rendered = parts.map((p, j) => j % 2 === 1 ? <strong key={j}>{p}</strong> : p)

        const isBullet = line.trim().startsWith('- ') || line.trim().startsWith('• ')
        if (isBullet) {
          return (
            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
              <span style={{ color: '#04AA6D', flexShrink: 0 }}>•</span>
              <span>{rendered}</span>
            </div>
          )
        }
        if (line.trim() === '') return <div key={i} style={{ height: 8 }} />
        return <div key={i} style={{ marginBottom: 3 }}>{rendered}</div>
      })}
    </div>
  )
}

export default function AISummaryPage() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: 'สวัสดีครับ! ผม AI ผู้ช่วยของ LOANDD 🤖\nสามารถถามเกี่ยวกับข้อมูลระบบได้เลย เช่น รายได้ เคสค้าง pipeline แต่ละฝ่าย หรืออะไรก็ได้ที่อยากรู้ครับ',
      time: new Date()
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [snapshot, setSnapshot] = useState(null)
  const [apiKeyMissing, setApiKeyMissing] = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // โหลด snapshot สถิติ
  useEffect(() => {
    fetch(`${API}/snapshot`, { headers: { Authorization: 'Bearer ' + token() } })
      .then(r => r.json())
      .then(d => { if (d.success) setSnapshot(d.data) })
      .catch(() => {})
  }, [])

  const sendMessage = async (question) => {
    const q = (question || input).trim()
    if (!q || loading) return

    setInput('')
    setMessages(prev => [...prev, { role: 'user', text: q, time: new Date() }])
    setLoading(true)

    try {
      const res = await fetch(`${API}/ask`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + token()
        },
        body: JSON.stringify({ question: q })
      })
      const data = await res.json()

      if (!data.success) {
        const isKey = data.message === 'GEMINI_API_KEY_MISSING'
        if (isKey) setApiKeyMissing(true)
        setMessages(prev => [...prev, {
          role: 'error',
          text: isKey ? 'ยังไม่ได้ตั้ง GEMINI_API_KEY ใน server/.env' : (data.message || 'เกิดข้อผิดพลาด'),
          time: new Date()
        }])
      } else {
        setMessages(prev => [...prev, {
          role: 'assistant',
          text: data.answer,
          time: new Date()
        }])
      }
    } catch (e) {
      setMessages(prev => [...prev, { role: 'error', text: 'ไม่สามารถเชื่อมต่อ server ได้', time: new Date() }])
    }
    setLoading(false)
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const fmtNum = (n) => Number(n || 0).toLocaleString()

  return (
    <div style={{ height: 'calc(100vh - 58px)', display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>

      {/* Header */}
      <div style={{
        padding: '18px 24px 14px',
        background: '#fff',
        borderBottom: '1px solid #e2e8f0',
        display: 'flex', alignItems: 'center', gap: 14
      }}>
        <div style={{
          width: 42, height: 42, borderRadius: 12, flexShrink: 0,
          background: 'linear-gradient(135deg, #0f172a, #1e293b)',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <i className="fas fa-robot" style={{ color: '#4ade80', fontSize: 20 }}></i>
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 17, color: '#0f172a' }}>AI สรุปข้อมูล</div>
          <div style={{ fontSize: 12, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 6 }}>
            ถามเกี่ยวกับรายได้ เคส หรือข้อมูลระบบได้เลย
            <span style={{ background: '#e0f2fe', color: '#0369a1', borderRadius: 6, padding: '1px 8px', fontSize: 11, fontWeight: 600 }}>
              <i className="fab fa-google" style={{ marginRight: 4 }}></i>Gemini
            </span>
          </div>
        </div>

        {/* Mini Stats */}
        {snapshot && (
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {[
              { label: 'เคสทั้งหมด', value: fmtNum(snapshot.summary?.total_cases), color: '#3b82f6' },
              { label: 'เสร็จสิ้น', value: fmtNum(snapshot.summary?.completed_count), color: '#04AA6D' },
              { label: 'วงเงินรวม', value: '฿' + fmtNum(snapshot.summary?.total_loan_amount), color: '#8b5cf6' },
            ].map(s => (
              <div key={s.label} style={{
                background: '#f8fafc', border: '1px solid #e2e8f0',
                borderRadius: 10, padding: '6px 14px', textAlign: 'center'
              }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 500 }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* API Key Warning */}
      {apiKeyMissing && (
        <div style={{
          margin: '12px 24px 0', padding: '12px 16px', borderRadius: 10,
          background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1d4ed8',
          fontSize: 13, display: 'flex', gap: 10, alignItems: 'flex-start'
        }}>
          <i className="fas fa-key" style={{ marginTop: 2, flexShrink: 0 }}></i>
          <div>
            <strong>ต้องตั้ง Gemini API Key ก่อนใช้งาน</strong><br />
            เพิ่ม <code style={{ background: '#dbeafe', padding: '1px 6px', borderRadius: 4 }}>GEMINI_API_KEY=AIza...</code> ใน
            ไฟล์ <code style={{ background: '#dbeafe', padding: '1px 6px', borderRadius: 4 }}>adminloandd/server/.env</code> แล้ว restart server
            &nbsp;—&nbsp; รับ key ฟรีได้ที่ <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" style={{ color: '#1d4ed8' }}>aistudio.google.com/apikey</a>
          </div>
        </div>
      )}

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Preset Sidebar */}
        <div style={{
          width: 200, flexShrink: 0, padding: '16px 12px',
          borderRight: '1px solid #e2e8f0', background: '#fff',
          overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>
            คำถามด่วน
          </div>
          {PRESET_QUESTIONS.map(p => (
            <button
              key={p.q}
              onClick={() => sendMessage(p.q)}
              disabled={loading}
              style={{
                background: 'none', border: '1px solid #e2e8f0', borderRadius: 10,
                padding: '9px 12px', cursor: 'pointer', textAlign: 'left',
                display: 'flex', alignItems: 'center', gap: 8,
                fontSize: 12.5, color: '#334155', fontFamily: 'Prompt, sans-serif',
                transition: 'all 0.15s', fontWeight: 500
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#f0fdf4'; e.currentTarget.style.borderColor = '#04AA6D'; e.currentTarget.style.color = '#038a58' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#334155' }}
            >
              <i className={p.icon} style={{ width: 14, textAlign: 'center', flexShrink: 0, color: '#04AA6D' }}></i>
              {p.label}
            </button>
          ))}
        </div>

        {/* Chat Area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            {messages.map((msg, i) => (
              <div key={i} style={{
                display: 'flex',
                justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                gap: 10, alignItems: 'flex-end'
              }}>
                {/* Avatar (AI) */}
                {msg.role !== 'user' && (
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                    background: msg.role === 'error' ? '#fee2e2' : 'linear-gradient(135deg, #0f172a, #1e293b)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginBottom: 4
                  }}>
                    <i className={msg.role === 'error' ? 'fas fa-exclamation' : 'fas fa-robot'}
                      style={{ color: msg.role === 'error' ? '#dc2626' : '#4ade80', fontSize: 13 }}></i>
                  </div>
                )}

                {/* Bubble */}
                <div style={{
                  maxWidth: '72%',
                  background: msg.role === 'user'
                    ? 'linear-gradient(135deg, #04AA6D, #038a58)'
                    : msg.role === 'error' ? '#fef2f2' : '#fff',
                  color: msg.role === 'user' ? '#fff' : msg.role === 'error' ? '#dc2626' : '#1e293b',
                  borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                  padding: '12px 16px',
                  border: msg.role === 'user' ? 'none' : msg.role === 'error' ? '1px solid #fecaca' : '1px solid #e2e8f0',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.06)'
                }}>
                  {msg.role === 'user'
                    ? <div style={{ fontSize: 14, lineHeight: 1.6 }}>{msg.text}</div>
                    : <MarkdownText text={msg.text} />
                  }
                  <div style={{
                    fontSize: 10, marginTop: 6, textAlign: 'right',
                    color: msg.role === 'user' ? 'rgba(255,255,255,0.65)' : '#94a3b8'
                  }}>
                    {msg.time?.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>

                {/* Avatar (user) */}
                {msg.role === 'user' && (
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                    background: '#e2e8f0',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginBottom: 4
                  }}>
                    <i className="fas fa-user" style={{ color: '#64748b', fontSize: 13 }}></i>
                  </div>
                )}
              </div>
            ))}

            {/* Loading indicator */}
            {loading && (
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                  background: 'linear-gradient(135deg, #0f172a, #1e293b)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <i className="fas fa-robot" style={{ color: '#4ade80', fontSize: 13 }}></i>
                </div>
                <div style={{
                  background: '#fff', border: '1px solid #e2e8f0', borderRadius: '18px 18px 18px 4px',
                  padding: '14px 18px', display: 'flex', gap: 5, alignItems: 'center'
                }}>
                  {[0, 0.2, 0.4].map((delay, i) => (
                    <div key={i} style={{
                      width: 7, height: 7, borderRadius: '50%', background: '#04AA6D',
                      animation: `bounce 1s ${delay}s infinite`
                    }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <div style={{
            padding: '14px 20px', background: '#fff',
            borderTop: '1px solid #e2e8f0',
            display: 'flex', gap: 10, alignItems: 'flex-end'
          }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="ถามเกี่ยวกับรายได้ เคส pipeline... (Enter ส่ง, Shift+Enter ขึ้นบรรทัด)"
              disabled={loading}
              rows={1}
              style={{
                flex: 1, padding: '11px 16px', borderRadius: 14, resize: 'none',
                border: '1.5px solid #e2e8f0', fontFamily: 'Prompt, sans-serif', fontSize: 14,
                outline: 'none', transition: 'border-color 0.18s', lineHeight: 1.5,
                maxHeight: 120, overflowY: 'auto',
                background: loading ? '#f8fafc' : '#fff', color: '#1e293b'
              }}
              onFocus={e => e.target.style.borderColor = '#04AA6D'}
              onBlur={e => e.target.style.borderColor = '#e2e8f0'}
            />
            <button
              onClick={() => sendMessage()}
              disabled={loading || !input.trim()}
              style={{
                width: 44, height: 44, borderRadius: 12, border: 'none', cursor: 'pointer',
                background: loading || !input.trim() ? '#e2e8f0' : 'linear-gradient(135deg, #04AA6D, #038a58)',
                color: loading || !input.trim() ? '#94a3b8' : '#fff',
                fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.18s', flexShrink: 0
              }}
            >
              <i className="fas fa-paper-plane"></i>
            </button>
          </div>
        </div>
      </div>

      {/* Bounce animation */}
      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0.7); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
