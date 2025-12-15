export type AttachmentService = {
    put: (file: Buffer, path: string) => Promise<boolean>;
    delete: (path: string) => Promise<boolean>;
};
