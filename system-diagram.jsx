import { useState } from "react";

const STEPS = [
  {
    id: 0,
    icon: "💬",
    dept: "Chat",
    label: "แชท",
    sub: "รับลูกค้าใหม่",
    color: "#1565c0",
    bg: "#e3f2fd",
    border: "#1565c0",
    details: [
      "ลูกค้าทักมาทาง LINE / Facebook",
      "Webhook รับข้อความ & AI parse ข้อมูล",
      "Round-Robin แจกแชทให้เซลล์คนต่อไปในคิวอัตโนมัติ",
    ],
    badge: null,
  },
  {
    id: 1,
    icon: "👤",
    dept: "Sales",
    label: "สร้างลูกหนี้",
    sub: "ฝ่ายขาย",
    color: "#2e7d32",
    bg: "#e8f5e9",
    border: "#2e7d32",
    details: [
      "เซลล์กรอกข้อมูลลูกหนี้ (ชื่อ, เบอร์, ทรัพย์, วงเงิน)",
      "เลือกสถานะสมรส → ระบบแสดง Checklist เอกสาร Option A–E อัตโนมัติ",
      "อัพโหลดรูปทรัพย์ & โฉนด",
      "บันทึก loan_request (debtor_code: LDD0001, สถานะ: pending)",
    ],
    badge: "สร้างลูกหนี้ก่อน",
    badgeColor: "#2e7d32",
  },
  {
    id: 2,
    icon: "🏠",
    dept: "Appraisal",
    label: "ฝ่ายประเมิน",
    sub: "ลงพื้นที่",
    color: "#e65100",
    bg: "#fff3e0",
    border: "#e65100",
    details: [
      "ลงพื้นที่ถ่ายรูปทรัพย์จริง",
      "กรอกราคาประเมิน & รายละเอียดทรัพย์",
      "อัพโหลดเล่มประเมิน (appraisal_book_image)",
      "บันทึกผล: passed / not_passed",
      "⚠️ เซลล์ไม่เห็นราคาและเล่มประเมิน",
    ],
    badge: "ลงพื้นที่",
    badgeColor: "#e65100",
  },
  {
    id: 3,
    icon: "📋",
    dept: "Approval",
    label: "ฝ่ายอนุมัติ",
    sub: "เอาตารางมา",
    color: "#6a1b9a",
    bg: "#f3e5f5",
    border: "#6a1b9a",
    details: [
      "รับตารางประเมินจากฝ่ายประเมิน",
      "พิจารณาวงเงินและความเสี่ยง",
      "ดูเล่มประเมินประกอบการตัดสินใจ",
      "ถ้าผ่าน → Sales สร้างเคสได้",
    ],
    badge: "เอาตารางมาก่อน",
    badgeColor: "#6a1b9a",
  },
  {
    id: 4,
    icon: "📁",
    dept: "Case",
    label: "สร้างเคส",
    sub: "ฝ่ายขาย",
    color: "#00695c",
    bg: "#e0f2f1",
    border: "#00695c",
    details: [
      "Sales สร้างเคส (case_code) หลังอนุมัติแล้ว",
      "ลิงก์ลูกหนี้ → เคส (loan_request_id)",
      "ระบบสร้าง transaction ให้ทุกฝ่ายอัตโนมัติ",
      "(approval / legal / issuing / auction transactions)",
    ],
    badge: "สร้างเคสหลังอนุมัติ",
    badgeColor: "#00695c",
  },
  {
    id: 5,
    icon: "⚖️",
    dept: "Legal",
    label: "ฝ่ายนิติกรรม",
    sub: "จดทะเบียน",
    color: "#c62828",
    bg: "#ffebee",
    border: "#c62828",
    details: [
      "นัดวันจดทะเบียนโอน",
      "อัพโหลดสัญญาและเอกสารกฎหมาย",
      "⚠️ ต้องอัพโหลดสลิปค่าคอมมิชชั่นก่อนปิดเคส",
      "legal_status: pending → completed",
    ],
    badge: "ต้องมีสลิปค่าคอม",
    badgeColor: "#c62828",
  },
  {
    id: 6,
    icon: "📄",
    dept: "Issuing",
    label: "ฝ่ายออกสัญญา",
    sub: "จัดทำสัญญา",
    color: "#1565c0",
    bg: "#e3f2fd",
    border: "#1565c0",
    details: [
      "จัดทำสัญญาจำนอง / ขายฝาก",
      "อัพโหลดเอกสารสัญญาฉบับจริง",
      "issuing_status: pending → sent",
    ],
    badge: null,
  },
  {
    id: 7,
    icon: "🔨",
    dept: "Auction",
    label: "ฝ่ายประมูล",
    sub: "จัดหานักลงทุน",
    color: "#4e342e",
    bg: "#efebe9",
    border: "#4e342e",
    details: [
      "ออกประกาศประมูลให้นักลงทุน",
      "จับคู่นักลงทุนกับเคส",
      "บันทึก investor_history",
      "auction_status: pending → auctioned",
      "cases.status: auction_completed → matched → completed",
    ],
    badge: null,
  },
];

const VISIBILITY = [
  { dept: "ฝ่ายขาย", appraisal_images: "✅", appraisal_book: "❌", price: "❌" },
  { dept: "ฝ่ายประเมิน", appraisal_images: "✅", appraisal_book: "✅", price: "✅" },
  { dept: "ฝ่ายอนุมัติ", appraisal_images: "✅", appraisal_book: "✅", price: "✅" },
  { dept: "ฝ่ายนิติกรรม", appraisal_images: "✅", appraisal_book: "✅", price: "✅" },
  { dept: "ฝ่ายออกสัญญา", appraisal_images: "✅", appraisal_book: "✅", price: "✅" },
  { dept: "ฝ่ายประมูล", appraisal_images: "✅", appraisal_book: "✅", price: "✅" },
];

export default function SystemDiagram() {
  const [selected, setSelected] = useState(null);

  return (
    <div style={{ fontFamily: "sans-serif", padding: 24, background: "#f8f9fa", minHeight: "100vh" }}>
      <div style={{ maxWidth: 960, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: "#1a237e", margin: 0 }}>
            🏦 LOANDD System — Workflow Diagram
          </h1>
          <p style={{ color: "#555", marginTop: 8, fontSize: 14 }}>
            คลิกที่แต่ละขั้นตอนเพื่อดูรายละเอียด
          </p>
        </div>

        {/* Flow */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 0, flexWrap: "wrap", justifyContent: "center" }}>
          {STEPS.map((step, i) => (
            <div key={step.id} style={{ display: "flex", alignItems: "center" }}>
              {/* Step Card */}
              <div
                onClick={() => setSelected(selected === step.id ? null : step.id)}
                style={{
                  cursor: "pointer",
                  width: 108,
                  background: selected === step.id ? step.bg : "#fff",
                  border: `2px solid ${selected === step.id ? step.border : "#ddd"}`,
                  borderRadius: 12,
                  padding: "14px 10px",
                  textAlign: "center",
                  boxShadow: selected === step.id ? `0 4px 16px ${step.color}33` : "0 2px 6px #0001",
                  transition: "all 0.2s",
                  position: "relative",
                }}
              >
                {/* Badge */}
                {step.badge && (
                  <div style={{
                    position: "absolute",
                    top: -10,
                    left: "50%",
                    transform: "translateX(-50%)",
                    background: step.badgeColor,
                    color: "#fff",
                    fontSize: 9,
                    fontWeight: 700,
                    borderRadius: 99,
                    padding: "2px 7px",
                    whiteSpace: "nowrap",
                  }}>
                    {step.badge}
                  </div>
                )}
                <div style={{ fontSize: 28 }}>{step.icon}</div>
                <div style={{ fontWeight: 700, fontSize: 13, color: step.color, marginTop: 4 }}>
                  {step.label}
                </div>
                <div style={{ fontSize: 11, color: "#777", marginTop: 2 }}>{step.sub}</div>
              </div>

              {/* Arrow */}
              {i < STEPS.length - 1 && (
                <div style={{ fontSize: 18, color: "#aaa", padding: "0 2px", marginTop: -10 }}>→</div>
              )}
            </div>
          ))}
        </div>

        {/* Detail Panel */}
        {selected !== null && (
          <div style={{
            marginTop: 24,
            background: STEPS[selected].bg,
            border: `2px solid ${STEPS[selected].border}`,
            borderRadius: 12,
            padding: 20,
          }}>
            <h3 style={{ margin: "0 0 12px", color: STEPS[selected].color, fontSize: 16 }}>
              {STEPS[selected].icon} {STEPS[selected].label} — {STEPS[selected].sub}
            </h3>
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              {STEPS[selected].details.map((d, i) => (
                <li key={i} style={{ marginBottom: 6, fontSize: 14, color: "#333" }}>{d}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Status Flow */}
        <div style={{ marginTop: 32, background: "#fff", borderRadius: 12, padding: 20, boxShadow: "0 2px 8px #0001" }}>
          <h3 style={{ margin: "0 0 16px", fontSize: 15, color: "#333" }}>📊 Status Flow ของ cases.status</h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", fontSize: 12 }}>
            {[
              { s: "pending", c: "#9e9e9e" },
              { s: "→" },
              { s: "appraisal_passed", c: "#e65100" },
              { s: "→" },
              { s: "pending_approve", c: "#6a1b9a" },
              { s: "→" },
              { s: "credit_approved", c: "#6a1b9a" },
              { s: "→" },
              { s: "legal_scheduled", c: "#c62828" },
              { s: "→" },
              { s: "legal_completed", c: "#c62828" },
              { s: "→" },
              { s: "preparing_docs", c: "#1565c0" },
              { s: "→" },
              { s: "pending_auction", c: "#4e342e" },
              { s: "→" },
              { s: "auction_completed", c: "#4e342e" },
              { s: "→" },
              { s: "matched", c: "#2e7d32" },
              { s: "→" },
              { s: "completed ✅", c: "#2e7d32" },
            ].map((item, i) =>
              item.c ? (
                <span key={i} style={{
                  background: item.c + "22",
                  color: item.c,
                  border: `1px solid ${item.c}55`,
                  borderRadius: 99,
                  padding: "3px 10px",
                  fontWeight: 600,
                  fontSize: 11,
                }}>
                  {item.s}
                </span>
              ) : (
                <span key={i} style={{ color: "#aaa", fontWeight: 700 }}>{item.s}</span>
              )
            )}
          </div>
        </div>

        {/* Visibility Table */}
        <div style={{ marginTop: 24, background: "#fff", borderRadius: 12, padding: 20, boxShadow: "0 2px 8px #0001" }}>
          <h3 style={{ margin: "0 0 16px", fontSize: 15, color: "#333" }}>👁️ สิทธิ์การมองเห็นข้อมูลประเมิน</h3>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#f5f5f5" }}>
                <th style={{ padding: "8px 12px", textAlign: "left", borderBottom: "1px solid #eee" }}>ฝ่าย</th>
                <th style={{ padding: "8px 12px", textAlign: "center", borderBottom: "1px solid #eee" }}>รูปทรัพย์<br/>(appraisal_images)</th>
                <th style={{ padding: "8px 12px", textAlign: "center", borderBottom: "1px solid #eee" }}>เล่มประเมิน<br/>(appraisal_book)</th>
                <th style={{ padding: "8px 12px", textAlign: "center", borderBottom: "1px solid #eee" }}>ราคาประเมิน<br/>(price)</th>
              </tr>
            </thead>
            <tbody>
              {VISIBILITY.map((row, i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                  <td style={{ padding: "8px 12px", borderBottom: "1px solid #eee", fontWeight: 600 }}>{row.dept}</td>
                  <td style={{ padding: "8px 12px", borderBottom: "1px solid #eee", textAlign: "center", fontSize: 16 }}>{row.appraisal_images}</td>
                  <td style={{ padding: "8px 12px", borderBottom: "1px solid #eee", textAlign: "center", fontSize: 16 }}>{row.appraisal_book}</td>
                  <td style={{ padding: "8px 12px", borderBottom: "1px solid #eee", textAlign: "center", fontSize: 16 }}>{row.price}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* New Features */}
        <div style={{ marginTop: 24, background: "#fff", borderRadius: 12, padding: 20, boxShadow: "0 2px 8px #0001", marginBottom: 32 }}>
          <h3 style={{ margin: "0 0 16px", fontSize: 15, color: "#333" }}>✨ Feature ใหม่ที่เพิ่งเพิ่ม</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {[
              { icon: "🔄", title: "Round-Robin Chat", desc: "แจกแชทให้เซลล์คนต่อไปในคิวอัตโนมัติ ไม่มีใครได้งานซ้ำ" },
              { icon: "🧾", title: "Commission Slip Gate", desc: "ฝ่ายนิติกรรมต้องอัพสลิปค่าคอมก่อนถึงจะปิดเคสได้" },
              { icon: "📋", title: "Document Checklist", desc: "ระบบแสดง Checklist เอกสารตามสถานะสมรส 5 แบบ (Option A–E)" },
              { icon: "🔒", title: "Price Restriction", desc: "ฝ่ายขายไม่เห็นราคาประเมินและเล่มประเมิน" },
            ].map((f, i) => (
              <div key={i} style={{ background: "#f8f9fa", borderRadius: 8, padding: 12, display: "flex", gap: 10 }}>
                <span style={{ fontSize: 22 }}>{f.icon}</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: "#333" }}>{f.title}</div>
                  <div style={{ fontSize: 12, color: "#666", marginTop: 3 }}>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
