import { mkdir, unlink } from "node:fs/promises";
import path from "node:path";
import { EnsureArray } from "@reillymc/es-utils";
import sharp from "sharp";
import { mapInBatches } from "../common/mapInBatches.ts";
import type {
    CreateRequest,
    CreateResponse,
    DeleteRequest,
    DeleteResponse,
    FileRepository,
} from "../fileRepository.ts";

export const createDiskFileRepository = (
    uploadDirectory: string,
    keyPrefix?: string,
): FileRepository => {
    const getLocalPath = (attachmentId: string) =>
        `${uploadDirectory}/${keyPrefix ? `${keyPrefix}/` : ""}${attachmentId}`;

    const createFile = async ({
        file,
        attachmentId,
    }: CreateRequest): Promise<CreateResponse> => {
        const localPath = getLocalPath(attachmentId);

        try {
            await mkdir(path.dirname(localPath), { recursive: true });
            await sharp(file).toFile(localPath);
            return { attachmentId, succeeded: true };
        } catch {
            await unlink(localPath).catch(() => undefined);
            return { attachmentId, succeeded: false };
        }
    };

    const deleteFile = async ({
        attachmentId,
    }: DeleteRequest): Promise<DeleteResponse> => {
        const localPath = getLocalPath(attachmentId);

        try {
            await unlink(localPath);
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
                return { attachmentId, succeeded: false };
            }
        }

        return { attachmentId, succeeded: true };
    };

    return {
        create: (_, request) => mapInBatches(createFile, EnsureArray(request)),
        read: async (_, { attachmentId }) => ({
            attachmentId,
            type: "file",
            path: path.resolve(getLocalPath(attachmentId)),
        }),
        delete: (_, request) => mapInBatches(deleteFile, EnsureArray(request)),
    };
};
