import * as React from "react"
import { Link } from "react-router-dom"
import {
  BookOpen,
  Bot,
  Cog ,
  LifeBuoy,
  Map,
  Send,
  Settings2,
  CircleGauge, 
  Proportions,
  MessageSquare,
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavProjects } from "@/components/nav-projects"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

const data = {
  navMain: [
    {
      title: "Dashboard",
      url: "dashboard",
      icon: CircleGauge ,
      isActive: true,
      items: [
        {
          title: "History",
          url: "#",
        },
        {
          title: "Starred",
          url: "#",
        },
        {
          title: "Settings",
          url: "#",
        },
      ],
    },
    {
      title: "Agents",
      url: "#",
      icon: Bot,
      items: [
        {
          title: "Assigned",
          url: "#",
        },
        {
          title: "Unassigned",
          url: "#",
        },
        {
          title: "Completed",
          url: "#",
        },
      ],
    },
    {
      title: "Issues",
      url: "#",
      icon: BookOpen,
      items: [
        {
          title: "All Issues",
          url: "#",
        },
        {
          title: "Open / In Progress",
          url: "#",
        },
        {
          title: "Resolved / Closed",
          url: "#",
        },
        {
          title: "Manual Submission",
          url: "#",
        },
      ],
    },
    {
      title: "Settings",
      url: "#",
      icon: Settings2,
      items: [
        {
          title: "General",
          url: "#",
        },
        {
          title: "Team",
          url: "#",
        },
        {
          title: "Billing",
          url: "#",
        },
        {
          title: "Limits",
          url: "#",
        },
      ],
    },
  ],
  navSecondary: [
    {
      title: "Support",
      url: "support",
      icon: LifeBuoy,
    },
    {
      title: "Feedback",
      url: "feedback",
      icon: Send,
    },
  ],
  projects: [
    {
      name: "Reports",
      url: "#",
      icon: Proportions,
    },
    {
      name: "Chatlogs",
      url: "#",
      icon: MessageSquare,
    },
    {
      name: "Facilities",
      url: "#",
      icon: Map,
    },
  ],
}

export function AppSidebar({ onSectionChange, ...props }: React.ComponentProps<typeof Sidebar> & { onSectionChange?: (section: string) => void }) {
  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link to="/db">
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <Cog className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">FixIT Inc</span>
                  <span className="truncate text-xs">Upang</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavProjects projects={data.projects} />
        <NavSecondary items={data.navSecondary} onSectionChange={onSectionChange} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  )
}
