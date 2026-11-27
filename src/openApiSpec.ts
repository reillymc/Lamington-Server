import { readFileSync } from "node:fs";
import { parse } from "yaml";

const file = readFileSync("./specs/lamington/openapi.yaml", "utf8");
export const openApiSpec = parse(file);
