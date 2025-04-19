// backend/collections/major.js
const { getDB } = require('../db');

// Get a reference to the "major" collection
function getMajorCollection() {
  const db = getDB();
  return db.collection('major');
}

// Fetch all courses from the "major" collection
async function getAllCourses() {
  return await getMajorCollection().find().toArray();
}

// Insert a new course document into "major"
async function addCourse(course) {
  return await getMajorCollection().insertOne(course);
}

// You can add more logic here in future, e.g. updateCourse(), deleteCourse(), etc.

module.exports = {
  getAllCourses
};