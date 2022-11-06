import multer from "multer";
import { imageFilter } from "../services";

export const uploadImageMiddleware = multer({ storage: multer.memoryStorage(), fileFilter: imageFilter }).single("photo");
