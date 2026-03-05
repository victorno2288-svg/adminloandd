
// ============ ProtectedRoute.jsx ============
// ครอบ Route เพื่อเช็คสิทธิ์ก่อนเข้าหน้า ตาม department ใน JWT
// วางไว้ที่: src/components/ProtectedRoute.jsx

import { Navigate, useLocation } from 'react-router-dom'
import { getCurrentUser } from '../utils/auth'
import { hasAccess, getDefaultPage } from '../utils/permissions'

export default function ProtectedRoute({ children }) {
  const location = useLocation()
  const user = getCurrentUser()

  // ถ้าไม่ได้ล็อกอิน → ไปหน้า login
  if (!user) {
    return <Navigate to="/login" replace />
  }

  const department = user.department
  const currentPath = location.pathname

  // ดึงเฉพาะ path หลัก เช่น /sales/edit/5 → /sales, /accounting/debtor/create → /accounting
  const basePath = '/' + currentPath.split('/').filter(Boolean)[0]

  // เช็คสิทธิ์ — เช็คทั้ง full path และ base path
  if (!hasAccess(department, currentPath) && !hasAccess(department, basePath)) {
    const defaultPage = getDefaultPage(department)
    return <Navigate to={defaultPage} replace />
  }

  return children
}