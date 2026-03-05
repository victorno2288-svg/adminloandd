import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import AdminLogin from './pages/AdminLogin'
import AdminRegister from './pages/AdminRegister'
import AdminLayout from './components/AdminLayout'
import ProtectedRoute from './components/ProtectedRoute'
import DashboardPage from './pages/DashboardPage'
import SalesPage from './pages/SalesPage'
import SalesFormPage from './pages/SalesFormPage'
import CaseEditPage from './pages/CaseEditPage'
import AccountingPage from './pages/AccountingPage'
import DebtorAccountingEditPage from './pages/DebtorAccountingEditPage'
import InvestorAccountingEditPage from './pages/InvestorAccountingEditPage'
import AgentAccountingEditPage from './pages/AgentAccountingEditPage'
import AgentsManagePage from './pages/AgentsManagePage'
import AgentFormPage from './pages/AgentFormPage'
import InvestorPage from './pages/InvestorPage'
import AppraisalPage from './pages/AppraisalPage'
import AppraisalEditPage from './pages/AppraisalEditPage'
import LegalPage from './pages/LegalPage'
import LegalEditPage from './pages/LegalEditPage'
import ApprovalPage from './pages/ApprovalPage'
import ApprovalEditPage from './pages/ApprovalEditPage'
import IssuingPage from './pages/IssuingPage'
import IssuingEditPage from './pages/IssuingEditPage'
import AuctionPage from './pages/AuctionPage'
import AuctionEditPage from './pages/AuctionEditPage'
import SalesTypeSelectPage from './pages/SalesTypeSelectPage'
import InvestorAuctionHistoryPage from './pages/InvestorAuctionHistoryPage'
import WithdrawalHistoryPage from './pages/WithdrawalHistoryPage'
import CancellationPage from './pages/CancellationPage'
import AccountUserPage from './pages/AccountUserPage'
import { getCurrentUser } from './utils/auth'
import { getDefaultPage } from './utils/permissions'
import ChatPage from './pages/ChatPage'
import AISummaryPage from './pages/AISummaryPage'
import ChatNotification from './components/ChatNotification'

// เช็คล็อกอินอย่างเดียว (ไม่เช็คสิทธิ์หน้า)
function RequireLogin({ children }) {
  const token = localStorage.getItem('loandd_admin')
  if (!token) return <Navigate to="/login" />
  return children
}

// Redirect หลังล็อกอิน → ไปหน้า /dashboard
function DefaultRedirect() {
  const user = getCurrentUser()
  const page = getDefaultPage(user?.department)
  return <Navigate to={page} replace />
}

function App() {
  return (
    <BrowserRouter>
      {/* แจ้งเตือนแชท — ทำงานทุกหน้าเมื่อล็อกอินแล้ว */}
      <ChatNotification />

      <Routes>
        <Route path="/login" element={<AdminLogin />} />
        <Route path="/register" element={<AdminRegister />} />

        {/* Protected: ใช้ AdminLayout ครอบทุกหน้า */}
        <Route path="/" element={
          <RequireLogin><AdminLayout /></RequireLogin>
        }>
          {/* Default redirect → /dashboard */}
          <Route index element={<DefaultRedirect />} />
          <Route path="chat" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
          <Route path="ai-summary" element={<ProtectedRoute><AISummaryPage /></ProtectedRoute>} />

          {/* แดชบอร์ด (ทุกฝ่ายเห็น) */}
          <Route path="dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />

          {/* ฝ่ายขาย */}
          <Route path="sales" element={<ProtectedRoute><SalesPage /></ProtectedRoute>} />
          <Route path="sales/new" element={<ProtectedRoute><SalesFormPage /></ProtectedRoute>} />
          <Route path="sales/edit/:id" element={<ProtectedRoute><SalesFormPage /></ProtectedRoute>} />
          <Route path="sales/case/new" element={<ProtectedRoute><CaseEditPage /></ProtectedRoute>} />
          <Route path="sales/case/edit/:id" element={<ProtectedRoute><CaseEditPage /></ProtectedRoute>} />
          <Route path="sales/agent/new" element={<ProtectedRoute><AgentFormPage /></ProtectedRoute>} />
          <Route path="sales/agent/edit/:id" element={<ProtectedRoute><AgentFormPage /></ProtectedRoute>} />
          {/* ฝ่ายบัญชี */}
          <Route path="accounting" element={<ProtectedRoute><AccountingPage /></ProtectedRoute>} />
          <Route path="accounting/debtor/create" element={<ProtectedRoute><DebtorAccountingEditPage /></ProtectedRoute>} />
          <Route path="accounting/debtor/edit/:caseId" element={<ProtectedRoute><DebtorAccountingEditPage /></ProtectedRoute>} />
          <Route path="accounting/investor/create" element={<ProtectedRoute><InvestorAccountingEditPage /></ProtectedRoute>} />
          <Route path="accounting/investor/edit/:investorId" element={<ProtectedRoute><InvestorAccountingEditPage /></ProtectedRoute>} />
          <Route path="accounting/agent/create" element={<ProtectedRoute><AgentAccountingEditPage /></ProtectedRoute>} />
          <Route path="accounting/agent/edit/:agentId" element={<ProtectedRoute><AgentAccountingEditPage /></ProtectedRoute>} />

          {/* ฝ่ายประเมิน */}
          <Route path="appraisal" element={<ProtectedRoute><AppraisalPage /></ProtectedRoute>} />
          <Route path="appraisal/edit/:id" element={<ProtectedRoute><AppraisalEditPage /></ProtectedRoute>} />

          {/* ฝ่ายนิติกรรม */}
          <Route path="legal" element={<ProtectedRoute><LegalPage /></ProtectedRoute>} />
          <Route path="legal/edit/:id" element={<ProtectedRoute><LegalEditPage /></ProtectedRoute>} />

          {/* ฝ่ายอนุมัติวงเงิน */}
          <Route path="approval" element={<ProtectedRoute><ApprovalPage /></ProtectedRoute>} />
          <Route path="approval/edit/:id" element={<ProtectedRoute><ApprovalEditPage /></ProtectedRoute>} />

          {/* ฝ่ายออกสัญญา (แยกจากนิติแล้ว) */}
          <Route path="issuing" element={<ProtectedRoute><IssuingPage /></ProtectedRoute>} />
          <Route path="issuing/edit/:id" element={<ProtectedRoute><IssuingEditPage /></ProtectedRoute>} />

          {/* ฝ่ายประมูลทรัพย์ */}
          <Route path="auction" element={<ProtectedRoute><AuctionPage /></ProtectedRoute>} />
          <Route path="auction/edit/:id" element={<ProtectedRoute><AuctionEditPage /></ProtectedRoute>} />

          {/* เลือกประเภทสินเชื่อก่อนเพิ่มลูกหนี้ */}
          <Route path="sales/select-type" element={<ProtectedRoute><SalesTypeSelectPage /></ProtectedRoute>} />

          {/* นายหน้า */}
          <Route path="agents" element={<ProtectedRoute><AgentsManagePage /></ProtectedRoute>} />

          {/* นายทุน */}
          <Route path="investors" element={<ProtectedRoute><InvestorPage /></ProtectedRoute>} />
          <Route path="investor-auction-history" element={<ProtectedRoute><InvestorAuctionHistoryPage /></ProtectedRoute>} />
          <Route path="withdrawal-history" element={<ProtectedRoute><WithdrawalHistoryPage /></ProtectedRoute>} />

          {/* ยกเลิกเคส */}
          <Route path="cancellation" element={<ProtectedRoute><CancellationPage /></ProtectedRoute>} />

          {/* จัดการแอคเคาท์ (super_admin เท่านั้น) */}
          <Route path="account-user" element={<ProtectedRoute><AccountUserPage /></ProtectedRoute>} />
        </Route>

        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App