import React from 'react'
import { Activity } from 'lucide-react'
import type { TabProps } from '../types'

export function ActivityTab({ player }: TabProps) {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Activity Log</h3>
        </div>
        <div className="p-4">
          <div className="text-center py-8">
            <Activity className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No activity recorded</p>
          </div>
        </div>
      </div>
    </div>
  )
}