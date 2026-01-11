-- Migration: RPC exec_sql + suppression tables deprecatees
-- Date: 2026-01-12
-- Description: Ajoute exec_sql pour operations MCP et supprime les tables legacy

-- ============================================================================
-- 1. RPC exec_sql (usage MCP)
-- ============================================================================

CREATE OR REPLACE FUNCTION exec_sql(sql TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  EXECUTE sql;
END;
$$;

REVOKE EXECUTE ON FUNCTION exec_sql(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION exec_sql(TEXT) TO service_role;

-- ============================================================================
-- 2. SUPPRESSION TABLES LEGACY
-- ============================================================================

DROP TABLE IF EXISTS face_zone_overrides CASCADE;
DROP TABLE IF EXISTS face_mask_fits CASCADE;
DROP TABLE IF EXISTS face_calibrations CASCADE;
