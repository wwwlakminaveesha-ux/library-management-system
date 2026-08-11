const http = require('http');
const urls = ['http://localhost:5000/api/members', 'http://localhost:5000/api/borrowings'];
let completed = 0;
urls.forEach((url) => {
    http.get(url, (res) => {
        let data = '';
        res.on('data', (chunk) => {
            data += chunk;
        });
        res.on('end', () => {
            console.log(`${url} -> ${res.statusCode}`);
            console.log(data.slice(0, 300));
            completed += 1;
            if (completed === urls.length) process.exit(0);
        });
    }).on('error', (err) => {
        console.error(`${url} -> ERROR ${err.message}`);
        completed += 1;
        if (completed === urls.length) process.exit(1);
    });
});
