import db from "../src/database";

const tearDown = async () => {
    await db.destroy();
};

export default tearDown;
