import type React from "react"
import { FileText, LayoutDashboard, Settings, User } from "lucide-react"
import { Sidebar } from "@/components/ui/sidebar"

interface AdminLayoutProps {
  children: React.ReactNode
}

const navigation = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    id: "users",
    label: "Users",
    icon: User,
  },
  {
    id: "applications",
    label: "Applications",
    icon: FileText,
  },
  {
    id: "settings",
    label: "Settings",
    icon: Settings,
  },
]

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  return (
    <div className="flex h-screen">
      <Sidebar navigation={navigation} />
      <main className="flex-1 p-4">{children}</main>
    </div>
  )
}

export default AdminLayout
