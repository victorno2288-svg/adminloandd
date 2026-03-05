const db = require('../config/db');
const https = require('https');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// ============================================
// Multer config — สำหรับอัปโหลดไฟล์ในแชท
// ============================================
const chatUploadDir = path.join(__dirname, '..', 'uploads', 'chat');
if (!fs.existsSync(chatUploadDir)) {
  fs.mkdirSync(chatUploadDir, { recursive: true });
}

const chatStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, chatUploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = Date.now() + '_' + Math.random().toString(36).substring(7) + ext;
    cb(null, name);
  }
});

const chatUpload = multer({
  storage: chatStorage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
  fileFilter: (req, file, cb) => {
    // อนุญาตรูป, วิดีโอ, PDF, เอกสาร
    const allowed = /jpeg|jpg|png|gif|webp|mp4|mov|pdf|doc|docx|xls|xlsx|csv|txt|zip|rar/;
    const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
    if (allowed.test(ext)) {
      cb(null, true);
    } else {
      cb(new Error('ไม่รองรับไฟล์ประเภท .' + ext));
    }
  }
});

exports.chatUpload = chatUpload;

// ============================================
// Helper: ดึง platform credentials จาก DB
// ============================================
function getPlatformConfig(platform, callback) {
  db.query(
    'SELECT * FROM chat_platforms WHERE platform_name = ? AND is_active = 1 LIMIT 1',
    [platform],
    (err, rows) => {
      if (err || rows.length === 0) return callback(err || new Error('ยังไม่ได้ตั้งค่า ' + platform));
      callback(null, rows[0]);
    }
  );
}

// ============================================
// Helper: HTTP request (ใช้แทน axios)
// ============================================
function httpRequest(url, method, headers, body, callback) {
  const parsed = new URL(url);
  const options = {
    hostname: parsed.hostname,
    path: parsed.pathname + parsed.search,
    method: method,
    headers: headers || {}
  };

  const req = https.request(options, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      try {
        callback(null, JSON.parse(data), res.statusCode);
      } catch (e) {
        callback(null, data, res.statusCode);
      }
    });
  });

  req.on('error', (err) => callback(err));

  if (body) {
    const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
    req.write(bodyStr);
  }
  req.end();
}

// ============================================
// Helper: Parse ชื่อ/เบอร์/อีเมล จากข้อความ
// ============================================
function extractCustomerInfo(text) {
  if (!text) return {};
  const info = {};

  // เบอร์โทรไทย
  const phoneMatch = text.match(/(\+?66|0)\d{1,2}[-.\s]?\d{3,4}[-.\s]?\d{3,4}/);
  if (phoneMatch) info.phone = phoneMatch[0].replace(/[-.\s]/g, '');

  // อีเมล
  const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  if (emailMatch) info.email = emailMatch[0];

  return info;
}

// ============================================
// 1. GET /conversations — ดูรายการ conversation
// ============================================
// สิทธิ์การมองเห็น:
//   - super_admin / admin → เห็นทุก conversation
//   - ฝ่ายขาย (sales) → เห็นเฉพาะแชทของเคสที่ตัวเองรับผิดชอบ (assigned_sales_id)
//     หรือ conversation ที่ assign ตรงให้ตัวเอง (assigned_to)
//   - ฝ่ายอื่น → เห็นเฉพาะที่ assign ตรง
exports.getConversations = (req, res) => {
  const { status, platform, search, page, tag_id } = req.query;
  const limit = 30;
  const offset = ((parseInt(page) || 1) - 1) * limit;
  const user = req.user; // { id, username, department } จาก authMiddleware

  let where = '1=1';
  let extraJoin = '';
  const params = [];

  // === ฟิลเตอร์ตามสิทธิ์ ===
  if (user.department !== 'super_admin' && user.department !== 'admin') {
    if (user.department === 'sales') {
      // เซลล์: เห็นแชทของเคสที่ assigned_sales_id = ตัวเอง
      //         หรือ conversation ที่ assigned_to = ตัวเอง
      extraJoin = 'LEFT JOIN cases cs ON cs.loan_request_id = c.loan_request_id ';
      where += ' AND (cs.assigned_sales_id = ? OR c.assigned_to = ?)';
      params.push(user.id, user.id);
    } else {
      // ฝ่ายอื่น → เห็นเฉพาะที่ assign ตรง
      where += ' AND c.assigned_to = ?';
      params.push(user.id);
    }
  }

  if (status && status !== 'all') {
    where += ' AND c.status = ?';
    params.push(status);
  }
  if (platform && platform !== 'all') {
    where += ' AND c.platform = ?';
    params.push(platform);
  }
  if (search) {
    where += ' AND (c.customer_name LIKE ? OR c.customer_phone LIKE ? OR c.last_message_text LIKE ?)';
    params.push('%' + search + '%', '%' + search + '%', '%' + search + '%');
  }
  if (tag_id && tag_id !== 'all') {
    if (tag_id === 'none') {
      where += ' AND c.tag_id IS NULL';
    } else {
      where += ' AND c.tag_id = ?';
      params.push(parseInt(tag_id));
    }
  }

  // นับจำนวนทั้งหมด
  db.query(
    'SELECT COUNT(DISTINCT c.id) as total FROM chat_conversations c ' + extraJoin + 'WHERE ' + where,
    params,
    (err, countRows) => {
      if (err) return res.status(500).json({ success: false, message: err.message });

      var total = countRows[0].total;

      // ดึงข้อมูล (JOIN chat_tags + admin_users + last_replied_by สำหรับ super_admin)
      db.query(
        'SELECT DISTINCT c.*, au.username as assigned_username, ' +
        'ct.name as tag_name, ct.bg_color as tag_bg_color, ct.text_color as tag_text_color, ' +
        'sales_au.full_name as sales_full_name, sales_au.nickname as sales_nickname ' +
        'FROM chat_conversations c ' +
        extraJoin +
        'LEFT JOIN admin_users au ON c.assigned_to = au.id ' +
        'LEFT JOIN chat_tags ct ON c.tag_id = ct.id ' +
        'LEFT JOIN cases cs2 ON cs2.loan_request_id = c.loan_request_id ' +
        'LEFT JOIN admin_users sales_au ON sales_au.id = cs2.assigned_sales_id ' +
        'WHERE ' + where + ' ' +
        'ORDER BY c.last_message_at DESC ' +
        'LIMIT ? OFFSET ?',
        params.concat([limit, offset]),
        (err2, rows) => {
          if (err2) return res.status(500).json({ success: false, message: err2.message });

          // นับ unread (filter ตามสิทธิ์เหมือนกัน)
          let unreadSql = "SELECT COUNT(DISTINCT c.id) as unread FROM chat_conversations c " + extraJoin + "WHERE c.status = 'unread'";
          const unreadParams = [];
          if (user.department !== 'super_admin' && user.department !== 'admin') {
            if (user.department === 'sales') {
              unreadSql += ' AND (cs.assigned_sales_id = ? OR c.assigned_to = ?)';
              unreadParams.push(user.id, user.id);
            } else {
              unreadSql += ' AND c.assigned_to = ?';
              unreadParams.push(user.id);
            }
          }
          db.query(
            unreadSql,
            unreadParams,
            (err3, unreadRows) => {
              res.json({
                success: true,
                conversations: rows,
                total: total,
                unread: unreadRows ? unreadRows[0].unread : 0,
                page: parseInt(page) || 1,
                totalPages: Math.ceil(total / limit)
              });
            }
          );
        }
      );
    }
  );
};

// ============================================
// 2. GET /conversations/:id — ดูข้อความใน conversation
// ============================================
// super_admin จะเห็นชื่อแอดมินที่ตอบแต่ละข้อความ + เซลล์ที่รับผิดชอบเคส
exports.getConversationDetail = (req, res) => {
  var id = req.params.id;
  var page = req.query.page;
  var limit = 50;
  var offset = ((parseInt(page) || 1) - 1) * limit;
  var user = req.user;

  // ดึง conversation info (JOIN chat_tags + loan_requests + cases + assigned sales)
  db.query(
    'SELECT c.*, au.username as assigned_username, ' +
    'ct.name as tag_name, ct.bg_color as tag_bg_color, ct.text_color as tag_text_color, ' +
    'lr.debtor_code, lr.status as loan_request_status, ' +
    'cs.case_code, cs.assigned_sales_id, ' +
    'sales_au.full_name as sales_full_name, sales_au.nickname as sales_nickname, sales_au.username as sales_username ' +
    'FROM chat_conversations c ' +
    'LEFT JOIN admin_users au ON c.assigned_to = au.id ' +
    'LEFT JOIN chat_tags ct ON c.tag_id = ct.id ' +
    'LEFT JOIN loan_requests lr ON lr.id = c.loan_request_id ' +
    'LEFT JOIN cases cs ON cs.loan_request_id = c.loan_request_id ' +
    'LEFT JOIN admin_users sales_au ON sales_au.id = cs.assigned_sales_id ' +
    'WHERE c.id = ?',
    [id],
    (err, convRows) => {
      if (err) return res.status(500).json({ success: false, message: err.message });
      if (convRows.length === 0) return res.status(404).json({ success: false, message: 'Conversation not found' });

      var conversation = convRows[0];

      // อัพเดทสถานะเป็น read
      if (conversation.status === 'unread') {
        db.query('UPDATE chat_conversations SET status = ? WHERE id = ?', ['read', id], function() {});
      }

      // ดึงข้อความ — sender_name เก็บชื่อแอดมินอยู่แล้ว (จาก saveAdminMessage)
      // ข้อมูลนี้จะแสดงให้ super_admin เห็นว่าใครตอบข้อความไหน
      db.query(
        'SELECT * FROM chat_messages WHERE conversation_id = ? ORDER BY created_at ASC LIMIT ? OFFSET ?',
        [id, limit, offset],
        (err2, msgRows) => {
          if (err2) return res.status(500).json({ success: false, message: err2.message });

          // นับข้อความทั้งหมด
          db.query(
            'SELECT COUNT(*) as total FROM chat_messages WHERE conversation_id = ?',
            [id],
            (err3, countRows) => {
              res.json({
                success: true,
                conversation: conversation,
                messages: msgRows,
                totalMessages: countRows ? countRows[0].total : 0
              });
            }
          );
        }
      );
    }
  );
};

// ============================================
// 3. POST /conversations/:id/reply — ตอบข้อความ
// ============================================
exports.sendReply = (req, res) => {
  var id = req.params.id;
  var message = req.body.message;
  var adminUser = req.user;

  if (!message || !message.trim()) {
    return res.status(400).json({ success: false, message: 'กรุณาพิมพ์ข้อความ' });
  }

  // ดึง conversation info
  db.query('SELECT * FROM chat_conversations WHERE id = ?', [id], (err, rows) => {
    if (err) return res.status(500).json({ success: false, message: err.message });
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Conversation not found' });

    var conv = rows[0];

    // เรียก API ส่งข้อความตามแพลตฟอร์ม
    if (conv.platform === 'facebook') {
      sendFacebookReply(conv, message, adminUser, (err2, result) => {
        if (err2) return res.status(500).json({ success: false, message: 'ส่งข้อความ Facebook ไม่สำเร็จ: ' + err2.message });
        saveAdminMessage(id, message, adminUser, res, req);
      });
    } else if (conv.platform === 'line') {
      sendLineReply(conv, message, adminUser, (err2, result) => {
        if (err2) return res.status(500).json({ success: false, message: 'ส่งข้อความ LINE ไม่สำเร็จ: ' + err2.message });
        saveAdminMessage(id, message, adminUser, res, req);
      });
    } else {
      return res.status(400).json({ success: false, message: 'Unknown platform' });
    }
  });
};

// ส่งข้อความผ่าน Facebook
function sendFacebookReply(conv, message, adminUser, callback) {
  getPlatformConfig('facebook', (err, config) => {
    if (err) return callback(err);

    var recipientId = conv.customer_platform_id;
    var url = 'https://graph.facebook.com/v19.0/me/messages?access_token=' + config.access_token;

    httpRequest(url, 'POST', { 'Content-Type': 'application/json' }, {
      recipient: { id: recipientId },
      message: { text: message }
    }, (err2, body, statusCode) => {
      if (err2) return callback(err2);
      if (statusCode !== 200) return callback(new Error((body.error && body.error.message) || 'Facebook API error'));
      callback(null, body);
    });
  });
}

// ส่งข้อความผ่าน LINE (push message)
function sendLineReply(conv, message, adminUser, callback) {
  getPlatformConfig('line', (err, config) => {
    if (err) return callback(err);

    var userId = conv.customer_platform_id;
    var url = 'https://api.line.me/v2/bot/message/push';

    httpRequest(url, 'POST', {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + config.access_token
    }, {
      to: userId,
      messages: [{ type: 'text', text: message }]
    }, (err2, body, statusCode) => {
      if (err2) return callback(err2);
      if (statusCode !== 200) return callback(new Error(body.message || 'LINE API error'));
      callback(null, body);
    });
  });
}

// บันทึกข้อความของ admin ลง DB + emit socket real-time
function saveAdminMessage(conversationId, message, adminUser, res, req) {
  db.query(
    "INSERT INTO chat_messages (conversation_id, sender_type, sender_name, message_text, message_type, created_at) " +
    "VALUES (?, 'admin', ?, ?, 'text', NOW())",
    [conversationId, (adminUser && adminUser.username) || 'Admin', message],
    (err, insertResult) => {
      if (err) return res.status(500).json({ success: false, message: err.message });
      var insertedId = insertResult.insertId;

      // อัพเดท conversation
      db.query(
        "UPDATE chat_conversations SET status = 'replied', last_message_text = ?, last_message_at = NOW() WHERE id = ?",
        [message, conversationId],
        (err2) => {
          // 🔥 Emit real-time socket — broadcast ให้แอดมินทุกคนที่เปิดดู conversation นี้
          if (req) {
            var io = req.app.get('io');
            if (io) {
              var messageData = {
                conversation_id: conversationId,
                message: {
                  id: insertedId,
                  conversation_id: conversationId,
                  sender_type: 'admin',
                  sender_name: (adminUser && adminUser.username) || 'Admin',
                  message_text: message,
                  message_type: 'text',
                  attachment_url: null,
                  created_at: new Date().toISOString()
                }
              };
              io.to('conv_' + conversationId).emit('new_message', messageData);
              io.to('admin_room').emit('conversation_updated', {
                conversation_id: conversationId,
                last_message: message,
                sender_type: 'admin'
              });
            }
          }
          res.json({ success: true, message: 'ส่งข้อความสำเร็จ', message_id: insertedId });
        }
      );
    }
  );
}

// ============================================
// 4. PUT /conversations/:id/note — เพิ่ม/แก้ไข note
// ============================================
exports.updateNote = (req, res) => {
  var id = req.params.id;
  var notes = req.body.notes;

  db.query(
    'UPDATE chat_conversations SET notes = ? WHERE id = ?',
    [notes, id],
    (err) => {
      if (err) return res.status(500).json({ success: false, message: err.message });
      res.json({ success: true, message: 'บันทึก note สำเร็จ' });
    }
  );
};

// ============================================
// 5. PUT /conversations/:id/info — แก้ไขข้อมูลลูกค้า
// ============================================
exports.updateCustomerInfo = (req, res) => {
  var id = req.params.id;
  var customer_name = req.body.customer_name;
  var customer_phone = req.body.customer_phone;
  var customer_email = req.body.customer_email;
  var occupation = req.body.occupation || null;
  var monthly_income = req.body.monthly_income || null;
  var desired_amount = req.body.desired_amount || null;

  db.query(
    'UPDATE chat_conversations SET customer_name = ?, customer_phone = ?, customer_email = ?, occupation = ?, monthly_income = ?, desired_amount = ? WHERE id = ?',
    [customer_name, customer_phone, customer_email, occupation, monthly_income, desired_amount, id],
    (err) => {
      if (err) return res.status(500).json({ success: false, message: err.message });

      // ถ้ามีชื่อ + เบอร์ครบ → ตรวจสอบว่า loan_request ยังอยู่ไหม
      if (customer_name && customer_phone) {
        db.query('SELECT loan_request_id FROM chat_conversations WHERE id = ?', [id], (err2, rows) => {
          if (err2 || rows.length === 0) return;
          var lrId = rows[0].loan_request_id;

          if (!lrId) {
            // ยังไม่เคยมี loan_request → สร้างใหม่
            var io = req.app.get('io');
            var chatWebhook = require('./chatWebhookController');
            if (chatWebhook.autoCreateLoanRequest) chatWebhook.autoCreateLoanRequest(id, io);
          } else {
            // มี loan_request_id → เช็คว่ายังอยู่ในฐานข้อมูลจริงไหม
            db.query('SELECT id FROM loan_requests WHERE id = ?', [lrId], (err3, lrRows) => {
              if (err3) return;
              if (lrRows && lrRows.length > 0) {
                // ยังอยู่ → อัพเดทข้อมูลทั้งหมดใน loan_request
                db.query(
                  'UPDATE loan_requests SET contact_name = ?, contact_phone = ?, contact_email = ?, occupation = ?, monthly_income = ?, desired_amount = ? WHERE id = ?',
                  [customer_name, customer_phone, customer_email || null, occupation, monthly_income, desired_amount, lrId],
                  () => {}
                );
              } else {
                // ถูกลบไปแล้ว → ตัด link เดิม แล้วสร้างลูกหนี้ใหม่
                db.query('UPDATE chat_conversations SET loan_request_id = NULL WHERE id = ?', [id], () => {
                  var io = req.app.get('io');
                  var chatWebhook = require('./chatWebhookController');
                  if (chatWebhook.autoCreateLoanRequest) chatWebhook.autoCreateLoanRequest(id, io);
                });
              }
            });
          }
        });
      }

      res.json({ success: true, message: 'อัพเดทข้อมูลลูกค้าสำเร็จ' });
    }
  );
};

// ============================================
// 6. PUT /conversations/:id/assign — มอบหมายเคส
// ============================================
exports.assignConversation = (req, res) => {
  var id = req.params.id;
  var assigned_to = req.body.assigned_to;

  db.query(
    'UPDATE chat_conversations SET assigned_to = ? WHERE id = ?',
    [assigned_to || null, id],
    (err) => {
      if (err) return res.status(500).json({ success: false, message: err.message });
      res.json({ success: true, message: 'มอบหมายเคสสำเร็จ' });
    }
  );
};

// ============================================
// 7. POST /sync/facebook — ดึงข้อมูลแชทจาก Facebook Graph API
// ============================================
exports.syncFacebook = (req, res) => {
  getPlatformConfig('facebook', (err, config) => {
    if (err) return res.status(500).json({ success: false, message: err.message });

    var pageId = config.platform_id;
    var token = config.access_token;

    // ดึง conversations จาก Facebook Page (Conversations API)
    var url = 'https://graph.facebook.com/v19.0/' + pageId +
      '/conversations?fields=id,participants,updated_time,snippet,message_count,' +
      'messages.limit(20){id,from,to,message,created_time,attachments{mime_type,name,size,image_data}}&' +
      'access_token=' + token + '&limit=25';

    httpRequest(url, 'GET', {}, null, (err2, body) => {
      if (err2) return res.status(500).json({ success: false, message: err2.message });
      if (body.error) return res.status(500).json({ success: false, message: 'Facebook API Error: ' + body.error.message });

      var conversations = (body.data) || [];
      var processed = 0;
      var synced = 0;

      if (conversations.length === 0) {
        return res.json({ success: true, message: 'ไม่มี conversation ใหม่จาก Facebook', synced: 0 });
      }

      conversations.forEach(function(fbConv) {
        // หา customer (ไม่ใช่ page)
        var participants = (fbConv.participants && fbConv.participants.data) || [];
        var customer = participants.find(function(p) { return p.id !== pageId; }) || {};
        var messages = (fbConv.messages && fbConv.messages.data) || [];
        var lastMsg = messages[0]; // messages เรียงจากใหม่สุด

        // Parse ข้อมูลลูกค้าจากข้อความทั้งหมด
        var allText = messages.map(function(m) { return m.message || ''; }).join(' ');
        var extracted = extractCustomerInfo(allText);

        // ดึง avatar ของลูกค้า (ถ้ามี PSID)
        var avatarUrl = customer.id ? ('https://graph.facebook.com/v19.0/' + customer.id + '/picture?type=normal&access_token=' + token) : null;

        // Upsert conversation
        db.query(
          "INSERT INTO chat_conversations (platform, platform_conversation_id, customer_name, customer_phone, customer_email, customer_avatar, customer_platform_id, status, last_message_text, last_message_at, created_at) " +
          "VALUES ('facebook', ?, ?, ?, ?, ?, ?, 'unread', ?, ?, NOW()) " +
          "ON DUPLICATE KEY UPDATE " +
          "customer_name = COALESCE(VALUES(customer_name), customer_name), " +
          "customer_phone = COALESCE(VALUES(customer_phone), customer_phone), " +
          "customer_email = COALESCE(VALUES(customer_email), customer_email), " +
          "customer_avatar = COALESCE(VALUES(customer_avatar), customer_avatar), " +
          "last_message_text = VALUES(last_message_text), " +
          "last_message_at = VALUES(last_message_at)",
          [
            fbConv.id,
            customer.name || null,
            extracted.phone || null,
            extracted.email || null,
            avatarUrl,
            customer.id || null,
            (lastMsg && lastMsg.message) || null,
            (lastMsg && lastMsg.created_time) || null
          ],
          (err3, result) => {
            if (err3) {
              console.log('Sync FB conversation error:', err3.message);
              processed++;
              if (processed === conversations.length) {
                return res.json({ success: true, message: 'Sync สำเร็จ ' + synced + '/' + processed + ' conversations', synced: synced });
              }
              return;
            }

            synced++;

            // ดึง conversation id สำหรับ insert messages
            var convId = result.insertId;
            if (!convId || convId === 0) {
              // ON DUPLICATE KEY UPDATE → ต้อง query หา id
              db.query(
                "SELECT id FROM chat_conversations WHERE platform = 'facebook' AND platform_conversation_id = ?",
                [fbConv.id],
                (err4, idRows) => {
                  if (!err4 && idRows.length > 0) {
                    syncMessages(idRows[0].id, messages, pageId);
                  }
                  processed++;
                  if (processed === conversations.length) {
                    res.json({ success: true, message: 'Sync Facebook สำเร็จ ' + synced + ' conversations, ' + messages.length + ' ข้อความ', synced: synced });
                  }
                }
              );
            } else {
              syncMessages(convId, messages, pageId);
              processed++;
              if (processed === conversations.length) {
                res.json({ success: true, message: 'Sync Facebook สำเร็จ ' + synced + ' conversations', synced: synced });
              }
            }
          }
        );
      });
    });
  });
};

// ============================================
// 8. POST /sync/line — LINE ไม่มี API ดึง history
// ============================================
exports.syncLine = (req, res) => {
  res.json({
    success: true,
    message: 'LINE ไม่มี API ดึงประวัติแชทย้อนหลัง — ข้อมูลจะเข้ามาผ่าน Webhook อัตโนมัติเมื่อลูกค้าส่งข้อความใหม่ (ต้องใช้ ngrok หรือ domain จริง)'
  });
};

// ============================================
// 9. GET /platforms — ดู platform configs
// ============================================
exports.getPlatforms = (req, res) => {
  db.query('SELECT id, platform_name, platform_id, page_name, is_active, created_at FROM chat_platforms', (err, rows) => {
    if (err) return res.status(500).json({ success: false, message: err.message });
    res.json({ success: true, platforms: rows });
  });
};

// ============================================
// 10. POST /platforms — เพิ่ม/แก้ platform config
// ============================================
exports.createPlatform = (req, res) => {
  var platform_name = req.body.platform_name;
  var platform_id = req.body.platform_id;
  var access_token = req.body.access_token;
  var channel_secret = req.body.channel_secret;
  var page_name = req.body.page_name;

  if (!platform_name || !platform_id || !access_token) {
    return res.status(400).json({ success: false, message: 'กรุณากรอกข้อมูลให้ครบ (platform, ID, token)' });
  }

  db.query(
    "INSERT INTO chat_platforms (platform_name, platform_id, access_token, channel_secret, page_name) " +
    "VALUES (?, ?, ?, ?, ?) " +
    "ON DUPLICATE KEY UPDATE access_token = VALUES(access_token), channel_secret = VALUES(channel_secret), page_name = VALUES(page_name)",
    [platform_name, platform_id, access_token, channel_secret || null, page_name || null],
    (err) => {
      if (err) return res.status(500).json({ success: false, message: err.message });
      res.json({ success: true, message: 'บันทึก platform สำเร็จ' });
    }
  );
};

// ============================================
// 11. DELETE /platforms/:id — ลบ platform
// ============================================
exports.deletePlatform = (req, res) => {
  var id = req.params.id;
  db.query('DELETE FROM chat_platforms WHERE id = ?', [id], (err) => {
    if (err) return res.status(500).json({ success: false, message: err.message });
    res.json({ success: true, message: 'ลบ platform สำเร็จ' });
  });
};

// ============================================
// 12. GET /stats — สถิติแชท
// ============================================
exports.getStats = (req, res) => {
  db.query(
    "SELECT " +
    "COUNT(*) as total, " +
    "SUM(CASE WHEN status = 'unread' THEN 1 ELSE 0 END) as unread, " +
    "SUM(CASE WHEN status = 'read' THEN 1 ELSE 0 END) as reading, " +
    "SUM(CASE WHEN status = 'replied' THEN 1 ELSE 0 END) as replied, " +
    "SUM(CASE WHEN platform = 'facebook' THEN 1 ELSE 0 END) as facebook, " +
    "SUM(CASE WHEN platform = 'line' THEN 1 ELSE 0 END) as line_count " +
    "FROM chat_conversations",
    (err, rows) => {
      if (err) return res.status(500).json({ success: false, message: err.message });
      res.json({ success: true, stats: rows[0] });
    }
  );
};

// ============================================
// Helper: Sync messages จาก Facebook ลง DB
// ============================================
function syncMessages(conversationId, messages, pageId) {
  if (!messages || messages.length === 0) return;

  messages.forEach(function(msg) {
    var senderType = (msg.from && msg.from.id === pageId) ? 'admin' : 'customer';
    var senderName = (msg.from && msg.from.name) || '';
    var messageText = msg.message || '';
    var createdAt = msg.created_time || new Date().toISOString();

    // ตรวจสอบ attachment
    var messageType = 'text';
    var attachmentUrl = null;
    if (msg.attachments && msg.attachments.data && msg.attachments.data.length > 0) {
      var att = msg.attachments.data[0];
      if (att.mime_type && att.mime_type.startsWith('image/')) {
        messageType = 'image';
        attachmentUrl = (att.image_data && att.image_data.url) || null;
      } else {
        messageType = 'file';
        attachmentUrl = att.file_url || null;
      }
    }

    db.query(
      "INSERT IGNORE INTO chat_messages (conversation_id, platform_message_id, sender_type, sender_name, message_text, message_type, attachment_url, created_at) " +
      "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [conversationId, msg.id, senderType, senderName, messageText, messageType, attachmentUrl, createdAt],
      (err) => {
        if (err) console.log('Sync message error:', err.message);
      }
    );
  });
}

// ============================================
// PROXY — ดึงรูปภาพ/วิดีโอจาก LINE (ต้องใช้ Bearer token)
// ============================================
exports.proxyLineContent = (req, res) => {
  const messageId = req.params.messageId;

  if (!messageId) {
    return res.status(400).json({ success: false, message: 'Missing messageId' });
  }

  getPlatformConfig('line', (err, config) => {
    if (err) return res.status(500).json({ success: false, message: 'LINE not configured' });

    const url = `https://api-data.line.me/v2/bot/message/${messageId}/content`;
    const options = {
      headers: { 'Authorization': `Bearer ${config.access_token}` }
    };

    https.get(url, options, (lineRes) => {
      if (lineRes.statusCode !== 200) {
        return res.status(lineRes.statusCode).json({ success: false, message: 'LINE content not found' });
      }

      // ส่ง content-type ตามที่ LINE ส่งกลับมา (image/jpeg, video/mp4 ฯลฯ)
      const contentType = lineRes.headers['content-type'] || 'application/octet-stream';
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=86400'); // cache 1 วัน

      // pipe ข้อมูลจาก LINE ไป client
      lineRes.pipe(res);
    }).on('error', (err2) => {
      console.log('LINE proxy error:', err2.message);
      res.status(500).json({ success: false, message: 'Proxy error' });
    });
  });
};

// ============================================
// TAGS — ระบบแท็กสถานะ
// ============================================

// GET /tags — ดึงแท็กทั้งหมด
exports.getTags = (req, res) => {
  db.query('SELECT * FROM chat_tags ORDER BY sort_order ASC, id ASC', (err, rows) => {
    if (err) return res.status(500).json({ success: false, message: err.message });
    res.json({ success: true, tags: rows });
  });
};

// POST /tags — สร้างแท็กใหม่
exports.createTag = (req, res) => {
  const { name, bg_color, text_color } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ success: false, message: 'กรุณาระบุชื่อแท็ก' });
  }

  // หา sort_order สูงสุด
  db.query('SELECT MAX(sort_order) as max_sort FROM chat_tags', (err, rows) => {
    const nextSort = (rows && rows[0] && rows[0].max_sort || 0) + 1;
    db.query(
      'INSERT INTO chat_tags (name, bg_color, text_color, sort_order, created_by) VALUES (?, ?, ?, ?, ?)',
      [name.trim(), bg_color || '#e5e7eb', text_color || '#333333', nextSort, req.user?.id || null],
      (err2, result) => {
        if (err2) return res.status(500).json({ success: false, message: err2.message });
        res.json({
          success: true,
          message: 'สร้างแท็กสำเร็จ',
          tag: { id: result.insertId, name: name.trim(), bg_color: bg_color || '#e5e7eb', text_color: text_color || '#333333', sort_order: nextSort }
        });
      }
    );
  });
};

// PUT /tags/:id — แก้ไขแท็ก
exports.updateTag = (req, res) => {
  const { name, bg_color, text_color } = req.body;
  const tagId = req.params.id;

  if (!name || !name.trim()) {
    return res.status(400).json({ success: false, message: 'กรุณาระบุชื่อแท็ก' });
  }

  db.query(
    'UPDATE chat_tags SET name = ?, bg_color = ?, text_color = ? WHERE id = ?',
    [name.trim(), bg_color || '#e5e7eb', text_color || '#333333', tagId],
    (err) => {
      if (err) return res.status(500).json({ success: false, message: err.message });
      res.json({ success: true, message: 'อัพเดทแท็กสำเร็จ' });
    }
  );
};

// DELETE /tags/:id — ลบแท็ก
exports.deleteTag = (req, res) => {
  const tagId = req.params.id;

  // ลบแท็กออกจาก conversations ที่ใช้อยู่
  db.query('UPDATE chat_conversations SET tag_id = NULL WHERE tag_id = ?', [tagId], (err) => {
    if (err) return res.status(500).json({ success: false, message: err.message });

    db.query('DELETE FROM chat_tags WHERE id = ?', [tagId], (err2) => {
      if (err2) return res.status(500).json({ success: false, message: err2.message });
      res.json({ success: true, message: 'ลบแท็กสำเร็จ' });
    });
  });
};

// PUT /conversations/:id/tag — ตั้งแท็กให้ conversation
exports.setConversationTag = (req, res) => {
  const id = req.params.id;
  const tag_id = req.body.tag_id; // null = ลบแท็ก

  db.query(
    'UPDATE chat_conversations SET tag_id = ? WHERE id = ?',
    [tag_id || null, id],
    (err) => {
      if (err) return res.status(500).json({ success: false, message: err.message });
      res.json({ success: true, message: tag_id ? 'ตั้งแท็กสำเร็จ' : 'ลบแท็กสำเร็จ' });
    }
  );
};

// ============================================
// ARCHIVE — ดูตัวอย่างข้อมูลที่จะ archive
// ============================================
exports.previewArchive = (req, res) => {
  const months = parseInt(req.query.months) || 3;
  const cutoffDate = new Date();
  cutoffDate.setMonth(cutoffDate.getMonth() - months);
  const cutoffStr = cutoffDate.toISOString().slice(0, 19).replace('T', ' ');

  db.query(
    `SELECT COUNT(*) as message_count,
            MIN(created_at) as oldest_message,
            MAX(created_at) as newest_in_range,
            COUNT(DISTINCT conversation_id) as conversation_count
     FROM chat_messages WHERE created_at < ?`,
    [cutoffStr],
    (err, rows) => {
      if (err) return res.json({ success: false, message: err.message });

      const info = rows[0];
      // ดูขนาดตาราง
      db.query(
        `SELECT
           (SELECT COUNT(*) FROM chat_messages) as total_messages,
           (SELECT COUNT(*) FROM chat_messages_archive) as archived_messages`,
        (err2, rows2) => {
          const totals = !err2 && rows2[0] ? rows2[0] : { total_messages: 0, archived_messages: 0 };
          res.json({
            success: true,
            preview: {
              months: months,
              cutoff_date: cutoffStr,
              messages_to_archive: info.message_count,
              conversations_affected: info.conversation_count,
              oldest_message: info.oldest_message,
              newest_in_range: info.newest_in_range,
              total_messages_current: totals.total_messages,
              total_messages_archived: totals.archived_messages
            }
          });
        }
      );
    }
  );
};

// ============================================
// ARCHIVE — ย้ายข้อมูลเก่าไปตาราง archive
// ============================================
exports.executeArchive = (req, res) => {
  const months = parseInt(req.body.months) || 3;
  const cutoffDate = new Date();
  cutoffDate.setMonth(cutoffDate.getMonth() - months);
  const cutoffStr = cutoffDate.toISOString().slice(0, 19).replace('T', ' ');

  // Step 1: Copy ข้อมูลเก่าไป archive
  db.query(
    `INSERT INTO chat_messages_archive (original_id, conversation_id, platform_message_id, sender_type, sender_name, message_text, message_type, attachment_url, created_at)
     SELECT id, conversation_id, platform_message_id, sender_type, sender_name, message_text, message_type, attachment_url, created_at
     FROM chat_messages WHERE created_at < ?`,
    [cutoffStr],
    (err, result) => {
      if (err) return res.json({ success: false, message: 'Archive copy error: ' + err.message });

      const copiedCount = result.affectedRows;

      // Step 2: ลบข้อมูลเก่าจากตาราง chat_messages
      db.query(
        `DELETE FROM chat_messages WHERE created_at < ?`,
        [cutoffStr],
        (err2, result2) => {
          if (err2) return res.json({ success: false, message: 'Archive delete error: ' + err2.message });

          const deletedCount = result2.affectedRows;
          res.json({
            success: true,
            message: `Archive สำเร็จ — ย้าย ${copiedCount} ข้อความ, ลบ ${deletedCount} ข้อความ (เก่ากว่า ${months} เดือน)`,
            archived: copiedCount,
            deleted: deletedCount
          });
        }
      );
    }
  );
};

// ============================================
// LINKED USER — ค้นหา user จาก property_db ที่เชื่อมกับลูกค้าแชท
// GET /conversations/:id/linked-user
// ============================================
exports.getLinkedUser = (req, res) => {
  var id = req.params.id;

  // ดึง phone/email ของลูกค้าจาก conversation
  db.query('SELECT customer_phone, customer_email, customer_name FROM chat_conversations WHERE id = ?', [id], (err, rows) => {
    if (err) return res.status(500).json({ success: false, message: err.message });
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Conversation not found' });

    var conv = rows[0];
    var phone = conv.customer_phone;
    var email = conv.customer_email;
    var name = conv.customer_name;

    // ถ้าไม่มีเบอร์และอีเมล → ไม่สามารถค้นหาได้
    if (!phone && !email) {
      return res.json({ success: true, linked_user: null, message: 'ไม่มีเบอร์/อีเมลเพื่อค้นหา' });
    }

    // ค้นหาจาก property_db.users (cross-database query)
    var where = [];
    var params = [];
    if (phone) {
      where.push('u.phone = ?');
      params.push(phone);
    }
    if (email) {
      where.push('u.email = ?');
      params.push(email);
    }

    var userSql = 'SELECT u.id, u.display_name, u.email, u.phone, u.role, u.avatar_url, u.company_name, u.line_id, u.created_at ' +
      'FROM property_db.users u WHERE (' + where.join(' OR ') + ') LIMIT 1';

    db.query(userSql, params, (err2, userRows) => {
      if (err2) {
        // ถ้า query cross-database ไม่ได้ (permission) → ส่ง null
        console.log('Cross-DB query error:', err2.message);
        return res.json({ success: true, linked_user: null, message: 'ไม่สามารถเชื่อมต่อ property_db: ' + err2.message });
      }

      if (userRows.length === 0) {
        return res.json({ success: true, linked_user: null, message: 'ไม่พบ user ที่ตรงกัน' });
      }

      var user = userRows[0];

      // ดึงทรัพย์ที่ user ลงประกาศ
      db.query(
        'SELECT ip.id, ip.property_type, ip.listing_type, ip.price, ip.province, ip.district, ip.status, ip.created_at ' +
        'FROM property_db.investment_properties ip WHERE ip.user_id = ? ORDER BY ip.created_at DESC LIMIT 10',
        [user.id],
        (err3, properties) => {
          if (err3) {
            console.log('Cross-DB properties query error:', err3.message);
            properties = [];
          }

          // ดึงทรัพย์ที่ user เป็นเจ้าของ (ถ้ามี)
          db.query(
            'SELECT p.id, p.title, p.property_type, p.listing_type, p.price_requested, p.province, p.is_active, p.created_at ' +
            'FROM property_db.properties p WHERE p.owner_id = ? ORDER BY p.created_at DESC LIMIT 10',
            [user.id],
            (err4, ownedProperties) => {
              if (err4) {
                console.log('Cross-DB owned properties query error:', err4.message);
                ownedProperties = [];
              }

              res.json({
                success: true,
                linked_user: {
                  ...user,
                  investment_properties: properties || [],
                  owned_properties: ownedProperties || []
                }
              });
            }
          );
        }
      );
    });
  });
};

// ============================================
// FILE UPLOAD — ส่งไฟล์ (รูป/PDF/เอกสาร) ในแชท
// ============================================
exports.sendFileReply = (req, res) => {
  var id = req.params.id;
  var adminUser = req.user;

  if (!req.file) {
    return res.status(400).json({ success: false, message: 'ไม่พบไฟล์' });
  }

  var file = req.file;
  var attachmentUrl = '/uploads/chat/' + file.filename;
  var ext = path.extname(file.originalname).toLowerCase();
  var messageType = 'file';
  if (/\.(jpg|jpeg|png|gif|webp)$/.test(ext)) messageType = 'image';
  else if (/\.(mp4|mov)$/.test(ext)) messageType = 'video';
  else if (/\.pdf$/.test(ext)) messageType = 'file';

  var messageText = messageType === 'image' ? '[รูปภาพ]' : '[ไฟล์] ' + file.originalname;

  // ดึง conversation info
  db.query('SELECT * FROM chat_conversations WHERE id = ?', [id], (err, rows) => {
    if (err) return res.status(500).json({ success: false, message: err.message });
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Conversation not found' });

    var conv = rows[0];

    // ส่งไฟล์ไปยังแพลตฟอร์ม (ถ้าเป็นรูป)
    // หมายเหตุ: FB/LINE รองรับส่งรูป แต่ไฟล์ PDF ส่งตรงไม่ได้ ส่งเป็นข้อความแจ้ง
    var platformSendDone = (sendErr) => {
      // บันทึกลง DB ไม่ว่าจะส่งไปแพลตฟอร์มสำเร็จหรือไม่
      db.query(
        "INSERT INTO chat_messages (conversation_id, sender_type, sender_name, message_text, message_type, attachment_url, created_at) " +
        "VALUES (?, 'admin', ?, ?, ?, ?, NOW())",
        [id, (adminUser && adminUser.username) || 'Admin', messageText, messageType, attachmentUrl],
        (err2, insertResult) => {
          if (err2) return res.status(500).json({ success: false, message: err2.message });
          var insertedId = insertResult.insertId;

          db.query(
            "UPDATE chat_conversations SET status = 'replied', last_message_text = ?, last_message_at = NOW() WHERE id = ?",
            [messageText, id],
            () => {
              // 🔥 Emit real-time socket event — แจ้ง admin ทุกคนที่เปิดดู conversation นี้
              var io = req.app.get('io');
              // insertedId มาจาก DB จริง ป้องกัน duplicate
              if (io) {
                var messageData = {
                  conversation_id: id,
                  message: {
                    id: insertedId,
                    conversation_id: id,
                    sender_type: 'admin',
                    sender_name: (adminUser && adminUser.username) || 'Admin',
                    message_text: messageText,
                    message_type: messageType,
                    attachment_url: attachmentUrl,
                    created_at: new Date().toISOString()
                  }
                };
                // ส่งไปห้อง conversation (แอดมินที่เปิดดูอยู่)
                io.to('conv_' + id).emit('new_message', messageData);
                // อัพเดท conversation list ของทุกแอดมิน
                io.to('admin_room').emit('conversation_updated', {
                  conversation_id: id,
                  customer_name: conv.customer_name || '',
                  platform: conv.platform || '',
                  customer_avatar: conv.customer_avatar || '',
                  last_message: messageText,
                  sender_type: 'admin'
                });
              }

              res.json({
                success: true,
                message: 'ส่งไฟล์สำเร็จ',
                attachment_url: attachmentUrl,
                message_type: messageType,
                message_id: insertedId  // ส่ง real DB id กลับให้ frontend อัปเดต id จริง
              });
            }
          );
        }
      );
    };

    // ส่งไฟล์ไปยังแพลตฟอร์มตามประเภท
    // PUBLIC_URL ต้องตั้งใน .env เช่น https://api.yourdomain.com (ต้องเป็น HTTPS สาธารณะ)
    // LINE และ Facebook จะดาวน์โหลดรูปจาก URL นี้ ถ้าไม่ตั้งจะใช้ req.hostname แทน
    var baseUrl = process.env.PUBLIC_URL
      ? process.env.PUBLIC_URL.replace(/\/$/, '')
      : (req.get('x-forwarded-proto') || req.protocol) + '://' + (req.get('x-forwarded-host') || req.get('host'));
    var fileUrl = baseUrl + attachmentUrl;

    if (conv.platform === 'facebook') {
      // Facebook รองรับส่งได้ทั้ง image, video, file (PDF/doc)
      getPlatformConfig('facebook', (err3, config) => {
        if (err3) return platformSendDone(err3);
        var fbType = messageType === 'image' ? 'image' : messageType === 'video' ? 'video' : 'file';
        var url = 'https://graph.facebook.com/v19.0/me/messages?access_token=' + config.access_token;
        httpRequest(url, 'POST', { 'Content-Type': 'application/json' }, {
          recipient: { id: conv.customer_platform_id },
          message: { attachment: { type: fbType, payload: { url: fileUrl, is_reusable: true } } }
        }, (sendErr, body, statusCode) => {
          if (sendErr || (statusCode && statusCode !== 200)) {
            console.log('FB send file error:', sendErr?.message || JSON.stringify(body));
          }
          platformSendDone(null); // บันทึกลง DB ไม่ว่าจะส่งสำเร็จหรือไม่
        });
      });
    } else if (conv.platform === 'line') {
      getPlatformConfig('line', (err3, config) => {
        if (err3) return platformSendDone(err3);

        var lineMessages;
        if (messageType === 'image') {
          // LINE รองรับส่งรูปภาพโดยตรง
          lineMessages = [{ type: 'image', originalContentUrl: fileUrl, previewImageUrl: fileUrl }];
        } else {
          // LINE ไม่รองรับส่งไฟล์ PDF/doc โดยตรง → ส่งเป็น text พร้อมลิงก์ดาวน์โหลด
          var fileName = file.originalname || path.basename(attachmentUrl);
          lineMessages = [{
            type: 'text',
            text: '📎 ไฟล์แนบ: ' + fileName + '\n🔗 ดาวน์โหลด: ' + fileUrl
          }];
        }

        httpRequest('https://api.line.me/v2/bot/message/push', 'POST', {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + config.access_token
        }, {
          to: conv.customer_platform_id,
          messages: lineMessages
        }, () => platformSendDone(null));
      });
    } else {
      platformSendDone(null);
    }
  });
};

// ============================================
// Helper: สร้างรหัส sequential (reuse logic จาก salesController)
// ============================================
function generateSequentialCode(table, column, prefix, digits, callback) {
  const sql = `SELECT ${column} FROM ${table} WHERE ${column} IS NOT NULL AND ${column} LIKE ? ORDER BY ${column} DESC LIMIT 1`;
  db.query(sql, [prefix + '%'], (err, rows) => {
    if (err) return callback(err, null);
    let nextNum = 1;
    if (rows.length > 0 && rows[0][column]) {
      const current = rows[0][column].replace(prefix, '');
      const num = parseInt(current, 10);
      if (!isNaN(num)) nextNum = num + 1;
    }
    const code = prefix + String(nextNum).padStart(digits, '0');
    callback(null, code);
  });
}

// ============================================
// POST /conversations/:id/create-loan-request
// ปุ่มสร้าง loan_request ด้วยมือ (กรณี auto-create ยังไม่ทริกเกอร์)
// ============================================
exports.manualCreateLoanRequest = (req, res) => {
  const convId = req.params.id;

  // 1) ดึงข้อมูล conversation
  db.query('SELECT * FROM chat_conversations WHERE id = ?', [convId], (err, rows) => {
    if (err) return res.status(500).json({ success: false, message: err.message });
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Conversation not found' });

    const conv = rows[0];

    // ถ้าสร้างแล้ว → return ข้อมูลเดิม
    if (conv.loan_request_id) {
      return db.query('SELECT id, debtor_code FROM loan_requests WHERE id = ?', [conv.loan_request_id], (err2, lrRows) => {
        if (err2) return res.status(500).json({ success: false, message: err2.message });
        return res.json({
          success: true,
          message: 'ลูกหนี้เคยสร้างแล้ว',
          loan_request_id: conv.loan_request_id,
          debtor_code: lrRows.length > 0 ? lrRows[0].debtor_code : null,
          already_exists: true
        });
      });
    }

    // ต้องมีอย่างน้อยชื่อ
    if (!conv.customer_name) {
      return res.status(400).json({ success: false, message: 'ไม่มีชื่อลูกค้า — กรุณาแก้ไขข้อมูลลูกค้าก่อน' });
    }

    // ตรวจ duplicate เบอร์
    const checkDup = conv.customer_phone
      ? new Promise((resolve) => {
          db.query('SELECT id, debtor_code FROM loan_requests WHERE contact_phone = ? LIMIT 1', [conv.customer_phone], (errDup, dupRows) => {
            if (!errDup && dupRows && dupRows.length > 0) {
              // มีอยู่แล้ว → เชื่อม
              const existingId = dupRows[0].id;
              db.query('UPDATE chat_conversations SET loan_request_id = ? WHERE id = ?', [existingId, convId], () => {});
              return resolve({ exists: true, id: existingId, debtor_code: dupRows[0].debtor_code });
            }
            resolve(null);
          });
        })
      : Promise.resolve(null);

    checkDup.then((existing) => {
      if (existing) {
        return res.json({
          success: true,
          message: `เชื่อมกับลูกหนี้ ${existing.debtor_code} ที่มีอยู่แล้ว (เบอร์เดียวกัน)`,
          loan_request_id: existing.id,
          debtor_code: existing.debtor_code,
          already_exists: true
        });
      }

      // สร้างใหม่
      generateSequentialCode('loan_requests', 'debtor_code', 'LDD', 4, (errCode, debtor_code) => {
        if (errCode) return res.status(500).json({ success: false, message: 'สร้างรหัสไม่สำเร็จ' });

        const source = conv.platform === 'line' ? 'LINE แชท' : conv.platform === 'facebook' ? 'Facebook แชท' : 'แชท';
        const preferred_contact = conv.platform || 'phone';
        let province = conv.location_hint || null;
        if (province === 'กทม' || province === 'กรุงเทพ') province = 'กรุงเทพมหานคร';
        if (province === 'โคราช') province = 'นครราชสีมา';
        if (province === 'อยุธยา') province = 'พระนครศรีอยุธยา';

        const notes = ['สร้างด้วยมือจากหน้าแชท — ' + source];
        if (conv.customer_email) notes.push('อีเมล: ' + conv.customer_email);

        const sql = `
          INSERT INTO loan_requests
            (debtor_code, source, contact_name, contact_phone,
             preferred_contact, property_type, loan_type_detail,
             deed_type, estimated_value, province,
             has_obligation, admin_note, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
        `;
        const params = [
          debtor_code, source,
          conv.customer_name,
          conv.customer_phone || null,
          preferred_contact,
          conv.property_type || null,
          conv.loan_type_detail || null,
          conv.deed_type || null,
          conv.estimated_value || null,
          province,
          conv.has_obligation || null,
          notes.join(' | ')
        ];

        db.query(sql, params, (errInsert, result) => {
          if (errInsert) return res.status(500).json({ success: false, message: errInsert.message });

          const loanRequestId = result.insertId;
          db.query('UPDATE chat_conversations SET loan_request_id = ? WHERE id = ?', [loanRequestId, convId], () => {});

          // แจ้ง socket
          const io = req.app.get('io');
          if (io) {
            io.to('admin_room').emit('loan_request_created', {
              conversation_id: parseInt(convId),
              loan_request_id: loanRequestId,
              debtor_code: debtor_code,
              customer_name: conv.customer_name,
              source: source,
              message: `ลูกหนี้ใหม่ ${debtor_code} สร้างจากหน้าแชท`
            });
          }

          res.json({
            success: true,
            message: `สร้างลูกหนี้ ${debtor_code} สำเร็จ`,
            loan_request_id: loanRequestId,
            debtor_code: debtor_code
          });
        });
      });
    });
  });
};

// ============================================
// POST /conversations/:id/sync-loan-request
// อัพเดทข้อมูล loan_request ด้วยข้อมูลล่าสุดจาก conversation
// (ปุ่มกดด้วยมือ — force update ทุกฟิลด์ที่ยังว่าง)
// ============================================
exports.syncLoanRequest = (req, res) => {
  const convId = req.params.id;

  db.query('SELECT * FROM chat_conversations WHERE id = ?', [convId], (err, rows) => {
    if (err) return res.status(500).json({ success: false, message: err.message });
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Conversation not found' });

    const conv = rows[0];
    if (!conv.loan_request_id) {
      return res.status(400).json({ success: false, message: 'ยังไม่ได้สร้างลูกหนี้ — กดสร้างก่อน' });
    }

    // Build update SET ด้วย COALESCE — อัพเดทเฉพาะฟิลด์ที่ยังว่าง
    const updates = [];
    const params = [];

    if (conv.customer_name) {
      updates.push('contact_name = COALESCE(contact_name, ?)');
      params.push(conv.customer_name);
    }
    if (conv.customer_phone) {
      updates.push('contact_phone = COALESCE(contact_phone, ?)');
      params.push(conv.customer_phone);
    }
    if (conv.property_type) {
      updates.push('property_type = COALESCE(property_type, ?)');
      params.push(conv.property_type);
    }
    if (conv.deed_type) {
      updates.push('deed_type = COALESCE(deed_type, ?)');
      params.push(conv.deed_type);
    }
    if (conv.loan_type_detail) {
      updates.push('loan_type_detail = COALESCE(loan_type_detail, ?)');
      params.push(conv.loan_type_detail);
    }
    if (conv.estimated_value) {
      updates.push('estimated_value = COALESCE(estimated_value, ?)');
      params.push(conv.estimated_value);
    }
    if (conv.has_obligation) {
      updates.push('has_obligation = COALESCE(has_obligation, ?)');
      params.push(conv.has_obligation);
    }
    if (conv.location_hint) {
      let province = conv.location_hint;
      if (province === 'กทม' || province === 'กรุงเทพ') province = 'กรุงเทพมหานคร';
      if (province === 'โคราช') province = 'นครราชสีมา';
      if (province === 'อยุธยา') province = 'พระนครศรีอยุธยา';
      updates.push('province = COALESCE(province, ?)');
      params.push(province);
    }
    if (conv.platform) {
      updates.push('preferred_contact = COALESCE(preferred_contact, ?)');
      params.push(conv.platform);
    }

    if (updates.length === 0) {
      return res.json({ success: true, message: 'ไม่มีข้อมูลใหม่ให้อัพเดท', updated_fields: 0 });
    }

    params.push(conv.loan_request_id);
    db.query(`UPDATE loan_requests SET ${updates.join(', ')} WHERE id = ?`, params, (errUpdate) => {
      if (errUpdate) return res.status(500).json({ success: false, message: errUpdate.message });

      res.json({
        success: true,
        message: `อัพเดทข้อมูลลูกหนี้สำเร็จ (${updates.length} รายการ)`,
        updated_fields: updates.length
      });
    });
  });
};