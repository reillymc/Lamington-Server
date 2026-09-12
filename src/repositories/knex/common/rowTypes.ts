import type { Content } from "../../temp.ts";
import type { User } from "../../userRepository.ts";

export type ContentAuthorColumns = {
    createdBy: Content["createdBy"];
    firstName: User["firstName"];
};

export type HeroAttachmentColumns = {
    heroAttachmentId: string | null;
    heroAttachmentUri: string | null;
    heroAttachmentPreview: string | null;
};
