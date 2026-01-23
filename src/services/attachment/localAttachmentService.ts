import { existsSync } from "node:fs";
import { mkdir, unlink } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

import { uploadDirectory } from "../../routes/spec/index.ts";
import type { AttachmentService } from "./attachmentService.ts";

const getLocalPath = (filePath: string) => `${uploadDirectory}/${filePath}`;

const storeLocal = async (file: Buffer, filePath: string) => {
    const localPath = getLocalPath(filePath);
    const localDir = path.dirname(localPath);

    if (!existsSync(localDir)) await mkdir(localDir, { recursive: true });

    await sharp(file).toFile(localPath);
    return true;
};

const deleteLocal = async (filePath: string) => {
    const localPath = getLocalPath(filePath);

    if (existsSync(localPath)) await unlink(localPath);
    return true;
};

export const LocalAttachmentService: AttachmentService = {
    delete: deleteLocal,
    put: storeLocal,
};
