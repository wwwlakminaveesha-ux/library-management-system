const express = require('express');
const cors = require('cors');
require('dotenv').config();
const db = require('./db'); // Import the database connection

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// ==========================================
// LOAN POLICY
// ==========================================
// Standard loan period given to every borrowing, and the daily fine
// charged for each day a book stays out past its due date.
const LOAN_PERIOD_DAYS = 14;
const MAX_LOAN_PERIOD_DAYS = 30;
const FINE_PER_DAY = 20; // currency units per overdue day

const addDays = (date, days) => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
};

const toDateOnly = (date) => new Date(new Date(date).toDateString());

// Formats a Date using its local Y-M-D components (never toISOString, which
// converts to UTC first and silently shifts the date for positive-offset zones).
const formatLocalDate = (date) => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const daysBetween = (from, to) => Math.round((toDateOnly(to) - toDateOnly(from)) / (1000 * 60 * 60 * 24));

// Attaches the live loan-status fields (days remaining/overdue, fine owed)
// to a borrowing row without requiring the database to store derived state.
const withLoanStatus = (record) => {
    const today = toDateOnly(new Date());
    const dueDate = toDateOnly(record.due_date);
    const referenceDate = record.status === 'returned' && record.return_date
        ? toDateOnly(record.return_date)
        : today;

    const overdueDays = record.status === 'borrowed'
        ? Math.max(0, daysBetween(dueDate, today))
        : Math.max(0, daysBetween(dueDate, referenceDate));

    const isOverdue = record.status === 'borrowed' && overdueDays > 0;
    const daysRemaining = record.status === 'borrowed' ? daysBetween(today, dueDate) : null;
    const currentFine = record.status === 'returned'
        ? Number(record.fine_amount || 0)
        : overdueDays * FINE_PER_DAY;

    return {
        ...record,
        isOverdue,
        daysRemaining,
        overdueDays,
        fine: currentFine,
    };
};

// GET THE ACTIVE LOAN POLICY (used by the frontend to explain due dates/fines)
app.get('/api/loan-policy', (req, res) => {
    res.json({
        loanPeriodDays: LOAN_PERIOD_DAYS,
        maxLoanPeriodDays: MAX_LOAN_PERIOD_DAYS,
        finePerDay: FINE_PER_DAY,
    });
});

// ==========================================
// USER AUTHENTICATION ROUTES
// ==========================================

// LOGIN USER
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and Password are required' });
    }

    const sql = `
        SELECT u.user_id, u.username, u.role, u.member_ref_id,
               m.member_id AS member_code, m.name AS member_name
        FROM users u
        LEFT JOIN members m ON u.member_ref_id = m.id
        WHERE u.username = ? AND u.password = ?
    `;

    db.query(sql, [username, password], (err, results) => {
        if (err) {
            console.error('Error during login:', err);
            return res.status(500).json({ error: 'Database query failed' });
        }

        if (results.length > 0) {
            res.json({
                success: true,
                message: 'Login successful',
                user: results[0]
            });
        } else {
            res.status(401).json({
                success: false,
                message: 'Invalid Username or Password!'
            });
        }
    });
});

// REGISTER A NEW STUDENT ACCOUNT
app.post('/api/register', (req, res) => {
    const { username, password, name, email, phone } = req.body;

    if (!username || !password || !name || !email) {
        return res.status(400).json({ error: 'Username, password, name, and email are required' });
    }

    if (password.length < 4) {
        return res.status(400).json({ error: 'Password must be at least 4 characters' });
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
        return res.status(400).json({ error: 'A valid email address is required' });
    }

    db.beginTransaction((txnErr) => {
        if (txnErr) {
            console.error('Transaction error:', txnErr);
            return res.status(500).json({ error: 'Failed to start database transaction' });
        }

        const memberCode = `STU-${Date.now().toString().slice(-8)}`;
        const insertMemberSql = `
            INSERT INTO members (member_id, name, email, phone)
            VALUES (?, ?, ?, ?)
        `;

        db.query(insertMemberSql, [memberCode, name, email, phone || null], (memberErr, memberResult) => {
            if (memberErr) {
                console.error('Error creating member profile:', memberErr);
                if (memberErr.code === 'ER_DUP_ENTRY') {
                    return db.rollback(() => res.status(409).json({ error: 'An account with this email already exists' }));
                }
                return db.rollback(() => res.status(500).json({ error: 'Failed to create member profile' }));
            }

            const insertUserSql = `
                INSERT INTO users (username, password, role, member_ref_id)
                VALUES (?, ?, 'student', ?)
            `;

            db.query(insertUserSql, [username, password, memberResult.insertId], (userErr, userResult) => {
                if (userErr) {
                    console.error('Error creating user account:', userErr);
                    if (userErr.code === 'ER_DUP_ENTRY') {
                        return db.rollback(() => res.status(409).json({ error: 'That username is already taken' }));
                    }
                    return db.rollback(() => res.status(500).json({ error: 'Failed to create account' }));
                }

                db.commit((commitErr) => {
                    if (commitErr) {
                        console.error('Error committing registration:', commitErr);
                        return db.rollback(() => res.status(500).json({ error: 'Failed to complete registration' }));
                    }

                    res.status(201).json({
                        success: true,
                        message: 'Account created successfully',
                        user: {
                            user_id: userResult.insertId,
                            username,
                            role: 'student',
                            member_ref_id: memberResult.insertId,
                            member_code: memberCode,
                            member_name: name,
                        }
                    });
                });
            });
        });
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

// 1. GET ALL BORROWINGS (optionally filtered to one member via ?memberRefId=)
app.get('/api/borrowings', (req, res) => {
    const { memberRefId } = req.query;
    const params = [];
    let sql = `
        SELECT
            b.id,
            b.book_id,
            b.member_id,
            b.borrow_date,
            b.due_date,
            b.return_date,
            b.status,
            b.fine_amount,
            books.title AS book_title,
            books.author AS book_author,
            members.name AS member_name,
            members.member_id AS member_code
        FROM borrowings b
        LEFT JOIN books ON b.book_id = books.book_id
        LEFT JOIN members ON b.member_id = members.id
    `;

    if (memberRefId) {
        sql += ' WHERE b.member_id = ?';
        params.push(memberRefId);
    }

    sql += ' ORDER BY b.id DESC';

    db.query(sql, params, (err, results) => {
        if (err) {
            console.error('Error fetching borrowings:', err);
            return res.status(500).json({ error: 'Database query failed' });
        }

        res.json(results.map(withLoanStatus));
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

        res.json(withLoanStatus(results[0]));
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

        const selectSql = 'SELECT id, book_id, status, due_date FROM borrowings WHERE id = ? FOR UPDATE';
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

            const overdueDays = Math.max(0, daysBetween(borrowing.due_date, new Date()));
            const finalFine = overdueDays * FINE_PER_DAY;

            const updateBorrowSql = `
                UPDATE borrowings
                SET status = 'returned', return_date = NOW(), fine_amount = ?
                WHERE id = ?
            `;

            db.query(updateBorrowSql, [finalFine, borrowingId], (updateErr) => {
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
                            message: finalFine > 0
                                ? `Book returned successfully. Overdue fine: ${finalFine}`
                                : 'Book returned successfully',
                            borrowingId,
                            fine: finalFine,
                        });
                    });
                });
            });
        });
    });
});

// 4. CREATE A NEW BORROWING
app.post('/api/borrowings', (req, res) => {
    const { book_id, member_id } = req.body;
    // A due date is optional from the client — the standard loan period applies
    // automatically. If the caller does supply one, it must fall within policy.
    const borrowDate = new Date();
    const requestedDueDate = req.body.due_date ? new Date(req.body.due_date) : addDays(borrowDate, LOAN_PERIOD_DAYS);

    if (!book_id || !member_id) {
        return res.status(400).json({ error: 'Book and member are required' });
    }

    if (Number.isNaN(requestedDueDate.getTime())) {
        return res.status(400).json({ error: 'A valid due date is required' });
    }

    const earliestAllowed = toDateOnly(borrowDate);
    const latestAllowed = addDays(borrowDate, MAX_LOAN_PERIOD_DAYS);
    if (toDateOnly(requestedDueDate) < earliestAllowed || toDateOnly(requestedDueDate) > toDateOnly(latestAllowed)) {
        return res.status(400).json({
            error: `Due date must be between today and ${MAX_LOAN_PERIOD_DAYS} days from now`
        });
    }

    const dueDate = requestedDueDate;

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

                db.query(insertSql, [book_id, member_id, dueDate], (insertErr, insertResult) => {
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
                                due_date: formatLocalDate(dueDate),
                                loanPeriodDays: daysBetween(borrowDate, dueDate),
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