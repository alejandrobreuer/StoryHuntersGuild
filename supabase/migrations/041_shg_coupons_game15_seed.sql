-- ═══════════════════════════════════════════════════════════════════════════
-- Story Hunters Guild — seed the first batch of GAME15 coupons (15% off)
-- ═══════════════════════════════════════════════════════════════════════════
-- Run AFTER 040_shg_coupons.sql. 30 single-use codes, all at 15% off.
-- ON CONFLICT targets the same case-insensitive unique index the table
-- already has (shg_coupons_code_upper_idx), so running this twice is a
-- no-op the second time rather than erroring or duplicating rows.

insert into shg_coupons (code, discount_percent) values
  ('GAME15-UF52P7', 15), ('GAME15-SJ6YMV', 15), ('GAME15-JHSABJ', 15),
  ('GAME15-RCYUWS', 15), ('GAME15-FG4F35', 15), ('GAME15-DUP8EQ', 15),
  ('GAME15-ELTYGP', 15), ('GAME15-YX3ZMJ', 15), ('GAME15-TW5EQC', 15),
  ('GAME15-5SXNR4', 15), ('GAME15-Y5K87Y', 15), ('GAME15-KUU8JR', 15),
  ('GAME15-UFKFMN', 15), ('GAME15-M9XN3Y', 15), ('GAME15-47G2QH', 15),
  ('GAME15-8LVV9G', 15), ('GAME15-YLVUGH', 15), ('GAME15-3LXE3B', 15),
  ('GAME15-FRAJC2', 15), ('GAME15-9QX547', 15), ('GAME15-BQ3KAQ', 15),
  ('GAME15-MLVXES', 15), ('GAME15-DFVGBL', 15), ('GAME15-8EJDKQ', 15),
  ('GAME15-HFEUNZ', 15), ('GAME15-LDYDH8', 15), ('GAME15-NCQMTJ', 15),
  ('GAME15-9XAWQA', 15), ('GAME15-MMYK4Y', 15), ('GAME15-QBSNA2', 15)
on conflict (upper(code)) do nothing;
