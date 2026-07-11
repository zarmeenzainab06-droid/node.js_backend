const mysql = require("mysql2/promise"); // Import mysql2 library with promise support for async database operations

const db = mysql.createPool({
  host: "localhost", // Database server is running on the local machine
  user: "admin", // MySQL username (default user in local setup)
  password: "YourStrongPassword", // Password for MySQL user (empty in local development)
  database: "gym_app", // Name of the database to connect to
  dateStrings: true,
}); // Create a pool of connections to efficiently manage multiple database requests

// Run table alterations safely on startup
(async () => {
  try {
    await db.query("ALTER TABLE memberships ADD COLUMN freeze_until DATE NULL");
    console.log("Database altered: freeze_until column added to memberships.");
  } catch (err) {
    // Column might already exist, swallow error
  }
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS check_ins (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        check_in_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log("Database altered: check_ins table ensured.");
  } catch (err) {
    console.error("Failed to create check_ins table:", err.message);
  }
})();

module.exports = db; // Export the database pool so it can be used in other files of the project