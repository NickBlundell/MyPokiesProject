'use client'

import React, { useState } from 'react'
import { PlayersTable } from './PlayersTable'
import { PlayerProfileModal } from './PlayerProfileModal'
import type { Player } from './types'

interface PlayersTableWithModalProps {
  players: Player[]
}

export default function PlayersTableWithModal({ players }: PlayersTableWithModalProps) {
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const handlePlayerClick = (player: Player) => {
    setSelectedPlayer(player)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedPlayer(null)
  }

  return (
    <>
      <PlayersTable
        players={players}
        onPlayerClick={handlePlayerClick}
      />
      <PlayerProfileModal
        player={selectedPlayer}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />
    </>
  )
}

// Also export individual components for flexible use
export { PlayersTable } from './PlayersTable'
export { PlayerProfileModal } from './PlayerProfileModal'
export { StatusBadge } from './common/StatusBadge'
export { VIPBadge } from './common/VIPBadge'
export * from './types'