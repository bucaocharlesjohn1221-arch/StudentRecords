require('dotenv').config();

const express = require('express');
const { MongoClient } = require('mongodb');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DATABASE = process.env.MONGODB_DATABASE || 'studentDB';

app.use(cors());
app.use(express.json());

if (!MONGODB_URI) {
  throw new Error('MONGODB_URI is missing from .env');
}

const client = new MongoClient(MONGODB_URI);

let studentsCollection;

async function startServer() {
  try {
    await client.connect();

    const db = client.db(MONGODB_DATABASE);
    studentsCollection = db.collection('students');

    console.log('MongoDB connected successfully!');

    app.post('/students', async (req, res) => {
      const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
      const course = typeof req.body.course === 'string' ? req.body.course.trim() : '';
      const year = typeof req.body.year === 'string' || typeof req.body.year === 'number'
        ? String(req.body.year).trim()
        : '';

      if (!name || !course || !year) {
        return res.status(400).json({
          message: 'Student name, course, and year level are required.'
        });
      }

      try {
        const student = { name, course, year };
        const result = await studentsCollection.insertOne(student);

        return res.status(201).json({
          ...student,
          _id: result.insertedId
        });
      } catch (error) {
        console.error('Error creating student:', error.message);
        return res.status(500).json({
          message: 'Failed to create student record.'
        });
      }
    });

    app.get('/students', async (req, res) => {
      try {
        const students = await studentsCollection
          .find({})
          .toArray();

        res.json(students);
      } catch (error) {
        console.error('Error retrieving students:', error.message);
        res.status(500).json({
          message: 'Failed to retrieve student records'
        });
      }
    });

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Server startup failed:', error.message);
    process.exit(1);
  }
}

startServer();