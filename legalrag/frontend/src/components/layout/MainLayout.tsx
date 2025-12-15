import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  HomeIcon,
  FolderIcon,
  BookOpenIcon,
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
  ScaleIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline'
import { useAuthStore } from '../../store/authStore'
import clsx from 'clsx'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
  { name: 'Mis Casos', href: '/cases', icon: FolderIcon },
  { name: 'Jurisprudencia', href: '/jurisprudencia', icon: BookOpenIcon },
]

export default function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-gray-900/50 z-40 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.div
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-72 bg-primary-900 z-50 lg:hidden"
            >
              <Sidebar onClose={() => setSidebarOpen(false)} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-72 lg:flex-col">
        <div className="flex grow flex-col overflow-y-auto bg-primary-900">
          <Sidebar />
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-72">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-white shadow-sm">
          <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
            <button
              type="button"
              className="lg:hidden -m-2.5 p-2.5 text-gray-700"
              onClick={() => setSidebarOpen(true)}
            >
              <Bars3Icon className="h-6 w-6" />
            </button>

            <div className="flex-1 lg:flex-none" />

            {/* User menu */}
            <div className="flex items-center gap-4">
              <div className="hidden sm:block text-right">
                <p className="text-sm font-medium text-gray-900">
                  {user?.nombre} {user?.apellidos}
                </p>
                <p className="text-xs text-gray-500">{user?.email}</p>
              </div>
              <UserCircleIcon className="h-9 w-9 text-gray-400" />
              <button
                onClick={handleLogout}
                className="text-gray-500 hover:text-gray-700 transition-colors"
                title="Cerrar sesión"
              >
                <ArrowRightOnRectangleIcon className="h-6 w-6" />
              </button>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="py-8 px-4 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

function Sidebar({ onClose }: { onClose?: () => void }) {
  return (
    <div className="flex grow flex-col gap-y-5 px-6 py-4">
      {/* Logo */}
      <div className="flex h-16 items-center justify-between">
        <div className="flex items-center gap-3">
          <ScaleIcon className="h-8 w-8 text-white" />
          <div>
            <h1 className="text-xl font-bold text-white">LegalRAG</h1>
            <p className="text-xs text-primary-300">Abogacía</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="lg:hidden text-white">
            <XMarkIcon className="h-6 w-6" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex flex-1 flex-col">
        <ul className="flex flex-1 flex-col gap-y-2">
          {navigation.map((item) => (
            <li key={item.name}>
              <NavLink
                to={item.href}
                onClick={onClose}
                className={({ isActive }) =>
                  clsx(
                    'group flex items-center gap-x-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary-800 text-white'
                      : 'text-primary-200 hover:bg-primary-800 hover:text-white'
                  )
                }
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {item.name}
              </NavLink>
            </li>
          ))}
        </ul>

        {/* Bottom section */}
        <div className="mt-auto">
          <NavLink
            to="/cases/new"
            className="flex items-center justify-center gap-2 rounded-lg bg-white px-4 py-3 text-sm font-semibold text-primary-900 hover:bg-primary-50 transition-colors"
          >
            <span>+ Nuevo Caso</span>
          </NavLink>
        </div>
      </nav>
    </div>
  )
}
