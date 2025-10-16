'use client'

import { useState } from 'react'
import {
  Shield,
  UserCheck,
  AlertTriangle,
  FileSearch,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Search,
  Filter,
  Download,
  Eye,
  Ban,
  FileText
} from 'lucide-react'

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

interface ComplianceClientProps {
  kycVerifications: KYCVerification[]
  complianceAlerts: ComplianceAlert[]
  stats: ComplianceStats
  responsibleGamingStats: ResponsibleGamingStats
}

export default function ComplianceClient({
  kycVerifications,
  complianceAlerts,
  stats,
  responsibleGamingStats
}: ComplianceClientProps) {
  const [activeTab, setActiveTab] = useState<'kyc' | 'aml' | 'responsible' | 'reports'>('kyc')
  const [searchQuery, setSearchQuery] = useState('')

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { color: string; icon: React.ComponentType<{ className?: string }> }> = {
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: AlertCircle },
      under_review: { color: 'bg-blue-100 text-blue-800', icon: Eye },
      approved: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      rejected: { color: 'bg-red-100 text-red-800', icon: XCircle },
      expired: { color: 'bg-gray-100 text-gray-800', icon: AlertCircle },
      open: { color: 'bg-red-100 text-red-800', icon: AlertCircle },
      investigating: { color: 'bg-yellow-100 text-yellow-800', icon: FileSearch },
      resolved: { color: 'bg-green-100 text-green-800', icon: CheckCircle }
    }

    const config = statusConfig[status]
    const Icon = config.icon

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${config.color}`}>
        <Icon className="w-3 h-3" />
        {status.replace('_', ' ').charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
      </span>
    )
  }

  const getRiskBadge = (risk: string) => {
    const riskConfig: Record<string, { color: string }> = {
      low: { color: 'bg-green-100 text-green-800' },
      medium: { color: 'bg-yellow-100 text-yellow-800' },
      high: { color: 'bg-red-100 text-red-800' }
    }

    const config = riskConfig[risk]

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${config.color}`}>
        {risk.charAt(0).toUpperCase() + risk.slice(1)} Risk
      </span>
    )
  }

  const getSeverityBadge = (severity: string) => {
    const severityConfig: Record<string, { color: string; icon: string }> = {
      low: { color: 'bg-gray-100 text-gray-800', icon: '\u25EF' },
      medium: { color: 'bg-yellow-100 text-yellow-800', icon: '\u25D0' },
      high: { color: 'bg-orange-100 text-orange-800', icon: '\u25D5' },
      critical: { color: 'bg-red-100 text-red-800', icon: '\u25CF' }
    }

    const config = severityConfig[severity]

    return (
      <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${config.color}`}>
        <span className="mr-1">{config.icon}</span>
        {severity.charAt(0).toUpperCase() + severity.slice(1)}
      </span>
    )
  }

  return (
    <div>
      {/* Page Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Compliance Dashboard</h1>
          <p className="text-gray-600 mt-2">KYC verification, AML monitoring, and regulatory compliance</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export Report
          </button>
        </div>
      </div>

      {/* Compliance Stats */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-8">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <UserCheck className="w-6 h-6 text-green-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.verifiedUsers}</p>
          <p className="text-sm text-gray-600">Verified Users</p>
          <p className="text-xs text-green-600 mt-1">{stats.complianceRate.toFixed(1)}% compliance</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <Clock className="w-6 h-6 text-yellow-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.pendingKyc}</p>
          <p className="text-sm text-gray-600">Pending KYC</p>
          {stats.pendingKyc > 0 && (
            <p className="text-xs text-orange-600 mt-1">Action required</p>
          )}
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.amlAlerts}</p>
          <p className="text-sm text-gray-600">AML Alerts</p>
          {stats.criticalAlerts > 0 && (
            <p className="text-xs text-red-600 mt-1">{stats.criticalAlerts} critical</p>
          )}
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <Ban className="w-6 h-6 text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.selfExcluded}</p>
          <p className="text-sm text-gray-600">Self-Excluded</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <FileText className="w-6 h-6 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.totalDocuments}</p>
          <p className="text-sm text-gray-600">Documents</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <Shield className="w-6 h-6 text-indigo-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.complianceRate.toFixed(1)}%</p>
          <p className="text-sm text-gray-600">Compliance Rate</p>
        </div>
      </div>

      {/* Critical Alerts */}
      {stats.criticalAlerts > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-red-900">{stats.criticalAlerts} Critical Compliance Issues</h3>
              <p className="text-sm text-red-700 mt-1">
                High-risk activities detected requiring immediate investigation.
              </p>
            </div>
            <button className="px-3 py-1 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700">
              Review Now
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-6 bg-white rounded-lg border border-gray-200 p-1 w-fit">
        {['kyc', 'aml', 'responsible', 'reports'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as 'kyc' | 'aml' | 'responsible' | 'reports')}
            className={`px-4 py-2 text-sm font-medium rounded-md ${
              activeTab === tab
                ? 'bg-indigo-600 text-white'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            {tab === 'kyc' && 'KYC Verification'}
            {tab === 'aml' && 'AML Monitoring'}
            {tab === 'responsible' && 'Responsible Gaming'}
            {tab === 'reports' && 'Reports'}
          </button>
        ))}
      </div>

      {/* KYC Tab */}
      {activeTab === 'kyc' && (
        <div>
          {/* Filters */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search verifications..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <select className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option>All Status</option>
                <option>Pending</option>
                <option>Under Review</option>
                <option>Approved</option>
                <option>Rejected</option>
              </select>
              <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2">
                <Filter className="w-4 h-4" />
                More Filters
              </button>
            </div>
          </div>

          {/* KYC Table */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Player
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Verification Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Documents
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Risk Level
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Submitted
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {kycVerifications.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                        No KYC verifications found
                      </td>
                    </tr>
                  ) : (
                    kycVerifications
                      .filter(v =>
                        searchQuery === '' ||
                        v.playerUsername.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        v.playerEmail.toLowerCase().includes(searchQuery.toLowerCase())
                      )
                      .map((verification) => (
                        <tr key={verification.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div>
                              <p className="text-sm font-medium text-gray-900">{verification.playerUsername}</p>
                              <p className="text-xs text-gray-500">{verification.playerEmail}</p>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm text-gray-900 capitalize">
                              {verification.verificationType.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-1">
                              <FileText className="w-4 h-4 text-gray-400" />
                              <span className="text-sm text-gray-900">{verification.documents} files</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            {getRiskBadge(verification.riskLevel)}
                          </td>
                          <td className="px-6 py-4">
                            {getStatusBadge(verification.status)}
                            {verification.reviewer && (
                              <p className="text-xs text-gray-500 mt-1">By: {verification.reviewer}</p>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm">
                              <p className="text-gray-900">{verification.submittedAt}</p>
                              {verification.expiryDate && (
                                <p className="text-xs text-gray-500">Expires: {verification.expiryDate}</p>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-1">
                              <button className="p-1 text-indigo-600 hover:bg-indigo-50 rounded" title="Review">
                                <Eye className="w-4 h-4" />
                              </button>
                              {verification.status === 'pending' && (
                                <>
                                  <button className="p-1 text-green-600 hover:bg-green-50 rounded" title="Approve">
                                    <CheckCircle className="w-4 h-4" />
                                  </button>
                                  <button className="p-1 text-red-600 hover:bg-red-50 rounded" title="Reject">
                                    <XCircle className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* AML Tab */}
      {activeTab === 'aml' && (
        <div>
          <div className="space-y-4">
            {complianceAlerts
              .filter(alert => alert.type === 'aml' || alert.type === 'fraud')
              .length === 0 ? (
                <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
                  No AML or fraud alerts found
                </div>
              ) : (
                complianceAlerts
                  .filter(alert => alert.type === 'aml' || alert.type === 'fraud')
                  .map((alert) => (
                    <div key={alert.id} className="bg-white rounded-lg border border-gray-200 p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <AlertTriangle className={`w-5 h-5 mt-0.5 ${
                            alert.severity === 'critical' ? 'text-red-600' :
                            alert.severity === 'high' ? 'text-orange-600' :
                            'text-yellow-600'
                          }`} />
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="text-sm font-semibold text-gray-900">
                                {alert.type === 'aml' ? 'AML Alert' : 'Fraud Alert'}
                              </h3>
                              {getSeverityBadge(alert.severity)}
                              {getStatusBadge(alert.status)}
                            </div>
                            <p className="text-sm text-gray-700">{alert.description}</p>
                            {alert.playerUsername && (
                              <p className="text-xs text-gray-500 mt-1">
                                Player: {alert.playerUsername} (ID: {alert.playerId})
                              </p>
                            )}
                            <p className="text-xs text-gray-500 mt-1">Created: {alert.createdAt}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button className="px-3 py-1 text-sm text-indigo-600 hover:bg-indigo-50 rounded">
                            Investigate
                          </button>
                          <button className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-50 rounded">
                            Dismiss
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
              )}
          </div>

          {/* Transaction Monitoring */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">High-Risk Transactions</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Large Deposits (&gt;$5k)</span>
                  <span className="text-sm font-medium text-red-600">-</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Rapid Withdrawals</span>
                  <span className="text-sm font-medium text-orange-600">-</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Pattern Anomalies</span>
                  <span className="text-sm font-medium text-yellow-600">-</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Unverified Sources</span>
                  <span className="text-sm font-medium text-red-600">-</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Risk Score Distribution</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Low Risk</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div className="bg-green-600 h-2 rounded-full" style={{ width: '75%' }}></div>
                    </div>
                    <span className="text-xs text-gray-600">75%</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Medium Risk</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div className="bg-yellow-600 h-2 rounded-full" style={{ width: '20%' }}></div>
                    </div>
                    <span className="text-xs text-gray-600">20%</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">High Risk</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div className="bg-red-600 h-2 rounded-full" style={{ width: '5%' }}></div>
                    </div>
                    <span className="text-xs text-gray-600">5%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Responsible Gaming Tab */}
      {activeTab === 'responsible' && (
        <div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Self-Exclusions</h4>
              <p className="text-2xl font-bold text-gray-900">{responsibleGamingStats.selfExclusions}</p>
              <p className="text-xs text-gray-500">Active players</p>
            </div>
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Deposit Limits</h4>
              <p className="text-2xl font-bold text-gray-900">{responsibleGamingStats.depositLimits}</p>
              <p className="text-xs text-gray-500">Players with limits</p>
            </div>
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Time Outs</h4>
              <p className="text-2xl font-bold text-gray-900">{responsibleGamingStats.timeOuts}</p>
              <p className="text-xs text-gray-500">Active cooling-off</p>
            </div>
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Problem Indicators</h4>
              <p className="text-2xl font-bold text-gray-900">{responsibleGamingStats.problemIndicators}</p>
              {responsibleGamingStats.problemIndicators > 0 && (
                <p className="text-xs text-red-600">Players flagged</p>
              )}
            </div>
          </div>

          {/* Responsible Gaming Alerts */}
          <div className="space-y-4">
            {complianceAlerts
              .filter(alert => alert.type === 'responsible_gaming')
              .length === 0 ? (
                <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
                  No responsible gaming alerts found
                </div>
              ) : (
                complianceAlerts
                  .filter(alert => alert.type === 'responsible_gaming')
                  .map((alert) => (
                    <div key={alert.id} className="bg-white rounded-lg border border-gray-200 p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="text-sm font-semibold text-gray-900">
                                Responsible Gaming Alert
                              </h3>
                              {getSeverityBadge(alert.severity)}
                              {getStatusBadge(alert.status)}
                            </div>
                            <p className="text-sm text-gray-700">{alert.description}</p>
                            {alert.playerUsername && (
                              <p className="text-xs text-gray-500 mt-1">
                                Player: {alert.playerUsername} (ID: {alert.playerId})
                              </p>
                            )}
                            <p className="text-xs text-gray-500 mt-1">Created: {alert.createdAt}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded">
                            Contact Player
                          </button>
                          <button className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-50 rounded">
                            Review History
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
              )}
          </div>
        </div>
      )}

      {/* Reports Tab */}
      {activeTab === 'reports' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Regulatory Reports</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b">
                <div>
                  <p className="text-sm font-medium text-gray-900">Monthly AML Report</p>
                  <p className="text-xs text-gray-500">Due: Jan 31, 2024</p>
                </div>
                <button className="text-sm text-indigo-600 hover:text-indigo-700">Generate</button>
              </div>
              <div className="flex items-center justify-between pb-2 border-b">
                <div>
                  <p className="text-sm font-medium text-gray-900">KYC Compliance Report</p>
                  <p className="text-xs text-gray-500">Due: Feb 15, 2024</p>
                </div>
                <button className="text-sm text-indigo-600 hover:text-indigo-700">Generate</button>
              </div>
              <div className="flex items-center justify-between pb-2 border-b">
                <div>
                  <p className="text-sm font-medium text-gray-900">Suspicious Activity Report</p>
                  <p className="text-xs text-gray-500">On-demand</p>
                </div>
                <button className="text-sm text-indigo-600 hover:text-indigo-700">Generate</button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">Player Risk Assessment</p>
                  <p className="text-xs text-gray-500">Weekly</p>
                </div>
                <button className="text-sm text-indigo-600 hover:text-indigo-700">Generate</button>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Compliance Metrics</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">KYC Completion Rate</span>
                <span className="text-sm font-medium text-green-600">{stats.complianceRate.toFixed(1)}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Average KYC Processing Time</span>
                <span className="text-sm font-medium text-gray-900">-</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">False Positive Rate</span>
                <span className="text-sm font-medium text-yellow-600">-</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Regulatory Fines (YTD)</span>
                <span className="text-sm font-medium text-green-600">$0</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Last Audit Score</span>
                <span className="text-sm font-medium text-green-600">-</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
