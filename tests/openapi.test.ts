import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { parse } from "yaml";

interface OperationObject {
    tags?: string[];
    summary?: string;
    description?: string;
    operationId?: string;
}

interface PathItemObject {
    summary?: string;
    description?: string;
    get?: OperationObject;
    put?: OperationObject;
    post?: OperationObject;
    delete?: OperationObject;
    options?: OperationObject;
    head?: OperationObject;
    patch?: OperationObject;
    trace?: OperationObject;
}

interface PathsObject {
    [path: string]: PathItemObject;
}

interface TagObject {
    name: string;
    description?: string;
}

interface OpenAPIObject {
    openapi: string;
    paths?: PathsObject;
    tags?: TagObject[];
}

const isValidMethod = (
    method: string,
): method is keyof Omit<PathItemObject, "summary" | "description"> => {
    return [
        "get",
        "put",
        "post",
        "delete",
        "options",
        "head",
        "patch",
        "trace",
    ].includes(method);
};

/**
 * This test ensures that for each OpenAPI operation defined in openapi.yaml,
 * there exists a corresponding test case in the appropriate test file under tests/routes/.
 *
 * It reads the OpenAPI specification, extracts the operations grouped by tags,
 * and checks that each operation has a matching describe block in the relevant test file.
 */
describe("OpenAPI Spec", () => {
    const openApiPath = path.join(process.cwd(), "openapi.yaml");
    const openApiContent = fs.readFileSync(openApiPath, "utf-8");
    const doc: OpenAPIObject = parse(openApiContent);

    const operationsByTag: Record<string, string[]> = {};

    if (doc.paths) {
        for (const pathItem of Object.values(doc.paths)) {
            for (const method of Object.keys(
                pathItem,
            ) as (keyof PathItemObject)[]) {
                if (!isValidMethod(method)) {
                    continue;
                }

                const operation = pathItem[method]!;
                if (!Array.isArray(operation.tags)) {
                    continue;
                }

                for (const tag of operation.tags) {
                    if (!operationsByTag[tag]) {
                        operationsByTag[tag] = [];
                    }
                    if (operation.summary) {
                        operationsByTag[tag].push(operation.summary);
                    }
                }
            }
        }
    }

    const tags = doc.tags
        ? doc.tags.map(({ name }) => name)
        : Object.keys(operationsByTag);

    for (const tag of tags) {
        it(`should have tests for ${tag} endpoints`, () => {
            const summaries = operationsByTag[tag];
            if (!summaries || summaries.length === 0) return;

            const testFileName = `${tag.toLowerCase()}.test.ts`;
            const testFilePath = path.join(
                process.cwd(),
                "tests",
                "routes",
                testFileName,
            );

            if (fs.existsSync(testFilePath)) {
                const testFileContent = fs.readFileSync(testFilePath, "utf-8");
                for (const summary of summaries) {
                    if (!testFileContent.includes(`describe("${summary}"`)) {
                        throw new Error(
                            `Missing describe block for "${summary}" in ${testFileName}`,
                        );
                    }
                }
            } else {
                throw new Error(`Test file ${testFileName} does not exist`);
            }
        });
    }
});
