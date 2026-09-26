export type ErrorLocation = "body" | "query" | "params" | "headers";

export interface FieldError {
    path: string[];
    location?: ErrorLocation;
    code: string;
    message: string;
}

export type FieldReference = {
    id: string;
    path: string[];
};
