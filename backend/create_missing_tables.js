const db = require('./db');
const stmts = [
    `CREATE TABLE IF NOT EXISTS members (
    id INT NOT NULL AUTO_INCREMENT,
    member_id VARCHAR(50) NOT NULL,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL,
    phone VARCHAR(50) DEFAULT NULL,
    address VARCHAR(255) DEFAULT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY member_id_unique (member_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`,
    `CREATE TABLE IF NOT EXISTS borrowings (
    id INT NOT NULL AUTO_INCREMENT,
    book_id INT NOT NULL,
    member_id INT NOT NULL,
    borrow_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    due_date DATE NOT NULL,
    return_date DATETIME DEFAULT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'borrowed',
    PRIMARY KEY (id),
    KEY book_idx (book_id),
    KEY member_idx (member_id),
    CONSTRAINT fk_borrowings_book FOREIGN KEY (book_id) REFERENCES books(book_id),
    CONSTRAINT fk_borrowings_member FOREIGN KEY (member_id) REFERENCES members(id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`
];
let i = 0;
function next() {
    if (i >= stmts.length) {
        db.end();
        return;
    }
    const sql = stmts[i++];
    db.query(sql, (err, res) => {
        if (err) {
            console.error('ERROR', err.message);
            db.end();
            return;
        }
        console.log('EXECUTED:', sql.split(' ')[0], 'statement');
        next();
    });
}
next();
