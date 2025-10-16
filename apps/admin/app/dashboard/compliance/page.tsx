import { createAdminClient } from '@/lib/supabase/server'
import { logger } from '@mypokies/monitoring'
import ComplianceClient from './ComplianceClient'

interface KYCVerification {
  id: string
  playerId: string
  playerUsername: string
  playerEmail: string
  verificationType: 'identity' | 'address' | 'payment' | 'source_of_funds'
  status: 'pending' | 'under_review' | 'approved' | 'rejected' | 'expired'
  submittedAt: string
  reviewedAt?: string
  reviewer?: string
  documents: number
  riskLevel: 'low' | 'medium' | 'high'
  expiryDate?: string
  notes?: string
}

interface ComplianceAlert {
  id: string
  type: 'aml' | 'responsible_gaming' | 'kyc' | 'regulatory' | 'fraud'
  severity: 'low' | 'medium' | 'high' | 'critical'
  playerId?: string
  playerUsername?: string
  description: string
  createdAt: string
  status: 'open' | 'investigating' | 'resolved'
}

interface ComplianceStats {
  verifiedUsers: number
  pendingKyc: number
  amlAlerts: number
  criticalAlerts: number
  selfExcluded: number
  totalDocuments: number
  complianceRate: number
}

interface ResponsibleGamingStats {
  selfExclusions: number
  depositLimits: number
  timeOuts: number
  problemIndicators: number
}

async function getComplianceData() {
  const supabase = await createAdminClient()

  // Initialize default data
  const defaultData = {
    kycVerifications: [] as KYCVerification[],
    complianceAlerts: [] as ComplianceAlert[],
    stats: {
      verifiedUsers: 0,
      pendingKyc: 0,
      amlAlerts: 0,
      criticalAlerts: 0,
      selfExcluded: 0,
      totalDocuments: 0,
      complianceRate: 0
    } as ComplianceStats,
    responsibleGamingStats: {
      selfExclusions: 0,
      depositLimits: 0,
      timeOuts: 0,
      problemIndicators: 0
    } as ResponsibleGamingStats
  }

  try {
    // Try to fetch KYC verifications from possible table names
    let kycData = null

    // Try kyc_verifications table first
    const { data: kycVerifications, error: _kycError1 } = await supabase
      .from('kyc_verifications')
      .select(`
        id,
        user_id,
        verification_type,
        status,
        risk_level,
        submitted_at,
        reviewed_at,
        reviewer_id,
        expiry_date,
        notes,
        users (
          id,
          external_user_id,
          email
        )
      `)
      .order('submitted_at', { ascending: false })
      .limit(50)

    if (!_kycError1 && kycVerifications) {
      kycData = kycVerifications
    } else {
      // Try verifications table
      const { data: verifications, error: _kycError2 } = await supabase
        .from('verifications')
        .select(`
          id,
          user_id,
          type,
          status,
          created_at,
          updated_at,
          users (
            id,
            external_user_id,
            email
          )
        `)
        .order('created_at', { ascending: false })
        .limit(50)

      if (!_kycError2 && verifications) {
        kycData = verifications
      }
    }

    // Transform KYC data
    if (kycData) {
      // Count documents for each verification
      const verificationsWithDocs = await Promise.all(kycData.map(async (verification: Record<string, unknown>) => {
        let documentCount = 0

        // Try to get document count from kyc_documents table
        const { count: docCount } = await supabase
          .from('kyc_documents')
          .select('id', { count: 'exact', head: true })
          .eq('verification_id', verification.id)

        if (docCount !== null) {
          documentCount = docCount
        }

        const users = verification.users as Record<string, unknown> | undefined
        const submittedDate = (verification.submitted_at || verification.created_at) as string | undefined
        const reviewedDate = verification.reviewed_at as string | undefined
        const expiryDate = verification.expiry_date as string | undefined

        return {
          id: verification.id as string,
          playerId: (verification.user_id as string) || '',
          playerUsername: (users?.external_user_id as string) || 'Unknown',
          playerEmail: (users?.email as string) || 'No email',
          verificationType: (verification.verification_type || verification.type || 'identity') as 'identity' | 'address' | 'payment' | 'source_of_funds',
          status: (verification.status || 'pending') as 'pending' | 'under_review' | 'approved' | 'rejected' | 'expired',
          submittedAt: submittedDate ? new Date(submittedDate).toLocaleString() : new Date().toLocaleString(),
          reviewedAt: reviewedDate ? new Date(reviewedDate).toLocaleString() : undefined,
          reviewer: verification.reviewer_id ? `Admin ${verification.reviewer_id as string}` : undefined,
          documents: documentCount,
          riskLevel: (verification.risk_level || 'low') as 'low' | 'medium' | 'high',
          expiryDate: expiryDate ? new Date(expiryDate).toLocaleDateString() : undefined,
          notes: (verification.notes as string) || undefined
        }
      }))

      defaultData.kycVerifications = verificationsWithDocs
    }

    // Try to fetch compliance alerts from possible table names
    let alertsData = null

    // Try compliance_alerts table first
    const { data: complianceAlerts, error: alertError1 } = await supabase
      .from('compliance_alerts')
      .select(`
        id,
        type,
        severity,
        user_id,
        description,
        status,
        created_at,
        users (
          id,
          external_user_id,
          email
        )
      `)
      .order('created_at', { ascending: false })
      .limit(50)

    if (!alertError1 && complianceAlerts) {
      alertsData = complianceAlerts
    } else {
      // Try aml_alerts table
      const { data: amlAlerts, error: alertError2 } = await supabase
        .from('aml_alerts')
        .select(`
          id,
          type,
          severity,
          user_id,
          description,
          status,
          created_at,
          users (
            id,
            external_user_id,
            email
          )
        `)
        .order('created_at', { ascending: false })
        .limit(50)

      if (!alertError2 && amlAlerts) {
        alertsData = amlAlerts
      } else {
        // Try generic alerts table
        const { data: alerts, error: alertError3 } = await supabase
          .from('alerts')
          .select(`
            id,
            type,
            severity,
            user_id,
            description,
            status,
            created_at,
            users (
              id,
              external_user_id,
              email
            )
          `)
          .in('type', ['aml', 'responsible_gaming', 'kyc', 'regulatory', 'fraud'])
          .order('created_at', { ascending: false })
          .limit(50)

        if (!alertError3 && alerts) {
          alertsData = alerts
        }
      }
    }

    // Transform alerts data
    if (alertsData) {
      defaultData.complianceAlerts = alertsData.map((alert: Record<string, unknown>) => ({
        id: alert.id as string,
        type: (alert.type || 'aml') as 'aml' | 'responsible_gaming' | 'kyc' | 'regulatory' | 'fraud',
        severity: (alert.severity || 'medium') as 'low' | 'medium' | 'high' | 'critical',
        playerId: alert.user_id as string | undefined,
        playerUsername: (alert.users as Record<string, unknown> | undefined)?.external_user_id as string | undefined,
        description: (alert.description as string) || 'No description',
        createdAt: new Date(alert.created_at as string).toLocaleString(),
        status: (alert.status || 'open') as 'open' | 'investigating' | 'resolved'
      }))
    }

    // Try to fetch responsible gaming data
    let selfExcludedCount = 0
    let depositLimitsCount = 0
    let timeOutsCount = 0
    let problemIndicatorsCount = 0

    // Try self_exclusions table
    const { count: selfExcCount } = await supabase
      .from('self_exclusions')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true)

    if (selfExcCount !== null) {
      selfExcludedCount = selfExcCount
    }

    // Try user_limits table for deposit limits
    const { count: limitsCount } = await supabase
      .from('user_limits')
      .select('id', { count: 'exact', head: true })
      .not('deposit_limit', 'is', null)

    if (limitsCount !== null) {
      depositLimitsCount = limitsCount
    }

    // Try responsible_gaming table for time outs
    const { count: timeOutCount } = await supabase
      .from('responsible_gaming')
      .select('id', { count: 'exact', head: true })
      .eq('timeout_active', true)

    if (timeOutCount !== null) {
      timeOutsCount = timeOutCount
    }

    // Count problem indicators from responsible gaming alerts
    problemIndicatorsCount = defaultData.complianceAlerts.filter(
      alert => alert.type === 'responsible_gaming' && alert.status === 'open'
    ).length

    defaultData.responsibleGamingStats = {
      selfExclusions: selfExcludedCount,
      depositLimits: depositLimitsCount,
      timeOuts: timeOutsCount,
      problemIndicators: problemIndicatorsCount
    }

    // Calculate statistics from fetched data
    const verifiedCount = defaultData.kycVerifications.filter(
      v => v.status === 'approved'
    ).length

    const pendingCount = defaultData.kycVerifications.filter(
      v => v.status === 'pending' || v.status === 'under_review'
    ).length

    const amlAlertCount = defaultData.complianceAlerts.filter(
      a => (a.type === 'aml' || a.type === 'fraud') && a.status !== 'resolved'
    ).length

    const criticalAlertCount = defaultData.complianceAlerts.filter(
      a => a.severity === 'critical' && a.status !== 'resolved'
    ).length

    // Try to get total users count for compliance rate
    const { count: totalUsers } = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true })

    const totalUsersCount = totalUsers || 1 // Avoid division by zero
    const complianceRate = (verifiedCount / totalUsersCount) * 100

    // Count total documents
    const { count: totalDocs } = await supabase
      .from('kyc_documents')
      .select('id', { count: 'exact', head: true })

    defaultData.stats = {
      verifiedUsers: verifiedCount,
      pendingKyc: pendingCount,
      amlAlerts: amlAlertCount,
      criticalAlerts: criticalAlertCount,
      selfExcluded: selfExcludedCount,
      totalDocuments: totalDocs || 0,
      complianceRate: complianceRate
    }

  } catch (error) {
    logger.error('Error fetching compliance data', error, {
      function: 'getComplianceData',
    })
    // Return default empty data on error
  }

  return defaultData
}

export default async function CompliancePage() {
  const data = await getComplianceData()

  return (
    <ComplianceClient
      kycVerifications={data.kycVerifications}
      complianceAlerts={data.complianceAlerts}
      stats={data.stats}
      responsibleGamingStats={data.responsibleGamingStats}
    />
  )
}
