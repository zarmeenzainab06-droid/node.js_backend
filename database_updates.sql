-- Database updates for GymFitex Operational Features (Freezing Limits & Gate Check-in)
-- Run these queries in your XAMPP MySQL database (phpMyAdmin)

-- 1. Add freeze_until column to memberships table to track the freeze period limits
ALTER TABLE memberships ADD COLUMN freeze_until DATE NULL;

-- 2. Create the check_ins table to store member reception check-in logs
CREATE TABLE IF NOT EXISTS check_ins (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  check_in_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
