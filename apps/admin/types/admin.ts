// Admin User Types
export interface AdminUser {
  id: string
  email: string
  full_name: string
  role: AdminRole
  permissions: string[]
  created_at: string
  last_login?: string
  is_active: boolean
  two_factor_enabled: boolean
}

export type AdminRole = 'super_admin' | 'admin' | 'support' | 'marketing' | 'finance'

export interface AdminPermission {
  id: string
  name: string
  description: string
  resource: string
  action: string
}

// Audit Log Types
export interface AdminAuditLog {
  id: string
  admin_user_id: string
  action: string
  resource_type: string
  resource_id?: string
  details?: any
  ip_address: string
  user_agent?: string
  created_at: string
}

// Player Management Types (extending from MyPokies)
export interface Player {
  id: string
  external_user_id: string
  email?: string
  phone?: string
  full_name?: string
  created_at: string
  updated_at: string
  last_login?: string
  status: 'active' | 'suspended' | 'banned' | 'self_excluded'
  kyc_status: 'pending' | 'verified' | 'rejected' | 'not_required'
  vip_tier?: string
  total_deposits: number
  total_withdrawals: number
  current_balance: number
  bonus_balance: number
  lifetime_value: number
  risk_score?: number
  tags?: string[]
  notes?: PlayerNote[]
}

export interface PlayerNote {
  id: string
  player_id: string
  admin_user_id: string
  note: string
  category: 'general' | 'support' | 'compliance' | 'vip' | 'marketing'
  created_at: string
  admin_name?: string
}

// Analytics Types
export interface DashboardKPI {
  label: string
  value: number | string
  change?: number
  changeType?: 'increase' | 'decrease'
  format?: 'currency' | 'number' | 'percentage'
}

export interface PlayerSegment {
  id: string
  name: string
  description: string
  criteria: SegmentCriteria[]
  player_count: number
  created_at: string
  updated_at: string
}

export interface SegmentCriteria {
  field: string
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'between'
  value: any
}

// CRM Types
export interface MarketingCampaign {
  id: string
  name: string
  type: 'email' | 'sms' | 'push' | 'in_app'
  status: 'draft' | 'scheduled' | 'active' | 'paused' | 'completed'
  segment_id?: string
  content: CampaignContent
  schedule?: CampaignSchedule
  metrics?: CampaignMetrics
  created_by: string
  created_at: string
  updated_at: string
}

export interface CampaignContent {
  subject?: string
  body: string
  template_id?: string
  variables?: Record<string, any>
}

export interface CampaignSchedule {
  start_date: string
  end_date?: string
  timezone: string
  recurrence?: 'once' | 'daily' | 'weekly' | 'monthly'
}

export interface CampaignMetrics {
  sent: number
  delivered: number
  opened: number
  clicked: number
  converted: number
  revenue: number
}

// Financial Types
export interface TransactionSummary {
  total_deposits: number
  total_withdrawals: number
  total_bonuses: number
  total_wagering: number
  net_revenue: number
  period: 'today' | 'week' | 'month' | 'year' | 'all_time'
}

export interface PaymentMethod {
  id: string
  name: string
  type: 'credit_card' | 'debit_card' | 'bank_transfer' | 'e_wallet' | 'crypto'
  is_active: boolean
  min_amount: number
  max_amount: number
  processing_time: string
  fees: number
}

// Bonus Management Types
export interface BonusAssignment {
  player_id: string
  bonus_offer_id: string
  amount: number
  reason?: string
  expires_at?: string
}

// Support Types
export interface SupportTicket {
  id: string
  player_id: string
  subject: string
  description: string
  status: 'open' | 'in_progress' | 'resolved' | 'closed'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  assigned_to?: string
  category: string
  created_at: string
  updated_at: string
  resolved_at?: string
}

// Compliance Types
export interface ComplianceCheck {
  id: string
  player_id: string
  check_type: 'kyc' | 'aml' | 'source_of_funds' | 'pep'
  status: 'pending' | 'passed' | 'failed' | 'manual_review'
  result?: any
  notes?: string
  checked_by?: string
  checked_at: string
}