const cloudinary = require('../../config/cloudinary');
const { sendSuccess, sendError } = require('../../utils/apiResponse');

const uploadImages = async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return sendError(res, 'No images uploaded', 400);
    }
    const images = req.files.map((file) => ({
      url: file.path,
      publicId: file.filename,
      originalName: file.originalname,
    }));
    sendSuccess(res, images, `${images.length} image(s) uploaded successfully`, 201);
  } catch (err) {
    next(err);
  }
};

const uploadVideo = async (req, res, next) => {
  try {
    if (!req.file) return sendError(res, 'No video uploaded', 400);
    const video = {
      url: req.file.path,
      publicId: req.file.filename,
      originalName: req.file.originalname,
    };
    sendSuccess(res, video, 'Video uploaded successfully', 201);
  } catch (err) {
    next(err);
  }
};

const deleteMedia = async (req, res, next) => {
  try {
    const { publicId, resourceType = 'image' } = req.body;
    if (!publicId) return sendError(res, 'publicId is required', 400);
    if (!['image', 'video', 'raw'].includes(resourceType)) {
      return sendError(res, 'Invalid resourceType', 400);
    }
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
    sendSuccess(res, null, 'Media deleted successfully');
  } catch (err) {
    next(err);
  }
};

module.exports = { uploadImages, uploadVideo, deleteMedia };
