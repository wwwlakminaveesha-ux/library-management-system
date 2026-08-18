import React from 'react';
import { BookOpen, Clock, GraduationCap, Library, ShieldCheck, Users } from 'lucide-react';
import './GetStarted.css';

function GetStarted({ onGetStarted, onSignIn }) {
    return (
        <div className="landing-screen">
            <header className="landing-header">
                <div className="landing-brand">
                    <span className="landing-brand-mark">
                        <Library size={20} />
                    </span>
                    <span>
                        Northstar
                        <br />
                        <strong>Library</strong>
                    </span>
                </div>
                <button className="secondary-button" type="button" onClick={onSignIn}>
                    Sign in
                </button>
            </header>

            <main className="landing-hero">
                <p className="eyebrow">Library management, simplified</p>
                <h1>Run your library without the spreadsheets.</h1>
                <p className="landing-lede">
                    Catalogue your books, manage members, and track every loan — from checkout
                    to overdue fines — in one place built for both staff and students.
                </p>
                <div className="landing-cta-row">
                    <button className="primary-button landing-cta" type="button" onClick={onGetStarted}>
                        <GraduationCap size={18} />
                        Get started as a student
                    </button>
                    <button className="secondary-button landing-cta" type="button" onClick={onSignIn}>
                        <ShieldCheck size={18} />
                        Staff sign in
                    </button>
                </div>
            </main>

            <section className="landing-features">
                <div className="landing-feature">
                    <span className="landing-feature-icon">
                        <BookOpen size={18} />
                    </span>
                    <h3>Full book catalogue</h3>
                    <p>Search, filter, and manage titles, categories and copy counts in real time.</p>
                </div>
                <div className="landing-feature">
                    <span className="landing-feature-icon">
                        <Clock size={18} />
                    </span>
                    <h3>Automatic due dates &amp; fines</h3>
                    <p>Every loan gets a standard 14-day period, with overdue fines calculated automatically.</p>
                </div>
                <div className="landing-feature">
                    <span className="landing-feature-icon">
                        <Users size={18} />
                    </span>
                    <h3>Members &amp; history</h3>
                    <p>Track every member's borrowing history, with filters for active, overdue and returned.</p>
                </div>
            </section>

            <footer className="landing-footer">
                <span>Northstar Library &copy; {new Date().getFullYear()}</span>
            </footer>
        </div>
    );
}

export default GetStarted;
