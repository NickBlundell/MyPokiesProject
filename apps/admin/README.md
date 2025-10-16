# MyPokies Admin Panel

A comprehensive casino management system for the MyPokies platform, providing administrative controls, player management, analytics, and CRM capabilities.

## 🚀 Features Implemented

### ✅ Phase 1 Complete
- **Project Setup**: Next.js 14 with TypeScript and Tailwind CSS
- **Database Schema**: Complete admin system with 15+ tables
  - Admin users with role-based access control
  - Audit logging for all admin actions
  - Player management and notes system
  - Marketing campaigns and segments
  - Support ticket system
  - Compliance and KYC management
- **Authentication System**: Admin-specific auth with roles (super_admin, admin, support, marketing, finance)
- **Admin Dashboard Layout**: Professional sidebar navigation with nested menus
- **Overview Dashboard**: Real-time KPIs including:
  - Total and active players
  - Today's deposits and revenue
  - Active bonuses and VIP players
  - Pending KYC checks
  - Recent activity feed
  - System alerts

## 🏗️ Architecture

### Tech Stack
- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS
- **Database**: PostgreSQL (Supabase)
- **Authentication**: Supabase Auth with custom admin roles
- **Icons**: Lucide React

### Project Structure
```
MyPokiesAdmin/
├── app/                    # Next.js app directory
│   ├── dashboard/         # Dashboard pages
│   ├── login/            # Authentication
│   └── api/              # API routes
├── components/            # React components
│   └── admin/            # Admin-specific components
├── lib/                   # Utilities
│   ├── auth/             # Authentication helpers
│   └── supabase/         # Database clients
├── types/                 # TypeScript definitions
└── supabase/             # Database migrations
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- NPM or Yarn
- Access to MyPokies Supabase database

### Installation

1. Install dependencies:
```bash
cd /Users/jo/MyPokiesAdmin
npm install
```

2. Environment variables are already configured in `.env.local`

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

### Default Admin Login
- **Email**: admin@mypokies.com
- **Password**: (Set in the database - needs to be configured)

## 📊 Database Schema

The admin system extends the existing MyPokies database with:

### Core Admin Tables
- `admin_users` - Admin accounts with roles and permissions
- `admin_sessions` - Active admin sessions
- `admin_audit_logs` - Complete audit trail

### CRM & Marketing
- `player_notes` - Internal notes about players
- `player_tags` - Segmentation tags
- `player_segments` - Dynamic and static segments
- `marketing_campaigns` - Email/SMS campaigns
- `campaign_sends` - Campaign delivery tracking

### Support & Compliance
- `support_tickets` - Customer support system
- `ticket_messages` - Ticket conversations
- `compliance_checks` - KYC/AML verification
- `player_limits` - Responsible gaming limits

### Reporting
- `scheduled_reports` - Automated report configuration
- `report_runs` - Report execution history

## 🔐 Security Features

- **Role-Based Access Control (RBAC)**: 5 admin roles with specific permissions
- **Audit Logging**: Every admin action is logged
- **Row Level Security (RLS)**: Database-level security policies
- **Two-Factor Authentication**: Support for 2FA (implementation pending)
- **IP Whitelisting**: Can restrict admin access by IP

## 📈 Admin Roles & Permissions

### Super Admin
- Full system access
- Manage other admins
- Access all features

### Admin
- Player management
- Bonus management
- Transaction viewing
- Analytics access

### Support
- View players
- Manage support tickets
- View transactions

### Marketing
- Campaign management
- Player segmentation
- Analytics access

### Finance
- Transaction management
- Withdrawal approvals
- Financial reports

## 🎯 Next Steps

### Phase 2: Player Management
- [ ] Player search and filtering
- [ ] Detailed player profiles
- [ ] Transaction history
- [ ] Bonus assignment interface

### Phase 3: CRM & Marketing
- [ ] Email/SMS campaign builder
- [ ] Automated marketing workflows
- [ ] Player segmentation UI
- [ ] A/B testing framework

### Phase 4: Advanced Features
- [ ] Real-time analytics dashboard
- [ ] Fraud detection alerts
- [ ] Affiliate management system
- [ ] Custom report builder

## 🛠️ Development

### Run Database Migration
```bash
PGPASSWORD='Msnrocks4u@' psql -h aws-1-ap-southeast-2.pooler.supabase.com \
  -U postgres.hupruyttzgeytlysobar -d postgres -p 6543 \
  -f supabase/migrations/20250110_admin_system.sql
```

### Build for Production
```bash
npm run build
npm start
```

## 📝 Notes

- The admin panel shares the same Supabase database as MyPokies
- Service role key is used for admin operations
- Real-time subscriptions available for live data updates
- All player data from MyPokies is accessible

## 🤝 Integration Points

### MyPokies Main App
- Shared database (Supabase)
- Shared user data
- Shared transaction records
- Shared bonus system

### External Services (To Configure)
- **Email**: Resend or SendGrid
- **SMS**: Twilio
- **Analytics**: Google Analytics or Mixpanel
- **Payment Processing**: Via MyPokies integration

## 🚨 Important Security Notes

1. **Change Default Admin Password**: The default admin password must be changed immediately
2. **Configure 2FA**: Enable two-factor authentication for all admin accounts
3. **IP Whitelist**: Consider restricting admin panel access to specific IPs
4. **Regular Audits**: Review admin audit logs regularly
5. **Principle of Least Privilege**: Only grant necessary permissions to each admin role

## 📞 Support

For issues or questions about the admin panel, please contact the development team.

---

**MyPokies Admin Panel** - Casino Management System v1.0.0