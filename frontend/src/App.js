import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
    BookOpen,
    Check,
    ChevronDown,
    ClipboardList,
    LayoutDashboard,
    Library,
    LogOut,
    Pencil,
    Plus,
    Search,
    Trash2,
    X,
} from "lucide-react";
import Login from "./Login";
import "./App.css";

const API_URL = "http://localhost:5000/api/books";
const MEMBERS_API_URL = "http://localhost:5000/api/members";
const BORROWINGS_API_URL = "http://localhost:5000/api/borrowings";
const EMPTY_FORM = {
    title: "",
    author: "",
    category: "",
    isbn: "",
    quantity: 1,
};
const EMPTY_MEMBER_FORM = {
    member_id: "",
    name: "",
    email: "",
    phone: "",
    address: "",
};
const EMPTY_BORROW_FORM = {
    book_id: "",
    member_id: "",
    due_date: "",
};

function Sidebar({ activeTab, onNavigate, user, onLogout }) {
    const navigationItems = user?.role === "staff"
        ? [
            { id: "overview", label: "Overview", icon: LayoutDashboard },
            { id: "catalog", label: "Book catalogue", icon: BookOpen },
            { id: "borrowings", label: "Issue books", icon: ClipboardList },
            { id: "members", label: "Members", icon: Check },
            { id: "insights", label: "Library insights", icon: BookOpen },
        ]
        : [
            { id: "catalog", label: "Book catalogue", icon: BookOpen }
        ];

    return (
        <aside className="sidebar">
            <div className="brand">
                <span className="brand-mark">
                    <Library size={20} />
                </span>
                <span>
                    Northstar
                    <br />
                    <strong>Library</strong>
                </span>
            </div>
            <nav className="nav-list" aria-label="Main navigation">
                {navigationItems.map(({ id, label, icon: Icon }) => (
                    <button
                        className={`nav-item ${activeTab === id ? "active" : ""}`}
                        key={id}
                        type="button"
                        onClick={() => onNavigate(id)}
                        aria-current={activeTab === id ? "page" : undefined}
                    >
                        <Icon size={18} />
                        {label}
                    </button>
                ))}
            </nav>
            <div className="sidebar-note">
                <span className="online-dot" />
                Logged in as: <strong>{user?.username}</strong> ({user?.role})
                <br />
                <button
                    onClick={onLogout}
                    style={{
                        marginTop: "10px",
                        background: "#ef4444",
                        color: "#fff",
                        border: "none",
                        padding: "6px 12px",
                        borderRadius: "6px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        fontSize: "12px"
                    }}
                >
                    <LogOut size={14} /> Logout
                </button>
            </div>
        </aside>
    );
}

function App() {
    // Persistent Authentication State
    const [currentUser, setCurrentUser] = useState(() => {
        const savedUser = localStorage.getItem("user");
        return savedUser ? JSON.parse(savedUser) : null;
    });

    const [books, setBooks] = useState([]);
    const [formData, setFormData] = useState(EMPTY_FORM);
    const [editingId, setEditingId] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("All categories");
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState("");
    const [activeTab, setActiveTab] = useState("overview");
    const [cardFilter, setCardFilter] = useState(null);

    const [members, setMembers] = useState([]);
    const [memberFormData, setMemberFormData] = useState(EMPTY_MEMBER_FORM);
    const [memberEditingId, setMemberEditingId] = useState(null);
    const [memberSearchTerm, setMemberSearchTerm] = useState("");
    const [isMemberFormOpen, setIsMemberFormOpen] = useState(false);
    const [isMemberLoading, setIsMemberLoading] = useState(false);
    const [isMemberSaving, setIsMemberSaving] = useState(false);
    const [memberError, setMemberError] = useState("");

    const [borrowings, setBorrowings] = useState([]);
    const [borrowFormData, setBorrowFormData] = useState(EMPTY_BORROW_FORM);
    const [borrowSearchTerm, setBorrowSearchTerm] = useState("");
    const [isBorrowFormOpen, setIsBorrowFormOpen] = useState(false);
    const [isBorrowingLoading, setIsBorrowingLoading] = useState(false);
    const [isBorrowingSaving, setIsBorrowingSaving] = useState(false);
    const [borrowError, setBorrowError] = useState("");
    const [borrowSuccess, setBorrowSuccess] = useState("");

    const handleLoginSuccess = (user) => {
        localStorage.setItem("user", JSON.stringify(user));
        setCurrentUser(user);
    };

    const handleLogout = () => {
        localStorage.removeItem("user");
        setCurrentUser(null);
    };

    const handleCardClick = (cardType) => {
        const nextFilter = cardFilter === cardType ? null : cardType;

        if (nextFilter) {
            setActiveTab("catalog");
            if (cardType === "titles" || cardType === "copies") {
                setSearchTerm("");
                setCategoryFilter("All categories");
            }
        }

        setCardFilter(nextFilter);
    };

    const fetchBooks = async () => {
        setIsLoading(true);
        try {
            const response = await axios.get(API_URL);
            setBooks(response.data);
            setError("");
        } catch (err) {
            console.error("Error fetching books:", err);
            setError("Could not connect to the library database. Start the backend and try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const fetchMembers = async () => {
        setIsMemberLoading(true);
        try {
            const response = await axios.get(MEMBERS_API_URL);
            setMembers(response.data);
            setMemberError("");
        } catch (err) {
            console.error("Error fetching members:", err);
            setMemberError("Could not connect to the member database. Start the backend and try again.");
        } finally {
            setIsMemberLoading(false);
        }
    };

    const fetchBorrowings = async () => {
        setIsBorrowingLoading(true);
        try {
            const response = await axios.get(BORROWINGS_API_URL);
            setBorrowings(response.data);
            setBorrowError("");
        } catch (err) {
            console.error("Error fetching borrowings:", err);
            setBorrowError("Could not connect to the borrowing database. Start the backend and try again.");
        } finally {
            setIsBorrowingLoading(false);
        }
    };

    useEffect(() => {
        if (currentUser) {
            fetchBooks();
            if (currentUser.role === "staff") {
                fetchMembers();
                fetchBorrowings();
                setActiveTab("overview");
            } else {
                setActiveTab("catalog");
            }
        }
    }, [currentUser]);

    const handleChange = (event) => {
        const { name, value } = event.target;
        setFormData((prev) => ({
            ...prev,
            [name]: name === "quantity" ? (value === "" ? "" : Number(value)) : value,
        }));
    };

    const handleMemberChange = (event) => {
        const { name, value } = event.target;
        setMemberFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleMemberEdit = (member) => {
        setMemberEditingId(member.id);
        setMemberFormData({
            member_id: member.member_id || "",
            name: member.name || "",
            email: member.email || "",
            phone: member.phone || "",
            address: member.address || "",
        });
        setMemberError("");
        setIsMemberFormOpen(true);
    };

    const handleMemberDelete = async (id) => {
        if (!window.confirm("Remove this member from the system?")) return;
        try {
            await axios.delete(`${MEMBERS_API_URL}/${id}`);
            await fetchMembers();
        } catch (err) {
            console.error("Error deleting member:", err);
            setMemberError("The member could not be deleted. Please try again.");
        }
    };

    const handleMemberCancel = () => {
        setMemberEditingId(null);
        setMemberFormData(EMPTY_MEMBER_FORM);
        setIsMemberFormOpen(false);
    };

    const handleMemberSubmit = async (event) => {
        event.preventDefault();
        setIsMemberSaving(true);
        setMemberError("");

        const payload = {
            ...memberFormData,
        };

        try {
            if (memberEditingId) {
                await axios.put(`${MEMBERS_API_URL}/${memberEditingId}`, payload);
            } else {
                await axios.post(MEMBERS_API_URL, payload);
            }
            setMemberFormData(EMPTY_MEMBER_FORM);
            setMemberEditingId(null);
            setIsMemberFormOpen(false);
            await fetchMembers();
        } catch (err) {
            console.error("Error saving member:", err);
            setMemberError(err.response?.data?.error || "The member could not be saved. Please try again.");
        } finally {
            setIsMemberSaving(false);
        }
    };

    const handleBorrowChange = (event) => {
        const { name, value } = event.target;
        setBorrowFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleBorrowCancel = () => {
        setBorrowFormData(EMPTY_BORROW_FORM);
        setIsBorrowFormOpen(false);
        setBorrowError("");
        setBorrowSuccess("");
    };

    const handleBorrowSubmit = async (event) => {
        event.preventDefault();
        setIsBorrowingSaving(true);
        setBorrowError("");
        setBorrowSuccess("");

        const payload = {
            book_id: Number(borrowFormData.book_id) || null,
            member_id: Number(borrowFormData.member_id) || null,
            due_date: borrowFormData.due_date,
        };

        try {
            await axios.post(BORROWINGS_API_URL, payload);
            setBorrowFormData(EMPTY_BORROW_FORM);
            setIsBorrowFormOpen(false);
            await fetchBooks();
            await fetchBorrowings();
            setBorrowSuccess("Book issued successfully.");
        } catch (err) {
            console.error("Error issuing book:", err);
            setBorrowError(err.response?.data?.error || "The borrowing could not be created. Please try again.");
        } finally {
            setIsBorrowingSaving(false);
        }
    };

    const handleReturn = async (borrowingId) => {
        setIsBorrowingSaving(true);
        setBorrowError("");
        setBorrowSuccess("");

        try {
            await axios.put(`${BORROWINGS_API_URL}/${borrowingId}`);
            await fetchBooks();
            await fetchBorrowings();
            setBorrowSuccess("Book returned successfully.");
        } catch (err) {
            console.error("Error returning book:", err);
            setBorrowError(err.response?.data?.error || "The book could not be returned. Please try again.");
        } finally {
            setIsBorrowingSaving(false);
        }
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setIsSaving(true);
        setError("");

        const payload = {
            ...formData,
            quantity: Number(formData.quantity) || 0,
        };

        try {
            if (editingId) {
                await axios.put(`${API_URL}/${editingId}`, payload);
            } else {
                await axios.post(API_URL, payload);
            }
            setFormData(EMPTY_FORM);
            setEditingId(null);
            setIsFormOpen(false);
            await fetchBooks();
        } catch (err) {
            console.error("Error saving book:", err);
            setError(err.response?.data?.error || "The book could not be saved. Please try again.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleEdit = (book) => {
        setEditingId(book.book_id);
        setFormData({
            title: book.title || "",
            author: book.author || "",
            category: book.category || "",
            isbn: book.isbn || "",
            quantity: book.quantity ?? 1,
        });
        setError("");
        setIsFormOpen(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Remove this book from the library catalogue?")) return;
        try {
            await axios.delete(`${API_URL}/${id}`);
            await fetchBooks();
        } catch (err) {
            console.error("Error deleting book:", err);
            setError("The book could not be deleted. Please try again.");
        }
    };

    const handleCancel = () => {
        setEditingId(null);
        setFormData(EMPTY_FORM);
        setIsFormOpen(false);
    };

    const categories = useMemo(
        () => ["All categories", ...new Set(books.map((book) => book.category).filter(Boolean))],
        [books]
    );

    const filteredBooks = useMemo(() => {
        return books.filter((book) => {
            const search = searchTerm.toLowerCase();
            const matchesSearch = [book.title, book.author, book.isbn, book.category].some((value) =>
                String(value || "").toLowerCase().includes(search)
            );

            const matchesCategory =
                categoryFilter === "All categories" || book.category === categoryFilter;

            let matchesCard = true;
            if (cardFilter === "available") {
                matchesCard = Number(book.quantity) > 0;
            }

            return matchesSearch && matchesCategory && matchesCard;
        });
    }, [books, categoryFilter, searchTerm, cardFilter]);

    const totalCopies = books.reduce((sum, book) => sum + Number(book.quantity || 0), 0);
    const availableTitles = books.filter((book) => Number(book.quantity) > 0).length;

    const filteredMembers = useMemo(() => {
        const search = memberSearchTerm.toLowerCase();
        return members.filter((member) => {
            return [member.member_id, member.name, member.email, member.phone, member.address]
                .some((value) => String(value || "").toLowerCase().includes(search));
        });
    }, [members, memberSearchTerm]);

    const filteredBorrowings = useMemo(() => {
        const search = borrowSearchTerm.toLowerCase();
        return borrowings.filter((record) => {
            return [record.book_title, record.member_name, record.status]
                .some((value) => String(value || "").toLowerCase().includes(search));
        });
    }, [borrowings, borrowSearchTerm]);

    // Updated condition to ensure table displays correctly for all supported tabs
    const showTable = activeTab === "overview" || activeTab === "catalog" || activeTab === "borrowings" || activeTab === "members" || cardFilter !== null;

    if (!currentUser) {
        return <Login onLoginSuccess={handleLoginSuccess} />;
    }

    return (
        <div className="app-shell">
            <Sidebar
                activeTab={activeTab}
                onNavigate={(id) => {
                    setActiveTab(id);
                    setCardFilter(null);
                }}
                user={currentUser}
                onLogout={handleLogout}
            />
            <main className="main-content">
                <header className="topbar">
                    <div>
                        <p className="eyebrow">Library operations / 2026</p>
                        <h1>Good day, {currentUser.username}!</h1>
                    </div>
                    {currentUser.role === "staff" && (
                        <button
                            className="primary-button"
                            onClick={() => {
                                if (activeTab === "members") {
                                    setMemberEditingId(null);
                                    setMemberFormData(EMPTY_MEMBER_FORM);
                                    setMemberError("");
                                    setIsMemberFormOpen(true);
                                } else if (activeTab === "borrowings") {
                                    setBorrowFormData(EMPTY_BORROW_FORM);
                                    setBorrowError("");
                                    setBorrowSuccess("");
                                    setIsBorrowFormOpen(true);
                                } else {
                                    setEditingId(null);
                                    setFormData(EMPTY_FORM);
                                    setError("");
                                    setIsFormOpen(true);
                                }
                            }}
                        >
                            <Plus size={18} />
                            {activeTab === "members"
                                ? "Add a member"
                                : activeTab === "borrowings"
                                    ? "Issue a book"
                                    : "Add a book"}
                        </button>
                    )}
                </header>

                {error && (
                    <div className="error-banner" role="alert">
                        {error}
                        <button onClick={fetchBooks}>Retry</button>
                    </div>
                )}

                {/* Staff Dashboard Cards */}
                {currentUser.role === "staff" && (activeTab === "overview" || activeTab === "insights") && (
                    <section className="insights-section">
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", margin: "20px 0" }}>
                            {/* Total Titles Card */}
                            <button
                                type="button"
                                onClick={() => handleCardClick("titles")}
                                aria-pressed={cardFilter === "titles"}
                                style={{
                                    backgroundColor: cardFilter === "titles" ? "#eef7f2" : "#ffffff",
                                    border: cardFilter === "titles" ? "2px solid #2d5a27" : "1px solid #e2e8f0",
                                    borderRadius: "12px",
                                    padding: "20px",
                                    cursor: "pointer",
                                    textAlign: "left",
                                }}
                            >
                                <div style={{ fontSize: "20px", marginBottom: "8px" }}>📖</div>
                                <div style={{ fontSize: "14px", color: "#64748b" }}>Total titles</div>
                                <div style={{ fontSize: "28px", fontWeight: "bold", margin: "4px 0" }}>{books.length}</div>
                                <div style={{ fontSize: "12px", color: "#2d5a27" }}>
                                    {cardFilter === "titles" ? "✓ Showing all" : "Click to view table"}
                                </div>
                            </button>

                            {/* Available Titles Card */}
                            <button
                                type="button"
                                onClick={() => handleCardClick("available")}
                                aria-pressed={cardFilter === "available"}
                                style={{
                                    backgroundColor: cardFilter === "available" ? "#eef7f2" : "#ffffff",
                                    border: cardFilter === "available" ? "2px solid #2d5a27" : "1px solid #e2e8f0",
                                    borderRadius: "12px",
                                    padding: "20px",
                                    cursor: "pointer",
                                    textAlign: "left",
                                }}
                            >
                                <div style={{ fontSize: "20px", marginBottom: "8px" }}>📚</div>
                                <div style={{ fontSize: "14px", color: "#64748b" }}>Available titles</div>
                                <div style={{ fontSize: "28px", fontWeight: "bold", margin: "4px 0" }}>{availableTitles}</div>
                                <div style={{ fontSize: "12px", color: "#2d5a27" }}>
                                    {cardFilter === "available" ? "✓ Filtered: Available only" : "Click to filter available"}
                                </div>
                            </button>

                            {/* Total Copies Card */}
                            <button
                                type="button"
                                onClick={() => handleCardClick("copies")}
                                aria-pressed={cardFilter === "copies"}
                                style={{
                                    backgroundColor: cardFilter === "copies" ? "#eef7f2" : "#ffffff",
                                    border: cardFilter === "copies" ? "2px solid #2d5a27" : "1px solid #e2e8f0",
                                    borderRadius: "12px",
                                    padding: "20px",
                                    cursor: "pointer",
                                    textAlign: "left",
                                }}
                            >
                                <div style={{ fontSize: "20px", marginBottom: "8px" }}>📋</div>
                                <div style={{ fontSize: "14px", color: "#64748b" }}>Total copies</div>
                                <div style={{ fontSize: "28px", fontWeight: "bold", margin: "4px 0" }}>{totalCopies}</div>
                                <div style={{ fontSize: "12px", color: "#2d5a27" }}>
                                    {cardFilter === "copies" ? "✓ Total inventory view" : "Click to view table"}
                                </div>
                            </button>
                        </div>
                    </section>
                )}

                {/* Main Table */}
                {showTable && activeTab !== "members" && (
                    <section className="catalog-section">
                        <div className="section-heading">
                            <div>
                                <p className="eyebrow">Collection</p>
                                <h2>
                                    {cardFilter === "available"
                                        ? "Available Books Only"
                                        : cardFilter === "copies"
                                            ? "Inventory Copy Breakdown"
                                            : "Book Catalogue"}
                                </h2>
                            </div>
                            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                                {cardFilter && (
                                    <button
                                        onClick={() => setCardFilter(null)}
                                        style={{
                                            background: "#e2e8f0",
                                            border: "none",
                                            padding: "6px 12px",
                                            borderRadius: "6px",
                                            cursor: "pointer",
                                            fontSize: "13px",
                                            fontWeight: "500",
                                        }}
                                    >
                                        Clear Filter ✕
                                    </button>
                                )}
                                <span className="result-count">
                                    {filteredBooks.length} {filteredBooks.length === 1 ? "title" : "titles"}
                                </span>
                            </div>
                        </div>
                        <div className="toolbar">
                            <label className="search-box">
                                <Search size={18} />
                                <input
                                    aria-label="Search books"
                                    value={searchTerm}
                                    onChange={(event) => setSearchTerm(event.target.value)}
                                    placeholder="Search title, author, ISBN..."
                                />
                            </label>
                            <label className="select-box">
                                <select
                                    value={categoryFilter}
                                    onChange={(event) => setCategoryFilter(event.target.value)}
                                    aria-label="Filter by category"
                                >
                                    {categories.map((category) => (
                                        <option key={category}>{category}</option>
                                    ))}
                                </select>
                                <ChevronDown size={16} />
                            </label>
                        </div>
                        <div className="table-wrap">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Book</th>
                                        <th>Category</th>
                                        <th>ISBN</th>
                                        <th>Copies</th>
                                        <th>Availability</th>
                                        {currentUser.role === "staff" && cardFilter !== "copies" && <th>Actions</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {isLoading ? (
                                        <tr>
                                            <td className="empty-state" colSpan={currentUser.role === "staff" ? "6" : "5"}>
                                                Loading catalogue...
                                            </td>
                                        </tr>
                                    ) : cardFilter === "copies" ? (
                                        books.length ? (
                                            books.map((book) => (
                                                <tr key={book.book_id}>
                                                    <td>
                                                        <div className="book-cell">
                                                            <span className="book-cover">
                                                                <BookOpen size={17} />
                                                            </span>
                                                            <span>
                                                                <strong>{book.title}</strong>
                                                                <small>{book.author}</small>
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <span className="category-tag">
                                                            {book.category || "Uncategorised"}
                                                        </span>
                                                    </td>
                                                    <td className="muted-cell">{book.isbn || "—"}</td>
                                                    <td>
                                                        <strong>{book.quantity}</strong>
                                                    </td>
                                                    <td>
                                                        <span
                                                            className={`availability ${Number(book.quantity) > 0 ? "available" : "unavailable"}`}
                                                        >
                                                            <span />
                                                            {Number(book.quantity) > 0 ? "In stock" : "Out of stock"}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td className="empty-state" colSpan={currentUser.role === "staff" ? "6" : "5"}>
                                                    <BookOpen size={30} />
                                                    <strong>No inventory data</strong>
                                                    <span>There are no books currently in the catalogue.</span>
                                                </td>
                                            </tr>
                                        )
                                    ) : filteredBooks.length ? (
                                        filteredBooks.map((book) => (
                                            <tr key={book.book_id}>
                                                <td>
                                                    <div className="book-cell">
                                                        <span className="book-cover">
                                                            <BookOpen size={17} />
                                                        </span>
                                                        <span>
                                                            <strong>{book.title}</strong>
                                                            <small>{book.author}</small>
                                                        </span>
                                                    </div>
                                                </td>
                                                <td>
                                                    <span className="category-tag">
                                                        {book.category || "Uncategorised"}
                                                    </span>
                                                </td>
                                                <td className="muted-cell">{book.isbn || "—"}</td>
                                                <td>
                                                    <strong>{book.quantity}</strong>
                                                </td>
                                                <td>
                                                    <span
                                                        className={`availability ${Number(book.quantity) > 0 ? "available" : "unavailable"}`}
                                                    >
                                                        <span />
                                                        {Number(book.quantity) > 0 ? "In stock" : "Out of stock"}
                                                    </span>
                                                </td>

                                                {currentUser.role === "staff" && (
                                                    <td>
                                                        <div className="actions">
                                                            <button
                                                                className="icon-button"
                                                                onClick={() => handleEdit(book)}
                                                                aria-label={`Edit ${book.title}`}
                                                            >
                                                                <Pencil size={16} />
                                                            </button>
                                                            <button
                                                                className="icon-button danger"
                                                                onClick={() => handleDelete(book.book_id)}
                                                                aria-label={`Delete ${book.title}`}
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                )}
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td className="empty-state" colSpan={currentUser.role === "staff" ? "6" : "5"}>
                                                <BookOpen size={30} />
                                                <strong>No books found</strong>
                                                <span>Try another search query.</span>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </section>
                )}
                {showTable && activeTab === "borrowings" && (
                    <section className="catalog-section">
                        <div className="section-heading">
                            <div>
                                <p className="eyebrow">Issue books</p>
                                <h2>Borrow / issue books</h2>
                            </div>
                            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                                {currentUser.role === "staff" && (
                                    <button
                                        className="primary-button"
                                        type="button"
                                        onClick={() => {
                                            setBorrowFormData(EMPTY_BORROW_FORM);
                                            setBorrowError("");
                                            setBorrowSuccess("");
                                            setIsBorrowFormOpen(true);
                                        }}
                                    >
                                        <Plus size={18} />
                                        Issue book
                                    </button>
                                )}
                                <span className="result-count">
                                    {borrowings.length} {borrowings.length === 1 ? "record" : "records"}
                                </span>
                            </div>
                        </div>
                        <div className="toolbar">
                            <label className="search-box">
                                <Search size={18} />
                                <input
                                    aria-label="Search borrowings"
                                    value={borrowSearchTerm}
                                    onChange={(event) => setBorrowSearchTerm(event.target.value)}
                                    placeholder="Search by member, book, status..."
                                />
                            </label>
                        </div>
                        {borrowSuccess && (
                            <div className="success-banner" role="status">
                                {borrowSuccess}
                            </div>
                        )}
                        <div className="table-wrap">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Book</th>
                                        <th>Member</th>
                                        <th>Borrowed</th>
                                        <th>Due date</th>
                                        <th>Status</th>
                                        <th>Return</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {isBorrowingLoading ? (
                                        <tr>
                                            <td className="empty-state" colSpan="6">
                                                Loading issue records...
                                            </td>
                                        </tr>
                                    ) : filteredBorrowings.length ? (
                                        filteredBorrowings.map((record) => (
                                            <tr key={record.id}>
                                                <td>{record.book_title || "Unknown book"}</td>
                                                <td>{record.member_name || "Unknown member"}</td>
                                                <td>{new Date(record.borrow_date).toLocaleDateString()}</td>
                                                <td>{new Date(record.due_date).toLocaleDateString()}</td>
                                                <td>
                                                    <span className={`availability ${record.status === "borrowed" ? "available" : "unavailable"}`}>
                                                        <span />
                                                        {record.status}
                                                    </span>
                                                </td>
                                                <td>
                                                    {record.status === "borrowed" ? (
                                                        <button
                                                            className="primary-button"
                                                            type="button"
                                                            onClick={() => handleReturn(record.id)}
                                                        >
                                                            Return Book
                                                        </button>
                                                    ) : (
                                                        record.return_date ? new Date(record.return_date).toLocaleDateString() : "-"
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td className="empty-state" colSpan="6">
                                                <strong>No borrowings found</strong>
                                                <span>Issue a book to create a record.</span>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </section>
                )}
                {showTable && activeTab === "members" && (
                    <section className="catalog-section">
                        <div className="section-heading">
                            <div>
                                <p className="eyebrow">Members</p>
                                <h2>Member management</h2>
                            </div>
                            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                                <span className="result-count">
                                    {filteredMembers.length} {filteredMembers.length === 1 ? "member" : "members"}
                                </span>
                            </div>
                        </div>
                        <div className="toolbar">
                            <label className="search-box">
                                <Search size={18} />
                                <input
                                    aria-label="Search members"
                                    value={memberSearchTerm}
                                    onChange={(event) => setMemberSearchTerm(event.target.value)}
                                    placeholder="Search member ID, name, email..."
                                />
                            </label>
                        </div>
                        <div className="table-wrap">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Member ID</th>
                                        <th>Name</th>
                                        <th>Email</th>
                                        <th>Phone</th>
                                        <th>Address</th>
                                        <th>Joined</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {isMemberLoading ? (
                                        <tr>
                                            <td className="empty-state" colSpan="7">
                                                Loading members...
                                            </td>
                                        </tr>
                                    ) : filteredMembers.length ? (
                                        filteredMembers.map((member) => (
                                            <tr key={member.id}>
                                                <td>{member.member_id}</td>
                                                <td>{member.name}</td>
                                                <td className="muted-cell">{member.email}</td>
                                                <td>{member.phone || "—"}</td>
                                                <td>{member.address || "—"}</td>
                                                <td>{new Date(member.created_at).toLocaleDateString()}</td>
                                                <td>
                                                    <div className="actions">
                                                        <button
                                                            className="icon-button"
                                                            onClick={() => handleMemberEdit(member)}
                                                            aria-label={`Edit ${member.name}`}
                                                        >
                                                            <Pencil size={16} />
                                                        </button>
                                                        <button
                                                            className="icon-button danger"
                                                            onClick={() => handleMemberDelete(member.id)}
                                                            aria-label={`Delete ${member.name}`}
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td className="empty-state" colSpan="7">
                                                <strong>No members found</strong>
                                                <span>Try another search query or add a member.</span>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </section>
                )}
            </main>

            {/* Modal Form for Add/Edit */}
            {
                isFormOpen && currentUser.role === "staff" && (
                    <div className="modal-backdrop">
                        <section className="modal" role="dialog" aria-modal="true" aria-labelledby="form-title">
                            <div className="modal-header">
                                <div>
                                    <p className="eyebrow">Catalogue entry</p>
                                    <h2 id="form-title">{editingId ? "Edit book" : "Add a new book"}</h2>
                                </div>
                                <button className="icon-button" onClick={handleCancel} aria-label="Close form">
                                    <X size={19} />
                                </button>
                            </div>
                            <form onSubmit={handleSubmit}>
                                <div className="form-grid">
                                    <input
                                        type="text"
                                        name="title"
                                        placeholder="Title *"
                                        value={formData.title}
                                        onChange={handleChange}
                                        required
                                    />
                                    <input
                                        type="text"
                                        name="author"
                                        placeholder="Author *"
                                        value={formData.author}
                                        onChange={handleChange}
                                        required
                                    />
                                    <input
                                        type="text"
                                        name="category"
                                        placeholder="Category"
                                        value={formData.category}
                                        onChange={handleChange}
                                    />
                                    <input
                                        type="text"
                                        name="isbn"
                                        placeholder="ISBN"
                                        value={formData.isbn}
                                        onChange={handleChange}
                                    />
                                    <input
                                        type="number"
                                        name="quantity"
                                        placeholder="Quantity"
                                        value={formData.quantity}
                                        onChange={handleChange}
                                        min="0"
                                        required
                                    />
                                </div>
                                <div className="modal-actions">
                                    <button className="secondary-button" type="button" onClick={handleCancel}>
                                        Cancel
                                    </button>
                                    <button className="primary-button" type="submit" disabled={isSaving}>
                                        {isSaving ? (
                                            "Saving..."
                                        ) : (
                                            <>
                                                <Check size={17} />
                                                {editingId ? "Save changes" : "Add book"}
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </section>
                    </div>
                )
            }

            {
                isMemberFormOpen && currentUser.role === "staff" && (
                    <div className="modal-backdrop">
                        <section className="modal" role="dialog" aria-modal="true" aria-labelledby="member-form-title">
                            <div className="modal-header">
                                <div>
                                    <p className="eyebrow">Member record</p>
                                    <h2 id="member-form-title">{memberEditingId ? "Edit member" : "Add a new member"}</h2>
                                </div>
                                <button className="icon-button" onClick={handleMemberCancel} aria-label="Close form">
                                    <X size={19} />
                                </button>
                            </div>
                            <form onSubmit={handleMemberSubmit}>
                                <div className="form-grid">
                                    <input
                                        type="text"
                                        name="member_id"
                                        placeholder="Member ID *"
                                        value={memberFormData.member_id}
                                        onChange={handleMemberChange}
                                        required
                                    />
                                    <input
                                        type="text"
                                        name="name"
                                        placeholder="Name *"
                                        value={memberFormData.name}
                                        onChange={handleMemberChange}
                                        required
                                    />
                                    <input
                                        type="email"
                                        name="email"
                                        placeholder="Email *"
                                        value={memberFormData.email}
                                        onChange={handleMemberChange}
                                        required
                                    />
                                    <input
                                        type="text"
                                        name="phone"
                                        placeholder="Phone"
                                        value={memberFormData.phone}
                                        onChange={handleMemberChange}
                                    />
                                    <input
                                        type="text"
                                        name="address"
                                        placeholder="Address"
                                        value={memberFormData.address}
                                        onChange={handleMemberChange}
                                    />
                                </div>
                                {memberError && (
                                    <div className="error-banner" role="alert" style={{ marginTop: '16px' }}>
                                        {memberError}
                                    </div>
                                )}
                                <div className="modal-actions">
                                    <button className="secondary-button" type="button" onClick={handleMemberCancel}>
                                        Cancel
                                    </button>
                                    <button className="primary-button" type="submit" disabled={isMemberSaving}>
                                        {isMemberSaving ? (
                                            "Saving..."
                                        ) : (
                                            <>
                                                <Check size={17} />
                                                {memberEditingId ? "Save changes" : "Add member"}
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </section>
                    </div>
                )
            }

            {
                isBorrowFormOpen && currentUser.role === "staff" && (
                    <div className="modal-backdrop">
                        <section className="modal" role="dialog" aria-modal="true" aria-labelledby="borrow-form-title">
                            <div className="modal-header">
                                <div>
                                    <p className="eyebrow">Issue book</p>
                                    <h2 id="borrow-form-title">Issue a book</h2>
                                </div>
                                <button className="icon-button" onClick={handleBorrowCancel} aria-label="Close issue form">
                                    <X size={19} />
                                </button>
                            </div>
                            <form onSubmit={handleBorrowSubmit}>
                                <div className="form-grid">
                                    <label className="field-group">
                                        <span>Book</span>
                                        <select
                                            name="book_id"
                                            value={borrowFormData.book_id}
                                            onChange={handleBorrowChange}
                                            required
                                        >
                                            <option value="">Select a book</option>
                                            {books
                                                .filter((book) => Number(book.quantity) > 0)
                                                .map((book) => (
                                                    <option key={book.book_id} value={book.book_id}>
                                                        {book.title} — {book.author} ({book.quantity} available)
                                                    </option>
                                                ))}
                                        </select>
                                    </label>
                                    <label className="field-group">
                                        <span>Member</span>
                                        <select
                                            name="member_id"
                                            value={borrowFormData.member_id}
                                            onChange={handleBorrowChange}
                                            required
                                        >
                                            <option value="">Select a member</option>
                                            {members.map((member) => (
                                                <option key={member.id} value={member.id}>
                                                    {member.name} — {member.member_id}
                                                </option>
                                            ))}
                                        </select>
                                    </label>
                                    <label className="field-group">
                                        <span>Due date</span>
                                        <input
                                            type="date"
                                            name="due_date"
                                            value={borrowFormData.due_date}
                                            onChange={handleBorrowChange}
                                            required
                                        />
                                    </label>
                                </div>
                                {borrowError && (
                                    <div className="error-banner" role="alert" style={{ marginTop: '16px' }}>
                                        {borrowError}
                                    </div>
                                )}
                                <div className="modal-actions">
                                    <button className="secondary-button" type="button" onClick={handleBorrowCancel}>
                                        Cancel
                                    </button>
                                    <button className="primary-button" type="submit" disabled={isBorrowingSaving}>
                                        {isBorrowingSaving ? (
                                            "Issuing..."
                                        ) : (
                                            <>
                                                <Check size={17} />
                                                Issue book
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </section>
                    </div>
                )
            }
        </div >
    );
}

export default App;