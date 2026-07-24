const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    let folder = 'chat_app_uploads';
    let resource_type = 'auto';
    return {
      folder: folder,
      resource_type: resource_type,
      allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'zip', 'mp3', 'wav', 'webm', 'ogg', 'm4a', 'aac', 'mp4'],
    };
  },
});

const upload = multer({ storage: storage });

module.exports = { cloudinary, upload };
