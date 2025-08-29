import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { 
  Download, 
  UserPlus, 
  CheckCircle, 
  FileText, 
  MoreHorizontal,
  Eye,
  Edit,
  Trash2
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function DashboardTables() {
  const recentReports = [
    {
      id: "TKT-001",
      subject: "Water Supply Issues",
      status: "In Progress",
      priority: "High",
      assignee: "Jo",
      reporter: "Johnson",
      created: "2024-12-28",
      updated: "2 hours ago"
    },
    {
      id: "TKT-002", 
      subject: "Cleanliness & Sanitation",
      status: "Pending",
      priority: "Urgent",
      assignee: "Unassigned",
      reporter: "Bob Marley",
      created: "2024-12-28",
      updated: "45 min ago"
    },
    {
      id: "TKT-003",
      subject: "Air Conditioning & Ventilation", 
      status: "Resolved",
      priority: "Medium",
      assignee: "Jane Wilson",
      reporter: "Carol Davis",
      created: "2024-12-27",
      updated: "1 day ago"
    },
    {
      id: "TKT-004",
      subject: "Technology & Equipment",
      status: "In Progress", 
      priority: "Low",
      assignee: "Mike Co",
      reporter: "David Brown",
      created: "2024-12-26",
      updated: "2 days ago"
    },
    {
      id: "TKT-005",
      subject: "Building Repairs",
      status: "Pending",
      priority: "Urgent",
      assignee: "Unassigned",
      reporter: "Eve Wilson",
      created: "2024-12-26",
      updated: "2 days ago"
    }
  ]

  const quickActions = [
    { icon: UserPlus, label: "Assign Issue", variant: "default" as const },
    { icon: CheckCircle, label: "Close Ticket", variant: "outline" as const },
    { icon: FileText, label: "Add Note", variant: "outline" as const },
    { icon: Download, label: "Export Reports", variant: "outline" as const }
  ]

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'resolved': return 'bg-green-100 text-green-800 border-green-200'
      case 'in progress': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200'
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low': return 'bg-gray-100 text-gray-800 border-gray-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  return (
    <div className="space-y-6">
      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {quickActions.map((action, index) => {
              const Icon = action.icon
              return (
                <Button key={index} variant={action.variant} className="flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  {action.label}
                </Button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Recent Reports Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-xl">Recent Reports</CardTitle>
          <div className="flex space-x-2">
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button size="sm">
              View All
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ticket ID</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Assignee</TableHead>
                  <TableHead>Reporter</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Last Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentReports.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell className="font-medium text-blue-600">
                      {report.id}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {report.subject}
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(report.status)}>
                        {report.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getPriorityColor(report.priority)}>
                        {report.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className={report.assignee === "Unassigned" ? "text-red-600 font-medium" : "text-gray-900"}>
                        {report.assignee}
                      </span>
                    </TableCell>
                    <TableCell>{report.reporter}</TableCell>
                    <TableCell>{report.created}</TableCell>
                    <TableCell className="text-gray-500">{report.updated}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <UserPlus className="mr-2 h-4 w-4" />
                            Assign
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}