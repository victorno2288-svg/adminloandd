import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'

export default function AdminRegister() {
  const [form, setForm] = useState({
    username: '', password: '', full_name: '', nickname: '',
    email: '', phone: '', department: '', position: ''
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      const res = await fetch('/api/admin/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      const data = await res.json()

      if (data.success) {
        setSuccess('ลงทะเบียนสำเร็จ! กำลังไปหน้า Login...')
        setTimeout(() => navigate('/login'), 2000)
      } else {
        setError(data.message || 'ลงทะเบียนไม่สำเร็จ')
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
        <h2>ลงทะเบียน</h2>
        <p className="subtitle">สร้างบัญชีผู้ดูแลระบบ</p>

        {error && <div className="error-msg">{error}</div>}
        {success && <div className="success-msg">{success}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>ชื่อผู้ใช้ *</label>
            <input type="text" name="username" value={form.username} onChange={handleChange} placeholder="username" required />
          </div>
          <div className="form-group">
            <label>รหัสผ่าน *</label>
            <input type="password" name="password" value={form.password} onChange={handleChange} placeholder="อย่างน้อย 6 ตัวอักษร" required />
          </div>
          <div className="form-group">
            <label>ชื่อ-นามสกุล</label>
            <input type="text" name="full_name" value={form.full_name} onChange={handleChange} placeholder="ชื่อจริง นามสกุล" />
          </div>
          <div className="form-group">
            <label>ชื่อเล่น</label>
            <input type="text" name="nickname" value={form.nickname} onChange={handleChange} placeholder="ชื่อเล่น" />
          </div>
          <div className="form-group">
            <label>แผนก</label>
            <select name="department" value={form.department} onChange={handleChange}>
              <option value="">-- Super Admin --</option>
              <option value="sales">ฝ่ายขาย</option>
              <option value="accounting">ฝ่ายบัญชี</option>
              <option value="legal">ฝ่ายนิติกรรม</option>
              <option value="appraisal">ฝ่ายประเมิน</option>
            </select>
          </div>
          <div className="form-group">
            <label>ตำแหน่ง</label>
            <input type="text" name="position" value={form.position} onChange={handleChange} placeholder="ตำแหน่ง" />
          </div>
          <div className="form-group">
            <label>อีเมล</label>
            <input type="email" name="email" value={form.email} onChange={handleChange} placeholder="email@example.com" />
          </div>
          <div className="form-group">
            <label>เบอร์โทร</label>
            <input type="text" name="phone" value={form.phone} onChange={handleChange} placeholder="0xx-xxx-xxxx" />
          </div>
          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? 'กำลังลงทะเบียน...' : 'ลงทะเบียน'}
          </button>
        </form>

        <div className="auth-link">
          มีบัญชีแล้ว? <Link to="/login">เข้าสู่ระบบ</Link>
        </div>
      </div>
    </div>
  )
}