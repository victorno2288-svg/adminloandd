const express = require('express')
const router = express.Router()
const upload = require('../config/upload')
const auctionController = require('../controllers/auctionController')

// Multer: รับไฟล์เอกสารประมูลทั้ง 9 ประเภท
const auctionDocsUpload = upload.fields([
  { name: 'house_reg_book',          maxCount: 5 },
  { name: 'house_reg_book_legal',    maxCount: 5 },
  { name: 'name_change_doc',         maxCount: 5 },
  { name: 'divorce_doc',             maxCount: 5 },
  { name: 'spouse_consent_doc',      maxCount: 5 },
  { name: 'spouse_id_card',          maxCount: 5 },
  { name: 'spouse_reg_copy',         maxCount: 5 },
  { name: 'marriage_cert',           maxCount: 5 },
  { name: 'spouse_name_change_doc',  maxCount: 5 },
])

router.get('/stats', auctionController.getStats)
router.get('/cases', auctionController.getAuctionCases)
router.get('/cases/:caseId', auctionController.getAuctionDetail)
router.put('/cases/:caseId', auctionController.updateAuction)

// เอกสารประมูล
router.post('/cases/:caseId/docs', auctionDocsUpload, auctionController.uploadAuctionDoc)
router.post('/cases/:caseId/docs/remove', auctionController.removeAuctionDoc)

// ประวัติการเสนอราคา
router.get('/cases/:caseId/bids', auctionController.getAuctionBids)
router.post('/cases/:caseId/bids', auctionController.createAuctionBid)
router.delete('/bids/:bidId', auctionController.deleteAuctionBid)

module.exports = router
