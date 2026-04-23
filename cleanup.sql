-- DATABASE CLEANUP SCRIPT
-- This script removes transactional data while preserving core catalog and settings.

BEGIN;

-- 1. Remove all transactional records
TRUNCATE TABLE 
    public.audit_log,
    public.shop_talk,
    public.tasks,
    public.appointments,
    public.quotations,
    public.sale_items,
    public.sales,
    public.grn_items,
    public.grns,
    public.inventory_lots,
    public.supplier_returns,
    public.supplier_payments,
    public.hotel_tires,
    public.invoices,
    public.accounts,
    public.customers,
    public.vehicles,
    public.suppliers,
    public.tires,
    public.parts,
    public.workers
CASCADE;

COMMIT;
