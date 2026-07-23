import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { TileProvider } from './context/TileContext'
import { AdsProvider } from './context/AdsContext'
import Login from './pages/Login'
import AdminHome from './pages/AdminHome'
import AdminTilePage from './pages/AdminTilePage'
import SuperAdminPage from './pages/SuperAdminPage'
import GridDetailPage from './pages/GridDetailPage'
import ComposePage from './pages/ComposePage'

export default function App() {
  return (
    <AuthProvider>
      <TileProvider>
        <AdsProvider>
          <HashRouter>
            <Routes>
              <Route path="/" element={<AdminHome />} />
              <Route path="/login" element={<Login />} />
              <Route path="/admin/:tileId" element={<AdminTilePage />} />
              <Route path="/compose/:tileId" element={<ComposePage />} />
              <Route path="/superadmin" element={<SuperAdminPage />} />
              <Route path="/superadmin/grid/:tileDbId" element={<GridDetailPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </HashRouter>
        </AdsProvider>
      </TileProvider>
    </AuthProvider>
  )
}
