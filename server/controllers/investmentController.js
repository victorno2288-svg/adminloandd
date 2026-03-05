const db = require('../config/db');

// ==========================================
// 1. ดึงรายการทรัพย์น่าลงทุนทั้งหมด (พร้อม pagination + filter)
// GET /api/investment-properties
// ==========================================
exports.getAllProperties = (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const offset = (page - 1) * limit;

    const { property_type, contract_type, province, min_price, max_price, bedrooms, search, sort } = req.query;

    let where = ["ip.status = 'available'"];
    let params = [];

    if (property_type) {
        where.push('ip.property_type = ?');
        params.push(property_type);
    }
    if (contract_type) {
        where.push('ip.contract_type = ?');
        params.push(contract_type);
    }
    if (province) {
        where.push('ip.province = ?');
        params.push(province);
    }
    if (min_price) {
        where.push('ip.investment_amount >= ?');
        params.push(min_price);
    }
    if (max_price) {
        where.push('ip.investment_amount <= ?');
        params.push(max_price);
    }
    if (bedrooms) {
        where.push('ip.bedrooms >= ?');
        params.push(bedrooms);
    }
    if (search) {
        where.push('(ip.title LIKE ? OR ip.address LIKE ? OR ip.property_code LIKE ?)');
        params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const whereClause = where.join(' AND ');

    // นับจำนวนทั้งหมด
    const countSql = `SELECT COUNT(*) AS total FROM investment_properties ip WHERE ${whereClause}`;

    db.query(countSql, params, (err, countResult) => {
        if (err) {
            console.error('Count query error:', err);
            return res.status(500).json({ message: 'เกิดข้อผิดพลาด' });
        }

        const total = countResult[0].total;

        // เรียงลำดับ
        let orderBy = 'ip.created_at DESC'; // default: ใหม่สุดก่อน
        if (sort === 'price_asc') orderBy = 'ip.investment_amount ASC';
        if (sort === 'price_desc') orderBy = 'ip.investment_amount DESC';
        if (sort === 'interest_desc') orderBy = 'ip.interest_rate DESC';

        const sql = `
            SELECT
                ip.id,
                ip.title,
                ip.property_type,
                ip.property_code,
                ip.contract_type,
                ip.appraised_value,
                ip.investment_amount,
                ip.interest_rate,
                ip.contract_duration,
                ip.bedrooms,
                ip.bathrooms,
                ip.land_area,
                ip.building_area,
                ip.property_condition,
                ip.province,
                ip.district,
                ip.thumbnail,
                ip.status,
                ip.created_at
            FROM investment_properties ip
            WHERE ${whereClause}
            ORDER BY ${orderBy}
            LIMIT ? OFFSET ?
        `;

        db.query(sql, [...params, limit, offset], (err, results) => {
            if (err) {
                console.error('List query error:', err);
                return res.status(500).json({ message: 'เกิดข้อผิดพลาด' });
            }

            res.json({
                data: results,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit)
                }
            });
        });
    });
};

// ==========================================
// 2. ดึงรายละเอียดทรัพย์ตาม ID
// GET /api/investment-properties/:id
// ==========================================
exports.getPropertyById = (req, res) => {
    const { id } = req.params;

    const sql = `
        SELECT
            ip.*
        FROM investment_properties ip
        WHERE ip.id = ?
    `;

    db.query(sql, [id], (err, results) => {
        if (err) {
            console.error('Detail query error:', err);
            return res.status(500).json({ message: 'เกิดข้อผิดพลาด' });
        }
        if (results.length === 0) {
            return res.status(404).json({ message: 'ไม่พบทรัพย์สินนี้' });
        }

        const property = results[0];

        // parse images JSON ถ้าเป็น string
        if (property.images && typeof property.images === 'string') {
            try {
                property.images = JSON.parse(property.images);
            } catch (e) {
                property.images = [];
            }
        }

        // parse nearby_landmarks ถ้าเป็น JSON
        if (property.nearby_landmarks && typeof property.nearby_landmarks === 'string') {
            try {
                property.nearby_landmarks = JSON.parse(property.nearby_landmarks);
            } catch (e) {
                // ถ้าเป็น plain text ก็ปล่อยไว้
            }
        }

        // parse highlights ถ้าเป็น JSON
        if (property.highlights && typeof property.highlights === 'string') {
            try {
                property.highlights = JSON.parse(property.highlights);
            } catch (e) {
                // ถ้าเป็น plain text ก็ปล่อยไว้
            }
        }

        res.json(property);
    });
};

// ==========================================
// 3. ดึงทรัพย์ล่าสุด (สำหรับหน้าแรก)
// GET /api/investment-properties/latest
// ==========================================
exports.getLatestProperties = (req, res) => {
    const limit = parseInt(req.query.limit) || 6;

    const sql = `
        SELECT
            ip.id,
            ip.title,
            ip.property_type,
            ip.contract_type,
            ip.appraised_value,
            ip.investment_amount,
            ip.interest_rate,
            ip.contract_duration,
            ip.bedrooms,
            ip.bathrooms,
            ip.land_area,
            ip.building_area,
            ip.province,
            ip.district,
            ip.thumbnail,
            ip.created_at
        FROM investment_properties ip
        WHERE ip.status = 'available'
        ORDER BY ip.created_at DESC
        LIMIT ?
    `;

    db.query(sql, [limit], (err, results) => {
        if (err) {
            console.error('Latest query error:', err);
            return res.status(500).json({ message: 'เกิดข้อผิดพลาด' });
        }
        res.json(results);
    });
};

// ==========================================
// 4. นับจำนวนตามประเภท (สำหรับหน้าแรก)
// GET /api/investment-properties/counts
// ==========================================
exports.getPropertyCounts = (req, res) => {
    const sql = `
        SELECT
            property_type,
            COUNT(*) AS count
        FROM investment_properties
        WHERE status = 'available'
        GROUP BY property_type
    `;

    db.query(sql, (err, results) => {
        if (err) {
            console.error('Count query error:', err);
            return res.status(500).json({ message: 'เกิดข้อผิดพลาด' });
        }
        res.json(results);
    });
};

// ==========================================
// 5. นับจำนวนตามจังหวัด (สำหรับ filter)
// GET /api/investment-properties/provinces
// ==========================================
exports.getProvinceList = (req, res) => {
    const sql = `
        SELECT
            province,
            COUNT(*) AS count
        FROM investment_properties
        WHERE status = 'available'
        GROUP BY province
        ORDER BY count DESC
    `;

    db.query(sql, (err, results) => {
        if (err) {
            console.error('Province query error:', err);
            return res.status(500).json({ message: 'เกิดข้อผิดพลาด' });
        }
        res.json(results);
    });
};

// ==========================================
// 6. คำนวณผลตอบแทนจากการลงทุน
// POST /api/investment-properties/calculate-return
// ==========================================
exports.calculateReturn = (req, res) => {
    const { investment_amount, interest_rate, contract_duration } = req.body;

    if (!investment_amount || !interest_rate || !contract_duration) {
        return res.status(400).json({ message: 'กรุณากรอกข้อมูลให้ครบ' });
    }

    const amount = parseFloat(investment_amount);
    const rate = parseFloat(interest_rate) / 100; // 15% → 0.15
    const months = parseInt(contract_duration);

    const totalReturn = amount * rate * (months / 12);
    const monthlyReturn = totalReturn / months;
    const totalReceive = amount + totalReturn;

    res.json({
        investment_amount: amount,
        interest_rate: parseFloat(interest_rate),
        contract_duration: months,
        total_return: Math.round(totalReturn * 100) / 100,
        monthly_return: Math.round(monthlyReturn * 100) / 100,
        total_receive: Math.round(totalReceive * 100) / 100
    });
};


// ==========================================
// 7. ลงประกาศทรัพย์ใหม่ (สำหรับ borrower — ฟอร์ม 3 ขั้นตอน)
// POST /api/investment-properties/create
// ==========================================
exports.createProperty = (req, res) => {
    // ── ข้อมูลจาก frontend (ListProperty.jsx — 3 step form) ──
    const {
        transaction_type,   // 'selling-pledge' | 'mortgage'
        property_type,      // 'house','condo','townhouse','land','commercial','apartment','factory','other'
        area_size,          // ตัวเลข เช่น "50"
        area_unit,          // 'sqw' | 'sqm' | 'rai'
        province,
        district,
        purchase_price,     // ตัวเลข (string ไม่มี comma)
        loan_amount,        // ตัวเลข
        existing_debt,      // ตัวเลข (อาจว่าง)
        phone,
        line_id,
        note
    } = req.body;

    // ── user_id มาจาก JWT token (ถอดรหัสโดย middleware) ──
    const userId = req.user ? req.user.id : null;

    // ── Validation ──
    if (!transaction_type || !property_type) {
        return res.status(400).json({ error: 'กรุณาเลือกประเภทบริการและประเภททรัพย์สิน' });
    }
    if (!area_size || !province) {
        return res.status(400).json({ error: 'กรุณาระบุขนาดพื้นที่และจังหวัด' });
    }
    if (!purchase_price || !loan_amount) {
        return res.status(400).json({ error: 'กรุณาระบุราคาทรัพย์และจำนวนเงินที่ต้องการ' });
    }
    if (!phone || phone.length < 9) {
        return res.status(400).json({ error: 'กรุณาระบุเบอร์โทรศัพท์ที่ถูกต้อง' });
    }

    // ── สร้าง property_code อัตโนมัติ ──
    const propertyCode = `LP-${Date.now().toString(36).toUpperCase()}`;

    // ── แปลงหน่วยพื้นที่เป็น text ──
    const unitMap = { sqw: 'ตร.ว.', sqm: 'ตร.ม.', rai: 'ไร่' };
    const areaText = `${area_size} ${unitMap[area_unit] || area_unit}`;

    // ── สร้าง title อัตโนมัติ ──
    const typeLabel = {
        house: 'บ้านเดี่ยว', condo: 'คอนโด', townhouse: 'ทาวน์เฮ้าส์',
        land: 'ที่ดินเปล่า', commercial: 'อาคารพาณิชย์',
        apartment: 'อพาร์ทเม้นท์', factory: 'โรงงาน/โกดัง', other: 'อื่นๆ'
    };
    const txLabel = transaction_type === 'selling-pledge' ? 'ขายฝาก' : 'จำนอง';
    const autoTitle = `${txLabel} ${typeLabel[property_type] || property_type} ${areaText} ${province}`;

    // ── สร้าง description จาก note + contact ──
    let descParts = [];
    if (note) descParts.push(`หมายเหตุ: ${note}`);
    if (existing_debt) descParts.push(`หนี้คงค้าง: ฿${Number(existing_debt).toLocaleString()}`);
    descParts.push(`ติดต่อ: ${phone}`);
    if (line_id) descParts.push(`Line: ${line_id}`);
    const description = descParts.join(' | ');

    // ── SQL INSERT ──
    const sql = `
        INSERT INTO investment_properties (
            title, property_type, property_code, contract_type, description,
            land_area, province, district,
            appraised_value, investment_amount,
            contact_phone, contact_line, existing_debt,
            area_unit, user_id, status,
            created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', NOW(), NOW())
    `;

    const params = [
        autoTitle,                                  // title
        property_type,                              // property_type
        propertyCode,                               // property_code
        transaction_type,                           // contract_type (selling-pledge / mortgage)
        description,                                // description
        parseFloat(area_size) || 0,                 // land_area
        province,                                   // province
        district || '',                             // district
        parseFloat(purchase_price) || 0,            // appraised_value
        parseFloat(loan_amount) || 0,               // investment_amount
        phone,                                      // contact_phone ★ คอลัมน์ใหม่
        line_id || '',                              // contact_line  ★ คอลัมน์ใหม่
        parseFloat(existing_debt) || 0,             // existing_debt ★ คอลัมน์ใหม่
        area_unit || 'sqw',                         // area_unit     ★ คอลัมน์ใหม่
        userId                                      // user_id       ★ คอลัมน์ใหม่
    ];

    db.query(sql, params, (err, result) => {
        if (err) {
            console.error('❌ Create property error:', err);

            // ถ้า error เพราะคอลัมน์ไม่มี → fallback ใส่แค่คอลัมน์เดิม
            if (err.code === 'ER_BAD_FIELD_ERROR') {
                console.log('⚠️ คอลัมน์ใหม่ยังไม่มี — ลอง fallback SQL...');
                return fallbackInsert(req, res, {
                    autoTitle, property_type, propertyCode, transaction_type,
                    description, area_size, province, district,
                    purchase_price, loan_amount
                });
            }

            return res.status(500).json({ error: 'เกิดข้อผิดพลาดในการบันทึก กรุณาลองใหม่' });
        }

        console.log(`✅ Property created: ${propertyCode} (ID: ${result.insertId})`);

        res.status(201).json({
            message: 'ส่งข้อมูลเรียบร้อย! ทีมงานจะติดต่อกลับภายใน 24 ชั่วโมง',
            property_id: result.insertId,
            property_code: propertyCode
        });
    });
};


// ── Fallback INSERT (กรณียังไม่ได้ ALTER TABLE เพิ่มคอลัมน์ใหม่) ──
function fallbackInsert(req, res, data) {
    const sql = `
        INSERT INTO investment_properties (
            title, property_type, property_code, contract_type, description,
            land_area, province, district,
            appraised_value, investment_amount,
            status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', NOW(), NOW())
    `;

    const params = [
        data.autoTitle,
        data.property_type,
        data.propertyCode,
        data.transaction_type,
        data.description,
        parseFloat(data.area_size) || 0,
        data.province,
        data.district || '',
        parseFloat(data.purchase_price) || 0,
        parseFloat(data.loan_amount) || 0
    ];

    db.query(sql, params, (err2, result2) => {
        if (err2) {
            console.error('❌ Fallback insert error:', err2);
            return res.status(500).json({ error: 'เกิดข้อผิดพลาดในการบันทึก กรุณาลองใหม่' });
        }

        console.log(`✅ Property created (fallback): ${data.propertyCode} (ID: ${result2.insertId})`);

        res.status(201).json({
            message: 'ส่งข้อมูลเรียบร้อย! ทีมงานจะติดต่อกลับภายใน 24 ชั่วโมง',
            property_id: result2.insertId,
            property_code: data.propertyCode
        });
    });
}