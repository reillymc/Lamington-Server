import db from "../src/database";

beforeEach(done => {
    db.raw("start transaction").then(() => {
        done();
    });
});

afterEach(done => {
    db.raw("rollback").then(() => {
        done();
    });
});
