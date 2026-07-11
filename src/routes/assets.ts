import express from "express";
import type { CreateRouter } from "./route.ts";

export type AssetsRouterConfig = {
    assetDirectory: string;
};

export const createAssetsRouter: CreateRouter<
    never,
    never,
    AssetsRouterConfig
> = ({ assetDirectory }) =>
    express.Router().use("/assets", express.static(assetDirectory));
