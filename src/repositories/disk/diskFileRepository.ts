import { existsSync } from "node:fs";
import { mkdir, unlink } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import config from "../../config.ts";
import type { FileRepository } from "../fileRepository.ts";

const getLocalPath = (filePath: string) =>
    `${config.attachments.localUploadDirectory}/${filePath}`;

export const DiskFileRepository: FileRepository = {
    delete: async (_, { path }) => {
        const localPath = getLocalPath(path);

        if (existsSync(localPath)) await unlink(localPath);
        return true;
    },
    create: async (_, { file, path: filePath }) => {
        const localPath = getLocalPath(filePath);
        const localDir = path.dirname(localPath);

        if (!existsSync(localDir)) await mkdir(localDir, { recursive: true });

        await sharp(file).toFile(localPath);
        return true;
    },
};
