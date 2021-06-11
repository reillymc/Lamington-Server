import express, { Request } from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
const router = express.Router();

interface multerFile {
    buffer: Buffer,
    encoding: string,
    fieldname: string,
    mimetype: string,
    originalname: string,
    size: number;
};

const storage = multer.diskStorage({
    destination: function (req: Request, file: multerFile, callback: any) {
        callback(null, 'uploads/')
    },
    filename: function (req: Request, file: multerFile, callback: any) {
        callback(null, uuidv4() + path.extname(file.originalname))
    }
})

const fileFilter = (req: Request, file: multerFile, callback: any) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const mimetype = file.mimetype;
    if (
        extension === '.jpg' || extension === '.jpeg' || extension === '.png' ||
        mimetype === 'image/png' || mimetype === 'image/jpg' || mimetype === 'image/jpeg'
    ) {
        callback(null, true)
    }
    callback(null, false, new Error('Incorrect File Type'))

}
var upload = multer({ storage: storage, fileFilter: fileFilter })

// upload image
router.post('/upload-image', upload.single('photo'), (req: Request<{}, multerFile>, res: any) => {
    res.json(req.file.filename)
})

export default router