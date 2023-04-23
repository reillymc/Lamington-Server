import fs from "fs";
import sharp from "sharp";
import path from "path";

import { uploadDirectory } from "../../routes/spec";

import { imagePath, unsavedImagePath } from "./helper";

const getLocalPath = (filePath: string) => `${uploadDirectory}/${filePath}`;

const moveLocal = (userId: string, entity: string, entityId: string, version: number) => {
    const oldPath = getLocalPath(unsavedImagePath(userId, entity));
    const newPath = imagePath(userId, entity, entityId, version);

    if (fs.existsSync(oldPath)) fs.renameSync(oldPath, getLocalPath(newPath));
    deleteLocal(imagePath(userId, entity, entityId, version - 1));

    return newPath;
};

const storeLocal = (file: Buffer, filePath: string) => {
    const localPath = getLocalPath(filePath);
    const localDir = path.dirname(localPath);

    if (!fs.existsSync(localDir)) fs.mkdirSync(localDir, { recursive: true });

    return sharp(file).toFile(localPath);
};

const deleteLocal = (filePath: string) => {
    const localPath = getLocalPath(filePath);

    if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
};

export const LocalAttachment = {
    delete: deleteLocal,
    move: moveLocal,
    upload: storeLocal,
};
