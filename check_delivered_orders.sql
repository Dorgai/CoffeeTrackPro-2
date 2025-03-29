-- Check delivered orders
SELECT 
  o.id as order_id,
  o.status,
  o.small_bags,
  o.large_bags,
  gc.grade,
  gc.name as coffee_name,
  s.name as shop_name,
  o.updated_at
FROM orders o
JOIN green_coffee gc ON o.green_coffee_id = gc.id
JOIN shops s ON o.shop_id = s.id
WHERE o.status = 'delivered'
ORDER BY o.updated_at DESC;

-- Check billing events
SELECT 
  be.id as billing_event_id,
  be.cycle_start_date,
  be.cycle_end_date,
  be.status,
  be.created_at,
  u.username as created_by
FROM billing_events be
JOIN users u ON be.created_by_id = u.id
ORDER BY be.cycle_end_date DESC;

-- Check billing event details
SELECT 
  bed.billing_event_id,
  bed.grade,
  bed.small_bags_quantity,
  bed.large_bags_quantity
FROM billing_event_details bed
JOIN billing_events be ON bed.billing_event_id = be.id
ORDER BY be.cycle_end_date DESC; 