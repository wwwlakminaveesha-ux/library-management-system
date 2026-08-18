# Northstar Library Management System

A full-stack library management system — React frontend, Node/Express API, MySQL database.
Two roles: **staff** (full catalogue/member/loan management) and **students** (self-registration, browse catalogue, track their own loans and fines).

## Prerequisites

- [Node.js](https://nodejs.org/) (v18+ recommended)
- [XAMPP](https://www.apachefriends.org/) (for MySQL) — or any local MySQL 8.x server
- A terminal (VS Code's integrated terminal works fine)

## 1. Start MySQL

Open the **XAMPP Control Panel** and click **Start** next to MySQL.

If this is the very first time running the project on this machine, the database won't exist yet. Create it by running the SQL below against your MySQL server (e.g. via phpMyAdmin, or the `mysql` CLI at `C:\xampp\mysql\bin\mysql.exe -u root`):

```sql
CREATE DATABASE IF NOT EXISTS librarydb;
CREATE USER IF NOT EXISTS 'libraryuser'@'localhost' IDENTIFIED BY '1234';
GRANT ALL PRIVILEGES ON librarydb.* TO 'libraryuser'@'localhost';
FLUSH PRIVILEGES;

USE librarydb;

CREATE TABLE IF NOT EXISTS users (
  user_id INT NOT NULL AUTO_INCREMENT,
  username VARCHAR(100) NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'staff',
  member_ref_id INT NULL,
  PRIMARY KEY (user_id),
  UNIQUE KEY username_unique (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS books (
  book_id INT NOT NULL AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL,
  author VARCHAR(255) DEFAULT NULL,
  category VARCHAR(150) DEFAULT NULL,
  isbn VARCHAR(50) DEFAULT NULL,
  quantity INT NOT NULL DEFAULT 1,
  PRIMARY KEY (book_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS members (
  id INT NOT NULL AUTO_INCREMENT,
  member_id VARCHAR(50) NOT NULL,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(150) NOT NULL,
  phone VARCHAR(50) DEFAULT NULL,
  address VARCHAR(255) DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY member_id_unique (member_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS borrowings (
  id INT NOT NULL AUTO_INCREMENT,
  book_id INT NOT NULL,
  member_id INT NOT NULL,
  borrow_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  due_date DATE NOT NULL,
  return_date DATETIME DEFAULT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'borrowed',
  fine_amount DECIMAL(8,2) NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY book_idx (book_id),
  KEY member_idx (member_id),
  CONSTRAINT fk_borrowings_book FOREIGN KEY (book_id) REFERENCES books(book_id),
  CONSTRAINT fk_borrowings_member FOREIGN KEY (member_id) REFERENCES members(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Seed a staff login (username: admin / password: admin123)
INSERT INTO users (username, password, role)
SELECT 'admin', 'admin123', 'staff'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'admin');
```

Check `backend/.env` matches whatever DB user/password/database name you used above.

## 2. Start the backend

```bash
cd backend
npm install
node server.js
```

You should see:

```
🚀 Server running at http://localhost:5000
✅ Connected to MySQL LibraryDB successfully!
```

Leave this terminal running. (Optional: use `npx nodemon server.js` instead so it auto-restarts on code changes.)

## 3. Start the frontend

Open a **second** terminal:

```bash
cd frontend
npm install
npm start
```

This compiles the React app and opens `http://localhost:3000` automatically. First compile takes 20–30 seconds.

## 4. Using the app

- Visit `http://localhost:3000` — you'll land on the **Get Started** page.
- **Staff login**: click *Staff sign in*, username `admin`, password `admin123`.
- **Student**: click *Get started as a student* to self-register a new account, or sign in with an existing one.

### Staff can

- Add/edit/delete books, members, and issue/return loans
- View the dashboard (total titles, available titles, copies, active loans, overdue count)
- Browse/filter the full borrow & return history, including per-member history

### Students can

- Browse the book catalogue
- Register their own account (creates a linked library membership automatically)
- View **My loans & history** — due dates, days remaining, overdue status, and any fines owed

## Project structure

```
backend/
  server.js        REST API — all routes (auth, books, members, borrowings, loan policy)
  db.js             MySQL connection (reads config from .env)
  .env              DB_HOST / DB_USER / DB_PASSWORD / DB_NAME / PORT

frontend/
  src/
    App.js          Main app shell — routing between tabs, all staff/student views
    App.css          Design system (colours, shadows, layout) shared across the app
    Login.js         Sign in / student self-registration, staff↔student toggle
    Login.css
    GetStarted.js     Landing page shown before login
    GetStarted.css
```

## Troubleshooting

- **"Could not connect to the library database"** in the UI → the backend isn't running, or MySQL isn't started. Check both terminals.
- **Backend won't connect to MySQL** → check `backend/.env` credentials match what you created in step 1, and that MySQL is actually running (XAMPP Control Panel → MySQL should say "Running").
- **Port already in use** → something else is already running on 3000 or 5000. Close it, or change `PORT` in `backend/.env` (and the `API_URL` constants at the top of `frontend/src/App.js` / `Login.js` if you change the backend port).
