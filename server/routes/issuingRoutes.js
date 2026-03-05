const express = require('express');
const router = express.Router();
const upload = require('../config/uploadIssuing');
const issuingController = require('../controllers/issuingController');

router.get('/stats', issuingController.getStats);
router.get('/cases', issuingController.getIssuingCases);
router.get('/cases/:caseId', issuingController.getIssuingDetail);

// อัพโหลดเอกสารออกสัญญา
const issuingUpload = upload.fields([
  { name: 'doc_selling_pledge', maxCount: 1 },
  { name: 'doc_mortgage', maxCount: 1 },
]);
router.put('/cases/:caseId', issuingUpload, issuingController.updateIssuing);

router.put('/cases/:caseId/status', issuingController.updateIssuingStatus);

// ลบเอกสาร
router.post('/delete-document', issuingController.deleteDocument);

module.exports = router;
