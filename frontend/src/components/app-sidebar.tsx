import * as React from "react"
import { Link, useLocation } from "react-router-dom"
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

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const location = useLocation()

  const data = {
    navMain: [
      {
        title: "Dashboard",
        url: "/dashboard",
        icon: CircleGauge,
        isActive: location.pathname === "/dashboard",
        items: [
          {
            title: "History",
            url: "/dashboard/history",
          },
          {
            title: "Starred",
            url: "/dashboard/starred",
          },
          {
            title: "Settings",
            url: "/dashboard/settings",
          },
        ],
      },
      {
        title: "Agents",
        url: "/dashboard/agents",
        icon: Bot,
        items: [
          {
            title: "Assigned",
            url: "/dashboard/agents/assigned",
          },
          {
            title: "Unassigned",
            url: "/dashboard/agents/unassigned",
          },
          {
            title: "Completed",
            url: "/dashboard/agents/completed",
          },
        ],
      },
      {
        title: "Issues",
        url: "/dashboard/issues",
        icon: BookOpen,
        items: [
          {
            title: "All Issues",
            url: "/dashboard/issues",
          },
          {
            title: "Open / In Progress",
            url: "/dashboard/issues/open",
          },
          {
            title: "Resolved / Closed",
            url: "/dashboard/issues/closed",
          },
          {
            title: "Manual Submission",
            url: "/dashboard/issues/manual",
          },
        ],
      },
      {
        title: "Settings",
        url: "/dashboard/settings",
        icon: Settings2,
        items: [
          {
            title: "General",
            url: "/dashboard/settings/general",
          },
          {
            title: "Team",
            url: "/dashboard/settings/team",
          },
          {
            title: "Billing",
            url: "/dashboard/settings/billing",
          },
          {
            title: "Limits",
            url: "/dashboard/settings/limits",
          },
        ],
      },
    ],
    projects: [
      {
        name: "Reports",
        url: "/dashboard/reports",
        icon: Proportions,
      },
      {
        name: "Chatlogs",
        url: "/dashboard/chat",
        icon: MessageSquare,
      },
      {
        name: "Facilities",
        url: "/dashboard/facilities",
        icon: Map,
      },
    ],
    navSecondary: [
      {
        title: "Support",
        url: "/dashboard/support",
        icon: LifeBuoy,
      },
      {
        title: "Feedback",
        url: "/dashboard/feedback",
        icon: Send,
      },
    ],
  }

  return (
    <Sidebar variant="inset" className="sidebar" {...props}>
      <SidebarHeader>
        
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link to="/dashboard">
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <Cog className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium text-sidebar-foreground dark:text-white">FixIt</span>
                  <span className="truncate text-xs text-muted-foreground dark:text-gray-400">Upang </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavProjects projects={data.projects} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  )
}
