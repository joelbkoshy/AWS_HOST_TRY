// index.mjs

import express from 'express';
import { engine } from 'express-handlebars';
import mysql from 'mysql2/promise';
import AWS from 'aws-sdk';
import bodyParser from 'body-parser';

const app = express();

const formatDate = (date) => {
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
};

const dynamodb = new AWS.DynamoDB();

app.engine('handlebars', engine());
app.set('view engine', 'handlebars');
app.set('views', './views');

// Configure AWS with your credentials and preferred region
// AWS.config.update({
//     accessKeyId: 'ASIASRIRQSQSOO6OL2EW',
//     secretAccessKey: 'q7NPbH/EHgyMxp5bFUt2Hosj+Xm2VSP93U1Pi+Qr',
//     region: 'us-east-1',
//     sessionToken:'FwoGZXIvYXdzEEMaDAmUBzsjOIoB4/6sdCLTAcBdNVlxuZsPehXid7I6V7ETPV5cOKIajT9QQK0pRMplV453izeybfpjewJcraC4iludJrd+ai842OVf07QOCsWNTbR3ZDnjM5mMMIWhcBzuqT1RoKiZ8ut/4Cb1IifHB53DahLs5q4N7qqaYwiSr0MLF3F+n1TPTsAwiSP8GVA3KbVZiUGP9Cqok+AEk3EBahrayw69LsBjAo40uy7S6iElAll4WuTvOG9iU2L3w5iiUeEsWVzTIX1uBOpESwSDOh3cl7K/gCNzk1R1RyIN+boGh8Eoren8qwYyLcUFHstDVkjsJIVb2uoiHtZF3UzhNK+gOrWqbo8jTacV2dFzHViQBKdiScdvZg=='
// });


app.get('/university', (req, res) => {
    const universityData = {
        universityName: "Your University",
        currentYear: new Date().getFullYear(),
    };

    res.render('university', universityData);
});


app.get('/student', (req, res) => {
    const universityData = {
        universityName: "Ramu",
        currentYear: new Date().getFullYear(),
    };

    res.render('student', universityData);
});
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

app.get('/dynamo', (req, res) => {

    res.render('dynamo', { /* Add necessary data here */ });
});


app.post('/hospital-submit', async (req, res) => {
    const { hospitalName, location, specialization, capacity, contactNumber, email } = req.body;

    try {
        // Save the data to DynamoDB
        const params = {
            TableName: 'cat3',
            Item: {
                hospitalName: { S: hospitalName },
                location: { S: location },
                specialization: { S: specialization },
                capacity: { N: capacity.toString() },
                contactNumber: { S: contactNumber },
                email: { S: email }
            }
        };

        await dynamodb.putItem(params).promise();

        res.redirect('/hospital-data'); // Redirect to the success page
    } catch (error) {
        console.error('Error saving data to DynamoDB:', error);
        res.status(500).send('Internal Server Error');
    }
});


// New route for fetching data from DynamoDB
app.get('/hospital-data', async (req, res) => {
    try {
        const params = {
            TableName: 'cat3'
        };

        const data = await dynamodb.scan(params).promise();

        const hospitalsData = data.Items.map(item => {
            return {
                hospitalName: item.hospitalName.S,
                location: item.location.S,
                specialization: item.specialization.S,
                capacity: parseInt(item.capacity.N),
                contactNumber: item.contactNumber.S,
                email: item.email.S
            };
        });

        res.render('hospital-data', { hospitalsData, formatDate });
    } catch (error) {
        console.error('Error fetching data from DynamoDB:', error);
        res.status(500).send('Internal Server Error');
    }
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
