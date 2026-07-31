const db = require("../config/db");

const getRecentActivity = async () => {
  // Step 1: most recent payments (simple query)
  const [payments] = await db.query(
    `SELECT p.user_id, u.name AS memberName, p.created_at AS eventTime
     FROM payments p
     JOIN users u ON u.id = p.user_id
     WHERE u.role = 'user'
     ORDER BY p.created_at DESC
     LIMIT 10`
  );

  // Step 2: most recently started memberships (simple query)
  const [memberships] = await db.query(
    `SELECT m.user_id, u.name AS memberName, m.status, m.start_date AS eventTime
     FROM memberships m
     JOIN users u ON u.id = m.user_id
     WHERE u.role = 'user'
     ORDER BY m.start_date DESC
     LIMIT 10`
  );

  // Step 3: most recently joined members (simple query)
  const [newMembers] = await db.query(
    `SELECT u.id AS user_id, u.name AS memberName, u.created_at AS eventTime
     FROM users u
     WHERE u.role = 'user'
     ORDER BY u.created_at DESC
     LIMIT 10`
  );

  // Step 4: combine all three event types into one list
  const events = [
    ...payments.map((p) => ({ ...p, action: "Payment received", status: null })),
    ...memberships.map((m) => ({ ...m, action: "Membership renewed" })),
    ...newMembers.map((n) => ({ ...n, action: "New member joined", status: null })),
  ];

  // Step 5: sort all events by time, most recent first, keep top 10
  events.sort((a, b) => new Date(b.eventTime) - new Date(a.eventTime));
  const top10 = events.slice(0, 10);

  // Step 6: fill in membership status for events that don't already have one
  // (simple query, only for the handful of rows we're actually showing)
  for (const ev of top10) {
    if (ev.status === null) {
      const [[latest]] = await db.query(
        `SELECT status FROM memberships
         WHERE user_id = ?
         ORDER BY created_at DESC
         LIMIT 1`,
        [ev.user_id]
      );
      ev.status = latest ? latest.status : "active";
    }
  }

  // Step 7: convert each event's timestamp into "hours ago"
  const now = Date.now();
  return top10.map((ev) => ({
    memberName: ev.memberName,
    action: ev.action,
    status: ev.status,
    hoursAgo: Math.floor((now - new Date(ev.eventTime).getTime()) / (1000 * 60 * 60)),
  }));
};

module.exports = { getRecentActivity };