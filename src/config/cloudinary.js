const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

const hasCloudinary =
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET;

let upload;

if (hasCloudinary) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  const storage = new CloudinaryStorage({
    cloudinary,
    params: {
      folder: 'adelcio-pinturas',
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
      transformation: [{ width: 1200, height: 1200, crop: 'limit', quality: 'auto' }],
    },
  });

  upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 },
  });

  console.log('☁️  Cloudinary storage configurado.');
} else {
  // Fallback: armazena em memória (fotos não persistidas, mas o orçamento salva)
  upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
  });

  console.warn('⚠️  Cloudinary não configurado. Usando memória local (fotos não serão salvas).');
}

module.exports = { cloudinary, upload };
