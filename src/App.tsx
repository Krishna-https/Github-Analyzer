import { Routes, Route } from 'react-router-dom'
import AppLayout from './components/layout/AppLayout'
import Home from './pages/Home'
import Analyze from './pages/Analyze'
import Overview from './pages/Overview'
import Architecture from './pages/Architecture'
import Modules from './pages/Modules'
import ModuleDetail from './pages/ModuleDetail'
import CodeAnalysis from './pages/CodeAnalysis'
import Security from './pages/Security'
import Dependencies from './pages/Dependencies'
import Issues from './pages/Issues'
import FindingDetail from './pages/FindingDetail'
import Rules from './pages/Rules'
import Explorer from './pages/Explorer'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route element={<AppLayout />}>
        <Route path="/analyze" element={<Analyze />} />
        <Route path="/overview" element={<Overview />} />
        <Route path="/architecture" element={<Architecture />} />
        <Route path="/modules" element={<Modules />} />
        <Route path="/modules/:moduleId" element={<ModuleDetail />} />
        <Route path="/code" element={<CodeAnalysis />} />
        <Route path="/security" element={<Security />} />
        <Route path="/dependencies" element={<Dependencies />} />
        <Route path="/issues" element={<Issues />} />
        <Route path="/findings/:findingId" element={<FindingDetail />} />
        <Route path="/rules" element={<Rules />} />
        <Route path="/explorer" element={<Explorer />} />
      </Route>
    </Routes>
  )
}