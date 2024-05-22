const db = require('../../config/db_wrapper');

exports.getReportData = async () => {
  return await db.query("SELECT r.*, rr.reason as ReportReason, uv.name as Reported, u.name FROM report_users r JOIN users uv ON uv.id = r.report_user_id JOIN users u ON r.user_id = u.id JOIN report_reasons rr ON rr.id = r.report_reason");
}

exports.deleteReport = async (id) => {
  return await db.execute(`DELETE FROM report_users WHERE id = ?`, [id]);
}
