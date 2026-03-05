const db = require('../config/db')

// ========== สถิติฝ่ายบัญชีรวม (ใช้ทุก tab) ==========
exports.getAccountingStats = (req, res) => {
  const sql = `
    SELECT
      -- สถิติฝ่ายบัญชีลูกหนี้ (จากตาราง debtor_accounting)
      (SELECT COUNT(*) FROM debtor_accounting WHERE appraisal_status = 'paid') AS appraisal,
      (SELECT COUNT(*) FROM debtor_accounting WHERE bag_fee_status = 'paid') AS bag_fee,
      (SELECT COUNT(*) FROM debtor_accounting WHERE contract_sale_status = 'paid') AS contract_sale,
      (SELECT COUNT(*) FROM debtor_accounting WHERE redemption_status = 'paid') AS redemption,
      (SELECT COUNT(*) FROM debtor_accounting WHERE additional_service_amount > 0) AS additional_service,
      (SELECT COUNT(*) FROM debtor_accounting WHERE property_forfeited_status = 'paid') AS property_forfeited,
      (SELECT COUNT(*) FROM cases WHERE status = 'cancelled') AS cancelled,
      (SELECT COALESCE(SUM(appraisal_amount), 0) FROM debtor_accounting) AS total_appraisal_fee,
      (SELECT COUNT(*) FROM cases) AS total_cases,

      -- สถิติฝ่ายบัญชีนายทุน (จาก investors + investor_accounting)
      (SELECT COALESCE(SUM(ia.auction_deposit), 0) FROM investor_accounting ia) AS auction_deposit_total,
      (SELECT COUNT(*) FROM investor_accounting ia WHERE ia.auction_deposit > 0) AS auction_deposit,
      (SELECT COUNT(*) FROM investor_accounting ia WHERE ia.post_auction_status = 'won_auction') AS withdrawal_request,

      -- สถิติฝ่ายบัญชีนายหน้า
      (SELECT COUNT(*) FROM agents WHERE commission_rate > 0) AS agent_commission,
      (SELECT COUNT(*) FROM agent_accounting WHERE payment_status = 'pending') AS commission_withdrawal
  `
  db.query(sql, (err, results) => {
    if (err) {
      console.error('getAccountingStats error:', err)
      // ถ้า table ยังไม่มี ส่ง default กลับ
      return res.json({
        success: true,
        stats: {
          appraisal: 0, bag_fee: 0, contract_sale: 0, redemption: 0,
          additional_service: 0, property_forfeited: 0, cancelled: 0,
          total_appraisal_fee: 0, total_cases: 0,
          auction_deposit: 0, withdrawal_request: 0,
          agent_commission: 0, commission_withdrawal: 0,
        }
      })
    }
    res.json({ success: true, stats: results[0] })
  })
}

// ========== TAB 1: ฝ่ายบัญชีลูกหนี้ (LEFT JOIN debtor_accounting) ==========
exports.getAccountingDebtors = (req, res) => {
  const { date } = req.query

  let sql = `
    SELECT
      c.id AS case_id, c.case_code, c.status, c.payment_status,
      c.appraisal_fee, c.approved_amount,
      c.payment_date, c.updated_at,
      lr.id AS debtor_id, lr.debtor_code,
      lr.contact_name AS debtor_name,
      lr.contact_phone AS debtor_phone,
      da.appraisal_amount, da.appraisal_status, da.appraisal_slip,
      da.bag_fee_amount, da.bag_fee_status, da.bag_fee_slip,
      da.contract_sale_amount, da.contract_sale_status, da.contract_sale_slip,
      da.redemption_amount, da.redemption_status, da.redemption_slip,
      da.additional_service_amount,
      da.property_forfeited_amount, da.property_forfeited_status, da.property_forfeited_slip,
      da.id_card_image
    FROM cases c
    LEFT JOIN loan_requests lr ON lr.id = c.loan_request_id
    LEFT JOIN debtor_accounting da ON da.case_id = c.id
  `

  const params = []
  if (date) {
    sql += ' WHERE DATE(c.payment_date) = ?'
    params.push(date)
  }

  sql += ' ORDER BY c.updated_at DESC'

  db.query(sql, params, (err, results) => {
    if (err) {
      console.error('getAccountingDebtors error:', err)
      return res.status(500).json({ success: false, message: 'Server Error' })
    }
    res.json({ success: true, data: results })
  })
}

// ========== GET: ดึงรายละเอียดบัญชีลูกหนี้ 1 เคส ==========
exports.getDebtorDetail = (req, res) => {
  const { caseId } = req.params

  // ดึงข้อมูล case + loan_request (รวมจังหวัดที่ตั้งทรัพย์)
  const caseSql = `
    SELECT c.id AS case_id, c.case_code, c.status,
      lr.debtor_code, lr.contact_name AS debtor_name, lr.contact_phone AS debtor_phone,
      lr.province, lr.district, lr.subdistrict, lr.property_address, lr.location_url
    FROM cases c
    LEFT JOIN loan_requests lr ON lr.id = c.loan_request_id
    WHERE c.id = ?
  `

  db.query(caseSql, [caseId], (err, caseResults) => {
    if (err || caseResults.length === 0) {
      return res.status(404).json({ success: false, message: 'Case not found' })
    }

    // ดึงข้อมูล debtor_accounting
    db.query('SELECT * FROM debtor_accounting WHERE case_id = ?', [caseId], (err2, accResults) => {
      res.json({
        success: true,
        caseInfo: caseResults[0],
        accounting: accResults.length > 0 ? accResults[0] : null
      })
    })
  })
}

// ========== PUT: บันทึก/อัปเดทบัญชีลูกหนี้ ==========
exports.saveDebtorDetail = (req, res) => {
  const { caseId } = req.params
  const data = req.body

  // ตรวจว่ามี record อยู่แล้วไหม
  db.query('SELECT id FROM debtor_accounting WHERE case_id = ?', [caseId], (err, existing) => {
    if (err) {
      console.error('saveDebtorDetail check error:', err)
      return res.status(500).json({ success: false, message: 'Server Error' })
    }

    const fields = {
      case_id: caseId,
      debtor_status: data.debtor_status || null,
      property_location: data.property_location || null,
      contact_person: data.contact_person || null,
      id_card_image: data.id_card_image || null,
      appraisal_amount: data.appraisal_amount || 0,
      appraisal_payment_date: data.appraisal_payment_date || null,
      appraisal_slip: data.appraisal_slip || null,
      appraisal_status: data.appraisal_status || 'unpaid',
      bag_fee_amount: data.bag_fee_amount || 0,
      bag_fee_payment_date: data.bag_fee_payment_date || null,
      bag_fee_slip: data.bag_fee_slip || null,
      bag_fee_status: data.bag_fee_status || 'unpaid',
      contract_sale_amount: data.contract_sale_amount || 0,
      contract_sale_payment_date: data.contract_sale_payment_date || null,
      contract_sale_slip: data.contract_sale_slip || null,
      contract_sale_status: data.contract_sale_status || 'unpaid',
      redemption_amount: data.redemption_amount || 0,
      redemption_payment_date: data.redemption_payment_date || null,
      redemption_slip: data.redemption_slip || null,
      redemption_status: data.redemption_status || 'unpaid',
      additional_service_amount: data.additional_service_amount || 0,
      additional_service_payment_date: data.additional_service_payment_date || null,
      additional_service_note: data.additional_service_note || null,
      property_forfeited_amount: data.property_forfeited_amount || 0,
      property_forfeited_payment_date: data.property_forfeited_payment_date || null,
      property_forfeited_slip: data.property_forfeited_slip || null,
      property_forfeited_status: data.property_forfeited_status || 'unpaid',
      property_forfeited_note: data.property_forfeited_note || null,
      recorded_by: data.recorded_by || null
    }

    if (existing.length > 0) {
      // UPDATE
      const setClauses = Object.keys(fields).filter(k => k !== 'case_id').map(k => `${k} = ?`)
      const values = Object.keys(fields).filter(k => k !== 'case_id').map(k => fields[k])
      values.push(caseId)

      db.query(`UPDATE debtor_accounting SET ${setClauses.join(', ')} WHERE case_id = ?`, values, (err2) => {
        if (err2) {
          console.error('saveDebtorDetail update error:', err2)
          return res.status(500).json({ success: false, message: 'Server Error' })
        }
        res.json({ success: true, message: 'Updated' })
      })
    } else {
      // INSERT
      const keys = Object.keys(fields)
      const placeholders = keys.map(() => '?').join(', ')
      const values = keys.map(k => fields[k])

      db.query(`INSERT INTO debtor_accounting (${keys.join(', ')}) VALUES (${placeholders})`, values, (err2) => {
        if (err2) {
          console.error('saveDebtorDetail insert error:', err2)
          return res.status(500).json({ success: false, message: 'Server Error' })
        }
        res.json({ success: true, message: 'Created' })
      })
    }
  })
}

// ========== GET: รายชื่อลูกหนี้สำหรับ dropdown (แสดงทุก ID) ==========
exports.getDebtorList = (req, res) => {
  const sql = `
    SELECT
      c.id AS case_id,
      c.case_code,
      lr.debtor_code,
      lr.contact_name AS debtor_name,
      c.payment_status,
      da.appraisal_status
    FROM cases c
    LEFT JOIN loan_requests lr ON lr.id = c.loan_request_id
    LEFT JOIN debtor_accounting da ON da.case_id = c.id
    ORDER BY c.updated_at DESC
  `

  db.query(sql, (err, results) => {
    if (err) {
      console.error('getDebtorList error:', err)
      return res.status(500).json({ success: false, message: 'Server Error' })
    }
    res.json({ success: true, data: results })
  })
}

// ========== PUT: อัปเดทสถานะค่าประเมินจากตาราง ==========
exports.updateAppraisalStatus = (req, res) => {
  const { caseId } = req.params
  const { appraisal_status } = req.body

  if (!['paid', 'unpaid'].includes(appraisal_status)) {
    return res.status(400).json({ success: false, message: 'Invalid status' })
  }

  // ตรวจว่ามี record อยู่แล้วไหม — ถ้ายังไม่มี ให้ INSERT ก่อน
  db.query('SELECT id FROM debtor_accounting WHERE case_id = ?', [caseId], (err, existing) => {
    if (err) {
      console.error('updateAppraisalStatus check error:', err)
      return res.status(500).json({ success: false, message: 'Server Error' })
    }

    if (existing.length > 0) {
      db.query('UPDATE debtor_accounting SET appraisal_status = ? WHERE case_id = ?', [appraisal_status, caseId], (err2) => {
        if (err2) {
          console.error('updateAppraisalStatus update error:', err2)
          return res.status(500).json({ success: false, message: 'Server Error' })
        }
        res.json({ success: true, message: 'Updated' })
      })
    } else {
      db.query('INSERT INTO debtor_accounting (case_id, appraisal_status) VALUES (?, ?)', [caseId, appraisal_status], (err2) => {
        if (err2) {
          console.error('updateAppraisalStatus insert error:', err2)
          return res.status(500).json({ success: false, message: 'Server Error' })
        }
        res.json({ success: true, message: 'Created & Updated' })
      })
    }
  })
}

// ========== PUT: อัปเดทสถานะชำระทั้งหมด (master status) ==========
exports.updateMasterStatus = (req, res) => {
  const { caseId } = req.params
  const { status } = req.body

  if (!['paid', 'unpaid'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid status' })
  }

  const paymentDate = status === 'paid' ? new Date() : null
  console.log(`[masterStatus] caseId=${caseId} status=${status} paymentDate=${paymentDate}`)

  db.query('SELECT status AS current_status FROM cases WHERE id = ?', [caseId], (errCheck, rows) => {
    if (errCheck || rows.length === 0) {
      console.error('masterStatus check error:', errCheck)
    }
    const currentCaseStatus = rows && rows[0] ? rows[0].current_status : null
    const shouldAdvance = status === 'paid' && currentCaseStatus === 'awaiting_appraisal_fee'

    const updateSql = shouldAdvance
      ? 'UPDATE cases SET payment_status = ?, payment_date = ?, status = ? WHERE id = ?'
      : 'UPDATE cases SET payment_status = ?, payment_date = ? WHERE id = ?'
    const updateParams = shouldAdvance
      ? [status, paymentDate, 'appraisal_scheduled', caseId]
      : [status, paymentDate, caseId]

  db.query(updateSql, updateParams, (err, result) => {
    if (err) {
      console.error('updateMasterStatus cases error:', err.message)
      return res.status(500).json({ success: false, message: 'cases update failed: ' + err.message })
    }
    console.log(`[masterStatus] cases updated: affectedRows=${result.affectedRows}`)

    db.query('SELECT id FROM debtor_accounting WHERE case_id = ?', [caseId], (err2, existing) => {
      if (err2) {
        console.error('updateMasterStatus check error:', err2)
        return res.status(500).json({ success: false, message: 'Server Error' })
      }

      const allFields = {
        appraisal_status: status,
        bag_fee_status: status,
        contract_sale_status: status,
        redemption_status: status,
        property_forfeited_status: status
      }

      if (existing.length > 0) {
        const setClauses = Object.keys(allFields).map(k => `${k} = ?`).join(', ')
        const values = [...Object.values(allFields), caseId]
        db.query(`UPDATE debtor_accounting SET ${setClauses} WHERE case_id = ?`, values, (err3) => {
          if (err3) {
            console.error('updateMasterStatus update error:', err3)
            return res.status(500).json({ success: false, message: 'Server Error' })
          }
          res.json({ success: true, message: 'All statuses updated' })
        })
      } else {
        db.query(
          `INSERT INTO debtor_accounting (case_id, appraisal_status, bag_fee_status, contract_sale_status, redemption_status, property_forfeited_status) VALUES (?, ?, ?, ?, ?, ?)`,
          [caseId, status, status, status, status, status],
          (err3) => {
            if (err3) {
              console.error('updateMasterStatus insert error:', err3)
              return res.status(500).json({ success: false, message: 'Server Error' })
            }
            res.json({ success: true, message: 'Created & all statuses set' })
          }
        )
      }
    })
  })
  })
}

// ========== TAB 2: ฝ่ายบัญชีนายทุน ==========
exports.getAccountingInvestors = (req, res) => {
  const { date } = req.query

  let sql = `
    SELECT
      u.id AS investor_id,
      u.investor_code AS investor_code,
      u.full_name AS investor_name,
      u.phone,
      u.updated_at,
      ia.auction_deposit,
      ia.status AS acc_status,
      COALESCE(ia.auction_deposit, 0) AS total_deposit,
      (SELECT COUNT(*) FROM investments inv WHERE inv.investor_id = u.id) AS total_investments,
      (SELECT COUNT(*) FROM investments inv WHERE inv.investor_id = u.id AND inv.status = 'accepted') AS won_auctions
    FROM investors u
    LEFT JOIN investor_accounting ia ON ia.user_id = u.id
    WHERE 1=1
  `

  const params = []
  if (date) {
    sql += ' AND DATE(u.updated_at) = ?'
    params.push(date)
  }

  sql += ' ORDER BY u.updated_at DESC'

  db.query(sql, params, (err, results) => {
    if (err) {
      console.error('getAccountingInvestors error:', err)
      return res.status(500).json({ success: false, message: 'Server Error' })
    }
    res.json({ success: true, data: results })
  })
}

// ========== GET: รายชื่อนายทุนสำหรับ dropdown ==========
exports.getInvestorList = (req, res) => {
  const sql = `
    SELECT u.id AS investor_id, u.investor_code AS investor_code, u.full_name AS investor_name
    FROM investors u
    ORDER BY u.updated_at DESC
  `
  db.query(sql, (err, results) => {
    if (err) {
      console.error('getInvestorList error:', err)
      return res.status(500).json({ success: false, message: 'Server Error' })
    }
    res.json({ success: true, data: results })
  })
}

// ========== GET: รายละเอียดบัญชีนายทุน 1 คน ==========
exports.getInvestorDetail = (req, res) => {
  const { investorId } = req.params

  const sql = `
    SELECT u.id AS investor_id, u.investor_code AS investor_code,
      u.full_name AS investor_name, u.phone, u.line_id AS line_name, u.email,
      u.updated_at,
      ia.hid, ia.auction_deposit, ia.auction_date, ia.status,
      ia.post_auction_status, ia.recorded_by
    FROM investors u
    LEFT JOIN investor_accounting ia ON ia.user_id = u.id
    WHERE u.id = ?
  `

  db.query(sql, [investorId], (err, results) => {
    if (err || results.length === 0) {
      return res.status(404).json({ success: false, message: 'Investor not found' })
    }
    res.json({ success: true, data: results[0] })
  })
}

// ========== PUT: บันทึก/อัปเดทบัญชีนายทุน ==========
exports.saveInvestorDetail = (req, res) => {
  const { investorId } = req.params
  const data = req.body

  const userFields = {
    full_name: data.investor_name || data.full_name || null,
    phone: data.phone || null,
    line_id: data.line_name || null,
    email: data.email || null,
  }
  const userSet = Object.keys(userFields).map(k => `${k} = ?`).join(', ')
  const userValues = [...Object.values(userFields), investorId]

  db.query(`UPDATE investors SET ${userSet} WHERE id = ?`, userValues, (err) => {
    if (err) {
      console.error('saveInvestorDetail investors error:', err)
      return res.status(500).json({ success: false, message: 'Server Error' })
    }

    const accFields = {
      hid: data.hid || null,
      auction_deposit: data.auction_deposit || 0,
      auction_date: data.auction_date || null,
      status: data.status || 'pending_auction',
      post_auction_status: data.post_auction_status || null,
      recorded_by: data.recorded_by || null
    }

    db.query('SELECT id FROM investor_accounting WHERE user_id = ?', [investorId], (err2, existing) => {
      if (err2) {
        console.error('saveInvestorDetail check error:', err2)
        return res.status(500).json({ success: false, message: 'Server Error' })
      }

      if (existing.length > 0) {
        const accSet = Object.keys(accFields).map(k => `${k} = ?`).join(', ')
        const accValues = [...Object.values(accFields), investorId]
        db.query(`UPDATE investor_accounting SET ${accSet} WHERE user_id = ?`, accValues, (err3) => {
          if (err3) {
            console.error('saveInvestorDetail update error:', err3)
            return res.status(500).json({ success: false, message: 'Server Error' })
          }
          res.json({ success: true, message: 'Updated' })
        })
      } else {
        const keys = ['user_id', ...Object.keys(accFields)]
        const placeholders = keys.map(() => '?').join(', ')
        const values = [investorId, ...Object.values(accFields)]
        db.query(`INSERT INTO investor_accounting (${keys.join(', ')}) VALUES (${placeholders})`, values, (err3) => {
          if (err3) {
            console.error('saveInvestorDetail insert error:', err3)
            return res.status(500).json({ success: false, message: 'Server Error' })
          }
          res.json({ success: true, message: 'Created' })
        })
      }
    })
  })
}

// ========== TAB 3: ฝ่ายบัญชีนายหน้า ==========
exports.getAccountingAgents = (req, res) => {
  const { date } = req.query

  let sql = `
    SELECT
      a.id AS agent_id, a.agent_code, a.full_name AS agent_name,
      a.phone, a.commission_rate, a.status, a.updated_at,
      aa.commission_amount, aa.commission_slip, aa.payment_status AS acc_payment_status,
      aa.payment_date,
      c.case_code,
      lr.debtor_code, lr.contact_name AS debtor_name,
      COUNT(c.id) OVER (PARTITION BY a.id) AS total_cases,
      COALESCE(SUM(c.approved_amount) OVER (PARTITION BY a.id), 0) AS total_approved
    FROM agents a
    LEFT JOIN agent_accounting aa ON aa.agent_id = a.id
    LEFT JOIN cases c ON c.agent_id = a.id
    LEFT JOIN loan_requests lr ON lr.id = c.loan_request_id
  `

  const params = []
  if (date) {
    sql += ' WHERE DATE(a.updated_at) = ?'
    params.push(date)
  }

  sql += ' GROUP BY a.id ORDER BY a.created_at DESC'

  db.query(sql, params, (err, results) => {
    if (err) {
      console.error('getAccountingAgents error:', err)
      return res.status(500).json({ success: false, message: 'Server Error' })
    }
    res.json({ success: true, data: results })
  })
}

// ========== GET: รายชื่อนายหน้าสำหรับ dropdown ==========
exports.getAgentList = (req, res) => {
  const sql = `
    SELECT id AS agent_id, agent_code, full_name AS agent_name
    FROM agents
    ORDER BY created_at DESC
  `
  db.query(sql, (err, results) => {
    if (err) {
      console.error('getAgentList error:', err)
      return res.status(500).json({ success: false, message: 'Server Error' })
    }
    res.json({ success: true, data: results })
  })
}

// ========== GET: รายละเอียดบัญชีนายหน้า 1 คน ==========
exports.getAgentDetail = (req, res) => {
  const { agentId } = req.params

  const sql = `
    SELECT a.id AS agent_id, a.agent_code, a.full_name AS agent_name,
      a.nickname, a.phone, a.email, a.line_id AS line_name,
      a.commission_rate, a.updated_at,
      aa.id AS acc_id, aa.case_id, aa.team, aa.commission_amount,
      aa.payment_date, aa.commission_slip, aa.payment_status, aa.recorded_by
    FROM agents a
    LEFT JOIN agent_accounting aa ON aa.agent_id = a.id
    WHERE a.id = ?
  `

  db.query(sql, [agentId], (err, results) => {
    if (err || results.length === 0) {
      return res.status(404).json({ success: false, message: 'Agent not found' })
    }
    const agent = results[0]
    if (agent.case_id) {
      db.query(
        `SELECT lr.debtor_code, lr.contact_name AS debtor_name
         FROM cases c LEFT JOIN loan_requests lr ON lr.id = c.loan_request_id
         WHERE c.id = ?`,
        [agent.case_id],
        (err2, debtorResults) => {
          const debtor = debtorResults && debtorResults.length > 0 ? debtorResults[0] : {}
          res.json({ success: true, data: { ...agent, ...debtor } })
        }
      )
    } else {
      res.json({ success: true, data: agent })
    }
  })
}

// ========== PUT: บันทึก/อัปเดทบัญชีนายหน้า ==========
exports.saveAgentDetail = (req, res) => {
  const { agentId } = req.params
  const data = req.body

  const accFields = {
    case_id: data.case_id || null,
    team: data.team || null,
    commission_amount: data.commission_amount || 0,
    payment_date: data.payment_date || null,
    commission_slip: data.commission_slip || null,
    payment_status: data.payment_status || 'unpaid',
    recorded_by: data.recorded_by || null
  }

  db.query('SELECT id FROM agent_accounting WHERE agent_id = ?', [agentId], (err, existing) => {
    if (err) {
      console.error('saveAgentDetail check error:', err)
      return res.status(500).json({ success: false, message: 'Server Error' })
    }

    if (existing.length > 0) {
      const setClauses = Object.keys(accFields).map(k => `${k} = ?`).join(', ')
      const values = [...Object.values(accFields), agentId]
      db.query(`UPDATE agent_accounting SET ${setClauses} WHERE agent_id = ?`, values, (err2) => {
        if (err2) {
          console.error('saveAgentDetail update error:', err2)
          return res.status(500).json({ success: false, message: 'Server Error' })
        }
        res.json({ success: true, message: 'Updated' })
      })
    } else {
      const keys = ['agent_id', ...Object.keys(accFields)]
      const placeholders = keys.map(() => '?').join(', ')
      const values = [agentId, ...Object.values(accFields)]
      db.query(`INSERT INTO agent_accounting (${keys.join(', ')}) VALUES (${placeholders})`, values, (err2) => {
        if (err2) {
          console.error('saveAgentDetail insert error:', err2)
          return res.status(500).json({ success: false, message: 'Server Error' })
        }
        res.json({ success: true, message: 'Created' })
      })
    }
  })
}