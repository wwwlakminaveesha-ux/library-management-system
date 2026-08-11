const express = require('express');
const cors = require('cors');
require('dotenv').config();
const db = require('./db'); // Import the database connection

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// ==========================================
// USER AUTHENTICATION ROUTE
// ==========================================

// LOGIN USER
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and Password are required' });
    }

    const sql = 'SELECT user_id, username, role FROM users WHERE username = ? AND password = ?';

    db.query(sql, [username, password], (err, results) => {
        if (err) {
            console.error('Error during login:', err);
            return res.status(500).json({ error: 'Database query failed' });
        }

        if (results.length > 0) {
            res.json({
                success: true,
                message: 'Login successful',
                user: results[0] // Returns { user_id, username, role }
            });
        } else {
            res.status(401).json({
                success: false,
                message: 'Invalid Username or Password!'
            });
        }
    });
});

// ==========================================
// CRUD ROUTES FOR BOOKS
// ==========================================

// 1. GET ALL BOOKS
app.get('/api/books', (req, res) => {
    const sql = 'SELECT * FROM books ORDER BY book_id DESC';

    db.query(sql, (err, results) => {
        if (err) {
            console.error('Error fetching books:', err);
            return res.status(500).json({ error: 'Database query failed' });
        }

        res.json(results);
    });
});

// 2. ADD A NEW BOOK
app.post('/api/books', (req, res) => {
    const { title, author, category, isbn, quantity } = req.body;

    // Validate required fields
    if (!title || !author) {
        return res.status(400).json({
            error: 'Title and Author are required'
        });
    }

    if (quantity !== undefined && (!Number.isInteger(Number(quantity)) || Number(quantity) < 0)) {
        return res.status(400).json({ error: 'Quantity must be a non-negative whole number' });
    }

    const sql = `
        INSERT INTO books (title, author, category, isbn, quantity)
        VALUES (?, ?, ?, ?, ?)
    `;

    db.query(
        sql,
        [title, author, category, isbn, quantity ?? 1],
        (err, result) => {
            if (err) {
                console.error('Error inserting book:', err);
                return res.status(500).json({
                    error: 'Failed to add book'
                });
            }

            res.status(201).json({
                message: 'Book added successfully',
                bookId: result.insertId
            });
        }
    );
});

// 3. UPDATE A BOOK
app.put('/api/books/:id', (req, res) => {
    const bookId = req.params.id;
    const { title, author, category, isbn, quantity } = req.body;

    if (!title || !author || !Number.isInteger(Number(quantity)) || Number(quantity) < 0) {
        return res.status(400).json({ error: 'Title, author, and a non-negative whole quantity are required' });
    }

    const sql = `
        UPDATE books
        SET title = ?, author = ?, category = ?, isbn = ?, quantity = ?
        WHERE book_id = ?
    `;

    db.query(
        sql,
        [title, author, category, isbn, quantity, bookId],
        (err, result) => {
            if (err) {
                console.error('Error updating book:', err);
                return res.status(500).json({
                    error: 'Failed to update book'
                });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    message: 'Book not found'
                });
            }

            res.json({
                message: 'Book updated successfully'
            });
        }
    );
});

// 4. DELETE A BOOK
app.delete('/api/books/:id', (req, res) => {
    const bookId = req.params.id;

    const sql = 'DELETE FROM books WHERE book_id = ?';

    db.query(sql, [bookId], (err, result) => {
        if (err) {
            console.error('Error deleting book:', err);
            return res.status(500).json({
                error: 'Failed to delete book'
            });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: 'Book not found'
            });
        }

        res.json({
            message: 'Book deleted successfully'
        });
    });
});

// ==========================================
// CRUD ROUTES FOR MEMBERS
// ==========================================

// 1. GET ALL MEMBERS
app.get('/api/members', (req, res) => {
    const sql = 'SELECT * FROM members ORDER BY id DESC';

    db.query(sql, (err, results) => {
        if (err) {
            console.error('Error fetching members:', err);
            return res.status(500).json({ error: 'Database query failed' });
        }

        res.json(results);
    });
});

// 2. GET MEMBER BY ID
app.get('/api/members/:id', (req, res) => {
    const memberId = req.params.id;
    const sql = 'SELECT * FROM members WHERE id = ?';

    db.query(sql, [memberId], (err, results) => {
        if (err) {
            console.error('Error fetching member:', err);
            return res.status(500).json({ error: 'Database query failed' });
        }

        if (results.length === 0) {
            return res.status(404).json({ error: 'Member not found' });
        }

        res.json(results[0]);
    });
});

// 3. ADD A NEW MEMBER
app.post('/api/members', (req, res) => {
    const { member_id, name, email, phone, address } = req.body;

    if (!member_id || !name || !email) {
        return res.status(400).json({ error: 'Member ID, name, and email are required' });
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
        return res.status(400).json({ error: 'A valid email address is required' });
    }

    const sql = `
        INSERT INTO members (member_id, name, email, phone, address)
        VALUES (?, ?, ?, ?, ?)
    `;

    db.query(sql, [member_id, name, email, phone || null, address || null], (err, result) => {
        if (err) {
            console.error('Error inserting member:', err);
            if (err.code === 'ER_DUP_ENTRY') {
                return res.status(409).json({ error: 'Member ID must be unique' });
            }
            return res.status(500).json({ error: 'Failed to add member' });
        }

        res.status(201).json({
            message: 'Member added successfully',
            memberId: result.insertId
        });
    });
});

// 4. UPDATE A MEMBER
app.put('/api/members/:id', (req, res) => {
    const memberId = req.params.id;
    const { member_id, name, email, phone, address } = req.body;

    if (!member_id || !name || !email) {
        return res.status(400).json({ error: 'Member ID, name, and email are required' });
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
        return res.status(400).json({ error: 'A valid email address is required' });
    }

    const sql = `
        UPDATE members
        SET member_id = ?, name = ?, email = ?, phone = ?, address = ?
        WHERE id = ?
    `;

    db.query(sql, [member_id, name, email, phone || null, address || null, memberId], (err, result) => {
        if (err) {
            console.error('Error updating member:', err);
            if (err.code === 'ER_DUP_ENTRY') {
                return res.status(409).json({ error: 'Member ID must be unique' });
            }
            return res.status(500).json({ error: 'Failed to update member' });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Member not found' });
        }

        res.json({ message: 'Member updated successfully' });
    });
});

// 5. DELETE A MEMBER
app.delete('/api/members/:id', (req, res) => {
    const memberId = req.params.id;
    const sql = 'DELETE FROM members WHERE id = ?';

    db.query(sql, [memberId], (err, result) => {
        if (err) {
            console.error('Error deleting member:', err);
            return res.status(500).json({ error: 'Failed to delete member' });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Member not found' });
        }

        res.json({ message: 'Member deleted successfully' });
    });
});

// ==========================================
// CRUD ROUTES FOR BORROWINGS
// ==========================================

// 1. GET ALL BORROWINGS
app.get('/api/borrowings', (req, res) => {
    const sql = `
        SELECT
            b.id,
            b.book_id,
            b.member_id,
            b.borrow_date,
            b.due_date,
            b.return_date,
            b.status,
            books.title AS book_title,
            members.name AS member_name,
            members.member_id AS member_code
        FROM borrowings b
        LEFT JOIN books ON b.book_id = books.book_id
        LEFT JOIN members ON b.member_id = members.id
        ORDER BY b.id DESC
    `;

    db.query(sql, (err, results) => {
        if (err) {
            console.error('Error fetching borrowings:', err);
            return res.status(500).json({ error: 'Database query failed' });
        }

        res.json(results);
    });
});

// 2. GET BORROWING BY ID
app.get('/api/borrowings/:id', (req, res) => {
    const borrowingId = req.params.id;
    const sql = `
        SELECT
            b.id,
            b.book_id,
            b.member_id,
            b.borrow_date,
            b.due_date,
            b.return_date,
            b.status,
            books.title AS book_title,
            members.name AS member_name,
            members.member_id AS member_code
        FROM borrowings b
        LEFT JOIN books ON b.book_id = books.book_id
        LEFT JOIN members ON b.member_id = members.id
        WHERE b.id = ?
    `;

    db.query(sql, [borrowingId], (err, results) => {
        if (err) {
            console.error('Error fetching borrowing:', err);
            return res.status(500).json({ error: 'Database query failed' });
        }

        if (results.length === 0) {
            return res.status(404).json({ error: 'Borrowing record not found' });
        }

        res.json(results[0]);
    });
});

// 3. RETURN A BORROWED BOOK
app.put('/api/borrowings/:id', (req, res) => {
    const borrowingId = Number(req.params.id);

    if (Number.isNaN(borrowingId)) {
        return res.status(400).json({ error: 'Invalid borrowing ID' });
    }

    db.beginTransaction((txnErr) => {
        if (txnErr) {
            console.error('Transaction error:', txnErr);
            return res.status(500).json({ error: 'Failed to start database transaction' });
        }

        const selectSql = 'SELECT id, book_id, status FROM borrowings WHERE id = ? FOR UPDATE';
        db.query(selectSql, [borrowingId], (selectErr, selectResults) => {
            if (selectErr) {
                console.error('Error fetching borrowing record:', selectErr);
                return db.rollback(() => res.status(500).json({ error: 'Database query failed' }));
            }

            if (selectResults.length === 0) {
                return db.rollback(() => res.status(404).json({ error: 'Borrowing record not found' }));
            }

            const borrowing = selectResults[0];
            if (borrowing.status !== 'borrowed') {
                return db.rollback(() => res.status(400).json({ error: 'This borrowing has already been returned' }));
            }

            const updateBorrowSql = `
                UPDATE borrowings
                SET status = 'returned', return_date = NOW()
                WHERE id = ?
            `;

            db.query(updateBorrowSql, [borrowingId], (updateErr) => {
                if (updateErr) {
                    console.error('Error updating borrowing status:', updateErr);
                    return db.rollback(() => res.status(500).json({ error: 'Failed to update borrowing record' }));
                }

                const updateBookSql = 'UPDATE books SET quantity = quantity + 1 WHERE book_id = ?';
                db.query(updateBookSql, [borrowing.book_id], (bookErr, bookResult) => {
                    if (bookErr) {
                        console.error('Error updating book quantity:', bookErr);
                        return db.rollback(() => res.status(500).json({ error: 'Failed to update book quantity' }));
                    }

                    if (bookResult.affectedRows === 0) {
                        return db.rollback(() => res.status(404).json({ error: 'Associated book not found' }));
                    }

                    db.commit((commitErr) => {
                        if (commitErr) {
                            console.error('Error committing transaction:', commitErr);
                            return db.rollback(() => res.status(500).json({ error: 'Failed to complete return operation' }));
                        }

                        res.json({
                            message: 'Book returned successfully',
                            borrowingId,
                        });
                    });
                });
            });
        });
    });
});

// 4. CREATE A NEW BORROWING
app.post('/api/borrowings', (req, res) => {
    const { book_id, member_id, due_date } = req.body;

    if (!book_id || !member_id || !due_date) {
        return res.status(400).json({ error: 'Book, member, and due date are required' });
    }

    const dueDate = new Date(due_date);
    if (Number.isNaN(dueDate.getTime())) {
        return res.status(400).json({ error: 'A valid due date is required' });
    }

    db.beginTransaction((txnErr) => {
        if (txnErr) {
            console.error('Transaction error:', txnErr);
            return res.status(500).json({ error: 'Failed to start database transaction' });
        }

        const bookSql = 'SELECT book_id, quantity, title FROM books WHERE book_id = ? FOR UPDATE';
        db.query(bookSql, [book_id], (bookErr, bookResults) => {
            if (bookErr) {
                console.error('Error fetching book for borrowing:', bookErr);
                return db.rollback(() => res.status(500).json({ error: 'Database query failed' }));
            }

            if (bookResults.length === 0) {
                return db.rollback(() => res.status(404).json({ error: 'Book not found' }));
            }

            const book = bookResults[0];
            if (Number(book.quantity) <= 0) {
                return db.rollback(() => res.status(400).json({ error: 'No available copies for this book' }));
            }

            const memberSql = 'SELECT id, member_id, name FROM members WHERE id = ? FOR UPDATE';
            db.query(memberSql, [member_id], (memberErr, memberResults) => {
                if (memberErr) {
                    console.error('Error fetching member for borrowing:', memberErr);
                    return db.rollback(() => res.status(500).json({ error: 'Database query failed' }));
                }

                if (memberResults.length === 0) {
                    return db.rollback(() => res.status(404).json({ error: 'Member not found' }));
                }

                const insertSql = `
                    INSERT INTO borrowings (book_id, member_id, borrow_date, due_date, status)
                    VALUES (?, ?, NOW(), ?, 'borrowed')
                `;

                db.query(insertSql, [book_id, member_id, due_date], (insertErr, insertResult) => {
                    if (insertErr) {
                        console.error('Error inserting borrowing:', insertErr);
                        return db.rollback(() => res.status(500).json({ error: 'Failed to create borrowing record' }));
                    }

                    const updateSql = 'UPDATE books SET quantity = quantity - 1 WHERE book_id = ?';
                    db.query(updateSql, [book_id], (updateErr) => {
                        if (updateErr) {
                            console.error('Error updating book quantity:', updateErr);
                            return db.rollback(() => res.status(500).json({ error: 'Failed to update book quantity' }));
                        }

                        db.commit((commitErr) => {
                            if (commitErr) {
                                console.error('Error committing transaction:', commitErr);
                                return db.rollback(() => res.status(500).json({ error: 'Failed to complete borrowing' }));
                            }

                            res.status(201).json({
                                message: 'Book issued successfully',
                                borrowingId: insertResult.insertId,
                                book: {
                                    id: book.book_id,
                                    title: book.title,
                                },
                                member: {
                                    id: memberResults[0].id,
                                    name: memberResults[0].name,
                                }
                            });
                        });
                    });
                });
            });
        });
    });
});

// Start the server
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
});