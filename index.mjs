// index.mjs

import express from 'express';
import { engine } from 'express-handlebars';
import mysql from 'mysql2/promise';
import bodyParser from 'body-parser';

const app = express();

const formatDate = (date) => {
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
};

app.engine('handlebars', engine());
app.set('view engine', 'handlebars');
app.set('views', './views');

const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'lab6',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Use bodyParser middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
    res.render('form');
});

app.post('/submit', async (req, res) => {
    const { stateName, date, samplesCollected, positiveCases, negativeCases, discharges, deaths } = req.body;

    try {
        // Save the data to MySQL
        const connection = await pool.getConnection();
        const sql = `
      INSERT INTO state_data (stateName, date, samplesCollected, positiveCases, negativeCases, discharges, deaths)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
        await connection.query(sql, [stateName, date, samplesCollected, positiveCases, negativeCases, discharges, deaths]);
        connection.release();

        res.redirect('/result'); // Redirect to the result page
    } catch (error) {
        console.error('Error saving data to MySQL:', error);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/success', (req, res) => {
    res.render('success');
});

// New route for the result page
app.get('/result', async (req, res) => {
    try {
        // Fetch data from MySQL and sort by positive cases in ascending order
        const connection = await pool.getConnection();
        const [rows] = await connection.query('SELECT * FROM state_data ORDER BY positiveCases ASC');
        connection.release();

        const statesData = rows;

        res.render('result', { statesData, formatDate })
    } catch (error) {
        console.error('Error fetching data from MySQL:', error);
        res.status(500).send('Internal Server Error');
    }
});

app.listen(3000, () => {
    console.log('Server is running on http://localhost:3000');
});
