const db = require('../config/db');

// GET /api/admin/dashboard
exports.getDashboard = (req, res) => {
  const queries = {};

  // 1. Stat Cards — นับจาก cases (source of truth ที่ถูกต้อง)
  queries.totalCases = `SELECT COUNT(*) as total FROM cases`;
  queries.pendingCases = `SELECT COUNT(*) as total FROM cases WHERE status IN ('new','contacting','incomplete','reviewing','pending')`;
  queries.reviewingCases = `SELECT COUNT(*) as total FROM cases WHERE status IN ('pending_approve','credit_approved')`;
  queries.appraisingCases = `SELECT COUNT(*) as total FROM cases WHERE status IN ('awaiting_appraisal_fee','appraisal_scheduled','appraisal_passed','appraisal_not_passed')`;
  queries.approvedCases = `SELECT COUNT(*) as total FROM cases WHERE status IN ('credit_approved','legal_scheduled','legal_completed','preparing_docs','pending_auction','auction_completed','matched')`;
  queries.rejectedCases = `SELECT COUNT(*) as total FROM cases WHERE status = 'appraisal_not_passed'`;
  queries.matchedCases = `SELECT COUNT(*) as total FROM cases WHERE status IN ('matched','completed')`;
  queries.cancelledCases = `SELECT COUNT(*) as total FROM cases WHERE status = 'cancelled'`;

  // 2. Property Type — จำนวนตามประเภททรัพย์ (สำหรับ Donut Chart)
  queries.propertyTypes = `
    SELECT lr.property_type, COUNT(*) as count
    FROM cases c
    LEFT JOIN loan_requests lr ON c.loan_request_id = lr.id
    GROUP BY lr.property_type
  `;

  // 3. สรุปยอดเงิน (จาก cases JOIN loan_requests)
  queries.totalLoanAmount = `
    SELECT COALESCE(SUM(lr.loan_amount), 0) as total
    FROM cases c
    LEFT JOIN loan_requests lr ON c.loan_request_id = lr.id
  `;
  queries.totalEstimatedValue = `
    SELECT COALESCE(SUM(lr.estimated_value), 0) as total
    FROM cases c
    LEFT JOIN loan_requests lr ON c.loan_request_id = lr.id
  `;

  // 4. เคสล่าสุด 10 รายการ (จาก cases + loan_requests)
  queries.recentCases = `
    SELECT c.id, lr.debtor_code, lr.property_type, lr.loan_amount, lr.estimated_value,
           c.status, lr.province, lr.district, lr.contact_name, c.created_at,
           lr.images
    FROM cases c
    LEFT JOIN loan_requests lr ON c.loan_request_id = lr.id
    ORDER BY c.created_at DESC
    LIMIT 10
  `;

  // 5. นับเคสรายวัน 7 วันล่าสุด (สำหรับ Bar Chart) — จาก cases
  queries.casesPerDay = `
    SELECT DATE(created_at) as date, COUNT(*) as count
    FROM cases
    WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
    GROUP BY DATE(created_at)
    ORDER BY date ASC
  `;

  // 6. Top Investors (จากตาราง auction_transactions)
  queries.topInvestors = `
    SELECT investor_name, investor_code,
           COUNT(*) as total_deals,
           COALESCE(SUM(selling_pledge_amount), 0) as total_invested
    FROM auction_transactions
    WHERE investor_name IS NOT NULL AND investor_name != ''
    GROUP BY investor_name, investor_code
    ORDER BY total_invested DESC
    LIMIT 5
  `;

  // 7. Province breakdown (สำหรับ chart จังหวัด) — จาก cases JOIN loan_requests
  queries.provinceBreakdown = `
    SELECT lr.province, COUNT(*) as count
    FROM cases c
    LEFT JOIN loan_requests lr ON c.loan_request_id = lr.id
    WHERE lr.province IS NOT NULL AND lr.province != ''
    GROUP BY lr.province
    ORDER BY count DESC
    LIMIT 10
  `;

  // 8. Loan Type breakdown — จาก cases JOIN loan_requests
  queries.loanTypeBreakdown = `
    SELECT lr.loan_type, COUNT(*) as count
    FROM cases c
    LEFT JOIN loan_requests lr ON c.loan_request_id = lr.id
    GROUP BY lr.loan_type
  `;

  // 9. Cases per month (6 เดือนล่าสุด) — จาก cases
  queries.casesPerMonth = `
    SELECT DATE_FORMAT(created_at, '%Y-%m') as month, COUNT(*) as count
    FROM cases
    WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
    GROUP BY DATE_FORMAT(created_at, '%Y-%m')
    ORDER BY month ASC
  `;

  // 10. Auction stats (จากตาราง auction_transactions)
  queries.auctionStats = `
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN auction_status = 'pending' THEN 1 ELSE 0 END) as auctioning,
      SUM(CASE WHEN auction_status = 'auctioned' THEN 1 ELSE 0 END) as completed,
      SUM(CASE WHEN auction_status = 'cancelled' OR is_cancelled = 1 THEN 1 ELSE 0 END) as no_bids
    FROM auction_transactions
  `;

  // Execute all queries in parallel
  const keys = Object.keys(queries);
  const results = {};
  let completed = 0;
  let hasError = false;

  keys.forEach(key => {
    db.query(queries[key], (err, rows) => {
      completed++;

      if (err) {
        console.log(`Dashboard query error (${key}):`, err.message);
        // ไม่ error ทั้งหมด ให้ค่า default แทน
        results[key] = key.includes('total') || key.includes('pending') || key.includes('reviewing') ||
                       key.includes('appraising') || key.includes('approved') || key.includes('rejected') ||
                       key.includes('matched') || key.includes('cancelled')
          ? [{ total: 0 }]
          : [];
      } else {
        results[key] = rows;
      }

      // ทุก query เสร็จแล้ว → ส่ง response
      if (completed === keys.length) {
        sendDashboardResponse(res, results);
      }
    });
  });
};

function sendDashboardResponse(res, r) {
  // Stat cards
  const stats = {
    totalCases: r.totalCases[0]?.total || 0,
    pendingCases: r.pendingCases[0]?.total || 0,
    reviewingCases: r.reviewingCases[0]?.total || 0,
    appraisingCases: r.appraisingCases[0]?.total || 0,
    approvedCases: r.approvedCases[0]?.total || 0,
    rejectedCases: r.rejectedCases[0]?.total || 0,
    matchedCases: r.matchedCases[0]?.total || 0,
    cancelledCases: r.cancelledCases[0]?.total || 0,
    totalLoanAmount: r.totalLoanAmount[0]?.total || 0,
    totalEstimatedValue: r.totalEstimatedValue[0]?.total || 0,
  };

  // Auction stats
  const auctionStats = {
    auctioning: r.auctionStats[0]?.auctioning || 0,
    completed: r.auctionStats[0]?.completed || 0,
    noBids: r.auctionStats[0]?.no_bids || 0,
    total: r.auctionStats[0]?.total || 0,
  };

  // Property type for donut chart
  const propertyTypes = (r.propertyTypes || []).map(row => ({
    type: row.property_type || 'unknown',
    count: row.count
  }));

  // Cases per day for bar chart
  const casesPerDay = (r.casesPerDay || []).map(row => ({
    date: row.date,
    count: row.count
  }));

  // Cases per month
  const casesPerMonth = (r.casesPerMonth || []).map(row => ({
    month: row.month,
    count: row.count
  }));

  // Recent cases
  const recentCases = (r.recentCases || []).map(row => ({
    id: row.id,
    debtor_code: row.debtor_code,
    property_type: row.property_type,
    loan_amount: row.loan_amount,
    estimated_value: row.estimated_value,
    status: row.status,
    province: row.province,
    district: row.district,
    contact_name: row.contact_name,
    created_at: row.created_at,
    image: row.images ? (typeof row.images === 'string' ? row.images.split(',')[0] : null) : null
  }));

  // Top investors
  const topInvestors = (r.topInvestors || []).map((row, idx) => ({
    id: idx + 1,
    name: row.investor_name,
    code: row.investor_code,
    totalDeals: row.total_deals,
    totalInvested: row.total_invested
  }));

  // Province breakdown
  const provinceBreakdown = (r.provinceBreakdown || []).map(row => ({
    province: row.province,
    count: row.count
  }));

  // Loan type breakdown
  const loanTypeBreakdown = (r.loanTypeBreakdown || []).map(row => ({
    type: row.loan_type,
    count: row.count
  }));

  res.json({
    success: true,
    stats,
    auctionStats,
    propertyTypes,
    casesPerDay,
    casesPerMonth,
    recentCases,
    topInvestors,
    provinceBreakdown,
    loanTypeBreakdown
  });
}