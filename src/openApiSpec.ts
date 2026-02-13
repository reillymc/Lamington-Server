import { readFileSync } from "node:fs";
import { parse } from "yaml";

const file = readFileSync("./openapi.yaml", "utf8");
export const openApiSpec = parse(file);
