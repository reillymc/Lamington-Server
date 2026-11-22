import sharp from "sharp";
import { rgbaToThumbHash } from "thumbhash";

export const compressImage = (file: Buffer): Promise<Buffer> =>
    sharp(file)
        .rotate()
        .resize({
            width: 2048,
            height: 2048,
            fit: "inside",
            withoutEnlargement: true,
        })
        .flatten({ background: "#ffffff" })
        .toFormat("jpeg", { mozjpeg: true, quality: 75 })
        .keepIccProfile()
        .toBuffer();

export const computePreviewHash = async (file: Buffer) => {
    const { data, info } = await sharp(file)
        .rotate()
        .resize({
            width: 100,
            height: 100,
            fit: "inside",
            withoutEnlargement: true,
        })
        .flatten({ background: "#ffffff" })
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });

    return Buffer.from(rgbaToThumbHash(info.width, info.height, data)).toString(
        "base64",
    );
};
