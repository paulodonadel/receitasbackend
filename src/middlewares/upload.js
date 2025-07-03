const multer = require('multer');
const path = require('path');
const fs = require('fs');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Use correct path relative to project root
    const uploadPath = path.join(__dirname, '..', '..', 'uploads', 'profiles');
    console.log('📁 [UPLOAD-MIDDLEWARE] Destination path:', uploadPath);
    
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
      console.log('📁 [UPLOAD-MIDDLEWARE] Created directory:', uploadPath);
    }
    
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${req.user.id}_${Date.now()}${path.extname(file.originalname)}`;
    console.log('📁 [UPLOAD-MIDDLEWARE] Generated filename:', uniqueName);
    cb(null, uniqueName);
  }
});

const fileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|gif|webp/;
  const extname = allowed.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowed.test(file.mimetype);
  
  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Apenas imagens são permitidas! (JPEG, JPG, PNG, GIF, WEBP)'), false);
  }
};

module.exports = multer({
  storage,
  limits: { 
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter
});
