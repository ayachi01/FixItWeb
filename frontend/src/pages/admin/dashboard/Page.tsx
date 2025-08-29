import { useState } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { SupportForm } from "@/features/support/components/SupportForm"
import { FeedbackForm } from "@/features/support/components/FeedbackForm"
import { DashboardMetrics } from "@/components/dashboard/DashboardMetrics"
import { DashboardCharts } from "@/components/dashboard/DashboardCharts"
import { DashboardTables } from "@/components/dashboard/DashboardTables"
import { DashboardHighlights } from "@/components/dashboard/DashboardHighlights"

export default function Page() {
  const [activeSection, setActiveSection] = useState('dashboard')

  const getBreadcrumbTitle = () => {
    switch(activeSection) {
      case 'support':
        return 'Support'
      case 'feedback':
        return 'Feedback'
      default:
        return 'FixIT Dashboard'
    }
  }

  const renderMainContent = () => {
    switch(activeSection) {
      case 'support':
        return (
          <div className="flex flex-1 flex-col gap-4 p-3 sm:p-4 pt-0">
            <SupportForm />
          </div>
        )
      case 'feedback':
        return (
          <div className="flex flex-1 flex-col gap-4 p-3 sm:p-4 pt-0">
            <FeedbackForm />
          </div>
        )
      default:
        return (
          <div className="flex flex-1 flex-col gap-4 p-3 sm:p-4 pt-0 space-y-6">
            {/* KPI Cards Section */}
            <DashboardMetrics />
            
            {/* Highlights Section */}
            <DashboardHighlights />
            
            {/* Charts Section */}
            <DashboardCharts />
            
            {/* Tables and Activity Section */}
            <DashboardTables />
          </div>
        )
    }
  }

  return (
    <SidebarProvider>
      <AppSidebar onSectionChange={setActiveSection} />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="#">Dashboard</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>{getBreadcrumbTitle()}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        {renderMainContent()}
      </SidebarInset>
    </SidebarProvider>
  )
}