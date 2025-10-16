'use client'

import { ReactNode } from 'react'
import { InitialLoader } from './initial-loader'

export function InitialLoaderWrapper({ children }: { children: ReactNode }) {
  return (
    <>
      <InitialLoader />
      {children}
    </>
  )
}
