const express = require('express');
const router = express.Router();
const ctrl = require('./dashboard.controller');

router.get('/analytics', ctrl.getAnalytics);
router.get('/bulk-template', ctrl.getBulkUploadTemplate);

module.exports = router;
