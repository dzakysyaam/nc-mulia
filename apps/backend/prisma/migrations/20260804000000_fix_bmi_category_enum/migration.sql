-- Migration: fix_bmi_category_enum_to_match_database
-- Date: 2026-08-04
--
-- Problem:
-- Prisma schema had BmiCategory enum with OVERWEIGHT/OBESITY but the original
-- database migration (20260724165515_init) used KELebihan_BERAT/OBESITAS.
-- This mismatch caused MySQL Error 1265 (Data truncated) when storing OVERWEIGHT
-- or OBESITY, because those values don't exist in the MySQL ENUM column.
--
-- Fix:
-- Updated schema enum values to match the actual database ENUM:
--   BEFORE: OVERWEIGHT / OBESITY
--   AFTER:  KELebihan_BERAT / OBESITAS
--
-- Note: This migration is a no-op for Railway Preview since the database
-- already has the KELebihan_BERAT/OBESITAS values and Prisma will detect
-- no drift after this change. The migration is kept for documentation.

-- Verify current ENUM values (this is informational, not executed as migration)
-- Current DB ENUM: ('KURUS', 'NORMAL', 'KELebihan_BERAT', 'OBESITAS')
-- Target schema ENUM: ('KURUS', 'NORMAL', 'KELebihan_BERAT', 'OBESITAS')
-- Status: No drift detected — no SQL changes needed.

SELECT 'No migration needed. Schema enum now matches database enum.' AS status;
