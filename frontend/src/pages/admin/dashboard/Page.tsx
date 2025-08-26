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
import { SectionCards } from "@/components/section-cards"
import { ChartAreaInteractive } from "@/components/chart-area-interactive"

export default function Page() {
  const [activeSection, setActiveSection] = useState('dashboard')

  // Function to get breadcrumb title based on active section
  const getBreadcrumbTitle = () => {
    switch(activeSection) {
      case 'support':
        return 'Support'
      case 'feedback':
        return 'Feedback'
      default:
        return 'Data Fetching'
    }
  }

  // Function to render main content based on active section
  const renderMainContent = () => {
    switch(activeSection) {
      case 'support':
        return (
          <div className="flex flex-1 flex-col gap-4 p-3 sm:p-4 pt-0">
            <div className="flex items-center justify-between">
            </div>
            <SupportForm />
          </div>
        )
      case 'feedback':
        return (
          <div className="flex flex-1 flex-col gap-4 p-3 sm:p-4 pt-0">
            <div className="flex items-center justify-between">
            </div>
            <FeedbackForm />
          </div>
        )
      default:
        return (
          <div className="flex flex-1 flex-col gap-4 p-3 sm:p-4 pt-0">
            {/* Dashboard Cards - Using SectionCards component */}
            <SectionCards />
            
            <ChartAreaInteractive />
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
            <Separator
              orientation="vertical"
              className="mr-2 data-[orientation=vertical]:h-4"
            />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="#">
                    Dashboard
                  </BreadcrumbLink>
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
