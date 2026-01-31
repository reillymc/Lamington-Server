import express from "express";
import type { CreateRouter } from "./route.ts";

export const createHealthRouter: CreateRouter = () =>
    express.Router().get("/", (_req, res) => {
        res.status(204).send();
    });
