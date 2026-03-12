import { it } from "node:test";

export * from "./auth.ts";
export * from "./data.ts";
export * from "./database.ts";
export * from "./recipe.ts";

export type TestCase<TExpected = unknown, TInput = object> =
    | {
          name: string;
          input: TInput;
          expected: TExpected;
      }
    | {
          name: string;
          inputAndExpected: TInput;
      };

export const runTestCases = <TExpected, TInput>(
    testCases: TestCase<TExpected, TInput>[],
    testFn: (input: TInput, expected: TExpected) => Promise<void> | void,
) => {
    testCases.forEach(({ name, ...rest }) => {
        const { input, expected } =
            "input" in rest
                ? (rest as { input: TInput; expected: TExpected })
                : {
                      input: rest.inputAndExpected as unknown as TInput,
                      expected: rest.inputAndExpected as unknown as TExpected,
                  };

        it(name, async () => {
            await testFn(input, expected);
        });
    });
};
