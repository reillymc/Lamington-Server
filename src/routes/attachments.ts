import path from 'path';
import multer, { FileFilterCallback } from 'multer';
import express, { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
const router = express.Router();

const acceptedExtensions = ['.jpg', '.jpeg', '.png']
const acceptedMimeTypes = ['image/jpg', 'image/jpeg', 'image/png']

const storage = multer.diskStorage({
    destination: (req: Request, file: Express.Multer.File, callback) => callback(null, 'uploads/'),
    filename: (req: Request, file: Express.Multer.File, callback) => callback(null, uuidv4() + path.extname(file.originalname))
})

const fileFilter = (req: Request, file: Express.Multer.File, callback: FileFilterCallback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const validFile = (acceptedExtensions.includes(extension) || acceptedMimeTypes.includes(file.mimetype))
    callback(null, validFile)
}

const upload = multer({ storage: storage, fileFilter: fileFilter })

// upload image
router.post('/upload-image', upload.single('photo'), (req: Request<{}, Express.Multer.File>, res: Response) => {
    res.json(req.file.filename)
})

export default router