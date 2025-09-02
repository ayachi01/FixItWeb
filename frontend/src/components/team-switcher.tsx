"use client"

import * as React from "react"
import { ChevronsUpDown, Plus } from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"

export function TeamSwitcher({
  teams,
}: {
  teams: {
    name: string
    logo: React.ElementType
    plan: string
  }[]
}) {
  const { isMobile } = useSidebar()
  const [activeTeam, setActiveTeam] = React.useState(teams[0])

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground text-sidebar-foreground dark:text-white hover:bg-sidebar-accent dark:hover:bg-gray-700 hover:text-sidebar-accent-foreground dark:hover:text-white dark:data-[state=open]:bg-gray-700 dark:data-[state=open]:text-white"
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground dark:bg-blue-600 dark:text-white">
                <activeTeam.logo className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">{activeTeam.name}</span>
                <span className="truncate text-xs opacity-70">{activeTeam.plan}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4 opacity-70" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg bg-popover text-popover-foreground border border-border dark:bg-gray-800 dark:text-white dark:border-gray-700"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-xs text-muted-foreground dark:text-gray-300">
              Teams
            </DropdownMenuLabel>
            {teams.map((team, index) => (
              <DropdownMenuItem
                key={team.name}
                onClick={() => setActiveTeam(team)}
                className="gap-2 p-2 text-foreground dark:text-white hover:bg-accent dark:hover:bg-gray-700 hover:text-accent-foreground dark:hover:text-white cursor-pointer"
              >
                <div className="flex size-6 items-center justify-center rounded-sm border bg-primary text-primary-foreground dark:bg-blue-600 dark:text-white dark:border-gray-600">
                  <team.logo className="size-4 shrink-0" />
                </div>
                {team.name}
                <DropdownMenuShortcut className="dark:text-gray-400">⌘{index + 1}</DropdownMenuShortcut>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator className="dark:border-gray-600" />
            <DropdownMenuItem className="gap-2 p-2 text-foreground dark:text-white hover:bg-accent dark:hover:bg-gray-700 hover:text-accent-foreground dark:hover:text-white cursor-pointer">
              <div className="flex size-6 items-center justify-center rounded-md border bg-background dark:bg-gray-700 dark:border-gray-600">
                <Plus className="size-4" />
              </div>
              <div className="font-medium text-muted-foreground dark:text-gray-300">Add team</div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
