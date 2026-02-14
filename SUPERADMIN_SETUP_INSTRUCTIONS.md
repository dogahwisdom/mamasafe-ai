# Superadmin Dashboard Setup Instructions

## Database Setup

The superadmin dashboard requires additional database tables for subscriptions, support tickets, and SOPs management.

### Step 1: Run SQL Migration

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Open the file `supabase/add-management-tables.sql`
4. Copy the entire contents
5. Paste into the SQL Editor
6. Click **Run** to execute

This will create the following tables:
- `subscriptions` - Facility subscription management
- `support_tickets` - Support ticket tracking
- `support_ticket_messages` - Ticket conversation history
- `sops` - Standard Operating Procedures
- `sop_access_logs` - SOP access tracking and compliance

### Step 2: Verify Tables

After running the migration, verify the tables exist:

1. Go to **Table Editor** in Supabase
2. You should see the new tables listed:
   - subscriptions
   - support_tickets
   - support_ticket_messages
   - sops
   - sop_access_logs

### Step 3: Test the Features

1. Log in as superadmin (`superadmin@mamasafe.ai` / `1234`)
2. Navigate to the Superadmin Dashboard
3. Click on the new tabs:
   - **Subscriptions** - Manage facility subscriptions
   - **Support** - Manage support tickets
   - **SOPs** - Manage Standard Operating Procedures

## Troubleshooting

### Error: "relation does not exist"

**Solution**: The database tables haven't been created yet. Run the SQL migration script in Step 1.

### Error: "permission denied"

**Solution**: Check your Row Level Security (RLS) policies. The migration script includes permissive policies for development. For production, you'll need to customize these based on your security requirements.

### Components Not Loading

**Solution**: 
1. Clear your browser cache
2. Restart the development server
3. Check the browser console for any JavaScript errors

### Empty Data

**Solution**: This is expected if you haven't added any data yet. The features will work with empty states. You can:
- Add test subscriptions via the UI
- Create support tickets
- Add SOPs to the library

## Next Steps

Once the tables are created, you can:

1. **Add Subscriptions**: Use the "Add Subscription" button to create facility subscriptions
2. **Create Support Tickets**: Use the "New Ticket" button to create support tickets
3. **Add SOPs**: Use the "New SOP" button to add Standard Operating Procedures

All features are fully functional and use real database queries.
