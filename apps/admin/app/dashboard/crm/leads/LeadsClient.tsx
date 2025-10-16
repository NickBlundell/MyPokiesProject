'use client'

import { useState, useRef } from 'react'
import {
  Upload,
  Users,
  Gift,
  TrendingUp,
  Search,
  Filter,
  Eye,
  Trash2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Phone,
  Edit
} from 'lucide-react'

interface LeadList {
  id: string
  name: string
  description: string
  total_leads: number
  source: string
  campaign_type: string
  bonus_enabled: boolean
  bonus_type?: string
  bonus_amount?: number
  created_at: string
  conversion_rate: number
  contacted: number
}

interface Lead {
  id: string
  phone_number: string
  email?: string
  first_name?: string
  last_name?: string
  status: string
  last_contacted_at?: string
  contact_count: number
  tags: string[]
  list_name: string
}

interface LeadsStats {
  total_leads: number
  sms_sent: number
  registrations: number
  bonuses_assigned: number
}

interface LeadsClientProps {
  leadLists: LeadList[]
  leads: Lead[]
  stats: LeadsStats
}

export default function LeadsClient({ leadLists, leads, stats }: LeadsClientProps) {
  const [selectedList, setSelectedList] = useState<string | null>(null)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showBonusModal, setShowBonusModal] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      // In production, would parse CSV and upload
      simulateUpload()
    }
  }

  const simulateUpload = () => {
    setUploadProgress(0)
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval)
          return 100
        }
        return prev + 10
      })
    }, 200)
  }

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { color: string, icon: React.ComponentType<{ className?: string }> }> = {
      new: { color: 'bg-gray-100 text-gray-800', icon: AlertCircle },
      contacted: { color: 'bg-blue-100 text-blue-800', icon: Phone },
      registered: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      converted: { color: 'bg-purple-100 text-purple-800', icon: TrendingUp },
      opted_out: { color: 'bg-red-100 text-red-800', icon: XCircle }
    }

    const config = statusConfig[status] || statusConfig.new
    const Icon = config.icon

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${config.color}`}>
        <Icon className="w-3 h-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    )
  }

  // Filter leads by selected list
  const filteredLeads = selectedList
    ? leads.filter(lead => {
        const list = leadLists.find(l => l.id === selectedList)
        return list && lead.list_name === list.name
      })
    : leads

  return (
    <div>
      {/* Page Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Lead Management</h1>
          <p className="text-gray-600 mt-2">Upload and manage marketing leads with automatic bonus assignment</p>
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
        >
          <Upload className="w-4 h-4" />
          Upload Lead List
        </button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <Users className="w-8 h-8 text-indigo-600" />
            <span className="text-xs text-gray-500">Total</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.total_leads.toLocaleString()}</p>
          <p className="text-sm text-gray-600">Total Leads</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <Phone className="w-8 h-8 text-green-600" />
            <span className="text-xs text-gray-500">Contacted</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.sms_sent.toLocaleString()}</p>
          <p className="text-sm text-gray-600">SMS Sent</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="w-8 h-8 text-purple-600" />
            <span className="text-xs text-gray-500">Converted</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.registrations.toLocaleString()}</p>
          <p className="text-sm text-gray-600">Registrations</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <Gift className="w-8 h-8 text-yellow-600" />
            <span className="text-xs text-gray-500">Bonuses</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">${stats.bonuses_assigned.toLocaleString()}</p>
          <p className="text-sm text-gray-600">Auto-Assigned</p>
        </div>
      </div>

      {/* Lead Lists */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Lead Lists</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  List Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Source
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Leads
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Bonus Config
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Performance
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {leadLists.map((list) => (
                <tr key={list.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedList(list.id)}>
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{list.name}</p>
                      <p className="text-xs text-gray-500">{list.description}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                      {list.source}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-gray-900">{list.total_leads.toLocaleString()}</p>
                    <p className="text-xs text-gray-500">{list.contacted} contacted</p>
                  </td>
                  <td className="px-6 py-4">
                    {list.bonus_enabled ? (
                      <div>
                        <p className="text-sm text-gray-900">{list.bonus_type === 'no_deposit' ? 'No Deposit' : 'Deposit Match'}</p>
                        <p className="text-xs text-gray-500">${list.bonus_amount}</p>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-500">No bonus</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-sm text-gray-900">{(list.conversion_rate * 100).toFixed(1)}%</p>
                      <p className="text-xs text-gray-500">Conversion</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setShowBonusModal(true)
                        }}
                        className="p-1 text-gray-600 hover:text-indigo-600"
                        title="Configure Bonus"
                      >
                        <Gift className="w-4 h-4" />
                      </button>
                      <button className="p-1 text-gray-600 hover:text-blue-600" title="View Details">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button className="p-1 text-gray-600 hover:text-green-600" title="Start Campaign">
                        <Phone className="w-4 h-4" />
                      </button>
                      <button className="p-1 text-gray-600 hover:text-red-600" title="Delete">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Lead Details */}
      {selectedList && filteredLeads.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Lead Details</h2>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search leads..."
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <button className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2">
                <Filter className="w-4 h-4" />
                Filter
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tags
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact History
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {lead.first_name} {lead.last_name}
                        </p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-gray-500">{lead.phone_number}</span>
                          {lead.email && <span className="text-xs text-gray-500">{lead.email}</span>}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(lead.status)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {lead.tags.map((tag) => (
                          <span key={tag} className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-full">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-900">{lead.contact_count} messages</p>
                      {lead.last_contacted_at && (
                        <p className="text-xs text-gray-500">Last: {lead.last_contacted_at}</p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        <button className="p-1 text-gray-600 hover:text-green-600" title="Send SMS">
                          <Phone className="w-4 h-4" />
                        </button>
                        <button className="p-1 text-gray-600 hover:text-blue-600" title="View Conversation">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button className="p-1 text-gray-600 hover:text-indigo-600" title="Edit">
                          <Edit className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Upload Lead List</h2>

            <div className="space-y-4">
              {/* List Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">List Name</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g., Facebook Campaign Q2"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  rows={3}
                  placeholder="Brief description of the lead source..."
                />
              </div>

              {/* Source */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Lead Source</label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="facebook">Facebook</option>
                  <option value="google">Google Ads</option>
                  <option value="instagram">Instagram</option>
                  <option value="manual">Manual Entry</option>
                  <option value="purchased">Purchased List</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {/* CSV Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">CSV File</label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <Upload className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600 mb-2">
                    Drop your CSV file here, or click to browse
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                  >
                    Select File
                  </button>
                  {selectedFile && (
                    <p className="text-sm text-gray-600 mt-2">
                      Selected: {selectedFile.name}
                    </p>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  CSV must include: phone_number, email (optional), first_name (optional), last_name (optional)
                </p>
              </div>

              {/* Upload Progress */}
              {uploadProgress > 0 && uploadProgress < 100 && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-600">Uploading...</span>
                    <span className="text-sm text-gray-600">{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Bonus Configuration */}
              <div className="border-t pt-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Enable automatic bonus for leads who register
                  </span>
                </label>

                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Bonus Type</label>
                    <select className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg">
                      <option value="no_deposit">No Deposit Bonus</option>
                      <option value="deposit_match">Deposit Match</option>
                      <option value="free_spins">Free Spins</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Amount</label>
                    <input
                      type="number"
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                      placeholder="20"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowUploadModal(false)
                  setUploadProgress(0)
                  setSelectedFile(null)
                }}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                Upload List
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bonus Configuration Modal */}
      {showBonusModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Configure Bonus</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bonus Type</label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="no_deposit">No Deposit Bonus</option>
                  <option value="deposit_match">Deposit Match</option>
                  <option value="free_spins">Free Spins</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bonus Amount</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                  <input
                    type="number"
                    className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Match Percentage (if applicable)</label>
                <div className="relative">
                  <input
                    type="number"
                    className="w-full pr-8 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="100"
                  />
                  <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">%</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Expiry (days)</label>
                <input
                  type="number"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="7"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={() => setShowBonusModal(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                Save Configuration
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
