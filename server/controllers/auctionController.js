const db = require('../config/db')
const { notifyStatusChange } = require('./notificationController')

// ========== สถิติฝ่ายประมูลทรัพย์ ==========
exports.getStats = (req, res) => {
  const sql = `
    SELECT
      (SELECT COUNT(*) FROM cases c LEFT JOIN auction_transactions auc ON auc.case_id = c.id WHERE auc.id IS NULL OR auc.auction_status = 'pending') AS pending_count,
      (SELECT COUNT(*) FROM auction_transactions WHERE auction_status = 'auctioned') AS auctioned_count,
      (SELECT COUNT(*) FROM auction_transactions WHERE auction_status = 'cancelled') AS cancelled_count,
      (SELECT COUNT(*) FROM cases) AS total_count
  `
  db.query(sql, (err, results) => {
    if (err) {
      console.error('getStats error:', err)
      return res.json({ success: true, stats: { pending_count: 0, auctioned_count: 0, cancelled_count: 0, total_count: 0 } })
    }
    res.json({ success: true, stats: results[0] })
  })
}

// ========== รายการเคสสำหรับฝ่ายประมูลทรัพย์ ==========
exports.getAuctionCases = (req, res) => {
  const { status, date } = req.query

  let sql = `
    SELECT
      c.id AS case_id, c.case_code, c.status AS case_status,
      lr.appraisal_result, lr.appraisal_type, lr.appraisal_book_image,
      lr.debtor_code, lr.contact_name AS debtor_name,
      lr.contact_phone AS debtor_phone,
      lr.province, lr.district, lr.property_address, lr.location_url,
      lr.images, lr.appraisal_images, lr.deed_images,
      a.full_name AS agent_name,
      auc.id AS auction_id, auc.investor_id, auc.investor_name, auc.investor_code,
      auc.investor_phone, auc.auction_status,
      auc.created_at AS auction_created_at, auc.updated_at AS auction_updated_at,
      auc.house_reg_book, auc.house_reg_book_legal,
      auc.name_change_doc, auc.divorce_doc,
      auc.spouse_consent_doc, auc.spouse_id_card, auc.spouse_reg_copy,
      auc.marriage_cert, auc.spouse_name_change_doc
    FROM cases c
    LEFT JOIN loan_requests lr ON lr.id = c.loan_request_id
    LEFT JOIN agents a ON a.id = c.agent_id
    LEFT JOIN auction_transactions auc ON auc.case_id = c.id
    WHERE 1=1
  `

  const params = []
  if (status) {
    if (status === 'pending') {
      sql += ' AND (auc.auction_status = ? OR auc.id IS NULL)'
      params.push(status)
    } else {
      sql += ' AND auc.auction_status = ?'
      params.push(status)
    }
  }
  if (date) {
    sql += ' AND (DATE(auc.updated_at) = ? OR DATE(c.created_at) = ?)'
    params.push(date, date)
  }

  sql += ' ORDER BY c.id DESC'

  db.query(sql, params, (err, results) => {
    if (err) {
      console.error('getAuctionCases error:', err)
      return res.status(500).json({ success: false, message: 'Server Error' })
    }
    res.json({ success: true, data: results })
  })
}

// ========== ดึงข้อมูลเคสเดี่ยว (หน้าแก้ไข) ==========
exports.getAuctionDetail = (req, res) => {
  const { caseId } = req.params

  db.query('SELECT id FROM auction_transactions WHERE case_id = ?', [caseId], (err0, existing) => {
    if (err0) {
      console.error('getAuctionDetail check error:', err0)
      return res.status(500).json({ success: false, message: 'Server Error' })
    }

    if (!existing || existing.length === 0) {
      db.query(
        'INSERT INTO auction_transactions (case_id, auction_status, created_at, updated_at) VALUES (?, ?, NOW(), NOW())',
        [caseId, 'pending'],
        (errInsert) => {
          if (errInsert) {
            console.error('getAuctionDetail insert error:', errInsert)
            return res.status(500).json({ success: false, message: 'Server Error' })
          }
          fetchAuctionDetail(caseId, res)
        }
      )
    } else {
      fetchAuctionDetail(caseId, res)
    }
  })
}

function fetchAuctionDetail(caseId, res) {
  const sql = `
    SELECT
      c.*,
      lr.debtor_code, lr.contact_name, lr.contact_phone, lr.contact_line,
      lr.property_type, lr.province, lr.district, lr.subdistrict,
      lr.property_address, lr.location_url,
      lr.deed_number, lr.land_area, lr.has_obligation, lr.obligation_count,
      lr.images, lr.appraisal_images, lr.deed_images,
      a.full_name AS agent_name,
      auc.id AS auction_id,
      auc.investor_id, auc.investor_name, auc.investor_code, auc.investor_phone,
      auc.investor_type, auc.property_value,
      auc.selling_pledge_amount, auc.interest_rate,
      auc.auction_land_area, auc.contract_years,
      auc.is_cancelled, auc.auction_status,
      auc.recorded_by, auc.recorded_at,
      auc.created_at AS auction_created_at, auc.updated_at AS auction_updated_at,
      auc.house_reg_book, auc.house_reg_book_legal,
      auc.name_change_doc, auc.divorce_doc,
      auc.spouse_consent_doc, auc.spouse_id_card, auc.spouse_reg_copy,
      auc.marriage_cert, auc.spouse_name_change_doc
    FROM cases c
    LEFT JOIN loan_requests lr ON lr.id = c.loan_request_id
    LEFT JOIN agents a ON a.id = c.agent_id
    LEFT JOIN auction_transactions auc ON auc.case_id = c.id
    WHERE c.id = ?
  `
  db.query(sql, [caseId], (err, results) => {
    if (err) {
      console.error('fetchAuctionDetail error:', err)
      return res.status(500).json({ success: false, message: 'Server Error' })
    }
    if (results.length === 0) return res.status(404).json({ success: false, message: 'ไม่พบข้อมูลเคส' })
    res.json({ success: true, caseData: results[0] })
  })
}

// ========== อัพเดทเคส (ฝ่ายประมูลทรัพย์) ==========
exports.updateAuction = (req, res) => {
  const { caseId } = req.params
  const body = req.body || {}
  const {
    investor_id, investor_name, investor_code, investor_phone, investor_type,
    property_value, selling_pledge_amount, interest_rate,
    auction_land_area, contract_years,
    is_cancelled, auction_status, recorded_by, recorded_at
  } = body

  const buildAndExecuteUpdate = () => {
    const fields = []
    const values = []

    if (investor_id !== undefined) { fields.push('investor_id=?'); values.push(investor_id || null) }
    if (investor_name !== undefined) { fields.push('investor_name=?'); values.push(investor_name || null) }
    if (investor_code !== undefined) { fields.push('investor_code=?'); values.push(investor_code || null) }
    if (investor_phone !== undefined) { fields.push('investor_phone=?'); values.push(investor_phone || null) }
    if (investor_type !== undefined) { fields.push('investor_type=?'); values.push(investor_type || null) }
    if (property_value !== undefined) { fields.push('property_value=?'); values.push(property_value || null) }
    if (selling_pledge_amount !== undefined) { fields.push('selling_pledge_amount=?'); values.push(selling_pledge_amount || null) }
    if (interest_rate !== undefined) { fields.push('interest_rate=?'); values.push(interest_rate || null) }
    if (auction_land_area !== undefined) { fields.push('auction_land_area=?'); values.push(auction_land_area || null) }
    if (contract_years !== undefined) { fields.push('contract_years=?'); values.push(contract_years || null) }
    if (is_cancelled !== undefined) { fields.push('is_cancelled=?'); values.push(is_cancelled ? 1 : 0) }
    if (auction_status !== undefined) { fields.push('auction_status=?'); values.push(auction_status || 'pending') }
    if (recorded_by !== undefined) { fields.push('recorded_by=?'); values.push(recorded_by || null) }
    if (recorded_at !== undefined) { fields.push('recorded_at=?'); values.push(recorded_at || null) }

    if (fields.length === 0) return res.status(400).json({ success: false, message: 'ไม่มีข้อมูลที่จะอัพเดท' })

    values.push(caseId)
    const sql = `UPDATE auction_transactions SET ${fields.join(', ')} WHERE case_id=?`
    db.query(sql, values, (err) => {
      if (err) {
        console.error('updateAuction error:', err)
        return res.status(500).json({ success: false, message: 'Server Error' })
      }

      // ===== auto-sync cases.status ตาม workflow =====
      let newCaseStatus = null
      if (is_cancelled == 1 || is_cancelled === true) {
        newCaseStatus = 'cancelled'
      } else if (auction_status === 'auctioned') {
        newCaseStatus = 'auction_completed'
      } else if (auction_status === 'pending') {
        newCaseStatus = 'pending_auction'
      }

      // ===== auto-create History การประมูลนายทุน + History การถอนเงิน =====
      if (auction_status === 'auctioned' && investor_id) {
        // ดึง bid_amount ล่าสุดของนายทุนคนนี้จาก auction_bids เพื่อใช้เป็นราคาที่ชนะ
        db.query(
          'SELECT bid_amount FROM auction_bids WHERE case_id = ? AND investor_id = ? ORDER BY bid_date DESC, created_at DESC LIMIT 1',
          [caseId, investor_id],
          (errBid, bidRows) => {
            const winningPrice = (bidRows && bidRows.length > 0 && bidRows[0].bid_amount) ? bidRows[0].bid_amount : null

            // 1) สร้าง investor_auction_history (ถ้ายังไม่มีสำหรับ investor+case นี้)
            db.query(
              'SELECT id FROM investor_auction_history WHERE investor_id = ? AND case_id = ?',
              [investor_id, caseId],
              (errChk1, existingHistory) => {
                if (!errChk1 && (!existingHistory || existingHistory.length === 0)) {
                  db.query(
                    'INSERT INTO investor_auction_history (investor_id, case_id, auction_date, winning_price, note) VALUES (?, ?, NOW(), ?, ?)',
                    [investor_id, caseId, winningPrice, 'สร้างอัตโนมัติจากฝ่ายประมูล'],
                    (errIns1) => {
                      if (errIns1) console.error('auto-create investor_auction_history error:', errIns1)
                    }
                  )
                }
              }
            )

            // 2) สร้าง investor_withdrawals status='pending' (ถ้ายังไม่มีสำหรับ investor+case นี้)
            db.query(
              'SELECT id FROM investor_withdrawals WHERE investor_id = ? AND case_id = ?',
              [investor_id, caseId],
              (errChk2, existingWithdrawal) => {
                if (!errChk2 && (!existingWithdrawal || existingWithdrawal.length === 0)) {
                  db.query(
                    'INSERT INTO investor_withdrawals (investor_id, case_id, amount, withdrawal_date, status, note) VALUES (?, ?, ?, NULL, ?, ?)',
                    [investor_id, caseId, winningPrice || 0, 'pending', 'สร้างอัตโนมัติจากฝ่ายประมูล — รอดำเนินการ'],
                    (errIns2) => {
                      if (errIns2) console.error('auto-create investor_withdrawals error:', errIns2)
                    }
                  )
                }
              }
            )
          }
        )
      }

      if (newCaseStatus) {
        db.query('UPDATE cases SET status = ? WHERE id = ?', [newCaseStatus, caseId], (err2) => {
          if (err2) console.error('sync cases.status error:', err2)

          // sync loan_requests.status ให้ตรงกับ cases.status
          const statusMap = { 'cancelled': 'cancelled', 'auction_completed': 'matched', 'preparing_docs': 'matched', 'pending_auction': 'approved' }
          const lrStatus = statusMap[newCaseStatus]
          if (lrStatus) {
            db.query('SELECT loan_request_id FROM cases WHERE id = ?', [caseId], (err3, rows) => {
              if (!err3 && rows.length > 0 && rows[0].loan_request_id) {
                db.query('UPDATE loan_requests SET status = ? WHERE id = ?', [lrStatus, rows[0].loan_request_id], () => {})

                // ===== ส่งแจ้งเตือน (ลูกค้า + ภายใน) =====
                const io = req.app.get('io')
                const userId = req.user ? req.user.id : null
                const extraInfo = investor_name ? ('นายทุน: ' + investor_name) : ''
                notifyStatusChange(rows[0].loan_request_id, parseInt(caseId), null, newCaseStatus, io, userId, extraInfo)
              }
            })
          } else {
            // ===== ส่งแจ้งเตือนกรณีไม่ต้อง sync loan_requests =====
            db.query('SELECT loan_request_id FROM cases WHERE id = ?', [caseId], (err3, rows) => {
              if (!err3 && rows.length > 0 && rows[0].loan_request_id) {
                const io = req.app.get('io')
                const userId = req.user ? req.user.id : null
                notifyStatusChange(rows[0].loan_request_id, parseInt(caseId), null, newCaseStatus, io, userId)
              }
            })
          }

          res.json({ success: true, message: 'อัพเดทข้อมูลประมูลทรัพย์สำเร็จ' })
        })
      } else {
        res.json({ success: true, message: 'อัพเดทข้อมูลประมูลทรัพย์สำเร็จ' })
      }
    })
  }

  // ตรวจสอบว่ามี auction_transaction หรือยัง ถ้ายังไม่มีให้สร้างก่อน
  db.query('SELECT id FROM auction_transactions WHERE case_id = ?', [caseId], (err0, existing) => {
    if (err0) {
      console.error('updateAuction check error:', err0)
      return res.status(500).json({ success: false, message: 'Server Error' })
    }
    if (!existing || existing.length === 0) {
      db.query(
        'INSERT INTO auction_transactions (case_id, auction_status, created_at, updated_at) VALUES (?, ?, NOW(), NOW())',
        [caseId, 'pending'],
        (errInsert) => {
          if (errInsert) {
            console.error('updateAuction insert error:', errInsert)
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

// ========== อัพโหลดเอกสารประมูล (ทีละ field) ==========
const AUCTION_DOC_FIELDS = [
  'house_reg_book','house_reg_book_legal','name_change_doc','divorce_doc',
  'spouse_consent_doc','spouse_id_card','spouse_reg_copy','marriage_cert','spouse_name_change_doc'
]

exports.uploadAuctionDoc = (req, res) => {
  const { caseId } = req.params
  const files = req.files || {}

  // หา field ที่ถูก upload มา
  const uploadedField = Object.keys(files).find(k => AUCTION_DOC_FIELDS.includes(k))
  if (!uploadedField) return res.status(400).json({ success: false, message: 'ไม่พบฟิลด์ที่ถูกต้อง' })

  const newPaths = files[uploadedField].map(f => `uploads/auction-docs/${f.filename}`)

  // ตรวจว่ามี auction_transactions หรือยัง ถ้ายังไม่มีให้สร้างก่อน (กรณีฝ่ายขายอัพโหลดก่อนฝ่ายประมูล)
  const doUpload = () => {
    db.query(`SELECT \`${uploadedField}\` FROM auction_transactions WHERE case_id = ?`, [caseId], (err, rows) => {
      if (err) return res.status(500).json({ success: false, message: 'Server Error' })

      let existing = []
      try { existing = JSON.parse(rows[0]?.[uploadedField] || '[]') || [] } catch {}

      const merged = [...existing, ...newPaths]
      db.query(`UPDATE auction_transactions SET \`${uploadedField}\` = ? WHERE case_id = ?`, [JSON.stringify(merged), caseId], (err2) => {
        if (err2) return res.status(500).json({ success: false, message: 'Server Error' })
        res.json({ success: true, field: uploadedField, paths: merged })
      })
    })
  }

  db.query('SELECT id FROM auction_transactions WHERE case_id = ?', [caseId], (err0, existing) => {
    if (err0) return res.status(500).json({ success: false, message: 'Server Error' })
    if (!existing || existing.length === 0) {
      db.query(
        'INSERT INTO auction_transactions (case_id, auction_status, created_at, updated_at) VALUES (?, ?, NOW(), NOW())',
        [caseId, 'pending'],
        (errInsert) => {
          if (errInsert) return res.status(500).json({ success: false, message: 'Server Error' })
          doUpload()
        }
      )
    } else {
      doUpload()
    }
  })
}

// ========== ลบเอกสารทีละรูป ==========
exports.removeAuctionDoc = (req, res) => {
  const { caseId } = req.params
  const { field, file_path } = req.body

  if (!AUCTION_DOC_FIELDS.includes(field)) return res.status(400).json({ success: false, message: 'Invalid field' })

  db.query(`SELECT \`${field}\` FROM auction_transactions WHERE case_id = ?`, [caseId], (err, rows) => {
    if (err) return res.status(500).json({ success: false, message: 'Server Error' })

    let existing = []
    try { existing = JSON.parse(rows[0]?.[field] || '[]') || [] } catch {}
    const filtered = existing.filter(p => p !== file_path)

    db.query(`UPDATE auction_transactions SET \`${field}\` = ? WHERE case_id = ?`, [JSON.stringify(filtered), caseId], (err2) => {
      if (err2) return res.status(500).json({ success: false, message: 'Server Error' })
      res.json({ success: true, field, paths: filtered })
    })
  })
}

// ========== ดึงประวัติการเสนอราคา ==========
exports.getAuctionBids = (req, res) => {
  const { caseId } = req.params
  db.query('SELECT * FROM auction_bids WHERE case_id = ? ORDER BY bid_date DESC, created_at DESC', [caseId], (err, results) => {
    if (err) return res.status(500).json({ success: false, message: 'Server Error' })
    res.json({ success: true, bids: results })
  })
}

// ========== เพิ่มการเสนอราคา ==========
exports.createAuctionBid = (req, res) => {
  const { caseId } = req.params
  const { bid_amount, investor_id, investor_name, investor_code, investor_phone, bid_date, note, recorded_by } = req.body
  db.query(
    `INSERT INTO auction_bids
      (case_id, bid_amount, investor_id, investor_name, investor_code, investor_phone, bid_date, note, recorded_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
    [caseId, bid_amount || null, investor_id || null, investor_name || null,
     investor_code || null, investor_phone || null, bid_date || null, note || null, recorded_by || null],
    (err, result) => {
      if (err) return res.status(500).json({ success: false, message: 'Server Error' })
      res.json({ success: true, bid_id: result.insertId })
    }
  )
}

// ========== ลบการเสนอราคา ==========
exports.deleteAuctionBid = (req, res) => {
  const { bidId } = req.params
  db.query('DELETE FROM auction_bids WHERE id = ?', [bidId], (err) => {
    if (err) return res.status(500).json({ success: false, message: 'Server Error' })
    res.json({ success: true })
  })
}