// server/controllers/notificationController.js
// ระบบแจ้งเตือนภายใน (ระหว่างฝ่าย) — ทุกฝ่ายเห็นทุกขั้นตอน

const db = require('../config/db');

// ============================
// ข้อความแจ้งเตือนภายในตามสถานะ
// target = 'all' → ทุกฝ่ายเห็นหมด
// ============================
const INTERNAL_NOTIFICATIONS = {
  new_from_chat: {
    target: 'all',
    title: '🟢 ลูกหนี้ใหม่จากแชท',
    getMessage: (code, extra) => `ลูกหนี้ใหม่ ${code} ถูกสร้างอัตโนมัติจากแชท ${extra || ''}`
  },
  new_from_admin: {
    target: 'all',
    title: '🆕 สร้างลูกหนี้ใหม่',
    getMessage: (code, extra) => `ลูกหนี้ใหม่ ${code} ถูกสร้างโดยทีมงาน${extra ? ' — ' + extra : ''}`
  },
  reviewing: {
    target: 'all',
    title: 'เคสใหม่ — รอประเมิน',
    getMessage: (code) => `เคสใหม่ ${code} ถูกสร้างแล้ว กรุณาดำเนินการประเมิน`
  },
  awaiting_appraisal_fee: {
    target: 'all',
    title: 'รอชำระค่าประเมิน',
    getMessage: (code) => `เคส ${code} รอลูกค้าชำระค่าประเมิน`
  },
  appraisal_scheduled: {
    target: 'all',
    title: 'อยู่ระหว่างประเมิน',
    getMessage: (code) => `เคส ${code} อยู่ระหว่างการประเมินทรัพย์สิน`
  },
  appraisal_passed: {
    target: 'all',
    title: 'ประเมินผ่าน — รอพิจารณาอนุมัติ',
    getMessage: (code) => `เคส ${code} ผ่านการประเมินแล้ว รอพิจารณาอนุมัติวงเงิน`
  },
  appraisal_not_passed: {
    target: 'all',
    title: 'ประเมินไม่ผ่าน',
    getMessage: (code) => `เคส ${code} ไม่ผ่านการประเมิน กรุณาแจ้งลูกค้า`
  },
  pending_approve: {
    target: 'all',
    title: 'รอพิจารณาอนุมัติ',
    getMessage: (code) => `เคส ${code} อยู่ระหว่างพิจารณาอนุมัติวงเงิน`
  },
  credit_approved: {
    target: 'all',
    title: 'อนุมัติวงเงินแล้ว',
    getMessage: (code, extra) => `เคส ${code} อนุมัติวงเงิน ${extra || ''} แล้ว`
  },
  pending_auction: {
    target: 'all',
    title: 'พร้อมประมูล',
    getMessage: (code) => `เคส ${code} พร้อมเข้าสู่ขั้นตอนประมูลแล้ว`
  },
  auction_completed: {
    target: 'all',
    title: 'ประมูลสำเร็จ — รอนิติกรรม',
    getMessage: (code, extra) => `เคส ${code} ประมูลสำเร็จ ${extra || ''} กรุณาดำเนินการนิติกรรม`
  },
  preparing_docs: {
    target: 'all',
    title: 'เตรียมเอกสาร',
    getMessage: (code) => `เคส ${code} อยู่ระหว่างเตรียมเอกสารนิติกรรม`
  },
  legal_scheduled: {
    target: 'all',
    title: 'นัดทำธุรกรรมแล้ว',
    getMessage: (code, extra) => `เคส ${code} นัดทำธุรกรรม ${extra || ''}`
  },
  legal_completed: {
    target: 'all',
    title: 'นิติกรรมเสร็จสิ้น',
    getMessage: (code) => `เคส ${code} ทำธุรกรรมเรียบร้อยแล้ว`
  },
  issuing_sent: {
    target: 'all',
    title: 'ออกสัญญาเรียบร้อย',
    getMessage: (code) => `เคส ${code} ออกสัญญาเรียบร้อยแล้ว`
  },
  completed: {
    target: 'all',
    title: 'เคสเสร็จสมบูรณ์',
    getMessage: (code) => `เคส ${code} ดำเนินการเสร็จสมบูรณ์แล้ว`
  },
  cancelled: {
    target: 'all',
    title: 'ยกเลิกเคส',
    getMessage: (code) => `เคส ${code} ถูกยกเลิก`
  },
  incomplete: {
    target: 'all',
    title: 'เอกสารไม่ครบ',
    getMessage: (code) => `เคส ${code} เอกสารไม่ครบถ้วน กรุณาติดตามเอกสารเพิ่มเติม`
  },
  credit_rejected: {
    target: 'all',
    title: 'ไม่อนุมัติวงเงิน',
    getMessage: (code) => `เคส ${code} ไม่ผ่านการอนุมัติวงเงิน`
  },
  auction_failed: {
    target: 'all',
    title: 'ประมูลไม่สำเร็จ',
    getMessage: (code) => `เคส ${code} ประมูลไม่สำเร็จ`
  }
};

// ============================
// ส่งแจ้งเตือนภายใน (ทุกฝ่ายเห็นทุกขั้นตอน)
// ============================
function sendInternalNotification(loanRequestId, caseId, newStatus, io, createdBy, extraInfo) {
  var config = INTERNAL_NOTIFICATIONS[newStatus];
  if (!config) {
    console.log('[Notification] ไม่มี config สำหรับสถานะ:', newStatus);
    return;
  }

  // ดึง debtor_code + contact_name เพื่อใช้ในข้อความ
  db.query(
    'SELECT debtor_code, contact_name FROM loan_requests WHERE id = ?',
    [loanRequestId],
    function(err, rows) {
      var debtorCode = (rows && rows.length > 0) ? rows[0].debtor_code : 'N/A';
      var contactName = (rows && rows.length > 0 && rows[0].contact_name) ? rows[0].contact_name : '';
      var codeWithName = contactName ? (debtorCode + ' (' + contactName + ')') : debtorCode;
      var message = config.getMessage(codeWithName, extraInfo);
      // map status → หน้าที่ถูกต้องของแต่ละฝ่าย
      var STATUS_PAGE = {
        new_from_chat:         '/sales/edit/',   // ชี้ไปหน้า loan_request ไม่ใช่ case
        new_from_admin:        '/sales/edit/',   // เช่นกัน
        reviewing:             '/sales/case/edit/',
        incomplete:            '/sales/case/edit/',
        completed:             '/sales/case/edit/',
        cancelled:             '/cancellation',
        awaiting_appraisal_fee: '/appraisal/edit/',
        appraisal_scheduled:   '/appraisal/edit/',
        appraisal_passed:      '/appraisal/edit/',
        appraisal_not_passed:  '/appraisal/edit/',
        pending_approve:       '/approval/edit/',
        credit_approved:       '/approval/edit/',
        credit_rejected:       '/approval/edit/',
        pending_auction:       '/auction/edit/',
        auction_completed:     '/auction/edit/',
        auction_failed:        '/auction/edit/',
        preparing_docs:        '/issuing/edit/',
        issuing_sent:          '/issuing/edit/',
        legal_scheduled:       '/legal/edit/',
        legal_completed:       '/legal/edit/',
      };
      var basePage = STATUS_PAGE[newStatus] || '/sales/case/edit/';
      var linkUrl;
      if (newStatus === 'new_from_chat' || newStatus === 'new_from_admin') {
        // ชี้ไปหน้า loan_request โดยตรง (ยังไม่มี case)
        linkUrl = '/sales/edit/' + loanRequestId;
      } else if (caseId) {
        linkUrl = basePage.endsWith('/') ? basePage + caseId : basePage;
      } else {
        linkUrl = '/sales/edit/' + loanRequestId;
      }

      // บันทึกลง notifications table — target_department = 'all'
      db.query(
        'INSERT INTO notifications (type, loan_request_id, case_id, target_department, ' +
        'title, message, status_to, link_url, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        ['internal', loanRequestId, caseId, 'all', config.title, message, newStatus, linkUrl, createdBy || null],
        function(insertErr, result) {
          if (insertErr) {
            console.log('[Notification] Internal insert error:', insertErr.message);
            return;
          }

          // Emit socket event → admin_room (ทุกคนเห็น)
          if (io) {
            var notifData = {
              id: result.insertId,
              type: 'internal',
              loan_request_id: loanRequestId,
              case_id: caseId,
              target_department: 'all',
              title: config.title,
              message: message,
              status_to: newStatus,
              link_url: linkUrl,
              is_read: 0,
              debtor_name: contactName || null,
              debtor_code: debtorCode || null,
              created_at: new Date().toISOString()
            };

            io.to('admin_room').emit('new_notification', notifData);
            console.log('[Notification] 🔔 แจ้งเตือนทุกฝ่าย: ' + message);
          }
        }
      );
    }
  );
}

// ============================
// ส่งแจ้งเตือน (ภายในอย่างเดียว — ไม่ส่ง LINE/Facebook)
// ============================
function notifyStatusChange(loanRequestId, caseId, oldStatus, newStatus, io, createdBy, extraInfo) {
  sendInternalNotification(loanRequestId, caseId, newStatus, io, createdBy, extraInfo);
}

// ============================
// API: ดึงรายการแจ้งเตือน — per-user is_read via notification_reads
// ============================
exports.getNotifications = function(req, res) {
  var page = parseInt(req.query.page) || 1;
  var limit = parseInt(req.query.limit) || 20;
  var offset = (page - 1) * limit;
  var userId = req.user ? req.user.id : null;

  db.query(
    "SELECT n.*, lr.contact_name AS debtor_name, lr.debtor_code, " +
    "  CASE WHEN nr.user_id IS NOT NULL THEN 1 ELSE 0 END AS is_read, " +
    "  nr.read_at " +
    "FROM notifications n " +
    "LEFT JOIN loan_requests lr ON lr.id = n.loan_request_id " +
    "LEFT JOIN notification_reads nr ON nr.notification_id = n.id AND nr.user_id = ? " +
    "WHERE n.type = 'internal' ORDER BY n.created_at DESC LIMIT ? OFFSET ?",
    [userId, limit, offset],
    function(err, rows) {
      if (err) return res.status(500).json({ error: err.message });

      db.query(
        "SELECT COUNT(*) as total FROM notifications WHERE type = 'internal'",
        [],
        function(err2, countRows) {
          var total = countRows && countRows[0] ? countRows[0].total : 0;
          res.json({
            notifications: rows,
            pagination: { page: page, limit: limit, total: total, totalPages: Math.ceil(total / limit) }
          });
        }
      );
    }
  );
};

// ============================
// API: นับ unread — per-user (นับเฉพาะที่ยังไม่ได้อ่านของ user นั้น)
// ============================
exports.getUnreadCount = function(req, res) {
  var userId = req.user ? req.user.id : null;
  db.query(
    "SELECT COUNT(*) as count FROM notifications n " +
    "LEFT JOIN notification_reads nr ON nr.notification_id = n.id AND nr.user_id = ? " +
    "WHERE n.type = 'internal' AND nr.user_id IS NULL",
    [userId],
    function(err, rows) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ unread_count: rows[0].count });
    }
  );
};

// ============================
// API: อ่านแล้ว (mark as read) — per-user
// ============================
exports.markAsRead = function(req, res) {
  var id = req.params.id;
  var userId = req.user ? req.user.id : null;
  db.query(
    'INSERT IGNORE INTO notification_reads (notification_id, user_id) VALUES (?, ?)',
    [id, userId],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    }
  );
};

// ============================
// API: อ่านทั้งหมด — per-user (insert ทุก notification ที่ยังไม่ได้อ่านของ user นั้น)
// ============================
exports.markAllAsRead = function(req, res) {
  var userId = req.user ? req.user.id : null;
  db.query(
    "INSERT IGNORE INTO notification_reads (notification_id, user_id) " +
    "SELECT n.id, ? FROM notifications n " +
    "LEFT JOIN notification_reads nr ON nr.notification_id = n.id AND nr.user_id = ? " +
    "WHERE n.type = 'internal' AND nr.user_id IS NULL",
    [userId, userId],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    }
  );
};

// Export helper functions สำหรับเรียกจาก controller อื่น
exports.sendInternalNotification = sendInternalNotification;
exports.notifyStatusChange = notifyStatusChange;
exports.INTERNAL_NOTIFICATIONS = INTERNAL_NOTIFICATIONS;
