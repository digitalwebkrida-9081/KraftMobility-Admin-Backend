const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    // Add unique prefix to original name to prevent overwriting
    cb(
      null,
      Date.now() +
        "-" +
        Math.round(Math.random() * 1e9) +
        path.extname(file.originalname),
    );
  },
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    // Extended filetypes for documents
    const filetypes = /jpeg|jpg|png|gif|pdf|doc|docx/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(
      path.extname(file.originalname).toLowerCase(),
    );

    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(
      new Error(
        "Error: File upload only supports images (JPEG, PNG, GIF) and documents (PDF, DOC, DOCX).",
      ),
    );
  },
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit for documents
});

module.exports = upload;
