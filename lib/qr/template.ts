// Private bucket for the mission-card .docx template (created in
// 053_shg_mission_qr_codes.sql). Its storage path lives in shg_settings
// under QR_SETTING_KEYS.templatePath.
export const TEMPLATE_BUCKET = "shg-templates";

export const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export const MAX_TEMPLATE_BYTES = 10 * 1024 * 1024;

/** Ships with the site (public/templates) as a starting point for admins. */
export const SAMPLE_TEMPLATE_URL = "/templates/mission-card-template.docx";
