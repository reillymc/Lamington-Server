import axios from "axios";
import sharp from "sharp";
import FormData from "form-data";
import { FileFilterCallback } from "multer";
import { Request } from "express";

import config from "../config";
import path from "path";

const acceptedExtensions = [".jpg", ".jpeg", ".png"];
const acceptedMimeTypes = ["image/jpg", "image/jpeg", "image/png"];

export const imageFilter = (req: Request, file: Express.Multer.File, callback: FileFilterCallback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const validFile = acceptedExtensions.includes(extension) || acceptedMimeTypes.includes(file.mimetype);
    callback(null, validFile);
};

export const storeLocalImage = (file: Buffer) =>
    sharp(file)
        .resize({
            width: 1280,
            fit: "cover",
        })
        .jpeg({ progressive: true, force: false, mozjpeg: true, quality: 50 })
        .png({ progressive: true, force: false, compressionLevel: 8, quality: 50 })
        .toFile("uploads/" + name);

export const uploadImageToImgur = async (file: Buffer) => {
    const formData = new FormData();
    formData.append("image", file.toString("base64"));

    const headers = {
        Authorization: `Client-ID ${config.service.imgurClientId}`,
        ...formData.getHeaders(),
    };

    var axiosConfig = {
        method: "post",
        url: "https://api.imgur.com/3/image",
        headers,
        formData,
    };

    const response = await axios(axiosConfig);

    const { data } = (await response.data) as { data: { id: string } };
    return data;
};
