import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { io } from 'socket.io-client'
import '../styles/sales.css'

const token = () => localStorage.getItem('loandd_admin')
const API = '/api/admin/sales'

// ★ ดึง department จาก JWT token (สำหรับซ่อนราคาประเมินจากเซล)
function getUserDepartment() {
  try {
    const t = localStorage.getItem('loandd_admin')
    if (!t) return null
    const payload = JSON.parse(atob(t.split('.')[1]))
    return payload.department || null
  } catch { return null }
}
const USER_DEPT = getUserDepartment()

// ★ Checklist เอกสารตามสถานะสมรส (ตาม SOP ฝ่ายขาย ข้อ 5.2)
const MARITAL_CHECKLIST = {
  single: {
    label: 'โสด',
    color: '#1565c0',
    option: 'Option A',
    items: [
      'สำเนาบัตรประชาชน (รับรองสำเนาถูกต้อง)',
      'สำเนาทะเบียนบ้าน',
      'ใบเปลี่ยนชื่อ/นามสกุล (ถ้ามี)',
    ],
  },
  married_reg: {
    label: 'สมรสจดทะเบียน',
    color: '#6a1b9a',
    option: 'Option B',
    items: [
      'สำเนาบัตรประชาชนผู้กู้ (รับรองสำเนาถูกต้อง)',
      'สำเนาทะเบียนบ้านผู้กู้',
      'ทะเบียนสมรส',
      'สำเนาบัตรประชาชนคู่สมรส',
      'สำเนาทะเบียนบ้านคู่สมรส',
      'ใบเปลี่ยนชื่อ/นามสกุล (ถ้ามี)',
    ],
  },
  married_unreg: {
    label: 'สมรสไม่จดทะเบียน',
    color: '#e65100',
    option: 'Option C',
    items: [
      'สำเนาบัตรประชาชนผู้กู้ (รับรองสำเนาถูกต้อง)',
      'สำเนาทะเบียนบ้านผู้กู้',
      'หนังสือรับรองโสด (จากอำเภอ) หรือแบบฟอร์มยืนยันสถานะไม่ได้จดทะเบียน',
      'ใบเปลี่ยนชื่อ/นามสกุล (ถ้ามี)',
    ],
  },
  divorced: {
    label: 'หย่า',
    color: '#c62828',
    option: 'Option D',
    items: [
      'สำเนาบัตรประชาชน (รับรองสำเนาถูกต้อง)',
      'สำเนาทะเบียนบ้าน',
      'ทะเบียนหย่า',
      'บันทึกการหย่า (ถ้ามี)',
      'ใบเปลี่ยนชื่อ/นามสกุล (ถ้ามี)',
    ],
  },
  inherited: {
    label: 'รับมรดก',
    color: '#2e7d32',
    option: 'Option E',
    items: [
      'สำเนาบัตรประชาชนผู้รับมรดก (รับรองสำเนาถูกต้อง)',
      'สำเนาทะเบียนบ้านผู้รับมรดก',
      'ใบมรณบัตรเจ้ามรดก',
      'พินัยกรรม หรือ คำสั่งศาล (ถ้ามี)',
      'สำเนาทะเบียนบ้านเจ้ามรดก',
      'ใบเปลี่ยนชื่อ/นามสกุล (ถ้ามี)',
    ],
  },
}

const propertyTypes = [
  { value: 'land', label: 'ที่ดินเปล่า' },
  { value: 'house', label: 'บ้านเดี่ยว' },
  { value: 'condo', label: 'คอนโด' },
  { value: 'townhouse', label: 'ทาวน์เฮ้าส์' },
  { value: 'other', label: 'อื่นๆ' },
]

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

export default function SalesFormPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const isEdit = Boolean(id)

  const socketRef = useRef(null)
  const [ocrFlash, setOcrFlash] = useState(null) // แสดง badge เมื่อ OCR อัพเดทฟิลด์

  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [agents, setAgents] = useState([])
  const [selectedAgent, setSelectedAgent] = useState(null)

  const [existingImages, setExistingImages] = useState([])
  const [existingDeedImages, setExistingDeedImages] = useState([])
  const [caseInfo, setCaseInfo] = useState(null)
  const [linkedCases, setLinkedCases] = useState([])

  const statusOptions = [
    { value: 'new', label: 'เคสใหม่' },
    { value: 'contacting', label: 'กำลังติดต่อ' },
    { value: 'incomplete', label: 'ข้อมูลไม่ครบ' },
    { value: 'awaiting_appraisal_fee', label: 'รอชำระค่าประเมิน' },
    { value: 'appraisal_scheduled', label: 'นัดประเมินแล้ว' },
    { value: 'appraisal_passed', label: 'ผ่านประเมินแล้ว' },
    { value: 'appraisal_not_passed', label: 'ไม่ผ่านประเมิน' },
    { value: 'pending_approve', label: 'รออนุมัติวงเงิน' },
    { value: 'credit_approved', label: 'อนุมัติวงเงินแล้ว' },
    { value: 'pending_auction', label: 'รอประมูล' },
    { value: 'preparing_docs', label: 'เตรียมเอกสาร' },
    { value: 'legal_scheduled', label: 'นัดนิติกรรมแล้ว' },
    { value: 'legal_completed', label: 'ทำนิติกรรมเสร็จสิ้น' },
    { value: 'completed', label: 'เสร็จสมบูรณ์' },
    { value: 'cancelled', label: 'ยกเลิก' },
  ]

  const paymentOptions = [
    { value: 'unpaid', label: 'ยังไม่ชำระ' },
    { value: 'paid', label: 'ชำระแล้ว' },
  ]

  // ★ ประเภทเอกสารสิทธิ์ตาม SOP
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

  const [form, setForm] = useState({
    contact_name: '',
    contact_phone: '',
    property_type: '',
    property_type_other: '',
    loan_type_detail: '',          // ไม่ระบุเป็น default
    has_obligation: 'no',
    obligation_count: '',
    province: '',
    district: '',
    subdistrict: '',
    house_no: '',
    village_name: '',
    additional_details: '',
    location_url: '',
    deed_number: '',
    deed_type: '',
    land_area: '',
    estimated_value: '',
    interest_rate: '',
    desired_amount: '',
    occupation: '',
    monthly_income: '',
    loan_purpose: '',
    marital_status: '',   // ★ สถานะสมรส (สำหรับ checklist เอกสาร)
    contract_years: '',
    net_desired_amount: '',
    preliminary_terms: '',
    agent_id: '',
    id_card_files: null,
    deed_files: null,
    property_files: null,
    permit_files: null,
    video_files: null,
  })

  // ★ LTV คำนวณตาม SOP
  const ltvMin = form.loan_type_detail === 'selling_pledge' ? 50 : 30
  const ltvMax = form.loan_type_detail === 'selling_pledge' ? 60 : 40
  const estimatedNum = parseFloat(String(form.estimated_value).replace(/,/g, '')) || 0
  const ltvLow = estimatedNum > 0 ? Math.round(estimatedNum * ltvMin / 100) : 0
  const ltvHigh = estimatedNum > 0 ? Math.round(estimatedNum * ltvMax / 100) : 0
  const fmt = (n) => n > 0 ? n.toLocaleString('th-TH') : '-'

  // โหลดรายการนายหน้า
  useEffect(() => {
    fetch(`${API}/agents`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json())
      .then(d => { if (d.success) setAgents(d.agents) })
      .catch(() => { })
  }, [])

  // ★ Socket.io — รับ deed_ocr_result แล้วอัพเดทฟิลด์ทรัพย์อัตโนมัติ
  useEffect(() => {
    if (!isEdit || !id) return // เฉพาะ edit mode ที่รู้ loan_request_id

    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000'
    const socket = io(backendUrl, {
      auth: { token: token() },
      reconnectionAttempts: 5,
      reconnectionDelay: 3000,
      transports: ['websocket', 'polling']
    })
    socketRef.current = socket

    // ฟังก์ชัน helper ใช้ร่วมกันทั้ง deed และ document
    const stripProv = (v) => v ? v.replace(/^จังหวัด/, '').replace(/^จ\./, '').trim() : v
    const stripAmph = (v) => v ? v.replace(/^อำเภอ/, '').replace(/^เขต/, '').replace(/^อ\./, '').trim() : v
    const stripTamb = (v) => v ? v.replace(/^ตำบล/, '').replace(/^แขวง/, '').replace(/^ต\./, '').trim() : v

    const applyOcrFields = (fieldMap) => {
      setForm(prev => {
        const updated = { ...prev }
        const filled = []
        Object.entries(fieldMap).forEach(([key, rawVal]) => {
          if (!rawVal || prev[key]) return
          const normalize = key === 'province' ? stripProv : key === 'district' ? stripAmph : key === 'subdistrict' ? stripTamb : null
          const val = normalize ? normalize(rawVal) : rawVal
          if (val) { updated[key] = val; filled.push(key) }
        })
        if (filled.length > 0) {
          setOcrFlash(filled)
          setTimeout(() => setOcrFlash(null), 5000)
        }
        return updated
      })
    }

    // ── โฉนด ──
    socket.on('deed_ocr_result', (data) => {
      if (String(data.loan_request_id) !== String(id)) return
      const uf = data.updated_fields || {}
      const dd = data.deed_data || {}
      applyOcrFields({
        province:    uf.province    || dd.province,
        district:    uf.district    || dd.amphoe,
        subdistrict: uf.subdistrict || dd.tambon,
        deed_number: uf.deed_number || dd.deed_number,
        land_area:   uf.land_area   || dd.land_area,
        deed_type:   uf.deed_type   || null,
      })
    })

    // ── เอกสารทั่วไป (บัตรประชาชน, สลิป, ทะเบียนบ้าน ฯลฯ) ──
    socket.on('document_ocr_result', (data) => {
      if (String(data.loan_request_id) !== String(id)) return
      const uf = data.updated_fields || {}
      const dd = data.doc_data || {}
      applyOcrFields({
        contact_name:  uf.contact_name  || dd.full_name,
        occupation:    uf.occupation    || dd.occupation,
        monthly_income:uf.monthly_income|| dd.monthly_income,
        province:      uf.province      || dd.province,
        district:      uf.district      || dd.amphoe,
        subdistrict:   uf.subdistrict   || dd.tambon,
        deed_number:   uf.deed_number   || dd.deed_number,
        land_area:     uf.land_area     || dd.land_area,
        deed_type:     uf.deed_type     || null,
      })
    })

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect()
        socketRef.current = null
      }
    }
  }, [isEdit, id])

  // ★ อ่าน agent_id + type จาก URL param (เช่น /sales/new?type=mortgage&agent_id=5)
  useEffect(() => {
    if (!isEdit) {
      const urlAgentId = searchParams.get('agent_id')
      const urlType = searchParams.get('type')
      const updates = {}
      if (urlAgentId) updates.agent_id = urlAgentId
      if (urlType && ['mortgage', 'selling_pledge'].includes(urlType)) updates.loan_type_detail = urlType
      if (Object.keys(updates).length > 0) setForm(prev => ({ ...prev, ...updates }))
    }
  }, [isEdit, searchParams])

  // ★ เมื่อ agent_id เปลี่ยน → หาข้อมูลนายหน้าแสดง
  useEffect(() => {
    if (form.agent_id && agents.length > 0) {
      var found = agents.find(a => String(a.id) === String(form.agent_id))
      setSelectedAgent(found || null)
    } else {
      setSelectedAgent(null)
    }
  }, [form.agent_id, agents])

  // โหลดข้อมูลลูกหนี้ (edit mode)
  useEffect(() => {
    if (!isEdit) return
    setLoading(true)
    fetch(`${API}/debtors/${id}`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json())
      .then(d => {
        if (d.success && d.debtor) {
          const debtor = d.debtor
          const knownTypes = propertyTypes.map(t => t.value)
          const isOtherType = debtor.property_type && !knownTypes.includes(debtor.property_type)
          setForm({
            contact_name: debtor.contact_name || '',
            contact_phone: debtor.contact_phone || '',
            property_type: isOtherType ? 'other' : (debtor.property_type || ''),
            property_type_other: isOtherType ? debtor.property_type : '',
            has_obligation: debtor.has_obligation || 'no',
            obligation_count: debtor.obligation_count || '',
            province: debtor.province || '',
            district: debtor.district || '',
            subdistrict: debtor.subdistrict || '',
            house_no: debtor.house_no || '',
            village_name: debtor.village_name || '',
            additional_details: debtor.additional_details || '',
            location_url: debtor.location_url || '',
            deed_number: debtor.deed_number || '',
            deed_type: debtor.deed_type || '',
            land_area: debtor.land_area || '',
            estimated_value: debtor.estimated_value || '',
            interest_rate: debtor.interest_rate || '',
            desired_amount: debtor.desired_amount || '',
            occupation: debtor.occupation || '',
            monthly_income: debtor.monthly_income || '',
            loan_purpose: debtor.loan_purpose || '',
            marital_status: debtor.marital_status || '',   // ★
            contract_years: debtor.contract_years || '',
            net_desired_amount: debtor.net_desired_amount || '',
            loan_type_detail: debtor.loan_type_detail || '',
            preliminary_terms: debtor.preliminary_terms || '',
            agent_id: debtor.agent_id || '',
            id_card_files: null, deed_files: null, property_files: null, permit_files: null, video_files: null,
          })
          try { setExistingImages(JSON.parse(debtor.images) || []) } catch { setExistingImages([]) }
          try { setExistingDeedImages(JSON.parse(debtor.deed_images) || []) } catch { setExistingDeedImages([]) }

          // ★ แสดงข้อมูลนายหน้าที่ผูกอยู่ (จาก API response)
          if (debtor.agent_id && debtor.agent_name) {
            setSelectedAgent({
              id: debtor.agent_id,
              full_name: debtor.agent_name,
              phone: debtor.agent_phone,
              agent_code: debtor.agent_code,
              nickname: debtor.agent_nickname,
              commission_rate: debtor.commission_rate,
            })
          }

          // เก็บ linked_cases
          if (d.linked_cases) setLinkedCases(d.linked_cases)

          // เก็บข้อมูลประเมิน+อนุมัติ (ไม่จำเป็นต้องมีเคส — ข้อมูลอยู่ใน loan_requests)
          setCaseInfo({
            case_id: debtor.case_id || null,
            status: debtor.case_status || 'new',
            payment_status: debtor.payment_status || 'unpaid',
            credit_table_file: debtor.credit_table_file || null,
            appraisal_book_image: debtor.appraisal_book_image || null,
            appraisal_result: debtor.appraisal_result || null,
            appraisal_type: debtor.appraisal_type || null,
            check_price_value: debtor.check_price_value || null,
            check_price_detail: debtor.check_price_detail || null,
            check_price_recorded_at: debtor.check_price_recorded_at || null,
            outside_result: debtor.outside_result || null,
            outside_reason: debtor.outside_reason || null,
            inside_result: debtor.inside_result || null,
            inside_reason: debtor.inside_reason || null,
            appraisal_note: debtor.appraisal_note || null,
            appraisal_date: debtor.appraisal_date || null,
            approved_credit: debtor.approved_credit || null,
            appraisal_images: debtor.appraisal_images || null,
          })
        }
      })
      .catch(() => { })
      .finally(() => setLoading(false))
  }, [id, isEdit])

  const set = (key, val) => {
    setForm(prev => ({ ...prev, [key]: val }))
    setErrors(prev => ({ ...prev, [key]: '' }))
  }

  const xBtnStyle = {
    background: '#e74c3c', color: '#fff', border: 'none', borderRadius: '50%',
    width: 18, height: 18, fontSize: 9, cursor: 'pointer', display: 'inline-flex',
    alignItems: 'center', justifyContent: 'center', padding: 0, lineHeight: 1,
    verticalAlign: 'middle', marginLeft: 6
  }

  const xBtnOverlay = {
    position: 'absolute', top: 2, right: 2, background: '#e74c3c', color: '#fff',
    border: 'none', borderRadius: '50%', width: 20, height: 20, fontSize: 10,
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 0, lineHeight: 1, zIndex: 2
  }

  const thumbWrap = {
    position: 'relative', display: 'inline-block', width: 80, height: 80,
    borderRadius: 6, overflow: 'hidden', border: '1px solid #ddd'
  }

  const thumbImg = {
    width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer'
  }

  const UPLOAD_BASE = '/uploads'

  const deleteExistingImage = async (field, imagePath) => {
    if (!window.confirm('ต้องการลบรูปนี้หรือไม่?')) return
    try {
      const res = await fetch(`${API}/remove-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ debtor_id: id, field, image_path: imagePath })
      })
      const data = await res.json()
      if (data.success) {
        if (field === 'images') setExistingImages(prev => prev.filter(p => p !== imagePath))
        else if (field === 'deed_images') setExistingDeedImages(prev => prev.filter(p => p !== imagePath))
      } else {
        alert(data.message || 'ลบไม่สำเร็จ')
      }
    } catch {
      alert('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้')
    }
  }

  const updateCaseField = async (field, value) => {
    if (!caseInfo?.case_id) return
    try {
      if (field === 'payment_status') {
        const res = await fetch(`/api/admin/accounting/debtor-master-status/${caseInfo.case_id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
          body: JSON.stringify({ status: value })
        })
        const data = await res.json()
        if (data.success) setCaseInfo(prev => ({ ...prev, payment_status: value }))
        else alert(data.message || 'อัพเดทไม่สำเร็จ')
      } else if (field === 'status') {
        const res = await fetch(`${API}/cases/${caseInfo.case_id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
          body: JSON.stringify({ status: value })
        })
        const data = await res.json()
        if (data.success) setCaseInfo(prev => ({ ...prev, status: value }))
        else alert(data.message || 'อัพเดทไม่สำเร็จ')
      }
    } catch {
      alert('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้')
    }
  }

  const renderExistingThumbs = (paths, field) => {
    if (!paths || paths.length === 0) return null
    return (
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
        {paths.map((p, i) => {
          const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(p)
          const fullUrl = p.startsWith('http') ? p : `${UPLOAD_BASE}/${p.replace(/^\/?uploads\//, '')}`
          return (
            <div key={`${field}-${i}`} style={thumbWrap}>
              {isImage ? (
                <img src={fullUrl} alt="" style={thumbImg} onClick={() => window.open(fullUrl, '_blank')} />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5', cursor: 'pointer', fontSize: 11, color: '#666', textAlign: 'center', padding: 4 }}
                  onClick={() => window.open(fullUrl, '_blank')}>
                  <div><i className="fas fa-file" style={{ fontSize: 20, color: '#999' }}></i><br />{p.split('/').pop().substring(0, 12)}</div>
                </div>
              )}
              <button type="button" style={xBtnOverlay} onClick={() => deleteExistingImage(field, p)} title="ลบรูปนี้">
                <i className="fas fa-times"></i>
              </button>
            </div>
          )
        })}
      </div>
    )
  }

  const validate = () => {
    const err = {}
    if (!form.contact_name.trim()) err.contact_name = 'กรุณากรอกชื่อ-สกุล'
    if (!form.contact_phone.trim()) err.contact_phone = 'กรุณากรอกเบอร์โทร'
    if (form.property_type === 'other' && !form.property_type_other.trim()) err.property_type_other = 'กรุณาระบุลักษณะทรัพย์'
    setErrors(err)
    return Object.keys(err).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    setSubmitting(true)
    try {
      const formData = new FormData()
      formData.append('contact_name', form.contact_name)
      formData.append('contact_phone', form.contact_phone)
      formData.append('property_type', form.property_type === 'other' ? form.property_type_other : form.property_type)
      formData.append('has_obligation', form.has_obligation)
      if (form.obligation_count) formData.append('obligation_count', form.obligation_count)
      if (form.province) formData.append('province', form.province)
      if (form.district) formData.append('district', form.district)
      if (form.subdistrict) formData.append('subdistrict', form.subdistrict)
      if (form.house_no) formData.append('house_no', form.house_no)
      if (form.village_name) formData.append('village_name', form.village_name)
      if (form.additional_details) formData.append('additional_details', form.additional_details)
      if (form.location_url) formData.append('location_url', form.location_url)
      if (form.deed_number) formData.append('deed_number', form.deed_number)
      if (form.deed_type) formData.append('deed_type', form.deed_type)
      if (form.land_area) formData.append('land_area', form.land_area)
      if (form.estimated_value) formData.append('estimated_value', form.estimated_value)
      if (form.interest_rate) formData.append('interest_rate', form.interest_rate)
      if (form.desired_amount) formData.append('desired_amount', form.desired_amount)
      if (form.loan_type_detail) formData.append('loan_type_detail', form.loan_type_detail)
      if (form.occupation) formData.append('occupation', form.occupation)
      if (form.monthly_income) formData.append('monthly_income', form.monthly_income)
      if (form.loan_purpose) formData.append('loan_purpose', form.loan_purpose)
      if (form.marital_status) formData.append('marital_status', form.marital_status)  // ★
      if (form.contract_years) formData.append('contract_years', form.contract_years)
      if (form.net_desired_amount) formData.append('net_desired_amount', form.net_desired_amount)
      if (form.preliminary_terms) formData.append('preliminary_terms', form.preliminary_terms)
      if (form.agent_id) formData.append('agent_id', form.agent_id)

      if (form.id_card_files) { for (const f of form.id_card_files) formData.append('id_card_image', f) }
      if (form.deed_files) { for (const f of form.deed_files) formData.append('deed_image', f) }
      if (form.property_files) { for (const f of form.property_files) formData.append('property_image', f) }
      if (form.permit_files) { for (const f of form.permit_files) formData.append('building_permit', f) }
      if (form.video_files) { for (const f of form.video_files) formData.append('property_video', f) }

      const url = isEdit ? `${API}/debtors/${id}` : `${API}/debtors`
      const method = isEdit ? 'PUT' : 'POST'
      const res = await fetch(url, { method, headers: { Authorization: `Bearer ${token()}` }, body: formData })
      const data = await res.json()
      if (data.success) {
        setSuccess(true)
        setTimeout(() => navigate('/sales'), 1500)
      } else setErrors({ submit: data.message || 'เกิดข้อผิดพลาด' })
    } catch {
      setErrors({ submit: 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้' })
    }
    setSubmitting(false)
  }

  const existingCount = existingImages.length + existingDeedImages.length

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
        <h2 style={{ margin: 0, fontSize: 20 }}>
          <i className="fas fa-user-plus" style={{ color: 'var(--primary)', marginRight: 8 }}></i>
          {isEdit ? 'แก้ไขข้อมูลลูกหนี้' : 'เพิ่มลูกหนี้ใหม่'}
        </h2>
      </div>

      {errors.submit && <div className="error-msg" style={{ marginBottom: 16 }}>{errors.submit}</div>}
      {success && (
        <div className="success-msg" style={{ marginBottom: 16 }}>
          <i className="fas fa-check-circle"></i> {isEdit ? 'อัพเดทข้อมูลสำเร็จ!' : 'บันทึกลูกหนี้สำเร็จ!'} ข้อมูลของ <strong>{form.contact_name}</strong> ถูก{isEdit ? 'อัพเดท' : 'บันทึก'}เรียบร้อยแล้ว กำลังกลับหน้าหลัก...
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>

          {/* ===== ซ้าย: ข้อมูลเจ้าของทรัพย์ ===== */}
          <div>
            <div className="card" style={{ padding: 24, marginBottom: 20 }}>
              <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700 }}>
                <i className="fas fa-user" style={{ color: 'var(--primary)', marginRight: 8 }}></i>
                ข้อมูลเจ้าของทรัพย์
              </h3>

              {/* ===== ประเภทสัญญา — dropdown โดดเด่นที่ต้นฟอร์ม ===== */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontWeight: 700, fontSize: 13, display: 'block', marginBottom: 8 }}>
                  ประเภทสัญญา <span style={{ color: '#e74c3c' }}>*</span>
                </label>
                <div style={{ display: 'flex', gap: 10 }}>
                  {[
                    { value: 'mortgage', label: 'จำนอง', icon: 'fa-home', color: '#1565c0', bg: '#e3f2fd' },
                    { value: 'selling_pledge', label: 'ขายฝาก', icon: 'fa-file-signature', color: '#6a1b9a', bg: '#f3e5f5' },
                    { value: '', label: 'ไม่ระบุ', icon: 'fa-question-circle', color: '#888', bg: '#f5f5f5' },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => set('loan_type_detail', opt.value)}
                      style={{
                        flex: 1, padding: '12px 8px', borderRadius: 10, cursor: 'pointer',
                        border: `2px solid ${form.loan_type_detail === opt.value ? opt.color : '#e0e0e0'}`,
                        background: form.loan_type_detail === opt.value ? opt.bg : '#fff',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                        transition: 'all 0.15s',
                        boxShadow: form.loan_type_detail === opt.value ? `0 2px 8px ${opt.color}30` : 'none',
                      }}
                    >
                      <i className={`fas ${opt.icon}`} style={{ fontSize: 20, color: form.loan_type_detail === opt.value ? opt.color : '#bbb' }}></i>
                      <span style={{ fontSize: 13, fontWeight: form.loan_type_detail === opt.value ? 700 : 500, color: form.loan_type_detail === opt.value ? opt.color : '#888' }}>
                        {opt.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-group">
                  <label>ชื่อ-สกุล *</label>
                  <input type="text" placeholder="เช่น น้าใส อิมตอนทอง" value={form.contact_name} onChange={e => set('contact_name', e.target.value)} />
                  {errors.contact_name && <span style={{ color: '#e74c3c', fontSize: 12 }}>{errors.contact_name}</span>}
                </div>
                <div className="form-group">
                  <label>เบอร์โทร *</label>
                  <input type="tel" placeholder="098-123-1234" value={form.contact_phone} onChange={e => set('contact_phone', e.target.value)} />
                  {errors.contact_phone && <span style={{ color: '#e74c3c', fontSize: 12 }}>{errors.contact_phone}</span>}
                </div>
              </div>

              <div className="form-group">
                <label>รูปหน้าบัตรประชาชน</label>
                <input type="file" accept="image/*,.pdf" onChange={e => set('id_card_files', Array.from(e.target.files))} />
                {form.id_card_files && <small style={{ color: 'var(--primary)', fontSize: 11 }}>เลือก {form.id_card_files.length} ไฟล์ <button type="button" onClick={() => set('id_card_files', null)} style={xBtnStyle}><i className="fas fa-times"></i></button></small>}
                {isEdit && existingImages.filter(p => p.includes('id-cards')).length > 0 && (
                  <div>
                    <small style={{ color: '#888', fontSize: 11 }}><i className="fas fa-image"></i> รูปเดิม ({existingImages.filter(p => p.includes('id-cards')).length} ไฟล์)</small>
                    {renderExistingThumbs(existingImages.filter(p => p.includes('id-cards')), 'images')}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label>ลักษณะทรัพย์ *</label>
                <select value={form.property_type} onChange={e => set('property_type', e.target.value)}>
                  <option value="">-- เลือกลักษณะทรัพย์ --</option>
                  {propertyTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
                {errors.property_type && <span style={{ color: '#e74c3c', fontSize: 12 }}>{errors.property_type}</span>}
              </div>

              {form.property_type === 'other' && (
                <div className="form-group">
                  <label>ระบุลักษณะทรัพย์ *</label>
                  <input type="text" placeholder="ระบุลักษณะทรัพย์..." value={form.property_type_other} onChange={e => set('property_type_other', e.target.value)} />
                  {errors.property_type_other && <span style={{ color: '#e74c3c', fontSize: 12 }}>{errors.property_type_other}</span>}
                </div>
              )}

              <div style={{ marginTop: 16 }}>
                <label style={{ fontWeight: 600, fontSize: 13, display: 'block', marginBottom: 10 }}>ทรัพย์ติดภาระหรือไม่</label>
                <div style={{ display: 'flex', gap: 16 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                    <input type="radio" name="has_obligation" value="no" checked={form.has_obligation === 'no'} onChange={e => set('has_obligation', e.target.value)} /> ไม่ติดภาระ
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                    <input type="radio" name="has_obligation" value="yes" checked={form.has_obligation === 'yes'} onChange={e => set('has_obligation', e.target.value)} /> ติดภาระ
                  </label>
                </div>
              </div>

              {form.has_obligation === 'yes' && (
                <div className="form-group" style={{ marginTop: 12 }}>
                  <label>จำนวนภาระ</label>
                  <input type="number" placeholder="จำนวน" value={form.obligation_count} onChange={e => set('obligation_count', e.target.value)} />
                </div>
              )}

              {/* ===== เลือกนายหน้า + แสดงข้อมูล auto ===== */}
              <div className="form-group" style={{ marginTop: 16 }}>
                <label>เลือกนายหน้า</label>
                <select value={form.agent_id} onChange={e => set('agent_id', e.target.value)}>
                  <option value="">-- เลือกนายหน้า --</option>
                  {agents.map(a => <option key={a.id} value={a.id}>{a.agent_code ? `[${a.agent_code}] ` : ''}{a.full_name} {a.nickname ? `(${a.nickname})` : ''} — {a.phone}</option>)}
                </select>
              </div>

              {/* ★ กล่องแสดงข้อมูลนายหน้าที่เลือก */}
              {selectedAgent && (
                <div style={{ background: '#f0f7ff', border: '1.5px solid #bbdefb', borderRadius: 12, padding: 16, marginTop: 4 }}>
                  {/* Header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <div style={{
                      width: 42, height: 42, borderRadius: '50%', flexShrink: 0,
                      background: 'linear-gradient(135deg, #1565C0, #1976d2)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', fontWeight: 800, fontSize: 16,
                    }}>
                      {(selectedAgent.full_name || 'A')[0].toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, color: '#1565C0', fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {selectedAgent.full_name}
                        {selectedAgent.nickname ? <span style={{ color: '#666', fontWeight: 400, marginLeft: 6 }}>({selectedAgent.nickname})</span> : ''}
                      </div>
                      <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
                        {selectedAgent.agent_code && (
                          <span style={{ padding: '1px 8px', background: '#1565C0', color: '#fff', borderRadius: 10, fontSize: 10, fontWeight: 700, marginRight: 6 }}>{selectedAgent.agent_code}</span>
                        )}
                        {selectedAgent.commission_rate && <span>ค่าคอม {selectedAgent.commission_rate}%</span>}
                      </div>
                    </div>
                  </div>

                  {/* ข้อมูลติดต่อ */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px', fontSize: 13, marginBottom: 12 }}>
                    <div><i className="fas fa-phone" style={{ color: '#1565C0', marginRight: 5, fontSize: 11 }}></i><span style={{ color: '#555' }}>{selectedAgent.phone || '-'}</span></div>
                    <div><i className="fas fa-envelope" style={{ color: '#1565C0', marginRight: 5, fontSize: 11 }}></i><span style={{ color: '#555' }}>{selectedAgent.email || '-'}</span></div>
                    {selectedAgent.line_id && <div><i className="fab fa-line" style={{ color: '#00C300', marginRight: 5, fontSize: 11 }}></i><span style={{ color: '#555' }}>{selectedAgent.line_id}</span></div>}
                    {selectedAgent.bank_name && <div><i className="fas fa-university" style={{ color: '#1565C0', marginRight: 5, fontSize: 11 }}></i><span style={{ color: '#555' }}>{selectedAgent.bank_name}</span></div>}
                    {selectedAgent.bank_account && <div><i className="fas fa-credit-card" style={{ color: '#1565C0', marginRight: 5, fontSize: 11 }}></i><span style={{ color: '#555' }}>{selectedAgent.bank_account}</span></div>}
                    {selectedAgent.bank_account_name && <div><i className="fas fa-user" style={{ color: '#1565C0', marginRight: 5, fontSize: 11 }}></i><span style={{ color: '#555' }}>{selectedAgent.bank_account_name}</span></div>}
                  </div>

                  {/* สถิติ */}
                  <div style={{ display: 'flex', gap: 8, borderTop: '1px solid #dbeafe', paddingTop: 10 }}>
                    {[
                      { label: 'เคสทั้งหมด', value: selectedAgent.total_cases || 0, color: '#1565C0', icon: 'fa-folder' },
                      { label: 'เคสสำเร็จ', value: selectedAgent.completed_cases || 0, color: '#27ae60', icon: 'fa-check-circle' },
                      { label: 'ยอดรวม', value: selectedAgent.total_amount > 0 ? `฿${Number(selectedAgent.total_amount).toLocaleString('th-TH')}` : '-', color: '#e67e22', icon: 'fa-baht-sign' },
                    ].map((s, i) => (
                      <div key={i} style={{ flex: 1, textAlign: 'center', padding: '6px 4px', background: '#fff', borderRadius: 8, border: '1px solid #e3f2fd' }}>
                        <i className={`fas ${s.icon}`} style={{ color: s.color, fontSize: 13, display: 'block', marginBottom: 3 }}></i>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#333' }}>{s.value}</div>
                        <div style={{ fontSize: 10, color: '#888' }}>{s.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ===== สถานะเคส + สถานะชำระ (เฉพาะ edit mode ที่มีเคสแล้ว) ===== */}
              {isEdit && caseInfo && (
                <div style={{ marginTop: 20, padding: 16, background: '#f8faf9', borderRadius: 10, border: '1px solid #d0edd8' }}>
                  <h4 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700, color: 'var(--primary)' }}>
                    <i className="fas fa-tasks" style={{ marginRight: 6 }}></i> สถานะเคส
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div className="form-group">
                      <label>สถานะเคส (ดูอย่างเดียว)</label>
                      <div style={{ padding: '8px 12px', background: '#fff', borderRadius: 8, border: '1px solid #e0e0e0' }}>
                        <span className={`badge ${caseInfo.status === 'completed' ? 'badge-completed' :
                            caseInfo.status === 'cancelled' ? 'badge-cancelled' :
                              caseInfo.status === 'credit_approved' || caseInfo.status === 'appraisal_passed' ? 'badge-paid' :
                                'badge-pending'
                          }`} style={{ fontSize: 13 }}>
                          {statusOptions.find(s => s.value === caseInfo.status)?.label || caseInfo.status || '-'}
                        </span>
                      </div>
                    </div>
                    <div className="form-group">
                      <label>สถานะชำระ</label>
                      <select value={caseInfo.payment_status} onChange={e => updateCaseField('payment_status', e.target.value)}
                        style={{ fontSize: 13 }}>
                        {paymentOptions.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              )}


              {/* ===== ตารางวงเงิน (จากฝ่ายอนุมัติ — อ่านอย่างเดียว) ===== */}
              {isEdit && caseInfo?.credit_table_file && (
                <div style={{ marginTop: 16, padding: 16, background: '#f0f9ff', borderRadius: 10, border: '1px solid #b3d9f7' }}>
                  <h4 style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 700, color: '#1565c0' }}>
                    <i className="fas fa-table" style={{ marginRight: 6 }}></i> ตารางวงเงิน (จากฝ่ายอนุมัติ)
                  </h4>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <i className="fas fa-file-alt" style={{ color: '#1565c0', fontSize: 18 }}></i>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, color: '#888', wordBreak: 'break-all' }}>
                        {caseInfo.credit_table_file.split('/').pop()}
                      </div>
                    </div>
                    <a
                      href={caseInfo.credit_table_file.startsWith('/') ? caseInfo.credit_table_file : `/${caseInfo.credit_table_file}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        padding: '6px 14px', background: '#1565c0', color: '#fff',
                        borderRadius: 6, fontSize: 12, fontWeight: 600,
                        textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0
                      }}
                    >
                      <i className="fas fa-eye"></i> เปิดดูตารางวงเงิน
                    </a>
                  </div>
                </div>
              )}

              {/* ===== รูปทรัพย์จากฝ่ายประเมิน (สำหรับให้ลูกหนี้ดู) ===== */}
              {isEdit && (() => {
                let appraisalImgs = []
                if (caseInfo?.appraisal_images) {
                  try { appraisalImgs = JSON.parse(caseInfo.appraisal_images) || [] } catch { appraisalImgs = [] }
                }
                if (appraisalImgs.length === 0) return null
                return (
                  <div style={{ marginTop: 16, padding: 16, background: '#f3e5f5', borderRadius: 10, border: '1px solid #ce93d8' }}>
                    <h4 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700, color: '#7b1fa2' }}>
                      <i className="fas fa-camera" style={{ marginRight: 6 }}></i> รูปทรัพย์จากฝ่ายประเมิน ({appraisalImgs.length} รูป)
                    </h4>
                    <p style={{ margin: '0 0 10px', fontSize: 12, color: '#666' }}>
                      รูปสถานที่ที่ฝ่ายประเมินลงพื้นที่อัพโหลดมา — ใช้แสดงให้ลูกหนี้ดู
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 10 }}>
                      {appraisalImgs.map((src, i) => {
                        const fullSrc = src.startsWith('/') ? src : `/${src}`
                        const isFilePdf = src.toLowerCase().includes('.pdf')
                        return (
                          <div key={i} style={{ border: '1px solid #ce93d8', borderRadius: 8, overflow: 'hidden', cursor: 'pointer' }}
                            onClick={() => window.open(fullSrc, '_blank')}>
                            {isFilePdf ? (
                              <div style={{ width: '100%', height: 90, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#fff5f5', gap: 4 }}>
                                <i className="fas fa-file-pdf" style={{ fontSize: 28, color: '#e53935' }}></i>
                                <span style={{ fontSize: 9, color: '#e53935', fontWeight: 600 }}>PDF</span>
                              </div>
                            ) : (
                              <img src={fullSrc} alt={`ทรัพย์ ${i + 1}`}
                                style={{ width: '100%', height: 90, objectFit: 'cover' }}
                                onError={e => { e.target.style.display = 'none' }} />
                            )}
                            <div style={{ padding: '4px 6px', fontSize: 10, color: '#7b1fa2', fontWeight: 600, textAlign: 'center' }}>
                              {isFilePdf ? `PDF ${i + 1}` : `รูปที่ ${i + 1}`}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })()}

              {/* ★ แสดงรายการเคสที่เชื่อมอยู่ (edit mode) */}
              {isEdit && linkedCases.length > 0 && (
                <div style={{ marginTop: 16, padding: 14, background: '#fffbf0', borderRadius: 10, border: '1px solid #ffe0b2' }}>
                  <h4 style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 700, color: '#e65100' }}>
                    <i className="fas fa-link" style={{ marginRight: 6 }}></i> เคสที่เชื่อมอยู่ ({linkedCases.length})
                  </h4>
                  {linkedCases.map((c, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderTop: i > 0 ? '1px solid #ffe0b2' : 'none', fontSize: 13 }}>
                      <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{c.case_code}</span>
                      {c.agent_name && <span style={{ color: '#666' }}>| นายหน้า: {c.agent_name}</span>}
                      <span className={`badge ${c.payment_status === 'paid' ? 'badge-paid' : 'badge-unpaid'}`} style={{ fontSize: 10 }}>
                        {c.payment_status === 'paid' ? 'ชำระแล้ว' : 'ยังไม่ชำระ'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ===== ขวา: ข้อมูลทรัพย์ + เอกสาร ===== */}
          <div>
            <div className="card" style={{ padding: 24, marginBottom: 20 }}>
              <h3 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span>
                  <i className="fas fa-map-marker-alt" style={{ color: 'var(--primary)', marginRight: 8 }}></i>
                  ข้อมูลทรัพย์
                </span>
                {ocrFlash && (
                  <span style={{
                    background: 'linear-gradient(135deg, #059669, #10b981)',
                    color: '#fff', fontSize: 11, fontWeight: 700,
                    padding: '3px 10px', borderRadius: 20,
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    boxShadow: '0 2px 8px rgba(5,150,105,0.4)',
                    animation: 'ocrFlashIn 0.3s ease'
                  }}>
                    <i className="fas fa-magic"></i>
                    OCR เติมข้อมูลให้แล้ว ({ocrFlash.length} ช่อง)
                  </span>
                )}
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                <div className="form-group">
                  <label>จังหวัด *</label>
                  <select value={form.province} onChange={e => set('province', e.target.value)}>
                    <option value="">-- เลือก --</option>
                    {provinces.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                  {errors.province && <span style={{ color: '#e74c3c', fontSize: 12 }}>{errors.province}</span>}
                </div>
                <div className="form-group">
                  <label>อำเภอ</label>
                  <input type="text" placeholder="อำเภอ" value={form.district} onChange={e => set('district', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>ตำบล</label>
                  <input type="text" placeholder="ตำบล" value={form.subdistrict} onChange={e => set('subdistrict', e.target.value)} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-group">
                  <label>บ้านเลขที่</label>
                  <input type="text" placeholder="เช่น 123/4" value={form.house_no} onChange={e => set('house_no', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>ชื่อหมู่บ้าน / โครงการ</label>
                  <input type="text" placeholder="เช่น หมู่บ้านสุขสันต์" value={form.village_name} onChange={e => set('village_name', e.target.value)} />
                </div>
              </div>

              <div className="form-group">
                <label>โลเคชั่น</label>
                <input type="url" placeholder="https://maps.app.goo.gl/..." value={form.location_url} onChange={e => set('location_url', e.target.value)} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-group">
                  <label>เลขโฉนด</label>
                  <input type="text" placeholder="กข.12345" value={form.deed_number} onChange={e => set('deed_number', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>พื้นที่</label>
                  <input type="text" placeholder="เช่น 50 ตร.วา / 2 ไร่" value={form.land_area} onChange={e => set('land_area', e.target.value)} />
                </div>
              </div>

              {/* ===== ★ ประเภทเอกสารสิทธิ์ (ตาม SOP) ===== */}
              <div className="form-group">
                <label style={{ fontWeight: 700 }}>
                  ประเภทเอกสารสิทธิ์
                  <span style={{ fontWeight: 400, fontSize: 11, color: '#888', marginLeft: 6 }}>(ตาม SOP: รับเฉพาะโฉนด/น.ส.4)</span>
                </label>
                <select
                  value={form.deed_type}
                  onChange={e => set('deed_type', e.target.value)}
                  style={{ borderColor: isDeedBlacklisted(form.deed_type) ? '#e74c3c' : isDeedOk(form.deed_type) ? '#27ae60' : '#ddd', fontWeight: 600 }}
                >
                  <option value="">-- เลือกประเภทโฉนด --</option>
                  {deedTypes.map(dt => (
                    <option key={dt.value} value={dt.value}>
                      {dt.ok === true ? '✅' : dt.ok === false ? '❌' : '⚠️'} {dt.label}
                    </option>
                  ))}
                </select>
                {isDeedBlacklisted(form.deed_type) && (
                  <div style={{ background: '#fff0f0', border: '1px solid #e74c3c', borderRadius: 8, padding: '10px 14px', marginTop: 8, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <i className="fas fa-ban" style={{ color: '#e74c3c', marginTop: 2 }}></i>
                    <div>
                      <strong style={{ color: '#c0392b', fontSize: 13 }}>ทรัพย์ไม่ผ่านเกณฑ์ตาม SOP</strong>
                      <p style={{ margin: '4px 0 0', fontSize: 12, color: '#c0392b' }}>
                        {form.deed_type === 'spk' && 'ที่ดิน ส.ป.ก. — ไม่รับพิจารณา (ไม่สามารถโอนกรรมสิทธิ์ได้)'}
                        {form.deed_type === 'ns3' && 'น.ส.3 — ไม่รับพิจารณา (ต้องเป็นโฉนด น.ส.4 เท่านั้น)'}
                        {form.deed_type === 'ns3k' && 'น.ส.3ก. — ไม่รับพิจารณา (ต้องเป็นโฉนด น.ส.4 เท่านั้น)'}
                      </p>
                    </div>
                  </div>
                )}
                {isDeedOk(form.deed_type) && (
                  <div style={{ background: '#f0fff4', border: '1px solid #27ae60', borderRadius: 8, padding: '8px 14px', marginTop: 8, fontSize: 12, color: '#2e7d32' }}>
                    <i className="fas fa-check-circle" style={{ marginRight: 6 }}></i>ผ่านเกณฑ์เอกสารสิทธิ์ตาม SOP
                  </div>
                )}
              </div>

              {/* ===== ★ ราคาประเมิน + LTV ===== */}
              <div style={{ background: '#f8f9ff', border: '1px solid #c5cae9', borderRadius: 10, padding: 16, marginTop: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: '#3949ab' }}>
                    <i className="fas fa-calculator" style={{ marginRight: 6 }}></i>คำนวณวงเงิน (LTV)
                  </div>
                  {form.loan_type_detail ? (
                    <span style={{
                      fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
                      background: form.loan_type_detail === 'mortgage' ? '#e3f2fd' : '#f3e5f5',
                      color: form.loan_type_detail === 'mortgage' ? '#1565c0' : '#6a1b9a',
                      border: `1px solid ${form.loan_type_detail === 'mortgage' ? '#1565c0' : '#6a1b9a'}50`,
                    }}>
                      {form.loan_type_detail === 'mortgage' ? 'จำนอง' : 'ขายฝาก'} · LTV {ltvMin}–{ltvMax}%
                    </span>
                  ) : (
                    <span style={{ fontSize: 12, color: '#aaa' }}>ยังไม่เลือกประเภทสัญญา</span>
                  )}
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>ราคาประเมิน (บาท)</label>
                  <input type="number" placeholder="0" value={form.estimated_value}
                    onChange={e => set('estimated_value', e.target.value)} />
                </div>
                {estimatedNum > 0 && (
                  <div style={{ marginTop: 12, padding: '10px 14px', background: '#e8eaf6', borderRadius: 8, fontSize: 13 }}>
                    <i className="fas fa-info-circle" style={{ color: '#3949ab', marginRight: 6 }}></i>
                    <strong>วงเงินที่คาดได้:</strong>{' '}
                    <span style={{ color: '#1a237e', fontWeight: 700 }}>฿{fmt(ltvLow)} – ฿{fmt(ltvHigh)}</span>
                    <span style={{ color: '#666', marginLeft: 6 }}>({ltvMin}–{ltvMax}% ของ ฿{fmt(estimatedNum)})</span>
                  </div>
                )}
              </div>
            </div>

            {/* ===== ★ ข้อมูลประกอบ Fact Finding ===== */}
            <div className="card" style={{ padding: 24, marginBottom: 20 }}>
              <h3 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 700 }}>
                <i className="fas fa-clipboard-list" style={{ color: '#e67e22', marginRight: 8 }}></i>
                ข้อมูลประกอบ (Fact Finding)
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-group">
                  <label>วงเงินที่ต้องการ (บาท)</label>
                  <input type="text" placeholder="เช่น 500,000" value={form.desired_amount} onChange={e => set('desired_amount', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>ดอกเบี้ย (%/เดือน)</label>
                  <input type="text" placeholder="เช่น 1.25" value={form.interest_rate} onChange={e => set('interest_rate', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>ต้องการเหลือถึงมือ (บาท)</label>
                  <input type="text" placeholder="เช่น 450,000" value={form.net_desired_amount} onChange={e => set('net_desired_amount', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>แพลนสัญญา (ปี)</label>
                  <input type="text" placeholder="เช่น 1, 2, 3" value={form.contract_years} onChange={e => set('contract_years', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>อาชีพลูกค้า</label>
                  <input type="text" placeholder="เช่น ค้าขาย, รับจ้าง" value={form.occupation} onChange={e => set('occupation', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>รายได้ต่อเดือน</label>
                  <input type="text" placeholder="เช่น 30,000 บาท" value={form.monthly_income} onChange={e => set('monthly_income', e.target.value)} />
                </div>
              </div>

              <div className="form-group">
                <label>สาเหตุที่ต้องการเงิน / วัตถุประสงค์</label>
                <textarea rows={3} placeholder="เช่น ขยายกิจการ, ชำระหนี้, ค่าใช้จ่ายฉุกเฉิน..."
                  value={form.loan_purpose} onChange={e => set('loan_purpose', e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 13, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }} />
              </div>

              {/* ★ สถานะสมรส + Checklist เอกสาร (ตาม SOP ข้อ 5.2) */}
              <div className="form-group">
                <label style={{ fontWeight: 700 }}>
                  <i className="fas fa-users" style={{ marginRight: 6, color: '#6a1b9a' }}></i>
                  สถานะสมรสของลูกค้า
                  <span style={{ fontSize: 11, color: '#888', fontWeight: 400, marginLeft: 6 }}>(ใช้กำหนด Checklist เอกสาร)</span>
                </label>
                <select
                  value={form.marital_status}
                  onChange={e => set('marital_status', e.target.value)}
                  style={{ borderColor: form.marital_status ? '#6a1b9a' : '#ddd' }}
                >
                  <option value="">-- เลือกสถานะสมรส --</option>
                  <option value="single">โสด</option>
                  <option value="married_reg">สมรสจดทะเบียน</option>
                  <option value="married_unreg">สมรสไม่จดทะเบียน</option>
                  <option value="divorced">หย่า</option>
                  <option value="inherited">รับมรดก (ผ่านมรดก)</option>
                </select>
              </div>

              {/* ★ Checklist เอกสารตามสถานะสมรส */}
              {form.marital_status && MARITAL_CHECKLIST[form.marital_status] && (() => {
                const cl = MARITAL_CHECKLIST[form.marital_status]
                return (
                  <div style={{
                    background: '#f8f4ff', border: `2px solid ${cl.color}40`,
                    borderRadius: 10, padding: 16, marginBottom: 8, marginTop: -4
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                      <div style={{
                        background: cl.color, color: '#fff', borderRadius: 6,
                        padding: '3px 10px', fontSize: 12, fontWeight: 700
                      }}>
                        {cl.option}
                      </div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: cl.color }}>
                        <i className="fas fa-clipboard-check" style={{ marginRight: 6 }}></i>
                        Checklist เอกสาร: {cl.label}
                      </div>
                    </div>
                    <ul style={{ margin: '0', padding: '0 0 0 20px', listStyle: 'none' }}>
                      {cl.items.map((item, idx) => (
                        <li key={idx} style={{
                          padding: '5px 0', fontSize: 13, color: '#333',
                          borderBottom: idx < cl.items.length - 1 ? '1px dashed #ddd' : 'none',
                          display: 'flex', alignItems: 'flex-start', gap: 8
                        }}>
                          <i className="fas fa-check-circle" style={{ color: cl.color, marginTop: 2, flexShrink: 0 }}></i>
                          {item}
                        </li>
                      ))}
                    </ul>
                    <div style={{ marginTop: 10, fontSize: 11, color: '#888', fontStyle: 'italic' }}>
                      <i className="fas fa-info-circle" style={{ marginRight: 4 }}></i>
                      ตาม SOP ฝ่ายขาย ข้อ 5.2 — เอกสารทุกฉบับต้องรับรองสำเนาถูกต้องก่อนส่งฝ่ายอนุมัติ
                    </div>
                  </div>
                )
              })()}

              <div className="form-group">
                <label>รายละเอียดเพิ่มเติม <span style={{ fontSize: 11, color: '#888', fontWeight: 400 }}>(ห้องนอน ห้องน้ำ ชั้น จำนวนห้อง ฯลฯ)</span></label>
                <textarea rows={3} placeholder="เช่น บ้านเดี่ยว 2 ชั้น 3 ห้องนอน 2 ห้องน้ำ สร้างปี 2558..."
                  value={form.additional_details} onChange={e => set('additional_details', e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 13, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }} />
              </div>
            </div>

            <div className="card" style={{ padding: 24, marginBottom: 20 }}>
              <h3 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 700 }}>
                <i className="fas fa-camera" style={{ color: 'var(--primary)', marginRight: 8 }}></i>
                อัพโหลดเอกสาร
              </h3>

              {isEdit && existingCount > 0 && (
                <div style={{ background: '#f0faf5', border: '1px solid #d0edd8', borderRadius: 8, padding: 12, marginBottom: 16 }}>
                  <small style={{ color: 'var(--primary)', fontWeight: 600 }}><i className="fas fa-images"></i> ไฟล์เดิม ({existingCount} ไฟล์) — กดกากบาทเพื่อลบ</small>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-group">
                  <label>รูปโฉนด</label>
                  <input type="file" accept="image/*,.pdf" onChange={e => set('deed_files', Array.from(e.target.files))} />
                  {form.deed_files && <small style={{ color: 'var(--primary)', fontSize: 11 }}>{form.deed_files.length} ไฟล์ <button type="button" onClick={() => set('deed_files', null)} style={xBtnStyle}><i className="fas fa-times"></i></button></small>}
                  {isEdit && renderExistingThumbs(existingDeedImages, 'deed_images')}
                </div>
                <div className="form-group">
                  <label>รูปภาพทรัพย์</label>
                  <input type="file" accept="image/*,.pdf" multiple onChange={e => set('property_files', Array.from(e.target.files))} />
                  {form.property_files && <small style={{ color: 'var(--primary)', fontSize: 11 }}>{form.property_files.length} ไฟล์ <button type="button" onClick={() => set('property_files', null)} style={xBtnStyle}><i className="fas fa-times"></i></button></small>}
                  {isEdit && renderExistingThumbs(existingImages.filter(p => p.includes('properties')), 'images')}
                </div>
                <div className="form-group">
                  <label>ใบอนุญาตสิ่งปลูกสร้าง</label>
                  <input type="file" accept="image/*,.pdf" onChange={e => set('permit_files', Array.from(e.target.files))} />
                  {form.permit_files && <small style={{ color: 'var(--primary)', fontSize: 11 }}>{form.permit_files.length} ไฟล์ <button type="button" onClick={() => set('permit_files', null)} style={xBtnStyle}><i className="fas fa-times"></i></button></small>}
                  {isEdit && renderExistingThumbs(existingImages.filter(p => p.includes('permits') || p.includes('building')), 'images')}
                </div>
                <div className="form-group">
                  <label>วีดีโอทรัพย์</label>
                  <input type="file" accept="video/*" multiple onChange={e => set('video_files', Array.from(e.target.files))} />
                  {form.video_files && <small style={{ color: 'var(--primary)', fontSize: 11 }}>{form.video_files.length} ไฟล์ <button type="button" onClick={() => set('video_files', null)} style={xBtnStyle}><i className="fas fa-times"></i></button></small>}
                  {isEdit && renderExistingThumbs(existingImages.filter(p => p.includes('videos')), 'images')}
                </div>
              </div>
            </div>

            {/* ===== ★ เงื่อนไขเบื้องต้นจากฝ่ายอนุมัติ (Preliminary Terms) ===== */}
            <div className="card" style={{ padding: 24, marginBottom: 20, border: '1px solid #e3f2fd', background: '#f9fdff' }}>
              <h3 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 700, color: '#1565c0' }}>
                <i className="fas fa-file-alt" style={{ marginRight: 8 }}></i>
                เงื่อนไขเบื้องต้น (Preliminary Terms)
              </h3>
              <p style={{ margin: '0 0 12px', fontSize: 12, color: '#666' }}>
                บันทึกเงื่อนไขที่ได้รับจากกลุ่มไลน์ "คัดทรัพย์" เพื่ออ้างอิงและแจ้งลูกค้า
              </p>
              <textarea
                rows={4}
                placeholder="เช่น วงเงินสูงสุด 850,000 บาท อัตราดอกเบี้ย 1.25%/เดือน ขายฝาก 1 ปี..."
                value={form.preliminary_terms}
                onChange={e => set('preliminary_terms', e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #bbdefb', fontSize: 13, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button type="submit" className="btn btn-primary" disabled={submitting} style={{ padding: '12px 32px', flex: 1 }}>
                {submitting ? <><i className="fas fa-spinner fa-spin"></i> กำลังบันทึก...</> : <><i className="fas fa-save"></i> {isEdit ? 'อัพเดทข้อมูล' : 'บันทึกข้อมูล'}</>}
              </button>
              <button type="button" className="btn btn-outline" onClick={() => navigate('/sales')} style={{ padding: '12px 24px' }}>
                ยกเลิก
              </button>
            </div>
          </div>
        </div>
      </form>

      <style>{`
        @keyframes ocrFlashIn {
          from { opacity: 0; transform: scale(0.8) translateY(-4px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  )
}
