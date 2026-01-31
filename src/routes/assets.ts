import express from "express";
import type { CreateRouter } from "./route.ts";

export const createAssetsRouter: CreateRouter = () =>
    express.Router().use("/assets", express.static("assets"));
