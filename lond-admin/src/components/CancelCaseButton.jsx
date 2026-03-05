import { useState } from 'react'
import { getCurrentUser } from '../utils/auth'

const token = () => localStorage.getItem('loandd_admin')

/**
 * ปุ่มยกเลิกเคส — ทุกฝ่ายกดได้ แต่ต้องรออนุมัติจากฝ่ายอนุมัติ/super_admin
 * Props:
 *   caseId      — cases.id
 *   caseCode    — รหัสเคส (แสดงใน modal)
 *   caseStatus  — status ปัจจุบัน (ซ่อนปุ่มถ้า cancelled/pending_cancel)
 *   onSuccess   — callback หลัง submit สำเร็จ (reload หน้า หรือ navigate)
 */
export default function CancelCaseButton({ caseId, caseCode, caseStatus, onSuccess }) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  // เช็คสิทธิ์: ทุกฝ่ายกดขอยกเลิกได้ (ต้องรออนุมัติจากฝ่ายอนุมัติ/super_admin)
  const currentUser = getCurrentUser()
  const dept = currentUser?.department
  if (!dept) {
    return null
  }

  // ซ่อนถ้า cancelled หรือรออนุมัติยกเลิกแล้ว
  if (caseStatus === 'cancelled' || caseStatus === 'pending_cancel') {
    return (
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        background: '#fdf2f2', border: '1px solid #f5c6c6', borderRadius: 8,
        padding: '8px 14px', fontSize: 13, color: '#c0392b'
      }}>
        <i className="fas fa-ban"></i>
        {caseStatus === 'pending_cancel' ? 'รออนุมัติยกเลิก' : 'เคสถูกยกเลิกแล้ว'}
      </div>
    )
  }

  const handleOpen = () => { setOpen(true); setReason(''); setErr('') }
  const handleClose = () => { if (!loading) setOpen(false) }

  const handleSubmit = async () => {
    if (!reason.trim()) { setErr('กรุณากรอกเหตุผลการยกเลิก'); return }
    setLoading(true)
    setErr('')
    try {
      const lsUser = JSON.parse(localStorage.getItem('loandd_admin_user') || '{}')
      const res = await fetch('/api/admin/cancellations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ case_id: caseId, requested_by: lsUser.id, reason: reason.trim() })
      })
      const data = await res.json()
      if (data.success) {
        setOpen(false)
        if (onSuccess) onSuccess()
      } else {
        setErr(data.message || 'เกิดข้อผิดพลาด')
      }
    } catch {
      setErr('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้')
    }
    setLoading(false)
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        style={{
          background: '#e74c3c', color: '#fff', border: 'none',
          borderRadius: 8, padding: '10px 20px', fontSize: 13, fontWeight: 600,
          cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8,
          boxShadow: '0 2px 6px rgba(231,76,60,0.3)',
        }}
      >
        <i className="fas fa-times-circle"></i> ยกเลิกเคส
      </button>

      {open && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
        }} onClick={handleClose}>
          <div style={{
            background: '#fff', borderRadius: 12, padding: 28, width: 420, maxWidth: '92vw',
            boxShadow: '0 8px 32px rgba(0,0,0,0.18)'
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#fdf2f2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="fas fa-exclamation-triangle" style={{ color: '#e74c3c', fontSize: 18 }}></i>
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>ยกเลิกเคส</div>
                <div style={{ fontSize: 12, color: '#888' }}>{caseCode}</div>
              </div>
            </div>

            <p style={{ fontSize: 13, color: '#555', margin: '0 0 16px', lineHeight: 1.6 }}>
              การยกเลิกต้องผ่านการอนุมัติจากผู้ดูแลระบบ สถานะเคสจะเปลี่ยนเป็น <strong>"รออนุมัติยกเลิก"</strong> ก่อน
            </p>

            <div className="form-group" style={{ marginBottom: 8 }}>
              <label style={{ fontWeight: 600, fontSize: 13 }}>เหตุผลการยกเลิก <span style={{ color: '#e74c3c' }}>*</span></label>
              <textarea
                rows="4"
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="ระบุเหตุผลการยกเลิกเคสนี้..."
                style={{ resize: 'vertical', marginTop: 6, fontSize: 13, borderColor: err ? '#e74c3c' : undefined }}
                disabled={loading}
              />
            </div>
            {err && <div style={{ color: '#e74c3c', fontSize: 12, marginBottom: 10 }}><i className="fas fa-exclamation-circle"></i> {err}</div>}

            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                style={{
                  flex: 1, background: '#e74c3c', color: '#fff', border: 'none',
                  borderRadius: 8, padding: '11px 0', fontWeight: 600, fontSize: 14, cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.7 : 1
                }}
              >
                {loading ? <><i className="fas fa-spinner fa-spin"></i> กำลังส่ง...</> : <><i className="fas fa-paper-plane"></i> ส่งคำขอยกเลิก</>}
              </button>
              <button
                type="button"
                onClick={handleClose}
                disabled={loading}
                style={{
                  flex: 1, background: '#f5f5f5', color: '#555', border: '1px solid #ddd',
                  borderRadius: 8, padding: '11px 0', fontWeight: 600, fontSize: 14, cursor: 'pointer'
                }}
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
