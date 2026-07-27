const db = require("../config/db");

const countActive = async () => {
  const [[{ active }]] = await db.query(
    `SELECT COUNT(*) AS active FROM memberships
     WHERE status = 'active'`
  );
  return active;
};

const countExpired = async () => {
  const [[{ expired }]] = await db.query(
    `SELECT COUNT(*) AS expired FROM memberships
     WHERE status = 'expired' OR end_date < CURDATE()`
  );
  return expired;
};


module.exports = {
  countActive,
  countExpired,
};
