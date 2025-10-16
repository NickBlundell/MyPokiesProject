import React from 'react'
import { Mail, Phone, Calendar, CheckCircle } from 'lucide-react'
import type { TabProps } from '../types'

export function OverviewTab({ player }: TabProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Mail className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-900">{player.email || 'No email'}</span>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-900">No phone number</span>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-900">
                Last login: {player.last_login || 'Today'}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">KYC & Compliance</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">KYC Status</span>
              <span className="inline-flex items-center gap-1 text-xs text-green-600">
                <CheckCircle className="w-3 h-3" />
                Verified
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Risk Score</span>
              <span className="text-sm font-medium text-gray-900">Low</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Documents</span>
              <span className="text-sm font-medium text-gray-900">3 verified</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Gaming Stats</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-gray-500">Total Sessions</p>
            <p className="text-lg font-semibold text-gray-900">0</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Avg Session</p>
            <p className="text-lg font-semibold text-gray-900">—</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Favorite Game</p>
            <p className="text-lg font-semibold text-gray-900">—</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Win Rate</p>
            <p className="text-lg font-semibold text-gray-900">—</p>
          </div>
        </div>
      </div>
    </div>
  )
}