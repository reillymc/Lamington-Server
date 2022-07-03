import path from "path";
import multer, { FileFilterCallback } from "multer";
import express, { Request, Response } from "express";
import sharp from "sharp";
import { v4 as uuidv4 } from "uuid";
import axios from "axios";
import FormData from "form-data";
import config from "../../config";

const router = express.Router();

const acceptedExtensions = [".jpg", ".jpeg", ".png"];
const acceptedMimeTypes = ["image/jpg", "image/jpeg", "image/png"];

const fileFilter = (req: Request, file: Express.Multer.File, callback: FileFilterCallback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const validFile = acceptedExtensions.includes(extension) || acceptedMimeTypes.includes(file.mimetype);
    callback(null, validFile);
};

const upload = multer({ storage: multer.memoryStorage(), fileFilter: fileFilter });

// upload image
router.post("/upload-image", upload.single("photo"), async (req: Request<{}, Express.Multer.File>, res: Response) => {
    if (config.service.imageStorage === "local") {
        const name = uuidv4() + path.extname(req?.file?.originalname ?? ".jpeg");

        await sharp(req.file.buffer)
            .resize({
                width: 1280,
                fit: "cover",
            })
            .jpeg({ progressive: true, force: false, mozjpeg: true, quality: 50 })
            .png({ progressive: true, force: false, compressionLevel: 8, quality: 50 })
            .toFile("uploads/" + name)
            .catch(err => {
                res.send(400);
            });
        return res.json({imageAddress: `lamington:${name}`});
    } else {
        const data = new FormData();
        data.append("image", req.file.buffer.toString("base64"));

        const headers = {
            Authorization: `Client-ID ${config.service.imgurClientId}`,
            ...data.getHeaders(),
        };

        var axiosConfig = {
            method: "post",
            url: "https://api.imgur.com/3/image",
            headers,
            data,
        };

        const image = req.file.buffer.toString("base64");

        try {
            const response = await axios(axiosConfig);

            const { data } = (await response.data) as any;
            console.log(data);

            return res.json({imageAddress: `imgur:${data.id}${path.extname(req?.file?.originalname ?? ".jpeg")}`});
        } catch (e) {
            console.warn(e);
        }
        return res.send(400);
    }
});

export default router;
