const db = require("../config/db");

const countActive = async () => {
  const [[{ active }]] = await db.query(
    `SELECT COUNT(*) AS active FROM memberships
     WHERE LOWER(status) = 'active' AND (end_date IS NULL OR end_date >= CURDATE())`
  );
  return active;
};

const countExpired = async () => {
  const [[{ expired }]] = await db.query(
    `SELECT COUNT(*) AS expired FROM memberships
     WHERE LOWER(status) = 'expired' OR (end_date IS NOT NULL AND end_date < CURDATE())`
  );
  return expired;
};



module.exports = {
  countActive,
  countExpired,
};
