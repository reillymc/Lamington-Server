import sharp from "sharp";

export const createImage = () =>
    sharp({
        create: {
            width: 4,
            height: 4,
            channels: 3,
            background: "#ffffff",
        },
    })
        .jpeg()
        .toBuffer();
