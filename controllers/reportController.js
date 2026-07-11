// Import report model for database operations
const ReportModel = require("../models/reportModel");

// ─────────────────────────────────────────────────────────────────────────
// GET /admin/reports/revenue
// Returns: total revenue, revenue this month, revenue by month (last 6),
//          and supports optional ?start=YYYY-MM-DD&end=YYYY-MM-DD for a
//          custom date-range revenue figure
// ─────────────────────────────────────────────────────────────────────────
const getRevenueReport = async (req, res) => {
  try {
    const { start, end, months } = req.query;
    const monthsCount = months ? parseInt(months, 10) : 6;

    const [[totalRow]] = await ReportModel.getTotalRevenue();
    const [[thisMonthRow]] = await ReportModel.getRevenueThisMonth();
    const [byMonthRows] = await ReportModel.getRevenueByMonth(monthsCount);

    let dateRange = null;
    if (start && end) {
      const [[rangeRow]] = await ReportModel.getRevenueByDateRange(start, end);
      dateRange = {
        start_date: start,
        end_date: end,
        revenue: Number(rangeRow.revenue),
      };
    }

    return res.status(200).json({
      success: true,
      data: {
        total_revenue: Number(totalRow.total_revenue),
        revenue_this_month: Number(thisMonthRow.revenue_this_month),
        revenue_by_month: byMonthRows.map((r) => ({
          month: r.month_label,
          month_key: r.month_key,
          revenue: Number(r.revenue),
        })),
        date_range: dateRange,
      },
    });
  } catch (err) {
    console.error("getRevenueReport error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────
// GET /admin/reports/membership
// Returns: per-package member count + revenue generated
// ─────────────────────────────────────────────────────────────────────────
const getMembershipReport = async (req, res) => {
  try {
    const [rows] = await ReportModel.getPackageBreakdown();

    const packages = rows.map((r) => ({
      package_id: r.package_id,
      package_name: r.package_name,
      member_count: Number(r.member_count),
      revenue: Number(r.revenue),
    }));

    const totalMembers = packages.reduce((sum, p) => sum + p.member_count, 0);

    return res.status(200).json({
      success: true,
      data: {
        packages,
        total_members_across_packages: totalMembers,
      },
    });
  } catch (err) {
    console.error("getMembershipReport error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────
// GET /admin/reports/trends
// Returns: monthly growth (new memberships), and revenue comparison between
//          months including month-over-month % change
// ─────────────────────────────────────────────────────────────────────────
const getTrendsReport = async (req, res) => {
  try {
    const { months } = req.query;
    const monthsCount = months ? parseInt(months, 10) : 6;

    const [newMembersRows] = await ReportModel.getNewMembershipsByMonth(
      monthsCount
    );
    const [revenueRows] = await ReportModel.getRevenueByMonth(monthsCount);

    // Merge new-members + revenue per month_key so the frontend gets one
    // unified array instead of stitching two arrays itself
    const monthMap = {};

    newMembersRows.forEach((r) => {
      monthMap[r.month_key] = {
        month: r.month_label,
        month_key: r.month_key,
        new_members: Number(r.new_members),
        revenue: 0,
      };
    });

    revenueRows.forEach((r) => {
      if (!monthMap[r.month_key]) {
        monthMap[r.month_key] = {
          month: r.month_label,
          month_key: r.month_key,
          new_members: 0,
          revenue: 0,
        };
      }
      monthMap[r.month_key].revenue = Number(r.revenue);
    });

    const merged = Object.values(monthMap).sort((a, b) =>
      a.month_key.localeCompare(b.month_key)
    );

    // Month-over-month revenue growth %
    const withGrowth = merged.map((m, i) => {
      if (i === 0) return { ...m, revenue_growth_percent: null };
      const prev = merged[i - 1].revenue;
      const growth =
        prev > 0 ? ((m.revenue - prev) / prev) * 100 : m.revenue > 0 ? 100 : 0;
      return { ...m, revenue_growth_percent: Number(growth.toFixed(1)) };
    });

    return res.status(200).json({
      success: true,
      data: {
        months: withGrowth,
      },
    });
  } catch (err) {
    console.error("getTrendsReport error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────
// GET /admin/reports/summary
// One-shot endpoint that returns everything the Reports screen needs in a
// single call (mirrors your existing admin dashboard pattern) — useful for
// the initial screen load so you don't fire 3 separate requests.
// ─────────────────────────────────────────────────────────────────────────
const getReportsSummary = async (req, res) => {
  try {
    const { months } = req.query;
    const monthsCount = months ? parseInt(months, 10) : 6;

    const [[totalRow]] = await ReportModel.getTotalRevenue();
    const [[thisMonthRow]] = await ReportModel.getRevenueThisMonth();
    const [byMonthRows] = await ReportModel.getRevenueByMonth(monthsCount);
    const [packageRows] = await ReportModel.getPackageBreakdown();
    const [newMembersRows] = await ReportModel.getNewMembershipsByMonth(
      monthsCount
    );

    const revenueByMonth = byMonthRows.map((r) => ({
      month: r.month_label,
      month_key: r.month_key,
      revenue: Number(r.revenue),
    }));

    const newMembersByMonth = newMembersRows.map((r) => ({
      month: r.month_label,
      month_key: r.month_key,
      new_members: Number(r.new_members),
    }));

    // average monthly revenue across the returned window
    const avgMonthly =
      revenueByMonth.length > 0
        ? revenueByMonth.reduce((s, m) => s + m.revenue, 0) /
          revenueByMonth.length
        : 0;

    return res.status(200).json({
      success: true,
      data: {
        total_revenue: Number(totalRow.total_revenue),
        revenue_this_month: Number(thisMonthRow.revenue_this_month),
        average_monthly_revenue: Number(avgMonthly.toFixed(2)),
        revenue_by_month: revenueByMonth,
        new_members_by_month: newMembersByMonth,
        packages: packageRows.map((r) => ({
          package_id: r.package_id,
          package_name: r.package_name,
          member_count: Number(r.member_count),
          revenue: Number(r.revenue),
        })),
      },
    });
  } catch (err) {
    console.error("getReportsSummary error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  getRevenueReport,
  getMembershipReport,
  getTrendsReport,
  getReportsSummary,
};