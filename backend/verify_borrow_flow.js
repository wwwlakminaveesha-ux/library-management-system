const axios = require('axios');

async function verify() {
    try {
        const booksRes = await axios.get('http://localhost:5000/api/books');
        console.log('books', booksRes.data.length);
        const membersRes = await axios.get('http://localhost:5000/api/members');
        console.log('members', membersRes.data.length);
        const availableBook = booksRes.data.find((b) => Number(b.quantity) > 0);
        if (!availableBook) {
            console.log('no available book');
            return;
        }
        const member = membersRes.data[0];
        if (!member) {
            console.log('no member');
            return;
        }
        const borrowRes = await axios.post('http://localhost:5000/api/borrowings', {
            book_id: availableBook.book_id,
            member_id: member.id,
            due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        });
        console.log('borrow created', borrowRes.status, borrowRes.data);
        const borrowingsRes = await axios.get('http://localhost:5000/api/borrowings');
        console.log('borrowings', borrowingsRes.data.length);
        console.log('first borrowing', borrowingsRes.data[0]);
    } catch (err) {
        console.error(err.response?.status, err.response?.data || err.message);
    }
}
verify();
