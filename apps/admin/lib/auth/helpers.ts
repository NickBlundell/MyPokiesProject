import { createAdminClient } from '@/lib/supabase/server'
import { AdminUser, AdminRole } from '@/types/admin'

export async function getAdminUser(email: string): Promise<AdminUser | null> {
  const supabase = await createAdminClient()

  const { data, error } = await supabase
    .from('admin_users')
    .select('*')
    .eq('email', email)
    .eq('is_active', true)
    .single()

  if (error || !data) {
    return null
  }

  return data as AdminUser
}

export async function checkAdminPermission(
  adminId: string,
  permission: string
): Promise<boolean> {
  const supabase = await createAdminClient()

  const { data } = await supabase
    .rpc('check_admin_permission', {
      p_admin_user_id: adminId,
      p_permission: permission
    })

  return data || false
}

export async function logAdminAction(
  adminId: string,
  action: string,
  resourceType: string,
  resourceId?: string,
  details?: Record<string, unknown>
): Promise<void> {
  const supabase = await createAdminClient()

  await supabase.rpc('log_admin_action', {
    p_admin_user_id: adminId,
    p_action: action,
    p_resource_type: resourceType,
    p_resource_id: resourceId,
    p_details: details,
    p_ip_address: null, // Would get from request
    p_user_agent: null  // Would get from request
  })
}

export function hasRole(userRole: AdminRole, allowedRoles: AdminRole[]): boolean {
  return allowedRoles.includes(userRole)
}

export function canAccessResource(
  userRole: AdminRole,
  resource: string
): boolean {
  const rolePermissions: Record<AdminRole, string[]> = {
    super_admin: ['*'], // All permissions
    admin: [
      'players.view',
      'players.edit',
      'bonuses.view',
      'bonuses.assign',
      'transactions.view',
      'analytics.view',
      'support.view',
      'support.manage'
    ],
    support: [
      'players.view',
      'support.view',
      'support.manage',
      'transactions.view'
    ],
    marketing: [
      'players.view',
      'campaigns.view',
      'campaigns.manage',
      'segments.view',
      'segments.manage',
      'analytics.view'
    ],
    finance: [
      'transactions.view',
      'withdrawals.view',
      'withdrawals.approve',
      'analytics.view',
      'reports.view'
    ]
  }

  const permissions = rolePermissions[userRole] || []

  return permissions.includes('*') || permissions.includes(resource)
}