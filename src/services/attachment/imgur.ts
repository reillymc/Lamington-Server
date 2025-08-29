import axios from "axios";
import FormData from "form-data";

import config from "../../config.ts";

const upload = async (file: Buffer) => {
    if (!config.attachments.imgurClientId) {
        throw new Error("Imgur client id not defined");
    }

    const formData = new FormData();
    formData.append("image", file.toString("base64"));

    const headers = {
        Authorization: `Client-ID ${config.attachments.imgurClientId}`,
        ...formData.getHeaders(),
    };

    const response = await axios({
        method: "post",
        url: "https://api.imgur.com/3/image",
        headers,
        data: formData,
    });

    if (response.status !== 200) {
        throw new Error("Failed to upload image to Imgur");
    }

    const { data } = (await response.data) as { data: { id: string } };
    return data;
};

export const ImgurAttachment = {
    upload,
};
