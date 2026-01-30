import express from "express";
import type { CreateRoute } from "./route.ts";

export const createAssetsRouter: CreateRoute = () =>
    express.Router().use("/assets", express.static("assets"));
