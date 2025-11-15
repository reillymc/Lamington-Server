import { AttachmentActions } from "./controllers/attachment.ts";
import type { Conn } from "./database/index.ts";
import db from "./database/index.ts";
import { LocalAttachmentService, type AttachmentService } from "./services/attachment/index.ts";

export type AppDependencies = {
    attachmentService: AttachmentService;
    attachmentActions: AttachmentActions;
    conn: Conn;
};

export const DefaultAppDependencies: AppDependencies = {
    attachmentService: LocalAttachmentService,
    attachmentActions: AttachmentActions,
    conn: db,
};
