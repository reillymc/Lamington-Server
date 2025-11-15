import { attachment } from "../../src/database/definitions/attachment.ts";
import db, { lamington, type Conn } from "../../src/database/index.ts";

export const readAllAttachments = (conn: Conn) => conn(lamington.attachment).select(attachment.attachmentId);
