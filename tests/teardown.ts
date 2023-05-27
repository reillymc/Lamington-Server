import db from "../src/database/config";

const tearDown = async () => {
    await db.destroy();
};

export default tearDown;
