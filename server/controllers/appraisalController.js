const db = require('../config/db')
const { notifyStatusChange } = require('./notificationController')

// ========== สถิติฝ่ายประเมิน (นับจาก loan_requests LEFT JOIN cases) ==========
exports.getAppraisalStats = (req, res) => {
  const sql = `
    SELECT
      (SELECT COUNT(*) FROM loan_requests WHERE appraisal_type = 'outside') AS outside_count,
      (SELECT COUNT(*) FROM loan_requests WHERE appraisal_type = 'inside') AS inside_count,
      (SELECT COUNT(*) FROM loan_requests WHERE appraisal_type = 'check_price') AS check_price_count,
      (SELECT COUNT(*) FROM loan_requests) AS total_count
  `
  db.query(sql, (err, results) => {
    if (err) {
      console.error('getAppraisalStats error:', err)
      return res.json({ success: true, stats: { outside_count: 0, inside_count: 0, check_price_count: 0, total_count: 0 } })
    }
    res.json({ success: true, stats: results[0] })
  })
}

// ========== รายการลูกหนี้สำหรับฝ่ายประเมิน (FROM loan_requests เป็นหลัก) ==========
exports.getAppraisalCases = (req, res) => {
  const { date, type, result } = req.query

  let sql = `
    SELECT
      lr.id AS loan_request_id,
      lr.debtor_code, lr.contact_name AS debtor_name,
      lr.contact_phone AS debtor_phone,
      lr.province, lr.district, lr.subdistrict,
      lr.property_address, lr.location_url,
      lr.images, lr.appraisal_images,
      lr.status,
      lr.appraisal_type, lr.appraisal_result, lr.appraisal_date,
      lr.appraisal_fee, lr.appraisal_book_image, lr.slip_image,
      lr.updated_at,
      c.id AS case_id, c.case_code
    FROM loan_requests lr
    LEFT JOIN cases c ON c.loan_request_id = lr.id
    WHERE 1=1
  `

  const params = []
  if (type) {
    sql += ' AND lr.appraisal_type = ?'
    params.push(type)
  }
  if (result) {
    sql += ' AND lr.appraisal_result = ?'
    params.push(result)
  }
  if (date) {
    sql += ' AND DATE(lr.updated_at) = ?'
    params.push(date)
  }

  sql += ' ORDER BY lr.id DESC'

  db.query(sql, params, (err, results) => {
    if (err) {
      console.error('getAppraisalCases error:', err)
      return res.status(500).json({ success: false, message: 'Server Error' })
    }
    res.json({ success: true, data: results })
  })
}

// ========== ดึงข้อมูลเดี่ยว (สำหรับหน้าแก้ไขฝ่ายประเมิน) — query จาก loan_requests เป็นหลัก ==========
// ข้อมูลการประเมินอยู่ที่ loan_requests (ไม่ใช่ cases) เพราะยังไม่เป็นเคสจนกว่าจะคอนเฟิร์ม
exports.getCaseDetail = (req, res) => {
  const { caseId: loanRequestId } = req.params
  const sql = `
    SELECT
      lr.id AS loan_request_id,
      lr.debtor_code, lr.contact_name, lr.contact_phone, lr.contact_line,
      lr.property_type, lr.loan_type, lr.loan_type_detail,
      lr.province, lr.district, lr.subdistrict,
      lr.house_no, lr.village_name, lr.additional_details,
      lr.property_address, lr.location_url,
      lr.deed_number, lr.deed_type, lr.land_area, lr.building_area,
      lr.estimated_value, lr.loan_amount,
      lr.has_obligation, lr.obligation_count,
      lr.desired_amount, lr.interest_rate, lr.net_desired_amount,
      lr.contract_years, lr.occupation, lr.monthly_income, lr.loan_purpose,
      lr.images, lr.appraisal_images, lr.deed_images,
      lr.status, lr.payment_status, lr.approved_amount, lr.appraised_value,
      lr.appraisal_type, lr.appraisal_result, lr.appraisal_date, lr.appraisal_fee,
      lr.slip_image, lr.appraisal_book_image,
      lr.appraisal_note AS note, lr.appraisal_recorded_by AS recorded_by, lr.appraisal_recorded_at AS recorded_at,
      lr.outside_result, lr.outside_reason, lr.outside_recorded_at,
      lr.inside_result, lr.inside_reason, lr.inside_recorded_at,
      lr.check_price_value, lr.check_price_detail, lr.check_price_recorded_at,
      lr.updated_at,
      c.id, c.case_code,
      a.full_name AS agent_name
    FROM loan_requests lr
    LEFT JOIN cases c ON c.loan_request_id = lr.id
    LEFT JOIN agents a ON a.id = lr.agent_id
    WHERE lr.id = ?
  `
  db.query(sql, [loanRequestId], (err, results) => {
    if (err) {
      console.error('getCaseDetail error:', err)
      return res.status(500).json({ success: false, message: 'Server Error' })
    }
    if (results.length === 0) return res.status(404).json({ success: false, message: 'ไม่พบข้อมูลลูกหนี้' })
    res.json({ success: true, caseData: results[0] })
  })
}

// ========== อัพเดทข้อมูลประเมิน (เขียนลง loan_requests — ไม่ใช่ cases) ==========
// ข้อมูลประเมินเป็นของลูกหนี้ ยังไม่เป็นเคสจนกว่าจะคอนเฟิร์มทั้งสองฝ่าย
exports.updateAppraisalCase = (req, res) => {
  const { caseId: loanRequestId } = req.params
  const body = req.body || {}
  const {
    appraisal_type, appraisal_result, appraisal_date, appraisal_fee,
    payment_status,
    approved_amount, note, recorded_by,
    outside_result, outside_reason,
    inside_result, inside_reason,
    check_price_value, check_price_detail
  } = body

  const fields = []
  const values = []

  if (appraisal_type !== undefined) { fields.push('appraisal_type=?'); values.push(appraisal_type || 'outside') }
  if (appraisal_result !== undefined) { fields.push('appraisal_result=?'); values.push(appraisal_result || null) }
  if (appraisal_date !== undefined) { fields.push('appraisal_date=?'); values.push(appraisal_date || null) }
  if (appraisal_fee !== undefined) { fields.push('appraisal_fee=?'); values.push(appraisal_fee || null) }
  if (payment_status !== undefined) { fields.push('payment_status=?'); values.push(payment_status || 'unpaid') }
  if (approved_amount !== undefined) { fields.push('approved_amount=?'); values.push(approved_amount || null) }
  if (note !== undefined) { fields.push('appraisal_note=?'); values.push(note || null) }
  if (recorded_by !== undefined) { fields.push('appraisal_recorded_by=?'); values.push(recorded_by || null) }

  // ผลประเมินนอก
  if (outside_result !== undefined) {
    fields.push('outside_result=?'); values.push(outside_result || null)
    fields.push('outside_reason=?'); values.push(outside_reason || null)
    fields.push('outside_recorded_at=?'); values.push(outside_result ? new Date() : null)
  }
  // ผลประเมินใน
  if (inside_result !== undefined) {
    fields.push('inside_result=?'); values.push(inside_result || null)
    fields.push('inside_reason=?'); values.push(inside_reason || null)
    fields.push('inside_recorded_at=?'); values.push(inside_result ? new Date() : null)
  }
  // ผลเช็คราคา
  if (check_price_value !== undefined) {
    fields.push('check_price_value=?'); values.push(check_price_value || null)
    fields.push('check_price_detail=?'); values.push(check_price_detail || null)
    fields.push('check_price_recorded_at=?'); values.push(check_price_value ? new Date() : null)
  }

  // ===== auto-sync status ตาม appraisal_result =====
  if (appraisal_result === 'passed') {
    fields.push('status=?'); values.push('appraisal_passed')
  } else if (appraisal_result === 'not_passed') {
    fields.push('status=?'); values.push('appraisal_not_passed')
  }

  // จัดการไฟล์อัพโหลด
  const files = req.files || {}
  if (files['slip_image'] && files['slip_image'].length > 0) {
    const slipPath = `uploads/slips/${files['slip_image'][0].filename}`
    fields.push('slip_image=?')
    values.push(slipPath)
  }
  if (files['appraisal_book_image'] && files['appraisal_book_image'].length > 0) {
    const bookPath = `uploads/appraisal-books/${files['appraisal_book_image'][0].filename}`
    fields.push('appraisal_book_image=?')
    values.push(bookPath)
  }

  if (fields.length === 0) return res.status(400).json({ success: false, message: 'ไม่มีข้อมูลที่จะอัพเดท' })

  values.push(loanRequestId)
  const sql = `UPDATE loan_requests SET ${fields.join(', ')} WHERE id=?`
  db.query(sql, values, (err) => {
    if (err) {
      console.error('updateAppraisalCase error:', err)
      return res.status(500).json({ success: false, message: 'Server Error' })
    }

    // ===== ส่งแจ้งเตือนตามการเปลี่ยนแปลง =====
    const io = req.app.get('io')
    const userId = req.user ? req.user.id : null

    // หา case_id เพื่อส่งแจ้งเตือน
    db.query('SELECT id FROM cases WHERE loan_request_id = ?', [loanRequestId], (err2, caseRows) => {
      const caseId = (caseRows && caseRows.length > 0) ? caseRows[0].id : null

      // แจ้งเตือนเมื่อชำระค่าประเมินแล้ว
      if (payment_status === 'paid') {
        notifyStatusChange(parseInt(loanRequestId), caseId, null, 'awaiting_appraisal_fee', io, userId)
      }
      // แจ้งเตือนเมื่อนัดวันประเมิน
      if (appraisal_date) {
        notifyStatusChange(parseInt(loanRequestId), caseId, null, 'appraisal_scheduled', io, userId, appraisal_date)
      }
      // แจ้งเตือนเมื่อผลประเมินเปลี่ยน
      if (appraisal_result === 'passed') {
        notifyStatusChange(parseInt(loanRequestId), caseId, null, 'appraisal_passed', io, userId)
      } else if (appraisal_result === 'not_passed') {
        notifyStatusChange(parseInt(loanRequestId), caseId, null, 'appraisal_not_passed', io, userId)
      }
    })

    res.json({ success: true, message: 'บันทึกข้อมูลประเมินสำเร็จ' })
  })
}

// ========== อัปเดทผลประเมินมาตรฐาน (passed / not_passed) — เขียนลง loan_requests ==========
exports.updateAppraisalResult = (req, res) => {
  const { caseId: loanRequestId } = req.params
  const { appraisal_result } = req.body

  if (!['passed', 'not_passed', null].includes(appraisal_result)) {
    return res.status(400).json({ success: false, message: 'Invalid result' })
  }

  let statusSync = null
  if (appraisal_result === 'passed') statusSync = 'appraisal_passed'
  else if (appraisal_result === 'not_passed') statusSync = 'appraisal_not_passed'

  const sql = statusSync
    ? 'UPDATE loan_requests SET appraisal_result = ?, status = ? WHERE id = ?'
    : 'UPDATE loan_requests SET appraisal_result = ? WHERE id = ?'
  const params = statusSync ? [appraisal_result, statusSync, loanRequestId] : [appraisal_result, loanRequestId]

  db.query(sql, params, (err) => {
    if (err) {
      console.error('updateAppraisalResult error:', err)
      return res.status(500).json({ success: false, message: 'Server Error' })
    }

    // ===== ส่งแจ้งเตือน (ลูกค้า + ภายใน) =====
    if (statusSync) {
      const io = req.app.get('io')
      const userId = req.user ? req.user.id : null
      // หา case_id จาก loan_request_id
      db.query('SELECT id FROM cases WHERE loan_request_id = ?', [loanRequestId], (err2, caseRows) => {
        const caseId = (caseRows && caseRows.length > 0) ? caseRows[0].id : null
        notifyStatusChange(parseInt(loanRequestId), caseId, null, statusSync, io, userId)
      })
    }

    res.json({ success: true, message: 'Updated' })
  })
}

// ========== อัปโหลดเอกสารฝ่ายประเมิน ==========
exports.uploadAppraisalDoc = (req, res) => {
  const { caseId } = req.params

  if (!req.files || Object.keys(req.files).length === 0) {
    return res.status(400).json({ success: false, message: 'ไม่มีไฟล์' })
  }

  const fieldName = Object.keys(req.files)[0]
  const file = req.files[fieldName][0]
  const filePath = `/uploads/${file.destination.split('uploads')[1].replace(/\\/g, '/')}/${file.filename}`.replace('//', '/')

  // อัปเดทลง cases table (appraisal_book_image) — caseId คือ loan_request_id
  db.query(
    'UPDATE cases SET appraisal_book_image = ? WHERE loan_request_id = ?',
    [filePath, caseId],
    (err) => {
      if (err) {
        console.error('uploadAppraisalDoc error:', err)
        return res.status(500).json({ success: false, message: 'Server Error' })
      }
      res.json({ success: true, filePath, originalName: file.originalname, size: file.size })
    }
  )
}

// ========== อัพโหลดรูปทรัพย์จากฝ่ายประเมิน (บันทึกลง loan_requests.appraisal_images แยกจากรูปลูกค้า) ==========
// caseId param = loan_request_id
exports.uploadPropertyImages = (req, res) => {
  const { caseId: loanRequestId } = req.params

  const files = req.files || {}
  const propertyFiles = files['appraisal_property_image'] || []

  if (propertyFiles.length === 0) {
    return res.status(400).json({ success: false, message: 'ไม่มีไฟล์รูปภาพ' })
  }

  // ดึงรูปเดิมจาก loan_requests.appraisal_images ก่อน
  db.query('SELECT appraisal_images FROM loan_requests WHERE id = ?', [loanRequestId], (err0, rows) => {
    if (err0) return res.status(500).json({ success: false, message: 'Server Error' })
    if (!rows || rows.length === 0) return res.status(404).json({ success: false, message: 'ไม่พบข้อมูลลูกหนี้' })

    let existingImages = []
    try { existingImages = JSON.parse(rows[0].appraisal_images) || [] } catch { existingImages = [] }

    // เพิ่มรูปใหม่เข้าไป (เก็บใน uploads/appraisal-properties/)
    const newPaths = propertyFiles.map(f => `uploads/appraisal-properties/${f.filename}`)
    const allImages = [...existingImages, ...newPaths]
    const imagesJson = JSON.stringify(allImages)

    db.query('UPDATE loan_requests SET appraisal_images = ? WHERE id = ?', [imagesJson, loanRequestId], (err2) => {
      if (err2) {
        console.error('uploadPropertyImages error:', err2)
        return res.status(500).json({ success: false, message: 'Server Error' })
      }
      res.json({ success: true, message: `อัพโหลดรูปทรัพย์ ${newPaths.length} รูปสำเร็จ`, newPaths, allImages })
    })
  })
}

// ========== ลบรูปทรัพย์ฝ่ายประเมินจาก loan_requests.appraisal_images ==========
// body: { loanRequestId, imagePath }
exports.deletePropertyImage = (req, res) => {
  const { loanRequestId, imagePath } = req.body
  if (!loanRequestId || !imagePath) {
    return res.status(400).json({ success: false, message: 'ต้องระบุ loanRequestId และ imagePath' })
  }

  db.query('SELECT appraisal_images FROM loan_requests WHERE id = ?', [loanRequestId], (err0, rows) => {
    if (err0) return res.status(500).json({ success: false, message: 'Server Error' })
    if (!rows || rows.length === 0) return res.status(404).json({ success: false, message: 'ไม่พบข้อมูล' })

    let existingImages = []
    try { existingImages = JSON.parse(rows[0].appraisal_images) || [] } catch { existingImages = [] }

    const updatedImages = existingImages.filter(img => img !== imagePath)
    const imagesJson = updatedImages.length > 0 ? JSON.stringify(updatedImages) : null

    db.query('UPDATE loan_requests SET appraisal_images = ? WHERE id = ?', [imagesJson, loanRequestId], (err2) => {
      if (err2) {
        console.error('deletePropertyImage error:', err2)
        return res.status(500).json({ success: false, message: 'Server Error' })
      }
      res.json({ success: true, message: 'ลบรูปสำเร็จ', updatedImages })
    })
  })
}

// ========== ลบรูป/เอกสาร (ใช้ได้ทุกฟอร์ม) ==========
exports.deleteImage = (req, res) => {
  const { table, id, column } = req.body

  // อนุญาตแค่ตารางและคอลัมน์ที่กำหนด
  const allowed = {
    loan_requests: ['slip_image', 'appraisal_book_image'],
    cases: ['slip_image', 'appraisal_book_image'],
    debtor_accounting: ['appraisal_slip', 'bag_fee_slip', 'contract_sale_slip', 'redemption_slip', 'property_forfeited_slip', 'id_card_image'],
    agent_accounting: ['commission_slip'],
  }

  if (!allowed[table] || !allowed[table].includes(column)) {
    return res.status(400).json({ success: false, message: 'Not allowed' })
  }

  // หา primary key column
  const pkColumn = table === 'debtor_accounting' ? 'case_id' :
                    table === 'agent_accounting' ? 'agent_id' :
                    table === 'loan_requests' ? 'id' :
                    table === 'cases' ? 'loan_request_id' : 'id'

  db.query(
    `UPDATE ${table} SET ${column} = NULL WHERE ${pkColumn} = ?`,
    [id],
    (err) => {
      if (err) {
        console.error('deleteImage error:', err)
        return res.status(500).json({ success: false, message: 'Server Error' })
      }
      res.json({ success: true, message: 'Image removed' })
    }
  )
}