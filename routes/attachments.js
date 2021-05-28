var express = require('express');
var router = express.Router();
var multer = require('multer')
var path = require('path')

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/')
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname))
    }
})

const fileFilter = (req, file, cb) => {
    if (file.mimetype === 'image/jpeg') {
        cb(null, true)
    } else {
        cb(null, true)
    }
}
var upload = multer({ storage: storage })

// upload image
router.post('/upload-image', upload.single('photo'), (req, res) => {
    console.log(req.file)
    res.json(req.file.filename)
})

module.exports = router;