export class ForeignKeyViolationError extends Error {
    public originalError: unknown;

    constructor(originalError: unknown) {
        super("Foreign key violation");
        this.name = "ForeignKeyViolationError";
        this.originalError = originalError;
    }
}

export class UniqueViolationError extends Error {
    public originalError: unknown;

    constructor(originalError: unknown) {
        super("Unique constraint violation");
        this.name = "UniqueViolationError";
        this.originalError = originalError;
    }
}
