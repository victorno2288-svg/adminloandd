import { useNavigate } from 'react-router-dom'

export default function SalesTypeSelectPage() {
  const navigate = useNavigate()

  const types = [
    {
      value: 'mortgage',
      label: 'จำนอง',
      icon: 'fa-home',
      color: '#1565c0',
      bg: '#e3f2fd',
      border: '#1565c0',
      desc: 'ลูกหนี้ยังเป็นเจ้าของกรรมสิทธิ์ทรัพย์ มีการโอนจำนองเป็นหลักประกัน',
      tag: 'Mortgage',
    },
    {
      value: 'selling_pledge',
      label: 'ขายฝาก',
      icon: 'fa-file-signature',
      color: '#6a1b9a',
      bg: '#f3e5f5',
      border: '#6a1b9a',
      desc: 'ลูกหนี้โอนกรรมสิทธิ์ทรัพย์ให้นายทุน โดยมีสิทธิ์ไถ่คืนตามกำหนด',
      tag: 'Selling Pledge',
    },
  ]

  return (
    <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <div style={{
          width: 64, height: 64, borderRadius: '50%',
          background: 'linear-gradient(135deg, #04AA6D, #038a58)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 16px',
          boxShadow: '0 4px 16px rgba(4,170,109,0.3)'
        }}>
          <i className="fas fa-user-plus" style={{ fontSize: 26, color: '#fff' }}></i>
        </div>
        <h2 style={{ margin: '0 0 8px', fontSize: 24, fontWeight: 800, color: '#1a1a2e' }}>
          เพิ่มลูกหนี้ใหม่
        </h2>
        <p style={{ margin: 0, fontSize: 15, color: '#888' }}>
          เลือกประเภทสินเชื่อก่อนกรอกข้อมูล
        </p>
      </div>

      {/* Type Cards */}
      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 700, width: '100%' }}>
        {types.map(t => (
          <div
            key={t.value}
            onClick={() => navigate(`/sales/new?type=${t.value}`)}
            style={{
              flex: '1 1 280px', maxWidth: 320,
              background: '#fff',
              border: `2px solid #e0e0e0`,
              borderRadius: 16,
              padding: '32px 28px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              position: 'relative',
              overflow: 'hidden',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.border = `2px solid ${t.border}`
              e.currentTarget.style.boxShadow = `0 8px 32px ${t.color}30`
              e.currentTarget.style.transform = 'translateY(-4px)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.border = '2px solid #e0e0e0'
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)'
              e.currentTarget.style.transform = 'translateY(0)'
            }}
          >
            {/* Decorative top strip */}
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: 4,
              background: t.color, borderRadius: '16px 16px 0 0'
            }} />

            {/* Icon */}
            <div style={{
              width: 64, height: 64, borderRadius: 16,
              background: t.bg,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: 20,
            }}>
              <i className={`fas ${t.icon}`} style={{ fontSize: 28, color: t.color }}></i>
            </div>

            {/* Label */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <h3 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#1a1a2e' }}>{t.label}</h3>
              <span style={{
                fontSize: 11, fontWeight: 700, padding: '3px 10px',
                borderRadius: 20, background: t.bg, color: t.color,
                border: `1px solid ${t.color}50`
              }}>{t.tag}</span>
            </div>

            {/* Description */}
            <p style={{ margin: '0 0 20px', fontSize: 13, color: '#666', lineHeight: 1.7 }}>
              {t.desc}
            </p>

            {/* Button */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '10px 20px', borderRadius: 10,
              background: t.color, color: '#fff',
              fontSize: 14, fontWeight: 700,
            }}>
              <i className="fas fa-arrow-right"></i>
              เลือก{t.label}
            </div>
          </div>
        ))}
      </div>

      {/* Skip button */}
      <button
        onClick={() => navigate('/sales/new')}
        style={{
          marginTop: 28, background: 'none', border: '1px solid #ddd',
          borderRadius: 8, padding: '8px 20px', color: '#888',
          fontSize: 13, cursor: 'pointer', transition: 'all 0.15s'
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = '#bbb'; e.currentTarget.style.color = '#555' }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = '#ddd'; e.currentTarget.style.color = '#888' }}
      >
        <i className="fas fa-forward" style={{ marginRight: 6 }}></i>
        ข้ามขั้นตอนนี้ (ไม่ระบุประเภท)
      </button>

      {/* Back */}
      <button
        onClick={() => navigate('/sales')}
        style={{
          marginTop: 12, background: 'none', border: 'none',
          color: '#aaa', fontSize: 12, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 6
        }}
      >
        <i className="fas fa-chevron-left"></i> กลับหน้าฝ่ายขาย
      </button>
    </div>
  )
}
