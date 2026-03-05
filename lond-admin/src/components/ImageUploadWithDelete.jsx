import { useState, useRef } from 'react'

/**
 * Component อัพโหลดรูป + ปุ่ม X ลบ
 * ใช้ได้ทุกฟอร์ม: DebtorAccountingEditPage, AgentAccountingEditPage, CaseEditPage, etc.
 *
 * Props:
 * - label: ชื่อฟิลด์ เช่น "สลิปค่าประเมิน"
 * - fieldName: ชื่อ field สำหรับ upload เช่น "slip_image"
 * - currentFile: path รูปปัจจุบัน (ถ้ามี)
 * - uploadUrl: URL สำหรับ upload เช่น "/api/admin/accounting/upload"
 * - deleteInfo: { table, id, column } สำหรับลบรูปจาก DB (ส่งไป /api/admin/appraisal/delete-image)
 * - onUploaded: callback เมื่ออัพโหลดสำเร็จ (filePath) => void
 * - onDeleted: callback เมื่อลบสำเร็จ () => void
 * - accept: ชนิดไฟล์ที่รับ (default: "image/*")
 */
export default function ImageUploadWithDelete({
  label, fieldName, currentFile, uploadUrl, deleteInfo,
  onUploaded, onDeleted, accept = 'image/*'
}) {
  const fileRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [localPreview, setLocalPreview] = useState(null) // preview ก่อนบันทึก
  const token = localStorage.getItem('loandd_admin')

  const handleUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    // ถ้ามี uploadUrl → upload จริง
    if (uploadUrl) {
      setUploading(true)
      try {
        const fd = new FormData()
        fd.append(fieldName, file)
        const res = await fetch(uploadUrl, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: fd
        })
        const r = await res.json()
        if (r.success && r.filePath) {
          setLocalPreview(null)
          onUploaded(r.filePath)
        } else {
          alert(r.message || 'อัพโหลดล้มเหลว')
        }
      } catch {
        alert('อัพโหลดล้มเหลว')
      } finally {
        setUploading(false)
        if (fileRef.current) fileRef.current.value = ''
      }
    } else {
      // ไม่มี uploadUrl → แค่ preview local (ฟอร์มจะ submit ทีเดียว)
      const reader = new FileReader()
      reader.onload = (ev) => {
        setLocalPreview(ev.target.result)
        onUploaded(file) // ส่ง File object กลับ
      }
      reader.readAsDataURL(file)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const handleDelete = async () => {
    // ถ้ามี localPreview แค่ clear local
    if (localPreview) {
      setLocalPreview(null)
      onDeleted()
      return
    }

    // ถ้ามี deleteInfo → ลบจาก DB
    if (deleteInfo && currentFile) {
      if (!confirm('ต้องการลบรูปนี้?')) return
      try {
        const res = await fetch('/api/admin/appraisal/delete-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(deleteInfo)
        })
        const r = await res.json()
        if (r.success) {
          onDeleted()
        } else {
          alert(r.message || 'ลบล้มเหลว')
        }
      } catch {
        alert('ลบล้มเหลว')
      }
    } else {
      // ไม่มี deleteInfo → แค่ clear
      onDeleted()
    }
  }

  const displaySrc = localPreview || currentFile

  return (
    <div>
      {label && <label style={{ fontSize: 14, fontWeight: 600, color: '#333', marginBottom: 6, display: 'block' }}>{label}</label>}

      {displaySrc ? (
        <div style={{ position: 'relative', display: 'inline-block', marginTop: 4 }}>
          {/* ปุ่ม X ลบรูป */}
          <button onClick={handleDelete} style={{
            position: 'absolute', top: -8, right: -8, width: 24, height: 24, borderRadius: '50%',
            background: '#e74c3c', border: '2px solid #fff', color: '#fff', fontSize: 12,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 6px rgba(0,0,0,0.3)', zIndex: 2, lineHeight: 1
          }} title="ลบรูป">
            <i className="fas fa-times"></i>
          </button>
          <img src={displaySrc} alt={label}
            style={{
              width: 120, height: 80, objectFit: 'cover', borderRadius: 8,
              border: '2px solid #e0e0e0', cursor: 'pointer'
            }}
            onClick={() => window.open(displaySrc, '_blank')}
          />
        </div>
      ) : (
        <div style={{ marginTop: 4 }}>
          <input ref={fileRef} type="file" accept={accept} style={{ display: 'none' }}
            onChange={handleUpload} />
          <button onClick={() => fileRef.current?.click()} disabled={uploading} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '8px 16px', borderRadius: 8, border: '2px dashed #ccc',
            background: '#fafafa', color: '#888', fontSize: 13, fontWeight: 600,
            cursor: uploading ? 'not-allowed' : 'pointer', opacity: uploading ? 0.7 : 1,
            transition: 'all 0.15s', minWidth: 120
          }}
            onMouseEnter={e => { if (!uploading) { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.color = 'var(--primary)' } }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#ccc'; e.currentTarget.style.color = '#888' }}
          >
            <i className={uploading ? 'fas fa-spinner fa-spin' : 'fas fa-cloud-upload-alt'}></i>
            {uploading ? 'อัพโหลด...' : 'เลือกไฟล์'}
          </button>
        </div>
      )}
    </div>
  )
}