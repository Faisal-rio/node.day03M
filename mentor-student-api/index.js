require('dotenv').config(); // Load .env variables

const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');

// Initialize Express app
const app = express();

// Middleware
app.use(bodyParser.json());

// Root endpoint with welcoming message and navigation links
app.get("/", (req, res) => {
  res.send(`
        <h1>Welcome to the Mentor-Student Database: Empowering Knowledge Through Guidance</h1>
        <h3>Available API Endpoints:</h3>
        <ul>
            <li><a href="/mentors">GET All Mentors</a></li>
            <li><a href="/students">GET All Students</a></li>
            <li><a href="/mentors/:mentorId/students">GET Students for a Mentor</a></li>
            <li><a href="/students/:studentId/previous-mentor">GET Previous Mentor for a Student</a></li>
        </ul>
    `);
});

// Connect to MongoDB using environment variable
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Error connecting to MongoDB:', err));

// Define Mentor and Student Schemas
const mentorSchema = new mongoose.Schema({
  name: String,
  students: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Student' }],
});

const studentSchema = new mongoose.Schema({
  name: String,
  mentor: { type: mongoose.Schema.Types.ObjectId, ref: 'Mentor' },
  previousMentor: { type: mongoose.Schema.Types.ObjectId, ref: 'Mentor' },
});

// Create models
const Mentor = mongoose.model('Mentor', mentorSchema);
const Student = mongoose.model('Student', studentSchema);

// API to get all mentors
app.get('/mentors', async (req, res) => {
  try {
    const mentors = await Mentor.find();
    res.send(mentors);
  } catch (error) {
    res.status(500).send(error);
  }
});

// API to get all students
app.get('/students', async (req, res) => {
  try {
    const students = await Student.find();
    res.send(students);
  } catch (error) {
    res.status(500).send(error);
  }
});

// API to create Mentor
app.post('/mentors', async (req, res) => {
  try {
    const mentor = new Mentor(req.body);
    await mentor.save();
    res.status(201).send(mentor);
  } catch (error) {
    res.status(500).send(error);
  }
});

// API to create Student
app.post('/students', async (req, res) => {
  try {
    const student = new Student(req.body);
    await student.save();
    res.status(201).send(student);
  } catch (error) {
    res.status(500).send(error);
  }
});

// API to assign a student to a mentor
app.post('/mentors/:mentorId/students/:studentId', async (req, res) => {
  const { mentorId, studentId } = req.params;
  try {
    const mentor = await Mentor.findById(mentorId);
    const student = await Student.findById(studentId);

    if (!mentor || !student) {
      return res.status(404).send('Mentor or Student not found');
    }

    if (student.mentor) {
      return res.status(400).send('Student already has a mentor');
    }

    student.mentor = mentor._id;
    await student.save();

    mentor.students.push(student._id);
    await mentor.save();

    res.send(mentor);
  } catch (error) {
    res.status(500).send(error);
  }
});

// API to assign or change mentor for a particular student
app.put('/students/:studentId/mentor/:mentorId', async (req, res) => {
  const { studentId, mentorId } = req.params;
  try {
    const student = await Student.findById(studentId);
    const newMentor = await Mentor.findById(mentorId);

    if (!student || !newMentor) {
      return res.status(404).send('Student or Mentor not found');
    }

    if (student.mentor) {
      student.previousMentor = student.mentor;
    }

    student.mentor = newMentor._id;
    await student.save();

    newMentor.students.push(student._id);
    await newMentor.save();

    res.send(student);
  } catch (error) {
    res.status(500).send(error);
  }
});

// API to show all students for a particular mentor
app.get('/mentors/:mentorId/students', async (req, res) => {
  const { mentorId } = req.params;
  try {
    const mentor = await Mentor.findById(mentorId).populate('students');
    if (!mentor) {
      return res.status(404).send('Mentor not found');
    }
    res.send(mentor.students);
  } catch (error) {
    res.status(500).send(error);
  }
});

// API to show the previously assigned mentor for a particular student
app.get('/students/:studentId/previous-mentor', async (req, res) => {
  const { studentId } = req.params;
  try {
    const student = await Student.findById(studentId).populate('previousMentor');
    if (!student) {
      return res.status(404).send('Student not found');
    }
    res.send(student.previousMentor);
  } catch (error) {
    res.status(500).send(error);
  }
});

// Start the server
app.listen(process.env.PORT, () => {
  console.log(`Server is running on port ${process.env.PORT}`);
});

module.exports = app;
