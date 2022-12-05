import path from "path";
import express from "express";
import { v4 as uuidv4 } from "uuid";

import config from "../config";
import { AppError, storeLocalImage, uploadImageToImgur } from "../services";
import { uploadImageMiddleware } from "../middleware";
import { BaseResponse } from "./spec";

const router = express.Router();

interface UploadResponse {
    imageAddress: string;
}

// upload image
router.post<never, BaseResponse<UploadResponse>>("/upload-image", uploadImageMiddleware, async (req, res, next) => {
    const { file } = req;
    if (!file) {
        return res.status(400).json({ error: true, message: "No file was uploaded." });
    }

    if (config.service.imageStorage === "local") {
        const name = uuidv4() + path.extname(file.originalname ?? ".jpeg");

        try {
            await storeLocalImage(file.buffer);
            return res.json({ error: false, data: { imageAddress: `lamington:${name}` } });
        } catch (e: unknown) {
            next(new AppError({ innerError: e, message: "An error occurred when uploading image" }));
        }
    } else {
        try {
            const uploadResponse = await uploadImageToImgur(file.buffer);
            return res.json({
                error: false,
                data: {
                    imageAddress: `imgur:${uploadResponse.id}${path.extname(req?.file?.originalname ?? ".jpeg")}`,
                },
            });
        } catch (e: unknown) {
            next(new AppError({ innerError: e, message: "An error occurred when uploading image" }));
        }
    }
});

export default router;
