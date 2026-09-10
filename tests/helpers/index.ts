import { withCxIt } from "./setup.ts";

export * from "./auth.ts";
export * from "./data.ts";
export * from "./database.ts";
export * from "./recipe.ts";

export type TestCase<TExpected = unknown, TInput = object, TUpdate = object> = {
    name: string;
    input: TInput;
    update?: TUpdate;
    expected: TExpected;
};

export const runTestCases = <TExpected, TInput, TUpdate>(
    testCases: TestCase<TExpected, TInput, TUpdate>[],
    testFn: (p: {
        input: TInput;
        update?: TUpdate;
        expected: TExpected;
    }) => Promise<void> | void,
) =>
    testCases.forEach(({ name, ...rest }) => {
        withCxIt(name, () => testFn(rest));
    });
