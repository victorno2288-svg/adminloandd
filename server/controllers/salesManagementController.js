const db = require('../config/db')

// ======================================================================
// ================ จัดการฝ่ายขาย (admin_users department=sales) ========
// ======================================================================

// ดึงรายชื่อฝ่ายขายทั้งหมด
exports.getSalesUsers = (req, res) => {
  const sql = `
    SELECT id, username, full_name, nickname, email, phone, department, position, status, created_at, updated_at
    FROM admin_users
    WHERE department = 'sales'
    ORDER BY id DESC
  `
  db.query(sql, (err, results) => {
    if (err) {
      console.error('getSalesUsers error:', err)
      return res.status(500).json({ success: false, message: 'Server Error' })
    }
    res.json({ success: true, data: results })
  })
}

// เพิ่มฝ่ายขาย (แบบ register เต็ม)
exports.createSalesUser = (req, res) => {
  const { username, password, full_name, nickname, email, phone, position } = req.body || {}
  if (!username) return res.status(400).json({ success: false, message: 'กรุณากรอกชื่อผู้ใช้' })
  if (!password || password.length < 6) return res.status(400).json({ success: false, message: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร' })

  const bcrypt = require('bcryptjs')
  const passwordHash = bcrypt.hashSync(password, 10)

  const sql = `
    INSERT INTO admin_users (username, password_hash, full_name, nickname, email, phone, department, position, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 'sales', ?, 'active', NOW(), NOW())
  `
  db.query(sql, [username, passwordHash, full_name || null, nickname || null, email || null, phone || null, position || null], (err, result) => {
    if (err) {
      console.error('createSalesUser error:', err)
      if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ success: false, message: 'Username ซ้ำ' })
      return res.status(500).json({ success: false, message: 'Server Error' })
    }
    res.json({ success: true, message: 'เพิ่มฝ่ายขายสำเร็จ', id: result.insertId, username })
  })
}

// อัปเดตฝ่ายขาย (รองรับเปลี่ยนรหัสผ่าน + ฟิลด์ครบ)
exports.updateSalesUser = (req, res) => {
  const { id } = req.params
  const { full_name, nickname, email, phone, position, status, password } = req.body || {}

  const fields = []
  const values = []
  if (full_name !== undefined) { fields.push('full_name=?'); values.push(full_name || null) }
  if (nickname !== undefined) { fields.push('nickname=?'); values.push(nickname || null) }
  if (email !== undefined) { fields.push('email=?'); values.push(email || null) }
  if (phone !== undefined) { fields.push('phone=?'); values.push(phone || null) }
  if (position !== undefined) { fields.push('position=?'); values.push(position || null) }
  if (status !== undefined) { fields.push('status=?'); values.push(status) }

  // เปลี่ยนรหัสผ่านถ้าส่งมา
  if (password && password.trim().length >= 6) {
    const bcrypt = require('bcryptjs')
    fields.push('password_hash=?')
    values.push(bcrypt.hashSync(password, 10))
  }

  if (fields.length === 0) return res.status(400).json({ success: false, message: 'ไม่มีข้อมูลที่จะอัพเดท' })

  values.push(id)
  db.query(`UPDATE admin_users SET ${fields.join(', ')} WHERE id = ? AND department = 'sales'`, values, (err) => {
    if (err) {
      console.error('updateSalesUser error:', err)
      return res.status(500).json({ success: false, message: 'Server Error' })
    }
    res.json({ success: true, message: 'อัพเดทข้อมูลสำเร็จ' })
  })
}

// ลบฝ่ายขาย
exports.deleteSalesUser = (req, res) => {
  const { id } = req.params
  db.query(`DELETE FROM admin_users WHERE id = ? AND department = 'sales'`, [id], (err) => {
    if (err) {
      console.error('deleteSalesUser error:', err)
      return res.status(500).json({ success: false, message: 'Server Error' })
    }
    res.json({ success: true, message: 'ลบข้อมูลสำเร็จ' })
  })
}

// ======================================================================
// ================ จัดการทีมฝ่ายขาย (sales_teams) =====================
// ======================================================================

// ดึงรายชื่อทีมทั้งหมด + จำนวนสมาชิก
exports.getTeams = (req, res) => {
  const sql = `
    SELECT st.*, COUNT(stm.id) AS member_count
    FROM sales_teams st
    LEFT JOIN sales_team_members stm ON stm.team_id = st.id
    GROUP BY st.id
    ORDER BY st.id DESC
  `
  db.query(sql, (err, results) => {
    if (err) {
      console.error('getTeams error:', err)
      return res.status(500).json({ success: false, message: 'Server Error' })
    }
    res.json({ success: true, data: results })
  })
}

// ดึงรายละเอียดทีม + สมาชิก
exports.getTeamDetail = (req, res) => {
  const { id } = req.params

  db.query('SELECT * FROM sales_teams WHERE id = ?', [id], (err, teamRows) => {
    if (err) {
      console.error('getTeamDetail error:', err)
      return res.status(500).json({ success: false, message: 'Server Error' })
    }
    if (teamRows.length === 0) return res.status(404).json({ success: false, message: 'ไม่พบทีม' })

    const memberSql = `
      SELECT stm.id AS member_id, stm.admin_user_id, au.full_name, au.username, au.phone
      FROM sales_team_members stm
      LEFT JOIN admin_users au ON au.id = stm.admin_user_id
      WHERE stm.team_id = ?
      ORDER BY stm.id ASC
    `
    db.query(memberSql, [id], (err2, members) => {
      if (err2) {
        console.error('getTeamDetail members error:', err2)
        return res.status(500).json({ success: false, message: 'Server Error' })
      }
      res.json({ success: true, team: teamRows[0], members })
    })
  })
}

// สร้างทีมใหม่
exports.createTeam = (req, res) => {
  const { team_name, description, member_ids } = req.body || {}
  if (!team_name) return res.status(400).json({ success: false, message: 'กรุณากรอกชื่อทีม' })

  db.query('INSERT INTO sales_teams (team_name, description) VALUES (?, ?)', [team_name, description || null], (err, result) => {
    if (err) {
      console.error('createTeam error:', err)
      return res.status(500).json({ success: false, message: 'Server Error' })
    }

    const teamId = result.insertId

    // เพิ่มสมาชิกถ้ามี
    if (member_ids && member_ids.length > 0) {
      const memberValues = member_ids.map(uid => [teamId, uid])
      db.query('INSERT IGNORE INTO sales_team_members (team_id, admin_user_id) VALUES ?', [memberValues], (err2) => {
        if (err2) console.error('createTeam members error:', err2)
        res.json({ success: true, message: 'สร้างทีมสำเร็จ', id: teamId })
      })
    } else {
      res.json({ success: true, message: 'สร้างทีมสำเร็จ', id: teamId })
    }
  })
}

// อัปเดตทีม (ชื่อ + รายละเอียด + สมาชิก)
exports.updateTeam = (req, res) => {
  const { id } = req.params
  const { team_name, description, member_ids } = req.body || {}

  const fields = []
  const values = []
  if (team_name !== undefined) { fields.push('team_name=?'); values.push(team_name) }
  if (description !== undefined) { fields.push('description=?'); values.push(description || null) }

  const doUpdate = () => {
    if (fields.length > 0) {
      values.push(id)
      db.query(`UPDATE sales_teams SET ${fields.join(', ')} WHERE id = ?`, values, (err) => {
        if (err) {
          console.error('updateTeam error:', err)
          return res.status(500).json({ success: false, message: 'Server Error' })
        }
        syncMembers()
      })
    } else {
      syncMembers()
    }
  }

  const syncMembers = () => {
    if (member_ids === undefined) {
      return res.json({ success: true, message: 'อัพเดททีมสำเร็จ' })
    }
    // ลบสมาชิกเดิมทั้งหมด แล้วเพิ่มใหม่
    db.query('DELETE FROM sales_team_members WHERE team_id = ?', [id], (err) => {
      if (err) {
        console.error('updateTeam delete members error:', err)
        return res.status(500).json({ success: false, message: 'Server Error' })
      }
      if (member_ids.length > 0) {
        const memberValues = member_ids.map(uid => [id, uid])
        db.query('INSERT IGNORE INTO sales_team_members (team_id, admin_user_id) VALUES ?', [memberValues], (err2) => {
          if (err2) console.error('updateTeam insert members error:', err2)
          res.json({ success: true, message: 'อัพเดททีมสำเร็จ' })
        })
      } else {
        res.json({ success: true, message: 'อัพเดททีมสำเร็จ' })
      }
    })
  }

  doUpdate()
}

// ลบทีม
exports.deleteTeam = (req, res) => {
  const { id } = req.params
  db.query('DELETE FROM sales_teams WHERE id = ?', [id], (err) => {
    if (err) {
      console.error('deleteTeam error:', err)
      return res.status(500).json({ success: false, message: 'Server Error' })
    }
    res.json({ success: true, message: 'ลบทีมสำเร็จ' })
  })
}

// ======================================================================
// ================ จัดการนายหน้า (agents) ==============================
// ======================================================================

// ดึงรายชื่อนายหน้าทั้งหมด
exports.getAgents = (req, res) => {
  const sql = `
    SELECT id, agent_code, full_name, nickname, phone, email, line_id, commission_rate, status, created_at, updated_at
    FROM agents
    ORDER BY id DESC
  `
  db.query(sql, (err, results) => {
    if (err) {
      console.error('getAgents error:', err)
      return res.status(500).json({ success: false, message: 'Server Error' })
    }
    res.json({ success: true, data: results })
  })
}

// สร้างนายหน้า
exports.createAgent = (req, res) => {
  const { full_name, nickname, phone, email, line_id, commission_rate } = req.body || {}
  if (!full_name) return res.status(400).json({ success: false, message: 'กรุณากรอกชื่อ-สกุล' })

  // auto-generate agent_code
  db.query('SELECT MAX(id) AS max_id FROM agents', (err0, maxRows) => {
    if (err0) {
      console.error('createAgent max_id error:', err0)
      return res.status(500).json({ success: false, message: 'Server Error' })
    }
    const nextId = (maxRows[0].max_id || 0) + 1
    const agent_code = 'AGT' + String(nextId).padStart(4, '0')

    const sql = `
      INSERT INTO agents (agent_code, full_name, nickname, phone, email, line_id, commission_rate, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'active', NOW(), NOW())
    `
    db.query(sql, [agent_code, full_name, nickname || null, phone || null, email || null, line_id || null, commission_rate || 0], (err, result) => {
      if (err) {
        console.error('createAgent error:', err)
        return res.status(500).json({ success: false, message: 'Server Error' })
      }
      res.json({ success: true, message: 'เพิ่มนายหน้าสำเร็จ', id: result.insertId, agent_code })
    })
  })
}

// อัปเดตนายหน้า
exports.updateAgent = (req, res) => {
  const { id } = req.params
  const { full_name, nickname, phone, email, line_id, commission_rate, status } = req.body || {}

  const fields = []
  const values = []
  if (full_name !== undefined) { fields.push('full_name=?'); values.push(full_name) }
  if (nickname !== undefined) { fields.push('nickname=?'); values.push(nickname || null) }
  if (phone !== undefined) { fields.push('phone=?'); values.push(phone || null) }
  if (email !== undefined) { fields.push('email=?'); values.push(email || null) }
  if (line_id !== undefined) { fields.push('line_id=?'); values.push(line_id || null) }
  if (commission_rate !== undefined) { fields.push('commission_rate=?'); values.push(commission_rate || 0) }
  if (status !== undefined) { fields.push('status=?'); values.push(status) }

  if (fields.length === 0) return res.status(400).json({ success: false, message: 'ไม่มีข้อมูลที่จะอัพเดท' })

  values.push(id)
  db.query(`UPDATE agents SET ${fields.join(', ')} WHERE id = ?`, values, (err) => {
    if (err) {
      console.error('updateAgent error:', err)
      return res.status(500).json({ success: false, message: 'Server Error' })
    }
    res.json({ success: true, message: 'อัพเดทข้อมูลนายหน้าสำเร็จ' })
  })
}

// ลบนายหน้า
exports.deleteAgent = (req, res) => {
  const { id } = req.params
  db.query('DELETE FROM agents WHERE id = ?', [id], (err) => {
    if (err) {
      console.error('deleteAgent error:', err)
      return res.status(500).json({ success: false, message: 'Server Error' })
    }
    res.json({ success: true, message: 'ลบนายหน้าสำเร็จ' })
  })
}