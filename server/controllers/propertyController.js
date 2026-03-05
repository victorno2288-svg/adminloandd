const db = require('../config/db');

// ==========================================
// 1. ดึงรายการทรัพย์สินทั้งหมด (พร้อม pagination + filter)
// ==========================================
exports.getAllProperties = (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const offset = (page - 1) * limit;

    const { property_type, listing_type, province, min_price, max_price, bedrooms, search } = req.query;

    let where = ['p.is_active = 1'];
    let params = [];

    if (property_type) { where.push('p.property_type = ?'); params.push(property_type); }
    if (listing_type) { where.push('p.listing_type = ?'); params.push(listing_type); }
    if (province) { where.push('p.province = ?'); params.push(province); }
    if (min_price) { where.push('p.price_requested >= ?'); params.push(min_price); }
    if (max_price) { where.push('p.price_requested <= ?'); params.push(max_price); }
    if (bedrooms) { where.push('p.bedrooms >= ?'); params.push(bedrooms); }
    if (search) { where.push('(p.title LIKE ? OR p.address LIKE ? OR p.project_name LIKE ?)'); params.push(`%${search}%`, `%${search}%`, `%${search}%`); }

    const whereClause = where.join(' AND ');

    const countSql = `SELECT COUNT(*) AS total FROM properties p WHERE ${whereClause}`;

    db.query(countSql, params, (err, countResult) => {
        if (err) return res.status(500).json({ message: "Server error", error: err });

        const total = countResult[0].total;

        const sql = `
            SELECT 
                p.id, p.title, p.property_type, p.listing_type,
                p.price_requested, p.price_per_sqm, p.monthly_rent,
                p.bedrooms, p.bathrooms, p.usable_area,
                p.land_area_rai, p.land_area_ngan, p.land_area_wah,
                p.province, p.district, p.sub_district,
                p.thumbnail_url, p.is_featured, p.view_count,
                p.created_at,
                u.display_name AS poster_name,
                u.avatar_url AS poster_avatar,
                u.role AS poster_role,
                pv.slug AS province_slug,
                pv.region AS province_region
            FROM properties p
            LEFT JOIN users u ON p.owner_id = u.id
            LEFT JOIN provinces pv ON p.province = pv.name
            WHERE ${whereClause}
            ORDER BY p.is_featured DESC, p.created_at DESC
            LIMIT ? OFFSET ?
        `;

        db.query(sql, [...params, limit, offset], (err, results) => {
            if (err) return res.status(500).json({ message: "Server error", error: err });

            res.status(200).json({
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
// 2. ดึงรายละเอียดทรัพย์สินตาม ID (พร้อม images, amenities, nearby)
// ==========================================
exports.getPropertyById = (req, res) => {
    const { id } = req.params;

    db.query('UPDATE properties SET view_count = view_count + 1 WHERE id = ?', [id]);

    const propertySql = `
        SELECT p.*,
            u.display_name AS poster_name,
            u.avatar_url AS poster_avatar,
            u.phone AS poster_phone,
            u.line_id AS poster_line,
            u.company_name AS poster_company,
            u.role AS poster_role,
            pv.slug AS province_slug,
            pv.region AS province_region
        FROM properties p
        LEFT JOIN users u ON p.owner_id = u.id
        LEFT JOIN provinces pv ON p.province = pv.name
        WHERE p.id = ?
    `;

    db.query(propertySql, [id], (err, propertyResult) => {
        if (err) return res.status(500).json({ message: "Server error", error: err });
        if (propertyResult.length === 0) return res.status(404).json({ message: "Property not found" });

        const property = propertyResult[0];

        const imagesSql = 'SELECT * FROM property_images WHERE property_id = ? ORDER BY sort_order';
        const amenitiesSql = 'SELECT * FROM property_amenities WHERE property_id = ?';
        const nearbySql = 'SELECT * FROM nearby_places WHERE property_id = ?';

        db.query(imagesSql, [id], (err, images) => {
            if (err) return res.status(500).json({ message: "Server error", error: err });

            db.query(amenitiesSql, [id], (err, amenities) => {
                if (err) return res.status(500).json({ message: "Server error", error: err });

                db.query(nearbySql, [id], (err, nearbyPlaces) => {
                    if (err) return res.status(500).json({ message: "Server error", error: err });

                    res.status(200).json({
                        ...property,
                        images,
                        amenities,
                        nearby_places: nearbyPlaces
                    });
                });
            });
        });
    });
};

// ==========================================
// 3. ดึงทรัพย์สินแนะนำ (Featured) สำหรับหน้าแรก
// ==========================================
exports.getFeaturedProperties = (req, res) => {
    const sql = `
        SELECT p.id, p.title, p.property_type, p.listing_type,
            p.price_requested, p.bedrooms, p.bathrooms, p.usable_area,
            p.province, p.district, p.thumbnail_url,
            pv.slug AS province_slug,
            pv.region AS province_region
        FROM properties p
        LEFT JOIN provinces pv ON p.province = pv.name
        WHERE p.is_active = 1 AND p.is_featured = 1
        ORDER BY p.created_at DESC
        LIMIT 8
    `;

    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ message: "Server error", error: err });
        res.status(200).json(results);
    });
};

// ==========================================
// 4. ดึงทรัพย์สินล่าสุด (Latest) สำหรับหน้าแรก
// ==========================================
exports.getLatestProperties = (req, res) => {
    const limit = parseInt(req.query.limit) || 8;

    const sql = `
        SELECT p.id, p.title, p.property_type, p.listing_type,
            p.price_requested, p.bedrooms, p.bathrooms, p.usable_area,
            p.province, p.district, p.thumbnail_url, p.created_at,
            pv.slug AS province_slug,
            pv.region AS province_region
        FROM properties p
        LEFT JOIN provinces pv ON p.province = pv.name
        WHERE p.is_active = 1
        ORDER BY p.created_at DESC
        LIMIT ?
    `;

    db.query(sql, [limit], (err, results) => {
        if (err) return res.status(500).json({ message: "Server error", error: err });
        res.status(200).json(results);
    });
};

// ==========================================
// 5. นับจำนวนตามประเภท (สำหรับหน้าแรก)
// ==========================================
exports.getPropertyCounts = (req, res) => {
    const sql = `
        SELECT property_type, COUNT(*) AS count 
        FROM properties 
        WHERE is_active = 1 
        GROUP BY property_type
    `;

    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ message: "Server error", error: err });
        res.status(200).json(results);
    });
};