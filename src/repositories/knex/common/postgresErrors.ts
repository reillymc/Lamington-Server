export const PostgresErrorCodes = {
    FOREIGN_KEY_VIOLATION: "23503",
    UNIQUE_VIOLATION: "23505",
} as const;

export const isForeignKeyViolation = (error: unknown): boolean => {
    return (
        (error as { code?: unknown })?.code ===
        PostgresErrorCodes.FOREIGN_KEY_VIOLATION
    );
};

export const isUniqueViolation = (error: unknown): boolean => {
    return (
        (error as { code?: unknown })?.code ===
        PostgresErrorCodes.UNIQUE_VIOLATION
    );
};
