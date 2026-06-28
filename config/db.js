const mysql = require("mysql2/promise"); // Import mysql2 library with promise support for async database operations

const db = mysql.createPool({
  host: "localhost", // Database server is running on the local machine
  user: "admin", // MySQL username (default user in local setup)
  password: "YourStrongPassword", // Password for MySQL user (empty in local development)
  database: "gym_app", // Name of the database to connect to
}); // Create a pool of connections to efficiently manage multiple database requests

module.exports = db; // Export the database pool so it can be used in other files of the project