# Pharmacy Dashboard Metrics Explained

## Overview

The Pharmacy Dashboard displays four key metrics to help pharmacy staff manage operations efficiently.

---

## 1. Pending Refills

### What It Means
**Pending Refills** shows the number of medication refill requests that are waiting to be processed.

### How It Works
- Counts all refill requests with status: **"pending"**
- These are requests from patients/clinics that need to be:
  - Reviewed
  - Approved or rejected
  - Dispensed to patients

### What You See
- **Number**: Total count of pending requests
- **Status Indicator**:
  - **Green/Brand color**: 1-5 pending (normal workload)
  - **Red/Alert color**: 6+ pending (high workload, needs attention)
  - **Gray**: 0 pending (all caught up)

### Example
If you see **"8 Pending Refills"**:
- 8 patients are waiting for medication refills
- These need to be processed
- Click the card to view the full list in the Refill Queue

---

## 2. Dispensed Today

### What It Means
**Dispensed Today** shows the number of medications you've successfully dispensed today.

### How It Works
- Counts all refill requests with status: **"dispensed"**
- Currently shows all-time dispensed count (may need filtering by date)
- Updates automatically when you click "Dispense" on a refill request

### What You See
- **Number**: Count of dispensed medications
- **Subtitle**: "Since 8:00 AM" (indicates daily tracking)
- **Trend**: Shows percentage change (e.g., "12% up")

### Example
If you see **"15 Dispensed Today"**:
- You've dispensed 15 medications today
- This helps track daily productivity
- Useful for reporting and workflow management

### Note
This metric currently counts all dispensed refills. For accurate "today" tracking, it should filter by date.

---

## 3. Stock Alerts

### What It Means
**Stock Alerts** shows the number of medications that are running low and need to be restocked.

### How It Works
- Compares current stock level to minimum threshold
- Alerts when: `current stock <= minimum level`
- Each medication has a minimum level set in inventory

### What You See
- **Number**: Count of low stock items
- **Status Indicator**:
  - **Red/Alert color**: Items need immediate restocking
  - **Gray**: All items have adequate stock
- **Clickable**: Click to view detailed inventory

### Example
If you see **"3 Stock Alerts"**:
- 3 medications are below minimum stock level
- Click the card to see which medications
- You'll see:
  - Medication name
  - Current stock (e.g., "5 tablets remaining")
  - "Order" button to restock

### Low Stock Criteria
- Each medication has a `minLevel` (minimum stock threshold)
- Alert triggers when: `stock <= minLevel`
- Example: If minLevel is 20 and you have 15, it shows as alert

---

## 4. Assigned Patients (Bonus Metric)

### What It Means
Shows the total number of patients assigned to your pharmacy.

### How It Works
- Currently shows a static count (156)
- Represents patients with active prescriptions
- Click to view patient list

---

## How These Metrics Work Together

### Daily Workflow

1. **Morning Check**
   - Check **Pending Refills** - see what needs processing
   - Check **Stock Alerts** - see what needs ordering

2. **During Day**
   - Process pending refills
   - Dispense medications
   - Watch **Dispensed Today** increase

3. **End of Day**
   - Review **Dispensed Today** count
   - Check if all **Pending Refills** are cleared
   - Address any **Stock Alerts**

---

## Visual Indicators

### Color Coding

- **Green/Brand**: Normal status, good to go
- **Red/Alert**: Needs attention, action required
- **Gray**: Inactive or no items

### Trend Indicators

- **Up arrow**: Increasing (e.g., more pending refills)
- **Down arrow**: Decreasing (e.g., fewer pending refills)
- **Percentage**: Shows change rate

---

## Quick Actions

### From Pending Refills Card
- Click to view full refill queue
- See all pending requests
- Process them directly

### From Stock Alerts Card
- Click to open inventory modal
- See all low stock items
- View all inventory items
- Click "Order" to restock

---

## Best Practices

### Pending Refills
- Check regularly throughout the day
- Process urgent requests first
- Aim to keep count below 5
- If above 10, consider additional staff

### Dispensed Today
- Track daily productivity
- Compare day-to-day performance
- Use for reporting to management

### Stock Alerts
- Check daily before opening
- Order before stock runs out
- Set appropriate minimum levels
- Keep critical medications well-stocked

---

## Troubleshooting

### Pending Refills Not Updating
- Refresh the page
- Check internet connection
- Verify refill requests are being created

### Stock Alerts Not Showing
- Check if inventory items have `minLevel` set
- Verify stock levels in inventory
- Ensure items exist in inventory table

### Dispensed Today Count Wrong
- Currently shows all-time dispensed
- May need date filtering for accurate "today" count
- Check refill status is "dispensed"

---

## Summary

| Metric | What It Shows | When to Act |
|--------|---------------|-------------|
| **Pending Refills** | Unprocessed refill requests | When count > 5 |
| **Dispensed Today** | Medications dispensed today | Track daily productivity |
| **Stock Alerts** | Low inventory items | When count > 0 (order immediately) |
| **Assigned Patients** | Total patients | For reference |

---

**These metrics help you manage pharmacy operations efficiently and ensure patients receive their medications on time.**
