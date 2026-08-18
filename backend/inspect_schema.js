const db = require('./db');
const queries = [
    "SHOW DATABASES LIKE 'librarydb'",
    "USE librarydb",
    "SHOW TABLES",
    "SHOW CREATE TABLE books",
    "SHOW CREATE TABLE users",
    "SHOW CREATE TABLE members",
    "SHOW CREATE TABLE borrowings"
];
let i = 0;
function next() {
    if (i >= queries.length) {
        db.end();
        return;
    }
    const q = queries[i++];
    db.query(q, (err, res) => {
        if (err) {
            console.error('ERROR', q, err);
            db.end();
            return;
        }
        console.log('QUERY:', q);
        console.log(JSON.stringify(res, null, 2));
        next();
    });
}
next();
