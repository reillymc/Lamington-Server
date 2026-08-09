import {
    AttachmentTable,
    lamington,
} from "../../src/repositories/knex/spec/index.ts";
import { getCurrentDatabase } from "./setup.ts";

export const readAllAttachments = () =>
    getCurrentDatabase()(lamington.attachment).select(
        AttachmentTable.attachmentId,
    );
