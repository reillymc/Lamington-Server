import { type Request } from "express";
import multer, { type FileFilterCallback } from "multer";
import path from "node:path";

const acceptedExtensions = [".jpg", ".jpeg", ".png"];
const acceptedMimeTypes = ["image/jpg", "image/jpeg", "image/png"];

export const imageFilter = (req: Request, file: Express.Multer.File, callback: FileFilterCallback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const validFile = acceptedExtensions.includes(extension) || acceptedMimeTypes.includes(file.mimetype);
    callback(null, validFile);
};

export const uploadImageMiddleware = multer({ storage: multer.memoryStorage(), fileFilter: imageFilter }).single(
    "photo"
);
