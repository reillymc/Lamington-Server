export class ForeignKeyViolationError extends Error {
    public originalError: unknown;

    constructor(originalError: unknown) {
        super("Foreign key violation");
        this.name = "ForeignKeyViolationError";
        this.originalError = originalError;
    }
}
