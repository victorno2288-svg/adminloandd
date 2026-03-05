// ============ roleMiddleware.js ============
// Middleware เช็คสิทธิ์ตาม department ที่ฝั่ง API (backend)
// วางไว้ที่: server/middleware/roleMiddleware.js
//
// ใช้ร่วมกับ authMiddleware ที่ set req.user จาก JWT
// req.user = { id, username, department, ... }

// ========== สิทธิ์ตาม department → API sections ==========
// โครงสร้าง 6 ฝ่าย:
// sales | appraisal | approval (รวม auction+นายทุน) | legal | issuing | accounting
const DEPT_API_ACCESS = {
  super_admin: '*',
  admin: ['sales', 'accounting', 'appraisal', 'approval', 'legal', 'issuing', 'auction', 'investors', 'investor-history', 'cancellation'],
  sales: ['sales', 'cancellation'],
  accounting: ['accounting'],
  appraisal: ['appraisal'],
  approval: ['approval', 'investors', 'investor-history', 'auction', 'cancellation'], // รวมประมูล+นายทุน + ยกเลิกเคส
  legal: ['legal', 'cancellation'], // ฝ่ายนิติกรรม (แยกออกสัญญาแล้ว)
  issuing: ['issuing', 'cancellation'], // ฝ่ายออกสัญญา (แยกจากนิติแล้ว)
}

/**
 * Middleware: เช็คว่า department ของ user เข้าถึง section นี้ได้ไหม
 * ใช้แบบ: router.use(requireDept('sales', 'sales-management'))
 *
 * @param  {...string} sections - ชื่อ section ที่อนุญาต
 */
function requireDept(...sections) {
  return (req, res, next) => {
    const department = req.user?.department

    if (!department) {
      return res.status(403).json({ success: false, message: 'ไม่พบข้อมูลสิทธิ์ของผู้ใช้' })
    }

    // super_admin เข้าถึงทุกอย่าง
    const allowed = DEPT_API_ACCESS[department]
    if (!allowed) {
      return res.status(403).json({ success: false, message: 'คุณไม่มีสิทธิ์เข้าถึงข้อมูลนี้' })
    }
    if (allowed === '*') return next()

    // เช็คว่า department มีสิทธิ์เข้า section ใด section หนึ่งที่ระบุไหม
    const hasAccess = sections.some(s => allowed.includes(s))
    if (hasAccess) return next()

    return res.status(403).json({ success: false, message: 'คุณไม่มีสิทธิ์เข้าถึงข้อมูลนี้' })
  }
}

/**
 * Middleware: อนุญาตเฉพาะ super_admin เท่านั้น
 * ใช้แบบ: router.use(superAdminOnly)
 */
function superAdminOnly(req, res, next) {
  if (req.user?.department === 'super_admin') return next()
  return res.status(403).json({ success: false, message: 'เฉพาะ Super Admin เท่านั้น' })
}

module.exports = { requireDept, superAdminOnly, DEPT_API_ACCESS }