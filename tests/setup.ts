require("dotenv").config();

module.exports = async () => {
    if (process.env.DEBUG === "jest") {
        jest.setTimeout(5 * 60 * 1000);
    }
};
