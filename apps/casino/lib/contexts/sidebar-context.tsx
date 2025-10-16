'use client'

import { createContext, useContext, useState, useMemo, useCallback, ReactNode } from 'react'

interface SidebarContextType {
  isCollapsed: boolean
  setIsCollapsed: (collapsed: boolean) => void
  toggleCollapsed: () => void
  isMobileOpen: boolean
  setIsMobileOpen: (open: boolean) => void
  toggleMobileOpen: () => void
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined)

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  // Memoize toggle functions to prevent re-creating them on every render
  const toggleCollapsed = useCallback(() => setIsCollapsed(prev => !prev), [])
  const toggleMobileOpen = useCallback(() => setIsMobileOpen(prev => !prev), [])

  // Memoize context value to prevent unnecessary re-renders of consumers
  const value = useMemo(() => ({
    isCollapsed,
    setIsCollapsed,
    toggleCollapsed,
    isMobileOpen,
    setIsMobileOpen,
    toggleMobileOpen,
  }), [isCollapsed, isMobileOpen, toggleCollapsed, toggleMobileOpen])

  return (
    <SidebarContext.Provider value={value}>
      {children}
    </SidebarContext.Provider>
  )
}

export function useSidebar() {
  const context = useContext(SidebarContext)
  if (context === undefined) {
    throw new Error('useSidebar must be used within a SidebarProvider')
  }
  return context
}
