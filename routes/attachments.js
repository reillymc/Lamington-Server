var express = require('express');
var router = express.Router();
var multer = require('multer')
var path = require('path')
const { v4: uuidv4 } = require('uuid');


const storage = multer.diskStorage({
    destination: function (req, file, callback) {
        callback(null, 'uploads/')
    },
    filename: function (req, file, callback) {
        callback(null, uuidv4() + path.extname(file.originalname))
    }
})

const fileFilter = (req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const mimetype = file.mimetype;
    if (
        extension !== '.jpg' ||
        extension !== '.jpeg' ||
        extension !== '.png' ||
        mimetype !== 'image/png' ||
        mimetype !== 'image/jpg' ||
        mimetype !== 'image/jpeg'
    ) {
        callback(null, false, new Error('Incorrect File Type'))
    }
    callback(null, true)
}
var upload = multer({ storage: storage, fileFilter: fileFilter })

// upload image
router.post('/upload-image', upload.single('photo'), (req, res) => {
    console.log(req.file)
    res.json(req.file.filename)
})

module.exports = router;