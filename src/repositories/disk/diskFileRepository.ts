import { existsSync } from "node:fs";
import { mkdir, unlink } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import type { FileRepository } from "../fileRepository.ts";

const getLocalPath = (uploadDirectory: string, filePath: string) =>
    `${uploadDirectory}/${filePath}`;

export const createDiskFileRepository = (
    uploadDirectory: string,
    subPath: string,
): FileRepository => ({
    delete: async (_, { path }) => {
        const localPath = getLocalPath(uploadDirectory, path);

        if (existsSync(localPath)) await unlink(localPath);
        return true;
    },
    create: async (_, { file, attachmentId, userId }) => {
        const filePath = `${subPath}/${userId}/${attachmentId}`;

        const localPath = getLocalPath(uploadDirectory, filePath);
        const localDir = path.dirname(localPath);

        if (!existsSync(localDir)) await mkdir(localDir, { recursive: true });

        await sharp(file).toFile(localPath);

        return `local:${filePath}`;
    },
});
