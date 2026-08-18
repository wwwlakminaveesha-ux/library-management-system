// src/StudentView.jsx
import React from 'react';

function StudentView({ user, books, onLogout }) {
    return (
        <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'sans-serif' }}>
            {/* Sidebar */}
            <aside style={{ width: '260px', backgroundColor: '#1e2522', color: '#fff', padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                    <h2 style={{ fontSize: '20px', marginBottom: '30px' }}>Northstar Library</h2>
                    <nav>
                        <ul style={{ listStyle: 'none', padding: 0 }}>
                            <li style={{ padding: '10px 0', fontWeight: 'bold' }}>📋 Overview</li>
                            <li style={{ padding: '10px 0', opacity: 0.8 }}>📚 Book Catalogue</li>
                        </ul>
                    </nav>
                </div>

                <div style={{ borderTop: '1px solid #333', paddingTop: '15px' }}>
                    <p style={{ fontSize: '14px', margin: '0 0 10px 0' }}>
                        ● Logged in as: <strong>{user?.username} ({user?.role})</strong>
                    </p>
                    <button
                        onClick={onLogout}
                        style={{ backgroundColor: '#e64a19', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer' }}
                    >
                        Logout
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <main style={{ flex: 1, backgroundColor: '#f9faf9', padding: '40px' }}>
                <header style={{ marginBottom: '30px' }}>
                    <small style={{ color: '#666', letterSpacing: '1px' }}>LIBRARY OPERATIONS / 2026</small>
                    <h1 style={{ margin: '5px 0 0 0', color: '#222' }}>Good day, {user?.username}!</h1>
                </header>

                {/* Quick Stats */}
                <div style={{ display: 'flex', gap: '20px', marginBottom: '40px' }}>
                    <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #eee', flex: 1 }}>
                        <small style={{ color: '#666' }}>Total titles</small>
                        <h2 style={{ margin: '5px 0' }}>{books.length}</h2>
                    </div>
                    <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #eee', flex: 1 }}>
                        <small style={{ color: '#666' }}>Available titles</small>
                        <h2 style={{ margin: '5px 0' }}>{books.filter(b => b.quantity > 0).length}</h2>
                    </div>
                </div>

                {/* Book Catalogue Table for Student */}
                <section style={{ background: '#fff', padding: '24px', borderRadius: '8px', border: '1px solid #eee' }}>
                    <h3 style={{ marginTop: 0, marginBottom: '20px' }}>Book Catalogue</h3>

                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ borderBottom: '2px solid #f0f0f0', color: '#888', fontSize: '12px' }}>
                                <th style={{ padding: '12px' }}>BOOK</th>
                                <th style={{ padding: '12px' }}>CATEGORY</th>
                                <th style={{ padding: '12px' }}>ISBN</th>
                                <th style={{ padding: '12px' }}>COPIES</th>
                                <th style={{ padding: '12px' }}>AVAILABILITY</th>
                                <th style={{ padding: '12px' }}>ACTIONS</th>
                            </tr>
                        </thead>
                        <tbody>
                            {books.map((book) => (
                                <tr key={book.book_id} style={{ borderBottom: '1px solid #f5f5f5' }}>
                                    <td style={{ padding: '12px' }}>
                                        <strong>{book.title}</strong><br />
                                        <small style={{ color: '#666' }}>{book.author}</small>
                                    </td>
                                    <td style={{ padding: '12px' }}>{book.category}</td>
                                    <td style={{ padding: '12px' }}>{book.isbn}</td>
                                    <td style={{ padding: '12px' }}>{book.quantity}</td>
                                    <td style={{ padding: '12px' }}>
                                        {book.quantity > 0 ? (
                                            <span style={{ color: '#2e7d32', fontWeight: 'bold' }}>● In stock</span>
                                        ) : (
                                            <span style={{ color: '#c62828', fontWeight: 'bold' }}>● Out of stock</span>
                                        )}
                                    </td>
                                    <td style={{ padding: '12px' }}>
                                        <button
                                            disabled={book.quantity === 0}
                                            onClick={() => alert(`Borrow request sent for "${book.title}"`)}
                                            style={{
                                                padding: '6px 12px',
                                                backgroundColor: book.quantity > 0 ? '#2e4a3e' : '#ccc',
                                                color: '#fff',
                                                border: 'none',
                                                borderRadius: '4px',
                                                cursor: book.quantity > 0 ? 'pointer' : 'not-allowed'
                                            }}
                                        >
                                            Borrow
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </section>
            </main>
        </div>
    );
}

export default StudentView;