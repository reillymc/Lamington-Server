import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

import { uploadDirectory } from "../../routes/spec/index.ts";

const getLocalPath = (filePath: string) => `${uploadDirectory}/${filePath}`;

const storeLocal = async (file: Buffer, filePath: string) => {
    const localPath = getLocalPath(filePath);
    const localDir = path.dirname(localPath);

    if (!fs.existsSync(localDir)) fs.mkdirSync(localDir, { recursive: true });

    await sharp(file).toFile(localPath);
    return true;
};

const deleteLocal = (filePath: string) => {
    const localPath = getLocalPath(filePath);

    if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
};

export const LocalAttachment = {
    delete: deleteLocal,
    upload: storeLocal,
};
