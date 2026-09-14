const mysql = require("mysql2/promise"); // Import mysql2 library with promise support for async database operations

const db = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "admin",
  password: process.env.DB_PASSWORD || "YourStrongPassword",
  database: process.env.DB_NAME || "gym_app",
  dateStrings: true,
});

module.exports = db; // Export the database pool so it can be used in other files of the project