const express = require('express');
const router = express.Router();
const { uploadImages: imgMiddleware, uploadVideo: vidMiddleware } = require('../../middlewares/upload');
const ctrl = require('./upload.controller');

router.post('/images', imgMiddleware.array('images', 10), ctrl.uploadImages);
router.post('/video', vidMiddleware.single('video'), ctrl.uploadVideo);
router.delete('/media', ctrl.deleteMedia);

module.exports = router;
