import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import '../styles/sales.css'

const token = () => localStorage.getItem('loandd_admin')
const API = '/api/admin/sales'

const propertyTypes = [
  { value: 'land', label: 'ที่ดินเปล่า' },
  { value: 'house', label: 'บ้านเดี่ยว' },
  { value: 'condo', label: 'คอนโด' },
  { value: 'townhouse', label: 'ทาวน์เฮ้าส์' },
  { value: 'other', label: 'อื่นๆ' },
]

const propertyTypeLabel = { land: 'ที่ดินเปล่า', house: 'บ้านเดี่ยว', condo: 'คอนโด', townhouse: 'ทาวน์เฮ้าส์' }

const provinces = [
  'กรุงเทพมหานคร', 'กระบี่', 'กาญจนบุรี', 'กาฬสินธุ์', 'กำแพงเพชร', 'ขอนแก่น', 'จันทบุรี', 'ฉะเชิงเทรา',
  'ชลบุรี', 'ชัยนาท', 'ชัยภูมิ', 'ชุมพร', 'เชียงราย', 'เชียงใหม่', 'ตรัง', 'ตราด', 'ตาก', 'นครนายก',
  'นครปฐม', 'นครพนม', 'นครราชสีมา', 'นครศรีธรรมราช', 'นครสวรรค์', 'นนทบุรี', 'นราธิวาส', 'น่าน',
  'บึงกาฬ', 'บุรีรัมย์', 'ปทุมธานี', 'ประจวบคีรีขันธ์', 'ปราจีนบุรี', 'ปัตตานี', 'พระนครศรีอยุธยา',
  'พังงา', 'พัทลุง', 'พิจิตร', 'พิษณุโลก', 'เพชรบุรี', 'เพชรบูรณ์', 'แพร่', 'พะเยา', 'ภูเก็ต',
  'มหาสารคาม', 'มุกดาหาร', 'แม่ฮ่องสอน', 'ยโสธร', 'ยะลา', 'ร้อยเอ็ด', 'ระนอง', 'ระยอง', 'ราชบุรี',
  'ลพบุรี', 'ลำปาง', 'ลำพูน', 'เลย', 'ศรีสะเกษ', 'สกลนคร', 'สงขลา', 'สตูล', 'สมุทรปราการ',
  'สมุทรสงคราม', 'สมุทรสาคร', 'สระแก้ว', 'สระบุรี', 'สิงห์บุรี', 'สุโขทัย', 'สุพรรณบุรี', 'สุราษฎร์ธานี',
  'สุรินทร์', 'หนองคาย', 'หนองบัวลำภู', 'อ่างทอง', 'อำนาจเจริญ', 'อุดรธานี', 'อุตรดิตถ์', 'อุทัยธานี', 'อุบลราชธานี'
]

const statusBadge = {
  new: 'badge-pending', contacting: 'badge-pending', incomplete: 'badge-pending',
  awaiting_appraisal_fee: 'badge-pending', appraisal_scheduled: 'badge-approve',
  appraisal_passed: 'badge-paid', appraisal_not_passed: 'badge-cancelled',
  pending_approve: 'badge-approve', credit_approved: 'badge-paid',
  pending_auction: 'badge-auction', preparing_docs: 'badge-approve',
  legal_scheduled: 'badge-transaction', legal_completed: 'badge-transaction',
  completed: 'badge-completed', cancelled: 'badge-cancelled'
}
const statusLabel = {
  new: 'เคสใหม่', contacting: 'กำลังติดต่อ', incomplete: 'ข้อมูลไม่ครบ',
  awaiting_appraisal_fee: 'รอชำระค่าประเมิน', appraisal_scheduled: 'นัดประเมินแล้ว',
  appraisal_passed: 'ผ่านประเมินแล้ว', appraisal_not_passed: 'ไม่ผ่านประเมิน',
  pending_approve: 'รออนุมัติวงเงิน', credit_approved: 'อนุมัติวงเงินแล้ว',
  pending_auction: 'รอประมูล', preparing_docs: 'เตรียมเอกสาร',
  legal_scheduled: 'นัดนิติกรรมแล้ว', legal_completed: 'ทำนิติกรรมเสร็จสิ้น',
  completed: 'เสร็จสมบูรณ์', cancelled: 'ยกเลิก'
}

export default function AgentFormPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = !!id

  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [agentCode, setAgentCode] = useState('')
  const [debtorCode, setDebtorCode] = useState('')

  // โหมดเลือกลูกหนี้
  const [debtorMode, setDebtorMode] = useState('new')
  const [existingDebtors, setExistingDebtors] = useState([])
  const [selectedDebtorId, setSelectedDebtorId] = useState('')
  const [selectedDebtor, setSelectedDebtor] = useState(null)

  // ★ ลูกหนี้ที่เชื่อมอยู่ (edit mode)
  const [linkedDebtors, setLinkedDebtors] = useState([])

  // ข้อมูลลูกหนี้ใหม่
  const [debtor, setDebtor] = useState({
    contact_name: '', contact_phone: '', property_type: '', property_type_other: '',
    loan_type_detail: '',
    has_obligation: 'no', obligation_count: '',
    province: '', district: '', subdistrict: '',
    house_no: '', village_name: '', additional_details: '',
    location_url: '', deed_number: '', deed_type: '', land_area: '',
    desired_amount: '', interest_rate: '', occupation: '', monthly_income: '',
    loan_purpose: '', contract_years: '', net_desired_amount: '',
    id_card_files: null, deed_files: null, property_files: null, permit_files: null, video_files: null,
  })

  const deedTypes = [
    { value: 'chanote', label: 'โฉนดที่ดิน (น.ส.4)', ok: true },
    { value: 'ns4k', label: 'น.ส.4ก.', ok: true },
    { value: 'ns3', label: 'นส.3', ok: false },
    { value: 'ns3k', label: 'นส.3ก.', ok: false },
    { value: 'spk', label: 'ที่ดิน ส.ป.ก.', ok: false },
    { value: 'other', label: 'อื่นๆ', ok: null },
  ]
  const isDeedBlacklisted = (v) => v && ['ns3', 'ns3k', 'spk'].includes(v)
  const isDeedOk = (v) => v && ['chanote', 'ns4k'].includes(v)

  // ข้อมูลนายหน้า
  const [agent, setAgent] = useState({
    full_name: '', nickname: '', phone: '', email: '', line_id: '',
    commission_rate: '', status: 'active', id_card_files: null,
  })

  const [existingIdCard, setExistingIdCard] = useState(null)

  useEffect(() => {
    fetch(`${API}/debtors`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json())
      .then(d => { if (d.success) setExistingDebtors(d.debtors) })
      .catch(() => { })
  }, [])

  useEffect(() => {
    if (!isEdit) return
    setLoading(true)
    fetch(`${API}/agents/${id}`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json())
      .then(d => {
        if (d.success && d.agent) {
          const a = d.agent
          setAgent({
            full_name: a.full_name || '', nickname: a.nickname || '', phone: a.phone || '',
            email: a.email || '', line_id: a.line_id || '', commission_rate: a.commission_rate || '',
            status: a.status || 'active', id_card_files: null,
          })
          setAgentCode(a.agent_code || '')
          setExistingIdCard(a.id_card_image || null)
        }
        // ★ เก็บรายการลูกหนี้ที่เชื่อมอยู่
        if (d.linked_debtors) setLinkedDebtors(d.linked_debtors)
      })
      .catch(() => { })
      .finally(() => setLoading(false))
  }, [id, isEdit])

  useEffect(() => {
    if (debtorMode === 'existing' && selectedDebtorId) {
      setSelectedDebtor(existingDebtors.find(d => d.id == selectedDebtorId) || null)
    } else {
      setSelectedDebtor(null)
    }
  }, [debtorMode, selectedDebtorId, existingDebtors])

  const setD = (key, val) => { setDebtor(prev => ({ ...prev, [key]: val })); setErrors(prev => ({ ...prev, [key]: '' })) }
  const setA = (key, val) => { setAgent(prev => ({ ...prev, [key]: val })); setErrors(prev => ({ ...prev, [key]: '' })) }

  const xBtnStyle = {
    background: '#e74c3c', color: '#fff', border: 'none', borderRadius: '50%',
    width: 18, height: 18, fontSize: 9, cursor: 'pointer', display: 'inline-flex',
    alignItems: 'center', justifyContent: 'center', padding: 0, lineHeight: 1,
    verticalAlign: 'middle', marginLeft: 6
  }

  const validate = () => {
    const err = {}
    // นายหน้า
    if (!agent.full_name.trim()) err.agent_full_name = 'กรุณากรอกชื่อนายหน้า'
    if (!agent.phone.trim()) err.agent_phone = 'กรุณากรอกเบอร์โทรนายหน้า'
    // ลูกหนี้ (ถ้าไม่ใช่ edit)
    if (!isEdit) {
      if (debtorMode === 'existing') {
        if (!selectedDebtorId) err.selectedDebtorId = 'กรุณาเลือกลูกหนี้'
      } else {
        if (!debtor.contact_name.trim()) err.contact_name = 'กรุณากรอกชื่อลูกหนี้'
        if (!debtor.contact_phone.trim()) err.contact_phone = 'กรุณากรอกเบอร์โทรลูกหนี้'
        if (!debtor.property_type) err.property_type = 'กรุณาเลือกลักษณะทรัพย์'
        if (debtor.property_type === 'other' && !debtor.property_type_other.trim()) err.property_type_other = 'กรุณาระบุลักษณะทรัพย์'
      }
    }
    setErrors(err)
    return Object.keys(err).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    setSubmitting(true)
    try {
      const fd = new FormData()
      fd.append('debtor_mode', debtorMode)

      if (!isEdit) {
        if (debtorMode === 'existing') {
          fd.append('debtor_id', selectedDebtorId)
        } else {
          fd.append('contact_name', debtor.contact_name)
          fd.append('contact_phone', debtor.contact_phone)
          fd.append('property_type', debtor.property_type === 'other' ? debtor.property_type_other : debtor.property_type)
          fd.append('has_obligation', debtor.has_obligation)
          if (debtor.loan_type_detail) fd.append('loan_type_detail', debtor.loan_type_detail)
          if (debtor.obligation_count) fd.append('obligation_count', debtor.obligation_count)
          if (debtor.province) fd.append('province', debtor.province)
          if (debtor.district) fd.append('district', debtor.district)
          if (debtor.subdistrict) fd.append('subdistrict', debtor.subdistrict)
          if (debtor.house_no) fd.append('house_no', debtor.house_no)
          if (debtor.village_name) fd.append('village_name', debtor.village_name)
          if (debtor.additional_details) fd.append('additional_details', debtor.additional_details)
          if (debtor.location_url) fd.append('location_url', debtor.location_url)
          if (debtor.deed_number) fd.append('deed_number', debtor.deed_number)
          if (debtor.deed_type) fd.append('deed_type', debtor.deed_type)
          if (debtor.land_area) fd.append('land_area', debtor.land_area)
          if (debtor.desired_amount) fd.append('desired_amount', debtor.desired_amount)
          if (debtor.interest_rate) fd.append('interest_rate', debtor.interest_rate)
          if (debtor.occupation) fd.append('occupation', debtor.occupation)
          if (debtor.monthly_income) fd.append('monthly_income', debtor.monthly_income)
          if (debtor.loan_purpose) fd.append('loan_purpose', debtor.loan_purpose)
          if (debtor.contract_years) fd.append('contract_years', debtor.contract_years)
          if (debtor.net_desired_amount) fd.append('net_desired_amount', debtor.net_desired_amount)
          if (debtor.id_card_files) { for (const f of debtor.id_card_files) fd.append('debtor_id_card', f) }
          if (debtor.deed_files) { for (const f of debtor.deed_files) fd.append('deed_image', f) }
          if (debtor.property_files) { for (const f of debtor.property_files) fd.append('property_image', f) }
          if (debtor.permit_files) { for (const f of debtor.permit_files) fd.append('building_permit', f) }
          if (debtor.video_files) { for (const f of debtor.video_files) fd.append('property_video', f) }
        }
      }

      fd.append('full_name', agent.full_name)
      fd.append('nickname', agent.nickname)
      fd.append('phone', agent.phone)
      fd.append('email', agent.email)
      fd.append('line_id', agent.line_id)
      fd.append('commission_rate', agent.commission_rate || '0')
      if (isEdit) fd.append('status', agent.status)
      if (agent.id_card_files) { for (const f of agent.id_card_files) fd.append('id_card_image', f) }

      const url = isEdit ? `${API}/agents/${id}` : `${API}/agents`
      const method = isEdit ? 'PUT' : 'POST'
      const res = await fetch(url, { method, headers: { Authorization: `Bearer ${token()}` }, body: fd })
      const data = await res.json()
      if (data.success) {
        if (data.agent_code) setAgentCode(data.agent_code)
        if (data.debtor_code) setDebtorCode(data.debtor_code)
        setSuccess(true)
        setTimeout(() => navigate('/sales'), 1500)
      } else {
        setErrors({ submit: data.message || 'เกิดข้อผิดพลาด' })
      }
    } catch {
      setErrors({ submit: 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้' })
    }
    setSubmitting(false)
  }

  const getPropertyLabel = () => {
    if (debtorMode === 'existing' && selectedDebtor) {
      return propertyTypeLabel[selectedDebtor.property_type] || selectedDebtor.property_type || '-'
    }
    if (debtor.property_type === 'other') return debtor.property_type_other || 'อื่นๆ'
    return propertyTypes.find(t => t.value === debtor.property_type)?.label || '-'
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 60 }}>
        <i className="fas fa-spinner fa-spin" style={{ fontSize: 32, color: 'var(--primary)' }}></i>
        <p style={{ marginTop: 12, color: '#888' }}>กำลังโหลดข้อมูล...</p>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button className="btn btn-outline" onClick={() => navigate('/sales')} style={{ padding: '8px 16px' }}>
          <i className="fas fa-arrow-left"></i>
        </button>
        <div>
          <h2 style={{ margin: 0, fontSize: 20 }}>
            <i className="fas fa-user-tie" style={{ color: 'var(--primary)', marginRight: 8 }}></i>
            {isEdit ? 'แก้ไขนายหน้า' : 'ลงทะเบียนนายหน้า'}
          </h2>
          {agentCode && (
            <span style={{ display: 'inline-block', marginTop: 4, padding: '2px 12px', background: 'var(--primary)', color: '#fff', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>{agentCode}</span>
          )}
        </div>
      </div>

      {errors.submit && <div className="error-msg" style={{ marginBottom: 16 }}>{errors.submit}</div>}
      {success && (
        <div className="success-msg" style={{ marginBottom: 16 }}>
          <i className="fas fa-check-circle"></i> {isEdit ? 'อัพเดทข้อมูลนายหน้าสำเร็จ!' : 'ลงทะเบียนนายหน้าสำเร็จ!'} ข้อมูลของ <strong>{agent.full_name}</strong> ถูก{isEdit ? 'อัพเดท' : 'บันทึก'}เรียบร้อยแล้ว กำลังกลับหน้าหลัก...
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>

          {/* ===== ซ้าย: ข้อมูลนายหน้า ===== */}
          <div>
            <div className="card" style={{ padding: 24, marginBottom: 20 }}>
              <h3 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 700 }}>
                <i className="fas fa-user-tie" style={{ color: 'var(--primary)', marginRight: 8 }}></i>
                ข้อมูลนายหน้า
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-group">
                  <label>ชื่อ-สกุล *</label>
                  <input type="text" placeholder="ชื่อ-นามสกุล" value={agent.full_name} onChange={e => setA('full_name', e.target.value)} />
                  {errors.agent_full_name && <span style={{ color: '#e74c3c', fontSize: 12 }}>{errors.agent_full_name}</span>}
                </div>
                <div className="form-group">
                  <label>ชื่อเล่น</label>
                  <input type="text" placeholder="ชื่อเล่น" value={agent.nickname} onChange={e => setA('nickname', e.target.value)} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-group">
                  <label>เบอร์โทร *</label>
                  <input type="tel" placeholder="0XX-XXX-XXXX" value={agent.phone} onChange={e => setA('phone', e.target.value)} />
                  {errors.agent_phone && <span style={{ color: '#e74c3c', fontSize: 12 }}>{errors.agent_phone}</span>}
                </div>
                <div className="form-group">
                  <label>อีเมล</label>
                  <input type="email" placeholder="email@example.com" value={agent.email} onChange={e => setA('email', e.target.value)} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-group">
                  <label>Line ID</label>
                  <input type="text" placeholder="Line ID" value={agent.line_id} onChange={e => setA('line_id', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>ค่าคอมมิชชั่น (%)</label>
                  <input type="number" step="0.01" placeholder="%" value={agent.commission_rate} onChange={e => setA('commission_rate', e.target.value)} />
                </div>
              </div>

              {isEdit && (
                <div className="form-group">
                  <label>สถานะ</label>
                  <select value={agent.status} onChange={e => setA('status', e.target.value)}>
                    <option value="active">ใช้งาน</option>
                    <option value="inactive">ปิดใช้งาน</option>
                  </select>
                </div>
              )}

              <div className="form-group" style={{ marginTop: 16 }}>
                <label>รูปหน้าบัตรประชาชน (นายหน้า)</label>
                <input type="file" accept="image/*,.pdf" onChange={e => setA('id_card_files', Array.from(e.target.files))} />
                {agent.id_card_files && <small style={{ color: 'var(--primary)', fontSize: 11 }}>เลือก {agent.id_card_files.length} ไฟล์ <button type="button" onClick={() => setA('id_card_files', null)} style={xBtnStyle}><i className="fas fa-times"></i></button></small>}
                {isEdit && existingIdCard && <small style={{ color: '#888', fontSize: 11 }}><i className="fas fa-image"></i> มีรูปเดิม 1 ไฟล์</small>}
              </div>
            </div>

            {/* ★ แสดงลูกหนี้ที่เชื่อมอยู่ (edit mode) */}
            {isEdit && linkedDebtors.length > 0 && (
              <div className="card" style={{ padding: 24, marginBottom: 20 }}>
                <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700 }}>
                  <i className="fas fa-users" style={{ color: '#2196F3', marginRight: 8 }}></i>
                  ลูกหนี้ที่เชื่อมอยู่ ({linkedDebtors.length} ราย)
                </h3>
                {linkedDebtors.map((d, i) => (
                  <div key={i} style={{
                    padding: 14, marginBottom: 10, borderRadius: 10,
                    border: '1px solid #e3f2fd', background: '#f8fbff'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <div style={{ fontWeight: 700, color: '#1565C0', fontSize: 14 }}>
                        <i className="fas fa-user" style={{ marginRight: 6 }}></i>
                        {d.contact_name}
                        {d.debtor_code && (
                          <span style={{ marginLeft: 8, padding: '2px 8px', background: '#1565C0', color: '#fff', borderRadius: 12, fontSize: 11 }}>{d.debtor_code}</span>
                        )}
                      </div>
                      <button type="button" className="btn btn-outline" style={{ padding: '4px 12px', fontSize: 11 }}
                        onClick={() => navigate(`/sales/edit/${d.id}`)}>
                        <i className="fas fa-edit"></i> แก้ไข
                      </button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px 12px', fontSize: 12, color: '#666' }}>
                      <div><span style={{ color: '#999' }}>เบอร์โทร:</span> {d.contact_phone}</div>
                      <div><span style={{ color: '#999' }}>ทรัพย์:</span> {propertyTypeLabel[d.property_type] || d.property_type || '-'}</div>
                      <div><span style={{ color: '#999' }}>จังหวัด:</span> {d.province || '-'}</div>
                    </div>
                    {d.case_code ? (
                      <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                        <span style={{ color: 'var(--primary)', fontWeight: 600 }}>เคส: {d.case_code}{d.contact_name ? ` (${d.contact_name})` : ''}</span>
                        <span className={`badge ${statusBadge[d.case_status] || 'badge-pending'}`} style={{ fontSize: 10 }}>
                          {statusLabel[d.case_status] || d.case_status || '-'}
                        </span>
                        <span className={`badge ${d.payment_status === 'paid' ? 'badge-paid' : 'badge-unpaid'}`} style={{ fontSize: 10 }}>
                          {d.payment_status === 'paid' ? 'ชำระแล้ว' : 'ยังไม่ชำระ'}
                        </span>
                      </div>
                    ) : (
                      <div style={{ marginTop: 6, fontSize: 11, color: '#999' }}>
                        <i className="fas fa-info-circle"></i> ยังไม่มีเคส
                      </div>
                    )}
                  </div>
                ))}

                {/* ★ ปุ่มเพิ่มลูกหนี้ใหม่ (ส่ง agent_id ผ่าน URL) */}
                <button type="button" className="btn btn-outline" style={{ width: '100%', padding: '10px 16px', fontSize: 13 }}
                  onClick={() => navigate(`/sales/new?agent_id=${id}`)}>
                  <i className="fas fa-user-plus" style={{ marginRight: 6 }}></i> เพิ่มลูกหนี้ใหม่ให้นายหน้าคนนี้
                </button>
              </div>
            )}

            {/* ★ ปุ่มเพิ่มลูกหนี้ (edit mode ยังไม่มีลูกหนี้) */}
            {isEdit && linkedDebtors.length === 0 && (
              <div className="card" style={{ padding: 24, marginBottom: 20, textAlign: 'center' }}>
                <p style={{ color: '#888', fontSize: 14, marginBottom: 12 }}>
                  <i className="fas fa-user-slash" style={{ marginRight: 6 }}></i>
                  ยังไม่มีลูกหนี้ที่เชื่อมอยู่
                </p>
                <button type="button" className="btn btn-primary" style={{ padding: '10px 20px', fontSize: 13 }}
                  onClick={() => navigate(`/sales/new?agent_id=${id}`)}>
                  <i className="fas fa-user-plus" style={{ marginRight: 6 }}></i> เพิ่มลูกหนี้ใหม่
                </button>
              </div>
            )}

            {/* ปุ่มบันทึก */}
            <div style={{ display: 'flex', gap: 12 }}>
              <button type="submit" className="btn btn-primary" disabled={submitting} style={{ padding: '12px 32px', flex: 1 }}>
                {submitting ? <><i className="fas fa-spinner fa-spin"></i> กำลังบันทึก...</> : <><i className="fas fa-save"></i> {isEdit ? 'อัพเดทข้อมูล' : 'บันทึกข้อมูล'}</>}
              </button>
              <button type="button" className="btn btn-outline" onClick={() => navigate('/sales')} style={{ padding: '12px 24px' }}>
                ยกเลิก
              </button>
            </div>
          </div>

          {/* ===== ขวา: ข้อมูลลูกหนี้ (ไม่แสดงในโหมดแก้ไข) ===== */}
          <div>
            {!isEdit && (
              <>
                <div className="card" style={{ padding: 24, marginBottom: 20 }}>
                  <h3 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 700 }}>
                    <i className="fas fa-user" style={{ color: 'var(--primary)', marginRight: 8 }}></i>
                    ข้อมูลลูกหนี้
                  </h3>

                  {/* Toggle เลือกโหมด */}
                  <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
                    <div onClick={() => { setDebtorMode('new'); setSelectedDebtorId('') }}
                      style={{
                        flex: 1, padding: '12px 16px', borderRadius: 10, cursor: 'pointer', textAlign: 'center',
                        border: `2px solid ${debtorMode === 'new' ? 'var(--primary)' : '#e0e0e0'}`,
                        background: debtorMode === 'new' ? '#f0faf5' : '#fff',
                      }}>
                      <i className="fas fa-user-plus" style={{ fontSize: 18, color: debtorMode === 'new' ? 'var(--primary)' : '#999', display: 'block', marginBottom: 4 }}></i>
                      <strong style={{ fontSize: 12, color: debtorMode === 'new' ? 'var(--primary)' : '#666' }}>กรอกลูกหนี้ใหม่</strong>
                    </div>
                    <div onClick={() => setDebtorMode('existing')}
                      style={{
                        flex: 1, padding: '12px 16px', borderRadius: 10, cursor: 'pointer', textAlign: 'center',
                        border: `2px solid ${debtorMode === 'existing' ? '#2196F3' : '#e0e0e0'}`,
                        background: debtorMode === 'existing' ? '#f0f7ff' : '#fff',
                      }}>
                      <i className="fas fa-search" style={{ fontSize: 18, color: debtorMode === 'existing' ? '#2196F3' : '#999', display: 'block', marginBottom: 4 }}></i>
                      <strong style={{ fontSize: 12, color: debtorMode === 'existing' ? '#2196F3' : '#666' }}>เลือกลูกหนี้ที่มีอยู่</strong>
                    </div>
                  </div>

                  {/* โหมดเลือกลูกหนี้เดิม */}
                  {debtorMode === 'existing' && (
                    <div>
                      <div className="form-group">
                        <label>เลือกลูกหนี้ *</label>
                        <select value={selectedDebtorId} onChange={e => setSelectedDebtorId(e.target.value)}>
                          <option value="">-- เลือกลูกหนี้ --</option>
                          {existingDebtors.map(d => (
                            <option key={d.id} value={d.id}>{d.debtor_code || `#${d.id}`} — {d.contact_name} ({d.contact_phone})</option>
                          ))}
                        </select>
                        {errors.selectedDebtorId && <span style={{ color: '#e74c3c', fontSize: 12 }}>{errors.selectedDebtorId}</span>}
                      </div>

                      {selectedDebtor && (
                        <div style={{ background: '#f0f7ff', border: '1px solid #bbdefb', borderRadius: 10, padding: 16, marginTop: 12 }}>
                          <div style={{ fontWeight: 700, color: '#1565C0', marginBottom: 8, fontSize: 14 }}>
                            <i className="fas fa-user-check"></i> {selectedDebtor.contact_name}
                            {selectedDebtor.debtor_code && <span style={{ marginLeft: 8, padding: '2px 10px', background: '#1565C0', color: '#fff', borderRadius: 12, fontSize: 11 }}>{selectedDebtor.debtor_code}</span>}
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px', fontSize: 13 }}>
                            <div><span style={{ color: '#888' }}>เบอร์โทร:</span> {selectedDebtor.contact_phone}</div>
                            <div><span style={{ color: '#888' }}>ทรัพย์:</span> {getPropertyLabel()}</div>
                            <div><span style={{ color: '#888' }}>จังหวัด:</span> {selectedDebtor.province || '-'}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* โหมดกรอกลูกหนี้ใหม่ */}
                  {debtorMode === 'new' && (
                    <div>

                      {/* ===== ประเภทสัญญา ===== */}
                      <div style={{ marginBottom: 16 }}>
                        <label style={{ fontWeight: 700, fontSize: 13, display: 'block', marginBottom: 8 }}>ประเภทสัญญา</label>
                        <div style={{ display: 'flex', gap: 8 }}>
                          {[
                            { value: 'mortgage', label: 'จำนอง', icon: 'fa-home', color: '#1565c0', bg: '#e3f2fd' },
                            { value: 'selling_pledge', label: 'ขายฝาก', icon: 'fa-file-signature', color: '#6a1b9a', bg: '#f3e5f5' },
                            { value: '', label: 'ไม่ระบุ', icon: 'fa-question-circle', color: '#888', bg: '#f5f5f5' },
                          ].map(opt => (
                            <button key={opt.value} type="button"
                              onClick={() => setD('loan_type_detail', opt.value)}
                              style={{
                                flex: 1, padding: '10px 4px', borderRadius: 10, cursor: 'pointer',
                                border: `2px solid ${debtor.loan_type_detail === opt.value ? opt.color : '#e0e0e0'}`,
                                background: debtor.loan_type_detail === opt.value ? opt.bg : '#fff',
                                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                                transition: 'all 0.15s',
                              }}>
                              <i className={`fas ${opt.icon}`} style={{ fontSize: 18, color: debtor.loan_type_detail === opt.value ? opt.color : '#bbb' }}></i>
                              <span style={{ fontSize: 12, fontWeight: debtor.loan_type_detail === opt.value ? 700 : 500, color: debtor.loan_type_detail === opt.value ? opt.color : '#888' }}>{opt.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* ชื่อ + เบอร์ */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <div className="form-group">
                          <label>ชื่อ-สกุล (ลูกหนี้) *</label>
                          <input type="text" placeholder="ชื่อ-สกุล" value={debtor.contact_name} onChange={e => setD('contact_name', e.target.value)} />
                          {errors.contact_name && <span style={{ color: '#e74c3c', fontSize: 12 }}>{errors.contact_name}</span>}
                        </div>
                        <div className="form-group">
                          <label>เบอร์โทร (ลูกหนี้) *</label>
                          <input type="tel" placeholder="098-123-1234" value={debtor.contact_phone} onChange={e => setD('contact_phone', e.target.value)} />
                          {errors.contact_phone && <span style={{ color: '#e74c3c', fontSize: 12 }}>{errors.contact_phone}</span>}
                        </div>
                      </div>

                      {/* ลักษณะทรัพย์ */}
                      <div className="form-group">
                        <label>ลักษณะทรัพย์ *</label>
                        <select value={debtor.property_type} onChange={e => setD('property_type', e.target.value)}>
                          <option value="">-- เลือก --</option>
                          {propertyTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                        {errors.property_type && <span style={{ color: '#e74c3c', fontSize: 12 }}>{errors.property_type}</span>}
                      </div>
                      {debtor.property_type === 'other' && (
                        <div className="form-group">
                          <label>ระบุลักษณะทรัพย์ *</label>
                          <input type="text" placeholder="ระบุ..." value={debtor.property_type_other} onChange={e => setD('property_type_other', e.target.value)} />
                          {errors.property_type_other && <span style={{ color: '#e74c3c', fontSize: 12 }}>{errors.property_type_other}</span>}
                        </div>
                      )}

                      {/* ติดภาระ */}
                      <div style={{ margin: '12px 0' }}>
                        <label style={{ fontWeight: 600, fontSize: 13, display: 'block', marginBottom: 8 }}>ทรัพย์ติดภาระหรือไม่</label>
                        <div style={{ display: 'flex', gap: 16 }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13 }}>
                            <input type="radio" name="debtor_has_obligation" value="no" checked={debtor.has_obligation === 'no'} onChange={e => setD('has_obligation', e.target.value)} /> ไม่ติดภาระ
                          </label>
                          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13 }}>
                            <input type="radio" name="debtor_has_obligation" value="yes" checked={debtor.has_obligation === 'yes'} onChange={e => setD('has_obligation', e.target.value)} /> ติดภาระ
                          </label>
                        </div>
                        {debtor.has_obligation === 'yes' && (
                          <div className="form-group" style={{ marginTop: 8 }}>
                            <label>จำนวนภาระ</label>
                            <input type="number" placeholder="จำนวน" value={debtor.obligation_count} onChange={e => setD('obligation_count', e.target.value)} />
                          </div>
                        )}
                      </div>

                      {/* จังหวัด / อำเภอ / ตำบล */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginTop: 4 }}>
                        <div className="form-group">
                          <label>จังหวัด</label>
                          <select value={debtor.province} onChange={e => setD('province', e.target.value)}>
                            <option value="">-- เลือก --</option>
                            {provinces.map(p => <option key={p} value={p}>{p}</option>)}
                          </select>
                        </div>
                        <div className="form-group">
                          <label>อำเภอ</label>
                          <input type="text" placeholder="อำเภอ" value={debtor.district} onChange={e => setD('district', e.target.value)} />
                        </div>
                        <div className="form-group">
                          <label>ตำบล</label>
                          <input type="text" placeholder="ตำบล" value={debtor.subdistrict} onChange={e => setD('subdistrict', e.target.value)} />
                        </div>
                      </div>

                      {/* บ้านเลขที่ / หมู่บ้าน */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div className="form-group">
                          <label>บ้านเลขที่</label>
                          <input type="text" placeholder="123/4" value={debtor.house_no} onChange={e => setD('house_no', e.target.value)} />
                        </div>
                        <div className="form-group">
                          <label>หมู่บ้าน / โครงการ</label>
                          <input type="text" placeholder="ชื่อหมู่บ้าน" value={debtor.village_name} onChange={e => setD('village_name', e.target.value)} />
                        </div>
                      </div>

                      <div className="form-group">
                        <label>รายละเอียดเพิ่มเติม</label>
                        <input type="text" placeholder="เช่น ใกล้ตลาด, ซอย..." value={debtor.additional_details} onChange={e => setD('additional_details', e.target.value)} />
                      </div>

                      <div className="form-group">
                        <label>Google Maps URL</label>
                        <input type="text" placeholder="https://maps.google.com/..." value={debtor.location_url} onChange={e => setD('location_url', e.target.value)} />
                      </div>

                      {/* โฉนด */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div className="form-group">
                          <label>เลขโฉนด</label>
                          <input type="text" placeholder="กข.12345" value={debtor.deed_number} onChange={e => setD('deed_number', e.target.value)} />
                        </div>
                        <div className="form-group">
                          <label>พื้นที่</label>
                          <input type="text" placeholder="เช่น 50 ตร.วา" value={debtor.land_area} onChange={e => setD('land_area', e.target.value)} />
                        </div>
                      </div>

                      {/* ประเภทโฉนด */}
                      <div className="form-group">
                        <label>ประเภทเอกสารสิทธิ์</label>
                        <select value={debtor.deed_type} onChange={e => setD('deed_type', e.target.value)}>
                          <option value="">-- เลือกประเภทโฉนด --</option>
                          {deedTypes.map(d => (
                            <option key={d.value} value={d.value}>{d.label}</option>
                          ))}
                        </select>
                        {isDeedBlacklisted(debtor.deed_type) && (
                          <div style={{ marginTop: 6, padding: '6px 10px', background: '#fdecea', borderRadius: 6, fontSize: 12, color: '#c62828', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <i className="fas fa-exclamation-triangle"></i> ประเภทนี้ไม่ผ่านเกณฑ์ตาม SOP
                          </div>
                        )}
                        {isDeedOk(debtor.deed_type) && (
                          <div style={{ marginTop: 6, padding: '6px 10px', background: '#e8f5e9', borderRadius: 6, fontSize: 12, color: '#2e7d32', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <i className="fas fa-check-circle"></i> ผ่านเกณฑ์เอกสารสิทธิ์ตาม SOP
                          </div>
                        )}
                      </div>

                      {/* ===== Fact Finding ===== */}
                      <div style={{ background: '#fff8f0', border: '1px solid #ffe0b2', borderRadius: 10, padding: 14, marginTop: 8 }}>
                        <div style={{ fontWeight: 700, fontSize: 13, color: '#e65100', marginBottom: 12 }}>
                          <i className="fas fa-clipboard-list" style={{ marginRight: 6 }}></i>ข้อมูลประกอบ (Fact Finding)
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                          <div className="form-group" style={{ margin: 0 }}>
                            <label>วงเงินที่ต้องการ (บาท)</label>
                            <input type="text" placeholder="เช่น 500,000" value={debtor.desired_amount} onChange={e => setD('desired_amount', e.target.value)} />
                          </div>
                          <div className="form-group" style={{ margin: 0 }}>
                            <label>วงเงินสุทธิ (บาท)</label>
                            <input type="text" placeholder="หักค่าใช้จ่ายแล้ว" value={debtor.net_desired_amount} onChange={e => setD('net_desired_amount', e.target.value)} />
                          </div>
                          <div className="form-group" style={{ margin: 0 }}>
                            <label>อัตราดอกเบี้ย (%/เดือน)</label>
                            <input type="number" step="0.01" placeholder="เช่น 1.25" value={debtor.interest_rate} onChange={e => setD('interest_rate', e.target.value)} />
                          </div>
                          <div className="form-group" style={{ margin: 0 }}>
                            <label>ระยะสัญญา (ปี)</label>
                            <input type="number" placeholder="เช่น 1" value={debtor.contract_years} onChange={e => setD('contract_years', e.target.value)} />
                          </div>
                          <div className="form-group" style={{ margin: 0 }}>
                            <label>อาชีพ</label>
                            <input type="text" placeholder="เช่น ค้าขาย" value={debtor.occupation} onChange={e => setD('occupation', e.target.value)} />
                          </div>
                          <div className="form-group" style={{ margin: 0 }}>
                            <label>รายได้ต่อเดือน (บาท)</label>
                            <input type="text" placeholder="เช่น 30,000" value={debtor.monthly_income} onChange={e => setD('monthly_income', e.target.value)} />
                          </div>
                        </div>
                        <div className="form-group" style={{ marginTop: 12, marginBottom: 0 }}>
                          <label>วัตถุประสงค์การกู้</label>
                          <input type="text" placeholder="เช่น ขยายกิจการ, ชำระหนี้" value={debtor.loan_purpose} onChange={e => setD('loan_purpose', e.target.value)} />
                        </div>
                      </div>

                    </div>
                  )}
                </div>

                {/* อัพโหลดเอกสาร (เฉพาะลูกหนี้ใหม่) */}
                {debtorMode === 'new' && (
                  <div className="card" style={{ padding: 24, marginBottom: 20 }}>
                    <h3 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 700 }}>
                      <i className="fas fa-camera" style={{ color: 'var(--primary)', marginRight: 8 }}></i>
                      เอกสารลูกหนี้
                    </h3>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                      <div className="form-group">
                        <label>บัตรประชาชน (ลูกหนี้)</label>
                        <input type="file" accept="image/*,.pdf" onChange={e => setD('id_card_files', Array.from(e.target.files))} />
                        {debtor.id_card_files && <small style={{ color: 'var(--primary)', fontSize: 11 }}>{debtor.id_card_files.length} ไฟล์ <button type="button" onClick={() => setD('id_card_files', null)} style={xBtnStyle}><i className="fas fa-times"></i></button></small>}
                      </div>
                      <div className="form-group">
                        <label>รูปโฉนด</label>
                        <input type="file" accept="image/*,.pdf" onChange={e => setD('deed_files', Array.from(e.target.files))} />
                        {debtor.deed_files && <small style={{ color: 'var(--primary)', fontSize: 11 }}>{debtor.deed_files.length} ไฟล์ <button type="button" onClick={() => setD('deed_files', null)} style={xBtnStyle}><i className="fas fa-times"></i></button></small>}
                      </div>
                      <div className="form-group">
                        <label>รูปภาพทรัพย์</label>
                        <input type="file" accept="image/*,.pdf" multiple onChange={e => setD('property_files', Array.from(e.target.files))} />
                        {debtor.property_files && <small style={{ color: 'var(--primary)', fontSize: 11 }}>{debtor.property_files.length} ไฟล์ <button type="button" onClick={() => setD('property_files', null)} style={xBtnStyle}><i className="fas fa-times"></i></button></small>}
                      </div>
                      <div className="form-group">
                        <label>ใบอนุญาตสิ่งปลูกสร้าง</label>
                        <input type="file" accept="image/*,.pdf" onChange={e => setD('permit_files', Array.from(e.target.files))} />
                        {debtor.permit_files && <small style={{ color: 'var(--primary)', fontSize: 11 }}>{debtor.permit_files.length} ไฟล์ <button type="button" onClick={() => setD('permit_files', null)} style={xBtnStyle}><i className="fas fa-times"></i></button></small>}
                      </div>
                    </div>
                    <div className="form-group">
                      <label>วีดีโอทรัพย์</label>
                      <input type="file" accept="video/*" multiple onChange={e => setD('video_files', Array.from(e.target.files))} />
                      {debtor.video_files && <small style={{ color: 'var(--primary)', fontSize: 11 }}>{debtor.video_files.length} ไฟล์ <button type="button" onClick={() => setD('video_files', null)} style={xBtnStyle}><i className="fas fa-times"></i></button></small>}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </form>
    </div>
  )
}
