import HomeContent from './home-content'

export default function Home() {
  // PERFORMANCE FIX: Removed duplicate server-side auth call
  // User is now fetched client-side via PlayerProvider
  return <HomeContent />
}