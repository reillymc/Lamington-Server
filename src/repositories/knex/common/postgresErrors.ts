export const PostgresErrorCodes = {
    FOREIGN_KEY_VIOLATION: "23503",
} as const;

export const isForeignKeyViolation = (error: unknown): boolean => {
    return (error as { code?: unknown })?.code === PostgresErrorCodes.FOREIGN_KEY_VIOLATION;
};
