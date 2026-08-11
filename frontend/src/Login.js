import React, { useState } from 'react';

function Login({ onLoginSuccess }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');

        try {
            const response = await fetch('http://localhost:5000/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                onLoginSuccess(data.user);
            } else {
                setError(data.message || 'Login failed!');
            }
        } catch (err) {
            console.error('Login Error:', err);
            setError('Server connection failed. Make sure Backend is running!');
        }
    };

    return (
        <div style={styles.container}>
            <div style={styles.card}>
                <h2 style={{ marginBottom: '10px', color: '#2f4f4f' }}>Northstar Library</h2>
                <p style={{ marginBottom: '20px', color: '#666', fontSize: '14px' }}>Please sign in to continue</p>

                {error && <div style={styles.errorBox}>{error}</div>}

                <form onSubmit={handleLogin}>
                    <div style={styles.inputGroup}>
                        <label style={styles.label}>Username</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="e.g. admin or student1"
                            required
                            style={styles.input}
                        />
                    </div>

                    <div style={styles.inputGroup}>
                        <label style={styles.label}>Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter your password"
                            required
                            style={styles.input}
                        />
                    </div>

                    <button type="submit" style={styles.button}>Sign In</button>
                </form>
            </div>
        </div>
    );
}

const styles = {
    container: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f4f6f8' },
    card: { padding: '40px', borderRadius: '12px', backgroundColor: '#ffffff', boxShadow: '0 8px 24px rgba(0,0,0,0.08)', width: '350px', textAlign: 'center' },
    inputGroup: { marginBottom: '18px', textAlign: 'left' },
    label: { display: 'block', marginBottom: '6px', fontSize: '13px', color: '#333', fontWeight: 'bold' },
    input: { width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box' },
    button: { width: '100%', padding: '12px', backgroundColor: '#2f4f4f', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', marginTop: '10px' },
    errorBox: { backgroundColor: '#ffe6e6', color: '#d9534f', padding: '10px', borderRadius: '6px', marginBottom: '15px', fontSize: '13px' }
};

export default Login;