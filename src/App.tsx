import './features/settings/density.ts'
import { ConfigGate } from './components/config/ConfigGate.tsx'
import { AuthProvider } from './features/auth/AuthProvider.tsx'
import { AppRouter } from './router.tsx'

export default function App() {
  return (
    <ConfigGate>
      <AuthProvider>
        <AppRouter />
      </AuthProvider>
    </ConfigGate>
  )
}
