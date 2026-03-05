import { useState } from 'react'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'

export default function AdminLogin() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const reason = searchParams.get('reason')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      })
      const data = await res.json()

      if (data.success) {
        localStorage.setItem('loandd_admin', data.token)
        localStorage.setItem('loandd_admin_user', JSON.stringify(data.user))
        navigate('/dashboard')
      } else {
        setError(data.message || 'เข้าสู่ระบบไม่สำเร็จ')
      }
    } catch (err) {
      setError('ไม่สามารถเชื่อมต่อ Server ได้')
    }
    setLoading(false)
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="logo">LoanDD Admin</div>
        <h2>เข้าสู่ระบบ</h2>
        <p className="subtitle">ระบบจัดการหลังบ้าน</p>

        {reason === 'session_expired' && (
          <div className="error-msg" style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' }}>
            ⏰ Session หมดอายุ กรุณาเข้าสู่ระบบใหม่
          </div>
        )}
        {error && <div className="error-msg">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>ชื่อผู้ใช้</label>
            <input type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="username" required />
          </div>
          <div className="form-group">
            <label>รหัสผ่าน</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="password" required />
          </div>
          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
          </button>
        </form>

        <div className="auth-link">
          ยังไม่มีบัญชี? <Link to="/register">ลงทะเบียน</Link>
        </div>
      </div>
    </div>
  )
}