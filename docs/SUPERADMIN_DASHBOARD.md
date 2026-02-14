# Superadmin Dashboard

## Overview

The Superadmin Dashboard provides comprehensive system-wide monitoring, analytics, and management capabilities for the MamaSafe AI team. Built with Apple/Google-level design principles, it offers a professional, intuitive interface for overseeing all aspects of the platform.

## Features

### 1. System Overview
- **Real-time Metrics**: Total patients, facilities, active users, enrollments
- **Risk Monitoring**: High-risk patient tracking and alerts
- **Task Management**: Pending tasks across all clinics
- **System Health**: Database, API, and messaging service status

### 2. Facility Monitoring
- **All Facilities View**: Complete list of clinics and pharmacies
- **Performance Metrics**: Patient counts, activity levels per facility
- **Status Tracking**: Active/inactive facility monitoring
- **Search & Filter**: Quick facility lookup and filtering

### 3. Analytics Dashboard
- **Enrollment Trends**: 30-day enrollment visualization
- **Risk Distribution**: Visual breakdown of patient risk levels
- **Geographic Distribution**: Patient and facility distribution by location
- **Weekly/Monthly Trends**: Time-based analytics

### 4. Patient Management
- **Global Patient Search**: Search across all facilities
- **Patient Details**: Complete patient information access
- **Risk Status**: Quick view of patient risk levels
- **Alert Tracking**: Monitor patient alerts and notifications

### 5. System Health Monitoring
- **Service Status**: Real-time database, API, and messaging status
- **Health Indicators**: Visual health status (healthy/degraded/down)
- **Component Monitoring**: Individual service health tracking

## Architecture

### Service Layer
- **SuperadminService**: Centralized service for all superadmin operations
- **Data Aggregation**: Efficient data collection from multiple sources
- **Caching**: Optimized data fetching with localStorage fallback

### Component Structure
- **MetricCard**: Reusable metric display component
- **ChartCard**: Interactive chart component (area, line, bar)
- **FacilityCard**: Facility information card
- **SystemHealthCard**: System health status display
- **PatientSearchModal**: Patient search interface

### Design Principles
- **Modular Architecture**: Each component is self-contained and reusable
- **Single Responsibility**: Each service/component has one clear purpose
- **OOP Design**: Class-based services with clear interfaces
- **Responsive Design**: Works seamlessly on all device sizes
- **Dark Mode Support**: Full dark mode compatibility

## Authentication

### Superadmin Login
- **Email**: `superadmin@mamasafe.ai`
- **Phone**: `+254700000001`
- **Password**: `1234` (default, should be changed in production)

### Role-Based Access
- Superadmin role is separate from clinic/pharmacy/patient roles
- Full system access with read/write capabilities
- Audit logging for all superadmin actions

## Database Schema

The superadmin dashboard uses existing tables:
- `users`: All user accounts (patients, clinics, pharmacies)
- `patients`: Patient records
- `tasks`: Clinic tasks
- `refills`: Pharmacy refill requests
- `reminders`: Scheduled reminders
- `medications`: Patient medications

## Usage

### Accessing the Dashboard
1. Login with superadmin credentials
2. Navigate to the dashboard (default view)
3. Use tabs to switch between Overview, Facilities, and Analytics

### Key Actions
- **Refresh Data**: Click the refresh button to update all metrics
- **Search Patients**: Use the "Search Patients" button to find any patient
- **View Facilities**: Click on facility cards to view details
- **Export Data**: Use the export button to download reports

## Performance

- **Auto-refresh**: Data refreshes every 5 minutes automatically
- **Lazy Loading**: Components load data on demand
- **Optimized Queries**: Efficient database queries with proper indexing
- **Caching**: localStorage caching for faster subsequent loads

## Security

- **Role-Based Access Control**: Only superadmin role can access
- **Data Privacy**: Respects patient privacy and data protection
- **Audit Logging**: All actions are logged for compliance
- **Secure Authentication**: Password hashing and secure session management

## Future Enhancements

- User management interface (create/edit/delete users)
- Advanced filtering and search capabilities
- Custom report generation
- Real-time notifications for system events
- Integration with external monitoring tools
- Performance analytics and optimization insights

## Technical Details

### Technologies Used
- React 19.2.4
- TypeScript
- Tailwind CSS
- Recharts (for data visualization)
- Supabase (database)
- Lucide React (icons)

### File Structure
```
services/backend/
  └── superadminService.ts      # Main service class
views/
  └── SuperadminDashboard.tsx   # Main dashboard view
components/admin/
  ├── MetricCard.tsx            # Metric display component
  ├── ChartCard.tsx             # Chart component
  ├── FacilityCard.tsx          # Facility card component
  ├── SystemHealthCard.tsx      # Health status component
  └── PatientSearchModal.tsx    # Patient search modal
```

## Setup

1. Ensure Supabase is configured with proper credentials
2. Run the seed script to create superadmin user:
   ```sql
   -- Run supabase/seed-admin.sql in Supabase SQL Editor
   ```
3. Login with superadmin credentials
4. Access the dashboard

## Support

For issues or questions about the superadmin dashboard, contact the development team or refer to the main project documentation.
