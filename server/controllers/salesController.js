const db = require('../config/db')
const fs = require('fs')
const path = require('path')
const { notifyStatusChange } = require('./notificationController')

// ========== Helper: รวม path ไฟล์จาก multer เป็น JSON string ==========
function getFilePaths(files, fieldname, subfolder) {
  if (!files || !files[fieldname]) return null
  const paths = files[fieldname].map(f => `uploads/${subfolder}/${f.filename}`)
  return JSON.stringify(paths)
}

// ========== Helper: Round-Robin กระจายเคสให้ฝ่ายขาย ==========
// วนรอบ: เคส1→คนที่1, เคส2→คนที่2, เคส3→คนที่3, เคส4→คนที่1 ...
// ข้ามฝ่ายขายที่ถูกลบ (ถูก DELETE จาก DB แล้ว) + status ไม่ active
function getNextSalesRoundRobin(callback) {
  // 1) ดึงฝ่ายขายที่ active ทั้งหมด เรียงตาม id ASC (ลำดับคงที่)
  db.query(
    "SELECT id, username, full_name, nickname FROM admin_users WHERE department = 'sales' AND status = 'active' ORDER BY id ASC",
    (err, salesUsers) => {
      if (err) return callback(err, null)
      if (salesUsers.length === 0) return callback(null, null) // ไม่มีเซลล์

      // 2) ดึง assigned_sales_id ของเคสล่าสุดที่ถูก assign (ไม่นับ NULL)
      db.query(
        "SELECT assigned_sales_id FROM cases WHERE assigned_sales_id IS NOT NULL ORDER BY id DESC LIMIT 1",
        (err2, lastCaseRows) => {
          if (err2) return callback(err2, null)

          var lastAssignedId = (lastCaseRows.length > 0) ? lastCaseRows[0].assigned_sales_id : null

          // 3) หาตำแหน่งของคนล่าสุดในลิสต์ แล้ววนไปคนถัดไป
          var lastIndex = -1
          if (lastAssignedId) {
            for (var i = 0; i < salesUsers.length; i++) {
              if (salesUsers[i].id === lastAssignedId) {
                lastIndex = i
                break
              }
            }
          }

          // ถ้าคนล่าสุดไม่อยู่ในลิสต์แล้ว (ถูกลบ/inactive) → เริ่มจากคนแรก
          // ถ้าคนล่าสุดอยู่ → ไปคนถัดไป (วนกลับถ้าสุด)
          var nextIndex = (lastIndex + 1) % salesUsers.length
          callback(null, salesUsers[nextIndex])
        }
      )
    }
  )
}

// ========== Helper: สร้างรหัส sequential ==========
// ลูกหนี้ = LDD0001, นายหน้า = AGT0001, เคส = CS0001
function generateSequentialCode(table, column, prefix, digits, callback) {
  const sql = `SELECT ${column} FROM ${table} WHERE ${column} IS NOT NULL AND ${column} LIKE ? ORDER BY ${column} DESC LIMIT 1`
  db.query(sql, [prefix + '%'], (err, rows) => {
    if (err) return callback(err, null)
    let nextNum = 1
    if (rows.length > 0 && rows[0][column]) {
      const current = rows[0][column].replace(prefix, '')
      const num = parseInt(current, 10)
      if (!isNaN(num)) nextNum = num + 1
    }
    const code = prefix + String(nextNum).padStart(digits, '0')
    callback(null, code)
  })
}

// ========== เพิ่มลูกหนี้ (จากฟอร์มเซลล์กรอก — รองรับ FormData) ==========
exports.createDebtor = (req, res) => {
  console.log('createDebtor req.body:', req.body)
  console.log('createDebtor req.files:', req.files)

  const body = req.body || {}
  const {
    source, contact_name, contact_phone, contact_line,
    preferred_contact, property_type, loan_type, loan_type_detail,
    property_address, province, district, subdistrict,
    house_no, village_name, additional_details,
    location_url, deed_number, deed_type, preliminary_terms,
    land_area, building_area,
    estimated_value, interest_rate, desired_amount, loan_amount, loan_duration,
    occupation, monthly_income, loan_purpose, contract_years, net_desired_amount,
    has_obligation, obligation_count,
    admin_note, agent_id
  } = body

  if (!contact_name || !contact_phone) {
    return res.status(400).json({ success: false, message: 'กรุณากรอกชื่อและเบอร์โทร' })
  }

  // สร้าง debtor_code แบบ sequential (LDD0001, LDD0002...)
  generateSequentialCode('loan_requests', 'debtor_code', 'LDD', 4, (err, debtor_code) => {
    if (err) return res.status(500).json({ success: false, message: 'Server Error: ' + err.message })

    // รวม path รูปทั้งหมด
    const allImagePaths = []
    const files = req.files || {}
    if (files['id_card_image']) {
      files['id_card_image'].forEach(f => allImagePaths.push(`uploads/id-cards/${f.filename}`))
    }
    if (files['property_image']) {
      files['property_image'].forEach(f => allImagePaths.push(`uploads/properties/${f.filename}`))
    }
    if (files['building_permit']) {
      files['building_permit'].forEach(f => allImagePaths.push(`uploads/permits/${f.filename}`))
    }
    if (files['property_video']) {
      files['property_video'].forEach(f => allImagePaths.push(`uploads/videos/${f.filename}`))
    }
    const imagesJson = allImagePaths.length > 0 ? JSON.stringify(allImagePaths) : null

    // deed_images แยกต่างหาก
    const deedPaths = []
    if (files['deed_image']) {
      files['deed_image'].forEach(f => deedPaths.push(`uploads/deeds/${f.filename}`))
    }
    const deedImagesJson = deedPaths.length > 0 ? JSON.stringify(deedPaths) : null

    const sql = `
      INSERT INTO loan_requests
        (debtor_code, source, contact_name, contact_phone, contact_line,
         preferred_contact, property_type, loan_type, loan_type_detail,
         property_address, province, district, subdistrict,
         house_no, village_name, additional_details,
         location_url, deed_number, deed_type, preliminary_terms,
         land_area, building_area,
         estimated_value, interest_rate, desired_amount, loan_amount, loan_duration,
         occupation, monthly_income, loan_purpose, contract_years, net_desired_amount,
         has_obligation, obligation_count,
         images, deed_images,
         admin_note, agent_id, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    `
    const params = [
      debtor_code,
      source || null,
      contact_name,
      contact_phone,
      contact_line || null,
      preferred_contact || 'phone',
      property_type || null,
      loan_type || loan_type_detail || null,
      loan_type_detail || null,
      property_address || '',
      province || '',
      district || null,
      subdistrict || null,
      house_no || null,
      village_name || null,
      additional_details || null,
      location_url || null,
      deed_number || null,
      deed_type || null,
      preliminary_terms || null,
      land_area || null,
      building_area || null,
      estimated_value || null,
      interest_rate || null,
      desired_amount || null,
      loan_amount || 0,
      loan_duration || 12,
      occupation || null,
      monthly_income || null,
      loan_purpose || null,
      contract_years || null,
      net_desired_amount || null,
      has_obligation || 'no',
      obligation_count || null,
      imagesJson,
      deedImagesJson,
      admin_note || null,
      agent_id || null
    ]

    db.query(sql, params, (err, result) => {
      if (err) {
        console.error('createDebtor SQL error:', err)
        return res.status(500).json({ success: false, message: 'Server Error: ' + err.message })
      }

      // ===== แจ้งเตือนทุกฝ่าย: สร้างลูกหนี้ใหม่ =====
      try {
        const io = req.app.get('io')
        const userId = req.user ? req.user.id : null
        notifyStatusChange(result.insertId, null, null, 'new_from_admin', io, userId, contact_name)
      } catch (notifErr) {
        console.error('createDebtor notify error:', notifErr.message)
      }

      res.json({ success: true, message: 'บันทึกข้อมูลลูกค้าสำเร็จ', id: result.insertId, debtor_code })
    })
  })
}

// ========== ID ลูกหนี้ (ใช้ subquery ดึงเคสล่าสุด — ไม่ซ้ำแถว) ==========
exports.getDebtors = (req, res) => {
  const sql = `
    SELECT
      lr.id, lr.debtor_code, lr.contact_name, lr.contact_phone, lr.contact_line,
      lr.property_type, lr.loan_type, lr.loan_type_detail, lr.province, lr.loan_amount,
      lr.status, lr.source, lr.created_at, lr.agent_id AS lr_agent_id,
      lr.images, lr.appraisal_images, lr.deed_images,
      lr.payment_status AS lr_payment_status,
      latest_case.case_id, latest_case.case_code, latest_case.case_status,
      COALESCE(latest_case.payment_status, lr.payment_status) AS payment_status,
      latest_case.approved_amount,
      COALESCE(latest_case.agent_id, lr.agent_id) AS agent_id,
      COALESCE(latest_case.agent_code, direct_agent.agent_code) AS agent_code,
      COALESCE(latest_case.agent_name, direct_agent.full_name) AS agent_name
    FROM loan_requests lr
    LEFT JOIN (
      SELECT c.loan_request_id,
        c.id AS case_id, c.case_code, c.status AS case_status,
        c.payment_status, c.approved_amount, c.agent_id,
        a.agent_code, a.full_name AS agent_name
      FROM cases c
      LEFT JOIN agents a ON a.id = c.agent_id
      WHERE c.id = (
        SELECT c2.id FROM cases c2
        WHERE c2.loan_request_id = c.loan_request_id
        ORDER BY c2.created_at DESC LIMIT 1
      )
    ) latest_case ON latest_case.loan_request_id = lr.id
    LEFT JOIN agents direct_agent ON direct_agent.id = lr.agent_id
    ORDER BY lr.created_at DESC
  `
  db.query(sql, (err, results) => {
    if (err) {
      console.error('getDebtors error:', err)
      return res.status(500).json({ success: false, message: 'Server Error' })
    }
    res.json({ success: true, debtors: results })
  })
}

// ========== ID เคส (LEFT JOIN loan_requests + agents + admin_users) ==========
exports.getCases = (req, res) => {
  const sql = `
    SELECT
      c.id, c.case_code, c.status, c.payment_status,
      lr.appraisal_fee, c.approved_amount, c.note,
      lr.slip_image, lr.appraisal_book_image,
      c.created_at, c.updated_at,
      lr.id AS loan_request_id, lr.debtor_code,
      lr.contact_name AS debtor_name,
      lr.contact_phone AS debtor_phone,
      lr.property_type, lr.loan_type, lr.loan_type_detail, lr.province,
      lr.loan_amount, lr.images AS debtor_images, lr.appraisal_images AS debtor_appraisal_images, lr.deed_images AS debtor_deed_images,
      a.id AS agent_id, a.agent_code, a.full_name AS agent_name,
      a.phone AS agent_phone, a.commission_rate,
      au.id AS sales_id, au.full_name AS sales_name,
      au.nickname AS sales_nickname
    FROM cases c
    LEFT JOIN loan_requests lr ON lr.id = c.loan_request_id
    LEFT JOIN agents a ON a.id = c.agent_id
    LEFT JOIN admin_users au ON au.id = c.assigned_sales_id
    ORDER BY c.created_at DESC
  `
  db.query(sql, (err, results) => {
    if (err) {
      console.error('getCases error:', err)
      return res.status(500).json({ success: false, message: 'Server Error' })
    }
    res.json({ success: true, cases: results })
  })
}

// ========== ID นายหน้า (LEFT JOIN cases + debtors) ==========
exports.getAgents = (req, res) => {
  const sql = `
    SELECT a.*,
      COUNT(c.id) AS total_cases,
      SUM(CASE WHEN c.status = 'completed' THEN 1 ELSE 0 END) AS completed_cases,
      COALESCE(SUM(c.approved_amount), 0) AS total_amount
    FROM agents a
    LEFT JOIN cases c ON c.agent_id = a.id
    GROUP BY a.id
    ORDER BY a.created_at DESC
  `
  db.query(sql, (err, results) => {
    if (err) {
      console.error('getAgents error:', err)
      return res.status(500).json({ success: false, message: 'Server Error' })
    }
    res.json({ success: true, agents: results })
  })
}

// ========== ดึงข้อมูลนายหน้าตาม ID (พร้อมข้อมูลลูกหนี้ที่เชื่อมกัน) ==========
exports.getAgentById = (req, res) => {
  const { id } = req.params
  const sql = `
    SELECT a.*,
      COUNT(c.id) AS total_cases,
      COALESCE(SUM(c.approved_amount), 0) AS total_amount
    FROM agents a
    LEFT JOIN cases c ON c.agent_id = a.id
    WHERE a.id = ?
    GROUP BY a.id
  `
  db.query(sql, [id], (err, results) => {
    if (err) return res.status(500).json({ success: false, message: 'Server Error' })
    if (results.length === 0) return res.status(404).json({ success: false, message: 'ไม่พบข้อมูลนายหน้า' })

    var agent = results[0]

    // ดึงลูกหนี้ที่เชื่อมกัน: ผ่านเคส + ผ่าน loan_requests.agent_id (ยังไม่มีเคส)
    db.query(
      `SELECT lr.id, lr.debtor_code, lr.contact_name, lr.contact_phone, lr.property_type, lr.province,
              c.case_code, c.status AS case_status, c.payment_status
       FROM cases c
       INNER JOIN loan_requests lr ON lr.id = c.loan_request_id
       WHERE c.agent_id = ?
       ORDER BY c.created_at DESC`,
      [id],
      (err2, caseDebtors) => {
        if (err2) caseDebtors = []

        // ดึงลูกหนี้ที่มี agent_id ตรง แต่ยังไม่มีเคส
        db.query(
          `SELECT lr.id, lr.debtor_code, lr.contact_name, lr.contact_phone, lr.property_type, lr.province,
                  NULL AS case_code, NULL AS case_status, NULL AS payment_status
           FROM loan_requests lr
           WHERE lr.agent_id = ? AND lr.id NOT IN (
             SELECT COALESCE(c2.loan_request_id, 0) FROM cases c2 WHERE c2.agent_id = ?
           )
           ORDER BY lr.created_at DESC`,
          [id, id],
          (err3, directDebtors) => {
            if (err3) directDebtors = []
            var allDebtors = (caseDebtors || []).concat(directDebtors || [])
            res.json({ success: true, agent: agent, linked_debtors: allDebtors })
          }
        )
      }
    )
  })
}

// ========== สร้างเคส — รองรับลูกหนี้อย่างเดียว / นายหน้าอย่างเดียว / หรือทั้งคู่ ==========
// ฝ่ายบัญชีสร้างเคสได้ทันที — ไม่ต้องชำระเงินก่อน (payment_status เริ่มเป็น 'unpaid')
exports.createCase = (req, res) => {
  const {
    loan_request_id, agent_id, assigned_sales_id, note,
    appraisal_type, appraisal_date, appraisal_fee, payment_date,
    payment_status,
    recorded_by,
    transaction_date, transaction_time, transaction_land_office,
    transaction_note, transaction_recorded_by
  } = req.body

  // ต้องมีอย่างน้อย ลูกหนี้ หรือ นายหน้า
  if (!loan_request_id && !agent_id) {
    return res.status(400).json({ success: false, message: 'กรุณาเลือกลูกหนี้ หรือ นายหน้า อย่างน้อย 1 รายการ' })
  }

  // ฝ่ายบัญชีสามารถสร้างเคสได้โดยไม่ต้องชำระเงินก่อน — payment_status จะเป็น 'unpaid' จนกว่าจะชำระ
  const files = req.files || {}
  const hasSlip = files['slip_image'] && files['slip_image'].length > 0
  const isPaid = payment_status === 'paid'

  // ดึง user_id จาก loan_requests (ถ้ามี)
  var getUserId = function(callback) {
    if (!loan_request_id) return callback(null)
    db.query('SELECT user_id FROM loan_requests WHERE id = ?', [loan_request_id], (err0, lrRows) => {
      if (err0) return callback(null)
      callback(lrRows.length > 0 ? lrRows[0].user_id : null)
    })
  }

  getUserId(function(user_id) {
    // ===== Round-Robin: ถ้าไม่ได้เลือกเซลล์เอง → ระบบกระจายอัตโนมัติ =====
    var doCreateCase = function(finalSalesId, autoAssignedName) {
      generateSequentialCode('cases', 'case_code', 'CS', 4, (err, case_code) => {
        if (err) return res.status(500).json({ success: false, message: 'Server Error' })

        // เช็คว่ารหัสซ้ำไหม
        db.query('SELECT id FROM cases WHERE case_code = ?', [case_code], (err1, existing) => {
          if (err1) return res.status(500).json({ success: false, message: 'Server Error' })
          if (existing.length > 0) {
            var num = parseInt(case_code.replace('CS', ''), 10) + 1
            case_code = 'CS' + String(num).padStart(4, '0')
          }

          // อัพโหลดรูปสลิป / เล่มประเมิน (ถ้ามี)
          let slipPath = null
          let bookPath = null
          if (hasSlip) {
            slipPath = `uploads/slips/${files['slip_image'][0].filename}`
          }
          if (files['appraisal_book_image'] && files['appraisal_book_image'].length > 0) {
            bookPath = `uploads/appraisal-books/${files['appraisal_book_image'][0].filename}`
          }

          const sql = `
            INSERT INTO cases (case_code, loan_request_id, user_id, agent_id, assigned_sales_id, note,
              appraisal_type, appraisal_date, appraisal_fee, payment_date, payment_status,
              recorded_by, recorded_at, slip_image, appraisal_book_image,
              transaction_date, transaction_time, transaction_land_office,
              transaction_note, transaction_recorded_by, transaction_recorded_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `
          const params = [
            case_code,
            loan_request_id || null,
            user_id || null,
            agent_id || null,
            finalSalesId || null,
            note || null,
            appraisal_type || 'outside',
            appraisal_date || null,
            appraisal_fee || 2900,
            payment_date || null,
            isPaid ? 'paid' : (hasSlip ? 'paid' : 'unpaid'),
            recorded_by || null,
            recorded_by ? new Date() : null,
            slipPath, bookPath,
            transaction_date || null,
            transaction_time || null,
            transaction_land_office || null,
            transaction_note || null,
            transaction_recorded_by || null,
            transaction_recorded_by ? new Date() : null
          ]

          db.query(sql, params, (err2, result) => {
            if (err2) return res.status(500).json({ success: false, message: 'Server Error: ' + err2.message })

            // อัพเดทสถานะ + agent_id ใน loan_requests (ถ้ามีลูกหนี้)
            if (loan_request_id) {
              db.query('UPDATE loan_requests SET status = ? WHERE id = ?', ['reviewing', loan_request_id])
              if (agent_id) {
                db.query(
                  'UPDATE loan_requests SET agent_id = ? WHERE id = ? AND (agent_id IS NULL OR agent_id = 0)',
                  [agent_id, loan_request_id],
                  () => {}
                )
              }

              // ===== ส่งแจ้งเตือน (ลูกค้า + ภายใน) เมื่อสร้างเคสใหม่ =====
              const io = req.app.get('io')
              const userId = req.user ? req.user.id : null
              notifyStatusChange(parseInt(loan_request_id), result.insertId, null, 'reviewing', io, userId)
            }

            var responseMsg = 'สร้างเคสสำเร็จ'
            if (autoAssignedName) {
              responseMsg += ' (กระจายให้: ' + autoAssignedName + ')'
            }
            res.json({ success: true, message: responseMsg, case_code, id: result.insertId, assigned_sales_id: finalSalesId })
          })
        })
      })
    }

    // ===== เริ่มสร้างเคส: ถ้าเลือกเซลล์เอง → ใช้เลย, ถ้าไม่ → Round-Robin =====
    if (assigned_sales_id) {
      // ผู้ใช้เลือกเซลล์เอง
      doCreateCase(assigned_sales_id, null)
    } else {
      // ระบบกระจายอัตโนมัติแบบ Round-Robin
      getNextSalesRoundRobin(function(err, nextSales) {
        if (err || !nextSales) {
          console.log('Round-Robin: ไม่พบเซลล์ที่ active → สร้างเคสไม่มีเซลล์')
          doCreateCase(null, null)
        } else {
          console.log('🎯 Round-Robin assign: ' + (nextSales.full_name || nextSales.username) + ' (id=' + nextSales.id + ')')
          doCreateCase(nextSales.id, nextSales.full_name || nextSales.nickname || nextSales.username)
        }
      })
    }
  })
}

// ========== เพิ่มนายหน้า (สร้าง agent + ลูกหนี้พร้อมกัน / หรือเลือกลูกหนี้เดิม) ==========
exports.createAgent = (req, res) => {
  const {
    full_name, nickname, phone, email, line_id, commission_rate,
    debtor_mode, debtor_id,
    contact_name, contact_phone, property_type,
    has_obligation, obligation_count,
    province, district, subdistrict,
    house_no, village_name, additional_details,
    location_url, deed_number, deed_type, land_area,
    loan_type_detail,
    desired_amount, interest_rate, occupation, monthly_income,
    loan_purpose, contract_years, net_desired_amount
  } = req.body

  if (!full_name || !phone) {
    return res.status(400).json({ success: false, message: 'กรุณากรอกชื่อและเบอร์โทรนายหน้า' })
  }

  // 1) สร้าง agent_code — ใช้ AGT prefix (ไม่ซ้ำกับลูกหนี้ LDD)
  generateSequentialCode('agents', 'agent_code', 'AGT', 4, (err, agent_code) => {
    if (err) return res.status(500).json({ success: false, message: 'Server Error: ' + err.message })

    const files = req.files || {}

    // บัตรประชาชนนายหน้า
    let idCardPath = null
    if (files['id_card_image'] && files['id_card_image'].length > 0) {
      idCardPath = `uploads/id-cards/${files['id_card_image'][0].filename}`
    }

    // INSERT นายหน้า
    const agentSql = `
      INSERT INTO agents (agent_code, full_name, nickname, phone, email, line_id, commission_rate, id_card_image)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `
    db.query(agentSql, [
      agent_code, full_name, nickname || null, phone,
      email || null, line_id || null, commission_rate || 0, idCardPath
    ], (err2, agentResult) => {
      if (err2) return res.status(500).json({ success: false, message: 'Server Error: ' + err2.message })

      const agentId = agentResult.insertId

      // 2) ถ้าเลือกลูกหนี้เดิม → อัพเดท agent_id ใน loan_requests แล้วส่ง response
      if (debtor_mode === 'existing' && debtor_id) {
        db.query('UPDATE loan_requests SET agent_id = ? WHERE id = ? AND (agent_id IS NULL OR agent_id = 0)', [agentId, debtor_id], function() {
          // ไม่สนใจ error — ถ้า update ไม่ได้ก็ไม่เป็นไร
        })
        return res.json({
          success: true,
          message: 'ลงทะเบียนนายหน้าสำเร็จ (เชื่อมลูกหนี้เดิม)',
          id: agentId, agent_code, debtor_id: debtor_id
        })
      }

      // 3) ถ้ากรอกลูกหนี้ใหม่ → สร้าง loan_request ด้วย
      if (!contact_name || !contact_phone) {
        // ไม่ได้กรอกข้อมูลลูกหนี้ → สร้างแค่นายหน้า
        return res.json({
          success: true, message: 'เพิ่มนายหน้าสำเร็จ',
          id: agentId, agent_code
        })
      }

      generateSequentialCode('loan_requests', 'debtor_code', 'LDD', 4, (err3, debtor_code) => {
        if (err3) {
          return res.json({
            success: true,
            message: 'เพิ่มนายหน้าสำเร็จ แต่สร้างลูกหนี้ไม่ได้: ' + err3.message,
            id: agentId, agent_code
          })
        }

        // รวม path ไฟล์ลูกหนี้
        const allImagePaths = []
        if (files['debtor_id_card']) {
          files['debtor_id_card'].forEach(f => allImagePaths.push(`uploads/id-cards/${f.filename}`))
        }
        if (files['property_image']) {
          files['property_image'].forEach(f => allImagePaths.push(`uploads/properties/${f.filename}`))
        }
        if (files['building_permit']) {
          files['building_permit'].forEach(f => allImagePaths.push(`uploads/permits/${f.filename}`))
        }
        if (files['property_video']) {
          files['property_video'].forEach(f => allImagePaths.push(`uploads/videos/${f.filename}`))
        }
        const imagesJson = allImagePaths.length > 0 ? JSON.stringify(allImagePaths) : null

        const deedPaths = []
        if (files['deed_image']) {
          files['deed_image'].forEach(f => deedPaths.push(`uploads/deeds/${f.filename}`))
        }
        const deedImagesJson = deedPaths.length > 0 ? JSON.stringify(deedPaths) : null

        const debtorSql = `
          INSERT INTO loan_requests
            (debtor_code, source, contact_name, contact_phone,
             property_type, has_obligation, obligation_count,
             province, district, subdistrict,
             house_no, village_name, additional_details,
             location_url, deed_number, deed_type, land_area,
             loan_type_detail,
             desired_amount, interest_rate, occupation, monthly_income,
             loan_purpose, contract_years, net_desired_amount,
             images, deed_images, agent_id, status)
          VALUES (?, 'agent', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
        `
        const debtorParams = [
          debtor_code, contact_name, contact_phone,
          property_type || null,
          has_obligation || 'no', obligation_count || null,
          province || '', district || null, subdistrict || null,
          house_no || null, village_name || null, additional_details || null,
          location_url || null, deed_number || null, deed_type || null, land_area || null,
          loan_type_detail || null,
          desired_amount || null, interest_rate || null, occupation || null, monthly_income || null,
          loan_purpose || null, contract_years || null, net_desired_amount || null,
          imagesJson, deedImagesJson,
          agentId
        ]

        db.query(debtorSql, debtorParams, (err4, debtorResult) => {
          if (err4) {
            return res.json({
              success: true,
              message: 'เพิ่มนายหน้าสำเร็จ แต่สร้างลูกหนี้ผิดพลาด: ' + err4.message,
              id: agentId, agent_code
            })
          }

          res.json({
            success: true,
            message: 'ลงทะเบียนนายหน้า + ลูกหนี้สำเร็จ',
            id: agentId, agent_code,
            debtor_id: debtorResult.insertId, debtor_code
          })
        })
      })
    })
  })
}

// ========== แก้ไขนายหน้า (รองรับ FormData + อัพโหลดบัตรประชาชน) ==========
exports.updateAgent = (req, res) => {
  const { id } = req.params
  const { full_name, nickname, phone, email, line_id, commission_rate, status } = req.body

  const fields = ['full_name=?', 'nickname=?', 'phone=?', 'email=?', 'line_id=?', 'commission_rate=?', 'status=?']
  const values = [full_name, nickname || null, phone, email || null, line_id || null, commission_rate || 0, status || 'active']

  // อัพโหลดบัตรประชาชนใหม่ (ถ้ามี)
  const files = req.files || {}
  if (files['id_card_image'] && files['id_card_image'].length > 0) {
    const idCardPath = `uploads/id-cards/${files['id_card_image'][0].filename}`
    fields.push('id_card_image=?')
    values.push(idCardPath)
  }

  values.push(id)
  const sql = `UPDATE agents SET ${fields.join(', ')} WHERE id=?`
  db.query(sql, values, (err) => {
    if (err) return res.status(500).json({ success: false, message: 'Server Error' })
    res.json({ success: true, message: 'อัพเดทนายหน้าสำเร็จ' })
  })
}

// ========== ลบนายหน้า (พร้อมลบรูปบัตรประชาชน) ==========
exports.deleteAgent = (req, res) => {
  const { id } = req.params

  // ตรวจสอบว่ามีเคสที่ผูกอยู่ไหม
  db.query('SELECT id FROM cases WHERE agent_id = ?', [id], (err, cases) => {
    if (err) return res.status(500).json({ success: false, message: 'Server Error' })
    if (cases.length > 0) {
      return res.status(400).json({ success: false, message: 'ไม่สามารถลบได้ เนื่องจากมีเคสที่ผูกกับนายหน้านี้อยู่' })
    }

    // ดึง path รูปก่อนลบ
    db.query('SELECT id_card_image FROM agents WHERE id = ?', [id], (err1, rows) => {
      if (err1) return res.status(500).json({ success: false, message: 'Server Error' })
      if (rows.length === 0) return res.status(404).json({ success: false, message: 'ไม่พบข้อมูลนายหน้า' })

      const { id_card_image } = rows[0]

      db.query('DELETE FROM agents WHERE id = ?', [id], (err2, result) => {
        if (err2) return res.status(500).json({ success: false, message: 'Server Error' })
        if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'ไม่พบข้อมูลนายหน้า' })

        // ลบไฟล์บัตรประชาชน
        if (id_card_image) {
          const fullPath = path.join(__dirname, '..', id_card_image)
          if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath)
        }

        res.json({ success: true, message: 'ลบนายหน้าและไฟล์ที่เกี่ยวข้องสำเร็จ' })
      })
    })
  })
}

// ========== ดึงข้อมูลเคสตาม ID (พร้อมข้อมูลคู่กัน: ลูกหนี้ + นายหน้า) ==========
exports.getCaseById = (req, res) => {
  const { id } = req.params
  const sql = `
    SELECT
      c.id, c.case_code, c.loan_request_id, c.user_id,
      c.agent_id, c.assigned_sales_id,
      c.status, c.payment_status,
      lr.appraisal_fee, c.approved_amount, c.note,
      lr.appraisal_type, lr.appraisal_date, c.payment_date,
      lr.slip_image, lr.appraisal_book_image,
      c.recorded_by, c.recorded_at,
      c.transaction_date, c.transaction_time, c.transaction_land_office,
      c.transaction_note, c.transaction_recorded_by, c.transaction_recorded_at,
      c.created_at, c.updated_at,

      lr.debtor_code, lr.contact_name, lr.contact_phone, lr.contact_line,
      lr.property_type, lr.loan_type, lr.loan_type_detail,
      lr.property_address, lr.province, lr.district, lr.subdistrict,
      lr.house_no, lr.village_name, lr.additional_details,
      lr.location_url, lr.deed_number,
      lr.land_area, lr.building_area,
      lr.estimated_value, lr.loan_amount, lr.loan_duration,
      lr.interest_rate, lr.desired_amount, lr.occupation,
      lr.monthly_income, lr.loan_purpose, lr.marital_status, lr.contract_years, lr.net_desired_amount,
      lr.has_obligation, lr.obligation_count,
      lr.images, lr.appraisal_images, lr.deed_images,
      lr.preferred_contact, lr.source,
      lr.admin_note AS debtor_note,
      lr.status AS debtor_status,

      lr.appraisal_result, lr.appraisal_note, lr.appraisal_recorded_by, lr.appraisal_recorded_at,
      lr.outside_result, lr.outside_reason, lr.outside_recorded_at,
      lr.inside_result, lr.inside_reason, lr.inside_recorded_at,
      lr.check_price_value, lr.check_price_detail, lr.check_price_recorded_at,

      a.agent_code, a.full_name AS agent_name,
      a.phone AS agent_phone,
      a.nickname AS agent_nickname,
      a.email AS agent_email,
      a.line_id AS agent_line_id,
      a.commission_rate,

      au.full_name AS sales_name,
      au.nickname AS sales_nickname,

      at2.id AS approval_id, at2.approval_type, at2.approved_credit,
      at2.interest_per_year, at2.interest_per_month, at2.operation_fee,
      at2.land_tax_estimate, at2.advance_interest, at2.approval_status,
      at2.credit_table_file, at2.approval_date AS approval_approval_date,

      auc.house_reg_book, auc.house_reg_book_legal,
      auc.name_change_doc, auc.divorce_doc,
      auc.spouse_consent_doc, auc.spouse_id_card, auc.spouse_reg_copy,
      auc.marriage_cert, auc.spouse_name_change_doc
    FROM cases c
    LEFT JOIN loan_requests lr ON lr.id = c.loan_request_id
    LEFT JOIN agents a ON a.id = c.agent_id
    LEFT JOIN admin_users au ON au.id = c.assigned_sales_id
    LEFT JOIN approval_transactions at2 ON at2.loan_request_id = c.loan_request_id
    LEFT JOIN auction_transactions auc ON auc.case_id = c.id
    WHERE c.id = ?
  `
  db.query(sql, [id], (err, results) => {
    if (err) {
      console.error('getCaseById error:', err)
      return res.status(500).json({ success: false, message: 'Server Error' })
    }
    if (results.length === 0) return res.status(404).json({ success: false, message: 'ไม่พบข้อมูลเคส' })
    res.json({ success: true, caseData: results[0] })
  })
}

// ========== อัพเดทสถานะชำระ ใน loan_requests (ก่อนมีเคส — inline จาก DebtorsTab) ==========
exports.updateDebtorPaymentStatus = (req, res) => {
  const { id } = req.params
  const { payment_status } = req.body
  if (!['paid', 'unpaid'].includes(payment_status)) {
    return res.status(400).json({ success: false, message: 'สถานะไม่ถูกต้อง' })
  }
  db.query('UPDATE loan_requests SET payment_status = ? WHERE id = ?', [payment_status, id], (err) => {
    if (err) {
      console.error('updateDebtorPaymentStatus error:', err)
      return res.status(500).json({ success: false, message: 'Server Error' })
    }
    res.json({ success: true })
  })
}

// ========== อัพเดทประเภทสินเชื่อ (inline จาก CaseEditPage) ==========
exports.updateLoanType = (req, res) => {
  const { id } = req.params
  const { loan_type_detail } = req.body
  db.query('UPDATE loan_requests SET loan_type_detail = ? WHERE id = ?', [loan_type_detail || null, id], (err) => {
    if (err) {
      console.error('updateLoanType error:', err)
      return res.status(500).json({ success: false, message: 'Server Error' })
    }
    res.json({ success: true })
  })
}

// ========== อัพเดทเคส (รองรับทุกฟิลด์ + อัพโหลดสลิป/เล่มประเมิน) ==========
exports.updateCaseStatus = (req, res) => {
  const { id } = req.params
  const body = req.body || {}
  const {
    status, payment_status, approved_amount, appraisal_fee,
    agent_id, loan_request_id, assigned_sales_id, note,
    appraisal_type, appraisal_result, appraisal_date, payment_date,
    recorded_by, recorded_at,
    transaction_date, transaction_time, transaction_land_office,
    transaction_note, transaction_recorded_by
  } = body

  const fields = []
  const values = []

  if (status) { fields.push('status=?'); values.push(status) }
  if (payment_status) { fields.push('payment_status=?'); values.push(payment_status) }
  if (approved_amount !== undefined) { fields.push('approved_amount=?'); values.push(approved_amount || null) }
  if (appraisal_fee !== undefined) { fields.push('appraisal_fee=?'); values.push(appraisal_fee || 2900) }
  if (agent_id !== undefined) { fields.push('agent_id=?'); values.push(agent_id || null) }
  if (loan_request_id !== undefined) { fields.push('loan_request_id=?'); values.push(loan_request_id || null) }
  if (assigned_sales_id !== undefined) { fields.push('assigned_sales_id=?'); values.push(assigned_sales_id || null) }
  if (note !== undefined) { fields.push('note=?'); values.push(note || null) }

  if (appraisal_type !== undefined) { fields.push('appraisal_type=?'); values.push(appraisal_type || 'outside') }
  if (appraisal_result !== undefined) { fields.push('appraisal_result=?'); values.push(appraisal_result || null) }
  if (appraisal_date !== undefined) { fields.push('appraisal_date=?'); values.push(appraisal_date || null) }
  if (payment_date !== undefined) { fields.push('payment_date=?'); values.push(payment_date || null) }
  if (recorded_by !== undefined) { fields.push('recorded_by=?'); values.push(recorded_by || null) }
  if (recorded_at !== undefined) { fields.push('recorded_at=?'); values.push(recorded_at || null) }

  // ข้อมูลการทำธุรกรรม (ฝ่ายขาย → ฝ่ายนิติกรรม)
  if (transaction_date !== undefined) { fields.push('transaction_date=?'); values.push(transaction_date || null) }
  if (transaction_time !== undefined) { fields.push('transaction_time=?'); values.push(transaction_time || null) }
  if (transaction_land_office !== undefined) { fields.push('transaction_land_office=?'); values.push(transaction_land_office || null) }
  if (transaction_note !== undefined) { fields.push('transaction_note=?'); values.push(transaction_note || null) }
  if (transaction_recorded_by !== undefined) {
    fields.push('transaction_recorded_by=?'); values.push(transaction_recorded_by || null)
    fields.push('transaction_recorded_at=?'); values.push(transaction_recorded_by ? new Date() : null)
  }

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

  values.push(id)
  const sql = `UPDATE cases SET ${fields.join(', ')} WHERE id=?`
  db.query(sql, values, (err) => {
    if (err) {
      console.error('updateCaseStatus error:', err)
      return res.status(500).json({ success: false, message: 'Server Error' })
    }

    // ===== sync loan_requests.status ให้ตรงกับ cases.status =====
    if (status) {
      const statusMap = {
        'pending_approve': 'reviewing',
        'incomplete': 'reviewing',
        'credit_approved': 'approved',
        'pending_auction': 'approved',
        'legal_scheduled': 'approved',
        'legal_completed': 'approved',
        'preparing_docs': 'matched',
        'completed': 'matched',
        'cancelled': 'cancelled'
      }
      const lrStatus = statusMap[status]
      if (lrStatus) {
        db.query('SELECT loan_request_id FROM cases WHERE id = ?', [id], (err2, rows) => {
          if (!err2 && rows.length > 0 && rows[0].loan_request_id) {
            db.query('UPDATE loan_requests SET status = ? WHERE id = ?', [lrStatus, rows[0].loan_request_id], () => {})

            // ===== ส่งแจ้งเตือน (ลูกค้า + ภายใน) =====
            const io = req.app.get('io')
            const userId = req.user ? req.user.id : null
            notifyStatusChange(rows[0].loan_request_id, parseInt(id), null, status, io, userId)
          }
        })
      }
    }

    res.json({ success: true, message: 'อัพเดทเคสสำเร็จ' })
  })
}

// ========== ดึงข้อมูลลูกหนี้ตาม ID (พร้อมนายหน้าทุกคนที่เชื่อมผ่านเคส) ==========
exports.getDebtorById = (req, res) => {
  const { id } = req.params

  // ดึงข้อมูลลูกหนี้
  db.query('SELECT * FROM loan_requests WHERE id = ?', [id], (err, lrRows) => {
    if (err) return res.status(500).json({ success: false, message: 'Server Error' })
    if (lrRows.length === 0) return res.status(404).json({ success: false, message: 'ไม่พบข้อมูลลูกหนี้' })

    var debtor = lrRows[0]

    // ดึงเคสทั้งหมดของลูกหนี้คนนี้ (1 ลูกหนี้มีได้หลายเคส, แต่ละเคสอาจมีนายหน้าต่างกัน)
    db.query(
      `SELECT c.id AS case_id, c.case_code, c.status AS case_status,
              c.payment_status, c.approved_amount, c.agent_id,
              lr.appraisal_book_image, lr.appraisal_result, lr.appraisal_type,
              lr.check_price_value, lr.outside_result, lr.inside_result,
              a.agent_code, a.full_name AS agent_name, a.phone AS agent_phone,
              a.nickname AS agent_nickname, a.commission_rate,
              at2.credit_table_file, at2.approved_credit
       FROM cases c
       LEFT JOIN loan_requests lr ON lr.id = c.loan_request_id
       LEFT JOIN agents a ON a.id = c.agent_id
       LEFT JOIN approval_transactions at2 ON at2.loan_request_id = c.loan_request_id
       WHERE c.loan_request_id = ?
       ORDER BY c.created_at DESC`,
      [id],
      (err2, caseRows) => {
        if (err2) caseRows = []

        // ย้อนกลับได้: ใส่ case_id, agent ของเคสล่าสุดไว้ใน debtor ด้วย (backward compatible)
        var latestCase = (caseRows && caseRows.length > 0) ? caseRows[0] : {}
        debtor.case_id = latestCase.case_id || null
        debtor.case_code = latestCase.case_code || null
        debtor.case_status = latestCase.case_status || null
        debtor.payment_status = latestCase.payment_status || null
        debtor.credit_table_file = latestCase.credit_table_file || null
        debtor.approved_credit = latestCase.approved_credit || null

        // agent_id: ใช้จากเคสล่าสุดก่อน, fallback เป็น loan_requests.agent_id (กรณียังไม่มีเคส)
        var caseAgentId = latestCase.agent_id || null
        debtor.agent_id = caseAgentId || debtor.agent_id || null
        debtor.agent_code = latestCase.agent_code || null
        debtor.agent_name = latestCase.agent_name || null
        debtor.agent_phone = latestCase.agent_phone || null
        debtor.agent_nickname = latestCase.agent_nickname || null
        debtor.commission_rate = latestCase.commission_rate || null

        // ===== ฟังก์ชันส่ง response สุดท้าย =====
        const sendResponse = () => {
          // ถ้าไม่มีเคส แต่มี agent_id ใน loan_requests → ดึงข้อมูลนายหน้า
          if (!caseAgentId && debtor.agent_id) {
            db.query('SELECT id, agent_code, full_name, phone, nickname, commission_rate FROM agents WHERE id = ?', [debtor.agent_id], function(errA, agentRows) {
              if (!errA && agentRows && agentRows.length > 0) {
                var ag = agentRows[0]
                debtor.agent_code = ag.agent_code
                debtor.agent_name = ag.full_name
                debtor.agent_phone = ag.phone
                debtor.agent_nickname = ag.nickname
                debtor.commission_rate = ag.commission_rate
              }
              return res.json({ success: true, debtor: debtor, linked_cases: caseRows || [] })
            })
            return
          }
          res.json({ success: true, debtor: debtor, linked_cases: caseRows || [] })
        }

        // ===== ถ้ายังไม่มี credit_table_file จาก case → ลองดึงจาก approval_transactions ตรงๆ =====
        if (!debtor.credit_table_file || !debtor.approved_credit) {
          db.query(
            'SELECT credit_table_file, approved_credit FROM approval_transactions WHERE loan_request_id = ? ORDER BY id DESC LIMIT 1',
            [id],
            (errAt, atRows) => {
              if (!errAt && atRows && atRows.length > 0) {
                if (!debtor.credit_table_file) debtor.credit_table_file = atRows[0].credit_table_file || null
                if (!debtor.approved_credit) debtor.approved_credit = atRows[0].approved_credit || null
              }
              sendResponse()
            }
          )
        } else {
          sendResponse()
        }
      }
    )
  })
}

// ========== แก้ไขลูกหนี้ (รองรับ FormData + อัพโหลดไฟล์ใหม่) ==========
exports.updateDebtor = (req, res) => {
  const { id } = req.params
  const body = req.body || {}
  const {
    source, contact_name, contact_phone, contact_line,
    preferred_contact, property_type, loan_type, loan_type_detail,
    property_address, province, district, subdistrict,
    house_no, village_name, additional_details,
    land_area, building_area, estimated_value,
    interest_rate, desired_amount, loan_amount, loan_duration, admin_note,
    occupation, monthly_income, loan_purpose, marital_status, contract_years, net_desired_amount,
    has_obligation, obligation_count,
    location_url, deed_number, deed_type, preliminary_terms, agent_id
  } = body

  if (!contact_name || !contact_phone) {
    return res.status(400).json({ success: false, message: 'กรุณากรอกชื่อและเบอร์โทร' })
  }

  db.query('SELECT images, deed_images FROM loan_requests WHERE id = ?', [id], (err0, rows) => {
    if (err0) return res.status(500).json({ success: false, message: 'Server Error' })
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'ไม่พบข้อมูลลูกหนี้' })

    let existingImages = []
    let existingDeedImages = []
    try { existingImages = JSON.parse(rows[0].images) || [] } catch { existingImages = [] }
    try { existingDeedImages = JSON.parse(rows[0].deed_images) || [] } catch { existingDeedImages = [] }

    const files = req.files || {}
    const newImagePaths = [...existingImages]
    if (files['id_card_image']) {
      files['id_card_image'].forEach(f => newImagePaths.push(`uploads/id-cards/${f.filename}`))
    }
    if (files['property_image']) {
      files['property_image'].forEach(f => newImagePaths.push(`uploads/properties/${f.filename}`))
    }
    if (files['building_permit']) {
      files['building_permit'].forEach(f => newImagePaths.push(`uploads/permits/${f.filename}`))
    }
    if (files['property_video']) {
      files['property_video'].forEach(f => newImagePaths.push(`uploads/videos/${f.filename}`))
    }
    const imagesJson = newImagePaths.length > 0 ? JSON.stringify(newImagePaths) : null

    const newDeedPaths = [...existingDeedImages]
    if (files['deed_image']) {
      files['deed_image'].forEach(f => newDeedPaths.push(`uploads/deeds/${f.filename}`))
    }
    const deedImagesJson = newDeedPaths.length > 0 ? JSON.stringify(newDeedPaths) : null

    const sql = `
      UPDATE loan_requests SET
        source=?, contact_name=?, contact_phone=?, contact_line=?,
        preferred_contact=?, property_type=?, loan_type=?, loan_type_detail=?,
        property_address=?, province=?, district=?, subdistrict=?,
        house_no=?, village_name=?, additional_details=?,
        land_area=?, building_area=?, estimated_value=?,
        interest_rate=?, desired_amount=?,
        loan_amount=?, loan_duration=?, admin_note=?,
        occupation=?, monthly_income=?, loan_purpose=?, marital_status=?, contract_years=?, net_desired_amount=?,
        has_obligation=?, obligation_count=?,
        location_url=?, deed_number=?, deed_type=?, preliminary_terms=?,
        images=?, deed_images=?,
        agent_id=?
      WHERE id=?
    `
    const params = [
      source || null, contact_name, contact_phone,
      contact_line || null, preferred_contact || 'phone',
      property_type || null, loan_type || null, loan_type_detail || null,
      property_address || '', province || '',
      district || null, subdistrict || null,
      house_no || null, village_name || null, additional_details || null,
      land_area || null, building_area || null,
      estimated_value || null,
      interest_rate || null, desired_amount || null,
      loan_amount || 0, loan_duration || 12, admin_note || null,
      occupation || null, monthly_income || null, loan_purpose || null,
      marital_status || null, contract_years || null, net_desired_amount || null,
      has_obligation || 'no', obligation_count || null,
      location_url || null, deed_number || null, deed_type || null, preliminary_terms || null,
      imagesJson, deedImagesJson,
      agent_id || null,
      id
    ]

    db.query(sql, params, (err, result) => {
      if (err) {
        console.error('updateDebtor error:', err)
        return res.status(500).json({ success: false, message: 'Server Error' })
      }
      if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'ไม่พบข้อมูลลูกหนี้' })
      res.json({ success: true, message: 'อัพเดทข้อมูลลูกหนี้สำเร็จ' })
    })
  })
}

// ========== ลบรูปทีละรูปจาก JSON array (loan_requests) ==========
exports.removeDebtorImage = (req, res) => {
  const { debtor_id, field, image_path } = req.body

  if (!['images', 'deed_images'].includes(field)) {
    return res.status(400).json({ success: false, message: 'Field not allowed' })
  }
  if (!debtor_id || !image_path) {
    return res.status(400).json({ success: false, message: 'Missing debtor_id or image_path' })
  }

  db.query(`SELECT ${field} FROM loan_requests WHERE id = ?`, [debtor_id], (err, rows) => {
    if (err) return res.status(500).json({ success: false, message: 'Server Error' })
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'ไม่พบลูกหนี้' })

    let arr = []
    try { arr = JSON.parse(rows[0][field]) || [] } catch { arr = [] }

    const newArr = arr.filter(p => p !== image_path)
    const newJson = newArr.length > 0 ? JSON.stringify(newArr) : null

    db.query(`UPDATE loan_requests SET ${field} = ? WHERE id = ?`, [newJson, debtor_id], (err2) => {
      if (err2) return res.status(500).json({ success: false, message: 'Server Error' })

      const fullPath = path.join(__dirname, '..', image_path)
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath)
        console.log('Deleted file:', fullPath)
      }

      res.json({ success: true, message: 'ลบรูปสำเร็จ' })
    })
  })
}

// ========== อัพโหลดรูปลูกหนี้เพิ่ม (ใช้จาก CaseEditPage) ==========
exports.uploadDebtorImages = (req, res) => {
  const { id } = req.params
  const files = req.files || {}

  if (Object.keys(files).length === 0) {
    return res.status(400).json({ success: false, message: 'ไม่มีไฟล์ที่อัพโหลด' })
  }

  db.query('SELECT images, deed_images FROM loan_requests WHERE id = ?', [id], (err, rows) => {
    if (err) return res.status(500).json({ success: false, message: 'Server Error' })
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'ไม่พบลูกหนี้' })

    let existingImages = []
    let existingDeedImages = []
    try { existingImages = JSON.parse(rows[0].images) || [] } catch { existingImages = [] }
    try { existingDeedImages = JSON.parse(rows[0].deed_images) || [] } catch { existingDeedImages = [] }

    const newImagePaths = [...existingImages]
    if (files['id_card_image']) {
      files['id_card_image'].forEach(f => newImagePaths.push(`uploads/id-cards/${f.filename}`))
    }
    if (files['property_image']) {
      files['property_image'].forEach(f => newImagePaths.push(`uploads/properties/${f.filename}`))
    }
    if (files['building_permit']) {
      files['building_permit'].forEach(f => newImagePaths.push(`uploads/permits/${f.filename}`))
    }
    if (files['property_video']) {
      files['property_video'].forEach(f => newImagePaths.push(`uploads/videos/${f.filename}`))
    }
    const imagesJson = newImagePaths.length > 0 ? JSON.stringify(newImagePaths) : null

    const newDeedPaths = [...existingDeedImages]
    if (files['deed_image']) {
      files['deed_image'].forEach(f => newDeedPaths.push(`uploads/deeds/${f.filename}`))
    }
    const deedImagesJson = newDeedPaths.length > 0 ? JSON.stringify(newDeedPaths) : null

    db.query('UPDATE loan_requests SET images = ?, deed_images = ? WHERE id = ?',
      [imagesJson, deedImagesJson, id], (err2) => {
        if (err2) return res.status(500).json({ success: false, message: 'Server Error' })
        res.json({ success: true, images: imagesJson, deed_images: deedImagesJson })
      }
    )
  })
}

// ========== Helper: ลบไฟล์จาก JSON path array ==========
function deleteFiles(jsonStr) {
  if (!jsonStr) return
  try {
    const paths = JSON.parse(jsonStr)
    if (!Array.isArray(paths)) return
    paths.forEach(filePath => {
      const fullPath = path.join(__dirname, '..', filePath)
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath)
        console.log('Deleted file:', fullPath)
      }
    })
  } catch (e) {
    console.error('deleteFiles error:', e.message)
  }
}

// ========== ลบลูกหนี้ (พร้อมลบรูปที่อัพโหลด) ==========
exports.deleteDebtor = (req, res) => {
  const { id } = req.params

  db.query('SELECT id FROM cases WHERE loan_request_id = ?', [id], (err, cases) => {
    if (err) return res.status(500).json({ success: false, message: 'Server Error' })
    if (cases.length > 0) {
      return res.status(400).json({ success: false, message: 'ไม่สามารถลบได้ เนื่องจากมีเคสที่ผูกกับลูกหนี้นี้อยู่' })
    }

    db.query('SELECT images, deed_images FROM loan_requests WHERE id = ?', [id], (err1, rows) => {
      if (err1) return res.status(500).json({ success: false, message: 'Server Error' })
      if (rows.length === 0) return res.status(404).json({ success: false, message: 'ไม่พบข้อมูลลูกหนี้' })

      const { images, deed_images } = rows[0]

      db.query('DELETE FROM loan_requests WHERE id = ?', [id], (err2, result) => {
        if (err2) return res.status(500).json({ success: false, message: 'Server Error' })
        if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'ไม่พบข้อมูลลูกหนี้' })

        deleteFiles(images)
        deleteFiles(deed_images)

        res.json({ success: true, message: 'ลบลูกหนี้และไฟล์ที่เกี่ยวข้องสำเร็จ' })
      })
    })
  })
}

// ========== ลบเคส (พร้อมลบรูปสลิป + เล่มประเมิน) ==========
exports.deleteCase = (req, res) => {
  const { id } = req.params

  db.query('SELECT slip_image, appraisal_book_image, loan_request_id FROM cases WHERE id = ?', [id], (err0, rows) => {
    if (err0) return res.status(500).json({ success: false, message: 'Server Error' })
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'ไม่พบข้อมูลเคส' })

    const { slip_image, appraisal_book_image, loan_request_id } = rows[0]

    db.query('DELETE FROM cases WHERE id = ?', [id], (err1, result) => {
      if (err1) return res.status(500).json({ success: false, message: 'Server Error' })
      if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'ไม่พบข้อมูลเคส' })

      if (slip_image) {
        const fullPath = path.join(__dirname, '..', slip_image)
        if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath)
      }
      if (appraisal_book_image) {
        const fullPath = path.join(__dirname, '..', appraisal_book_image)
        if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath)
      }

      if (loan_request_id) {
        db.query('UPDATE loan_requests SET status = ? WHERE id = ?', ['pending', loan_request_id])
      }

      res.json({ success: true, message: 'ลบเคสและไฟล์ที่เกี่ยวข้องสำเร็จ' })
    })
  })
}

// ========== สถิติฝ่ายขาย ==========
exports.getSalesStats = (req, res) => {
  const sql = `
    SELECT
      SUM(CASE WHEN status = 'pending_approve' THEN 1 ELSE 0 END) AS pending_approve,
      SUM(CASE WHEN status = 'incomplete' THEN 1 ELSE 0 END) AS incomplete,
      SUM(CASE WHEN status = 'pending_auction' THEN 1 ELSE 0 END) AS pending_auction,
      SUM(CASE WHEN status = 'preparing_docs' THEN 1 ELSE 0 END) AS preparing_docs,
      SUM(CASE WHEN status = 'legal_completed' THEN 1 ELSE 0 END) AS legal_completed,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed,
      SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled,
      COALESCE(SUM(approved_amount), 0) AS total_approved,
      (SELECT COUNT(*) FROM loan_requests) AS total_debtors,
      (SELECT COUNT(*) FROM agents) AS total_agents
    FROM cases
  `
  db.query(sql, (err, results) => {
    if (err) {
      console.error('getSalesStats error:', err)
      return res.status(500).json({ success: false, message: 'Server Error' })
    }
    res.json({ success: true, stats: results[0] })
  })
}

// ========== Auto-matching: ค้นหาคู่ลูกหนี้-นายหน้าจากเบอร์โทร/ชื่อ ==========
exports.findMatch = (req, res) => {
  const { type, phone, name } = req.query

  if (!phone && !name) {
    return res.json({ success: true, matches: [] })
  }

  var sql, params

  if (type === 'agent') {
    // ค้นหานายหน้าที่ match กับลูกหนี้
    sql = `SELECT id, agent_code, full_name, phone, nickname, commission_rate
           FROM agents WHERE 1=1`
    params = []
    if (phone) { sql += ' AND phone = ?'; params.push(phone) }
    if (name) { sql += ' AND (full_name LIKE ? OR nickname LIKE ?)'; params.push('%' + name + '%', '%' + name + '%') }
    sql += ' LIMIT 10'
  } else {
    // ค้นหาลูกหนี้ที่ match กับนายหน้า
    sql = `SELECT id, debtor_code, contact_name, contact_phone, property_type, province
           FROM loan_requests WHERE 1=1`
    params = []
    if (phone) { sql += ' AND contact_phone = ?'; params.push(phone) }
    if (name) { sql += ' AND contact_name LIKE ?'; params.push('%' + name + '%') }
    sql += ' LIMIT 10'
  }

  db.query(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ success: false, message: 'Server Error' })
    res.json({ success: true, matches: rows || [] })
  })
}