import path from 'path';
import multer, { FileFilterCallback } from 'multer';
import express, { Request, Response } from 'express';
import sharp from 'sharp'
import { v4 as uuidv4 } from 'uuid';
const router = express.Router();

const acceptedExtensions = ['.jpg', '.jpeg', '.png']
const acceptedMimeTypes = ['image/jpg', 'image/jpeg', 'image/png']

const fileFilter = (req: Request, file: Express.Multer.File, callback: FileFilterCallback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const validFile = (acceptedExtensions.includes(extension) || acceptedMimeTypes.includes(file.mimetype))
    callback(null, validFile)
}

const upload = multer({ storage: multer.memoryStorage(), fileFilter: fileFilter })

// upload image
router.post('/upload-image', upload.single('photo'), async (req: Request<{}, Express.Multer.File>, res: Response) => {

    const name = uuidv4() + path.extname(req?.file?.originalname ?? '.jpeg')

    await sharp(req.file.buffer)
        .resize({
            width: 1280,
            fit: 'cover'
        })
        .jpeg({ progressive: true, force: false, mozjpeg: true, quality: 50 })
        .png({ progressive: true, force: false, compressionLevel: 8, quality: 50 })
        .toFile('uploads/' + name)
        .catch(err => {
            res.send(400)
        })
    res.json(name)
})

export default router