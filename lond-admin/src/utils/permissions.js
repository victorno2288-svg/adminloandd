// ============ permissions.js ============
// กำหนดสิทธิ์การเข้าถึงหน้าต่างๆ ตาม department

const PERMISSIONS = {
  // Super Admin — เห็นทุกอย่าง
  super_admin: '*',

  // Admin — เหมือน super_admin แต่ไม่เห็น account-user
  admin: [
    '/dashboard', '/ai-summary',
    '/chat',
    '/sales', '/agents',
    '/appraisal',
    '/approval',
    '/legal', '/issuing',
    '/auction',
    '/investors', '/withdrawal-history', '/investor-auction-history',
    '/cancellation',
    '/accounting',
  ],

  // ฝ่ายขาย — เห็น: แชท + รายการเคส + นายหน้า เท่านั้น
  sales: [
    '/dashboard',
    '/chat',
    '/sales',
    '/agents',
  ],

  // ฝ่ายประเมิน — เห็น: หน้าประเมินอย่างเดียว ไม่เห็นชื่อลูกค้า/แชท
  appraisal: [
    '/dashboard',
    '/appraisal',
  ],

  // ฝ่ายอนุมัติสินเชื่อ — เห็น: ผลประเมิน + อนุมัติ + นายทุน + ประมูล
  approval: [
    '/dashboard',
    '/approval',
    '/appraisal',
    '/investors', '/withdrawal-history', '/investor-auction-history',
    '/auction',
  ],

  // ฝ่ายนิติกรรม — เห็น: นิติกรรม + ยกเลิกเคส
  legal: [
    '/dashboard',
    '/legal',
    '/cancellation',
  ],

  // ฝ่ายออกสัญญา — เห็น: ออกสัญญา + ยกเลิกเคส
  issuing: [
    '/dashboard',
    '/issuing',
    '/cancellation',
  ],
}

export function hasAccess(department, path) {
  if (!department) return false
  const allowed = PERMISSIONS[department]
  if (!allowed) return false
  if (allowed === '*') return true
  return allowed.includes(path)
}

export function getAllowedPaths(department) {
  if (!department) return []
  const allowed = PERMISSIONS[department]
  if (!allowed) return []
  if (allowed === '*') return null
  return allowed
}

export function getDefaultPage(department) {
  return '/dashboard'
}

export default PERMISSIONS
