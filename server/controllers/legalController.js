const db = require('../config/db')
const path = require('path')
const fs = require('fs')
const { notifyStatusChange } = require('./notificationController')

// mapping fieldname → subfolder (ต้องตรงกับ uploadLegal.js)
const folderMap = {
  attachment: 'attachment',
  doc_selling_pledge: 'doc-selling-pledge',
  deed_selling_pledge: 'deed-selling-pledge',
  doc_extension: 'doc-extension',
  deed_extension: 'deed-extension',
  doc_redemption: 'doc-redemption',
  deed_redemption: 'deed-redemption',
  commission_slip: 'commission-slip',  // ★ สลิปค่าคอมมิชชั่น
}

// ========== สถิติฝ่ายนิติกรรม ==========
exports.getStats = (req, res) => {
  const sql = `
    SELECT
      (SELECT COUNT(*) FROM cases c LEFT JOIN legal_transactions lt ON lt.case_id = c.id WHERE lt.id IS NULL OR lt.legal_status = 'pending') AS pending_count,
      (SELECT COUNT(*) FROM legal_transactions WHERE legal_status = 'completed') AS completed_count,
      (SELECT COUNT(*) FROM legal_transactions WHERE legal_status = 'cancelled') AS cancelled_count,
      (SELECT COUNT(*) FROM cases) AS total_count
  `
  db.query(sql, (err, results) => {
    if (err) {
      console.error('getStats error:', err)
      return res.json({ success: true, stats: { pending_count: 0, completed_count: 0, cancelled_count: 0, total_count: 0 } })
    }
    res.json({ success: true, stats: results[0] })
  })
}

// ========== รายการเคสสำหรับฝ่ายนิติกรรม ==========
exports.getLegalCases = (req, res) => {
  const { status, date } = req.query

  let sql = `
    SELECT
      c.id AS case_id, c.case_code, c.status AS case_status,
      lr.appraisal_result, lr.appraisal_type, c.approved_amount,
      lr.debtor_code, lr.contact_name AS debtor_name,
      lr.contact_phone AS debtor_phone,
      lr.province, lr.district, lr.property_address, lr.location_url,
      lt.id AS legal_id, lt.officer_name, lt.visit_date, lt.land_office, lt.time_slot, lt.team,
      lt.legal_status, lt.attachment, lt.doc_selling_pledge, lt.deed_selling_pledge,
      lt.doc_extension, lt.deed_extension, lt.doc_redemption, lt.deed_redemption,
      lt.note, lt.created_at AS legal_created_at, lt.updated_at AS legal_updated_at
    FROM cases c
    LEFT JOIN loan_requests lr ON lr.id = c.loan_request_id
    LEFT JOIN legal_transactions lt ON lt.case_id = c.id
    WHERE 1=1
  `

  const params = []
  if (status) {
    if (status === 'pending') {
      sql += ' AND (lt.legal_status = ? OR lt.id IS NULL)'
      params.push(status)
    } else {
      sql += ' AND lt.legal_status = ?'
      params.push(status)
    }
  }
  if (date) {
    sql += ' AND (DATE(lt.updated_at) = ? OR DATE(c.created_at) = ?)'
    params.push(date, date)
  }

  sql += ' ORDER BY c.id DESC'

  db.query(sql, params, (err, results) => {
    if (err) {
      console.error('getLegalCases error:', err)
      return res.status(500).json({ success: false, message: 'Server Error' })
    }
    res.json({ success: true, data: results })
  })
}

// ========== ดึงข้อมูลเคสเดี่ยว (สำหรับหน้าแก้ไขฝ่ายนิติกรรม) ==========
exports.getLegalDetail = (req, res) => {
  const { caseId } = req.params

  // ตรวจสอบว่ามี legal_transaction สำหรับ case นี้หรือไม่
  db.query('SELECT id FROM legal_transactions WHERE case_id = ?', [caseId], (err0, existingLegal) => {
    if (err0) {
      console.error('getLegalDetail check error:', err0)
      return res.status(500).json({ success: false, message: 'Server Error' })
    }

    // ถ้าไม่มี legal_transaction → สร้างใหม่
    if (!existingLegal || existingLegal.length === 0) {
      db.query(
        'INSERT INTO legal_transactions (case_id, legal_status, created_at, updated_at) VALUES (?, ?, NOW(), NOW())',
        [caseId, 'pending'],
        (errInsert) => {
          if (errInsert) {
            console.error('getLegalDetail insert error:', errInsert)
            return res.status(500).json({ success: false, message: 'Server Error' })
          }
          // หลังจากสร้างแล้ว → ดึงข้อมูล
          fetchLegalDetail(caseId, res)
        }
      )
    } else {
      // มี legal_transaction แล้ว → ดึงข้อมูลทันที
      fetchLegalDetail(caseId, res)
    }
  })
}

function fetchLegalDetail(caseId, res) {
  const sql = `
    SELECT
      c.id, c.case_code, c.status, c.loan_request_id, c.created_at, c.updated_at,
      lr.appraisal_type, lr.appraisal_result, lr.appraisal_date, lr.appraisal_fee,
      c.transaction_date, c.transaction_time, c.transaction_land_office,
      c.transaction_note, c.transaction_recorded_by, c.transaction_recorded_at,
      lr.outside_result, lr.outside_reason, lr.outside_recorded_at,
      lr.inside_result, lr.inside_reason, lr.inside_recorded_at,
      lr.check_price_value, lr.check_price_detail, lr.check_price_recorded_at,
      lr.debtor_code, lr.contact_name, lr.contact_phone, lr.contact_line,
      lr.property_type, lr.loan_type_detail, lr.province, lr.district, lr.subdistrict,
      lr.house_no, lr.village_name, lr.additional_details,
      lr.property_address, lr.location_url,
      lr.deed_number, lr.deed_type, lr.land_area, lr.building_area, lr.has_obligation, lr.obligation_count,
      lr.images, lr.appraisal_images, lr.deed_images, lr.appraisal_book_image,
      lt.id AS legal_id, lt.officer_name, lt.visit_date, lt.land_office, lt.time_slot, lt.team,
      lt.legal_status, lt.attachment, lt.doc_selling_pledge, lt.deed_selling_pledge,
      lt.doc_extension, lt.deed_extension, lt.doc_redemption, lt.deed_redemption,
      lt.commission_slip,
      lt.note, lt.created_at AS legal_created_at, lt.updated_at AS legal_updated_at,
      at2.approval_type AS legal_approval_type, at2.approved_credit, at2.approval_date
    FROM cases c
    LEFT JOIN loan_requests lr ON lr.id = c.loan_request_id
    LEFT JOIN legal_transactions lt ON lt.case_id = c.id
    LEFT JOIN approval_transactions at2 ON at2.loan_request_id = c.loan_request_id
    WHERE c.id = ?
  `
  db.query(sql, [caseId], (err, results) => {
    if (err) {
      console.error('fetchLegalDetail error:', err)
      return res.status(500).json({ success: false, message: 'Server Error' })
    }
    if (results.length === 0) return res.status(404).json({ success: false, message: 'ไม่พบข้อมูลเคส' })
    res.json({ success: true, caseData: results[0] })
  })
}

// ========== อัพเดทเคส (ฝ่ายนิติกรรม — รองรับ FormData + อัพโหลดเอกสาร) ==========
exports.updateLegal = (req, res) => {
  const { caseId } = req.params
  const body = req.body || {}
  const {
    officer_name, visit_date, land_office, time_slot, team, legal_status, note
  } = body

  const buildAndExecuteUpdate = () => {
    // ★ GATE: ถ้าจะ complete ต้องเช็ค commission_slip ก่อน
    if (legal_status === 'completed') {
      const files = req.files || {}
      const hasNewSlip = files['commission_slip'] && files['commission_slip'].length > 0

      // ตรวจสอบว่ามี commission_slip ในฐานข้อมูลอยู่แล้วหรือไม่
      db.query(
        'SELECT commission_slip FROM legal_transactions WHERE case_id = ?',
        [caseId],
        (errSlip, slipRows) => {
          if (errSlip) return res.status(500).json({ success: false, message: 'Server Error' })
          const existingSlip = slipRows && slipRows[0] ? slipRows[0].commission_slip : null
          if (!hasNewSlip && !existingSlip) {
            return res.status(400).json({
              success: false,
              message: '⚠️ ไม่สามารถปิดเคสได้ — กรุณาอัพโหลดสลิปค่าคอมมิชชั่นก่อน',
              error_code: 'COMMISSION_SLIP_REQUIRED'
            })
          }
          doUpdate()
        }
      )
      return
    }
    doUpdate()
  }

  const doUpdate = () => {
    const fields = []
    const values = []

    if (officer_name !== undefined) { fields.push('officer_name=?'); values.push(officer_name || null) }
    if (visit_date !== undefined) { fields.push('visit_date=?'); values.push(visit_date || null) }
    if (land_office !== undefined) { fields.push('land_office=?'); values.push(land_office || null) }
    if (time_slot !== undefined) { fields.push('time_slot=?'); values.push(time_slot || null) }
    if (team !== undefined) { fields.push('team=?'); values.push(team || null) }
    if (legal_status !== undefined) { fields.push('legal_status=?'); values.push(legal_status || 'pending') }
    if (note !== undefined) { fields.push('note=?'); values.push(note || null) }

    // จัดการไฟล์อัพโหลด (รวม commission_slip)
    const files = req.files || {}
    const docFields = [
      'attachment', 'doc_selling_pledge', 'deed_selling_pledge',
      'doc_extension', 'deed_extension', 'doc_redemption', 'deed_redemption',
      'commission_slip'  // ★ เพิ่มสลิปค่าคอม
    ]

    docFields.forEach(docField => {
      if (files[docField] && files[docField].length > 0) {
        const subfolder = folderMap[docField] || 'general'
        const docPath = `uploads/legal/${subfolder}/${files[docField][0].filename}`
        fields.push(`${docField}=?`)
        values.push(docPath)
      }
    })

    if (fields.length === 0) return res.status(400).json({ success: false, message: 'ไม่มีข้อมูลที่จะอัพเดท' })

    values.push(caseId)
    const sql = `UPDATE legal_transactions SET ${fields.join(', ')} WHERE case_id=?`
    db.query(sql, values, (err) => {
      if (err) {
        console.error('updateLegal error:', err)
        return res.status(500).json({ success: false, message: 'Server Error' })
      }

      // ===== auto-sync cases.status ตาม legal_status =====
      let newCaseStatus = null
      if (legal_status === 'completed') {
        newCaseStatus = 'legal_completed'
      } else if (visit_date) {
        newCaseStatus = 'legal_scheduled'
      }

      if (newCaseStatus) {
        db.query('UPDATE cases SET status = ? WHERE id = ?', [newCaseStatus, caseId], (err2) => {
          if (err2) console.error('sync cases.status error:', err2)

          // ===== ส่งแจ้งเตือน (ลูกค้า + ภายใน) =====
          db.query('SELECT loan_request_id FROM cases WHERE id = ?', [caseId], (err3, rows) => {
            if (!err3 && rows.length > 0 && rows[0].loan_request_id) {
              const io = req.app.get('io')
              const userId = req.user ? req.user.id : null
              const extraInfo = visit_date ? ('วันที่ ' + visit_date) : ''
              notifyStatusChange(rows[0].loan_request_id, parseInt(caseId), null, newCaseStatus, io, userId, extraInfo)
            }
          })

          res.json({ success: true, message: 'อัพเดทข้อมูลนิติกรรมสำเร็จ' })
        })
      } else {
        res.json({ success: true, message: 'อัพเดทข้อมูลนิติกรรมสำเร็จ' })
      }
    })
  }

  // ตรวจสอบว่ามี legal_transaction หรือยัง ถ้ายังไม่มีให้สร้างก่อน
  db.query('SELECT id FROM legal_transactions WHERE case_id = ?', [caseId], (err0, existing) => {
    if (err0) {
      console.error('updateLegal check error:', err0)
      return res.status(500).json({ success: false, message: 'Server Error' })
    }
    if (!existing || existing.length === 0) {
      db.query(
        'INSERT INTO legal_transactions (case_id, legal_status, created_at, updated_at) VALUES (?, ?, NOW(), NOW())',
        [caseId, 'pending'],
        (errInsert) => {
          if (errInsert) {
            console.error('updateLegal insert error:', errInsert)
            return res.status(500).json({ success: false, message: 'Server Error' })
          }
          buildAndExecuteUpdate()
        }
      )
    } else {
      buildAndExecuteUpdate()
    }
  })
}

// ========== ลบเอกสารเฉพาะ (ฝ่ายนิติกรรม) — ลบไฟล์จริงจาก disk ด้วย ==========
exports.deleteDocument = (req, res) => {
  const { case_id, column } = req.body

  // อนุญาตแค่คอลัมน์ที่กำหนด
  const allowed = [
    'attachment', 'doc_selling_pledge', 'deed_selling_pledge',
    'doc_extension', 'deed_extension', 'doc_redemption', 'deed_redemption',
    'commission_slip'  // ★ สลิปค่าคอมมิชชั่น
  ]

  if (!allowed.includes(column)) {
    return res.status(400).json({ success: false, message: 'Not allowed' })
  }

  // ดึง path เดิมจาก DB ก่อน เพื่อลบไฟล์จริง
  db.query(
    `SELECT ${column} FROM legal_transactions WHERE case_id = ?`,
    [case_id],
    (errSelect, rows) => {
      if (errSelect) {
        console.error('deleteDocument select error:', errSelect)
        return res.status(500).json({ success: false, message: 'Server Error' })
      }

      const oldFilePath = rows && rows[0] ? rows[0][column] : null

      // SET column = NULL ใน DB
      db.query(
        `UPDATE legal_transactions SET ${column} = NULL WHERE case_id = ?`,
        [case_id],
        (err) => {
          if (err) {
            console.error('deleteDocument error:', err)
            return res.status(500).json({ success: false, message: 'Server Error' })
          }

          // ลบไฟล์จริงจาก disk
          if (oldFilePath) {
            const fullPath = path.join(__dirname, '..', oldFilePath)
            fs.unlink(fullPath, (unlinkErr) => {
              if (unlinkErr) console.error('ลบไฟล์จาก disk ไม่สำเร็จ:', unlinkErr.message)
              else console.log('ลบไฟล์สำเร็จ:', fullPath)
            })
          }

          res.json({ success: true, message: 'ลบเอกสารสำเร็จ' })
        }
      )
    }
  )
}