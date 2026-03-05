// ============ auth.js ============
// ใช้ decode JWT token เพื่อดึงข้อมูล user ปัจจุบัน (department, id, username)
// วางไว้ที่: src/utils/auth.js

export function getCurrentUser() {
  try {
    const token = localStorage.getItem('loandd_admin')
    if (!token) return null
    // decode JWT payload (ส่วนที่ 2 ของ token)
    const payload = token.split('.')[1]
    if (!payload) return null
    const decoded = JSON.parse(atob(payload))
    return decoded // { id, username, department, exp, ... }
  } catch {
    return null
  }
}

// ตรวจว่า token หมดอายุแล้วหรือยัง
export function isTokenExpired() {
  try {
    const user = getCurrentUser()
    if (!user || !user.exp) return true
    // exp คือ Unix timestamp (วินาที) → เทียบกับเวลาปัจจุบัน
    return Date.now() / 1000 > user.exp
  } catch {
    return true
  }
}

// logout: ล้าง localStorage แล้ว redirect ไป login
export function logout(reason) {
  localStorage.removeItem('loandd_admin')
  localStorage.removeItem('loandd_admin_user')
  const msg = reason ? `?reason=${encodeURIComponent(reason)}` : ''
  window.location.href = '/login' + msg
}

export function getUserDepartment() {
  const user = getCurrentUser()
  return user?.department || null
}

export function isSuperAdmin() {
  return getUserDepartment() === 'super_admin'
}

export function isAdmin() {
  const dept = getUserDepartment()
  return dept === 'super_admin' || dept === 'admin'
}