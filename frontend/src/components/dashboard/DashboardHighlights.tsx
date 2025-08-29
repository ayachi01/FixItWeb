import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  AlertTriangle, 
  Calendar, 
  UserPlus, 
  FileX, 
  Clock,
  ExternalLink
} from "lucide-react"

export function DashboardHighlights() {
  const unassignedTickets = [
    { id: "TKT-001", subject: "Light not turning on", priority: "High", created: "2 hours ago" },
    { id: "TKT-003", subject: "Chair Broken", priority: "Urgent", created: "45 min ago" },
    { id: "TKT-005", subject: "Door not closing", priority: "Medium", created: "1 hour ago" }
  ]

  const upcomingDeadlines = [
    { id: "TKT-008", subject: "Electrical Problems", assignee: "Josh Co", deadline: "Today 5:00 PM" },
    { id: "TKT-012", subject: "Plumbing Issues", assignee: "Josh Soy", deadline: "Tomorrow 2:00 PM" },
    { id: "TKT-015", subject: "Damaged Furnitur", assignee: "Josh Soco", deadline: "Dec 30, 2024" }
  ]

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200'
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getDeadlineColor = (deadline: string) => {
    if (deadline.includes('Today')) return 'text-red-600 font-semibold'
    if (deadline.includes('Tomorrow')) return 'text-orange-600 font-medium'
    return 'text-gray-600'
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Unassigned Tickets */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="flex items-center space-x-2">
            <UserPlus className="h-5 w-5 text-red-600" />
            <CardTitle className="text-lg">Unassigned Tickets</CardTitle>
          </div>
          <Badge variant="destructive" className="ml-auto">
            {unassignedTickets.length}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-3">
          {unassignedTickets.map((ticket) => (
            <div key={ticket.id} className="flex items-start justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <span className="text-sm font-medium text-blue-600">{ticket.id}</span>
                  <Badge className={getPriorityColor(ticket.priority)}>
                    {ticket.priority}
                  </Badge>
                </div>
                <p className="text-sm text-gray-900 truncate">{ticket.subject}</p>
                <p className="text-xs text-gray-500 mt-1">Created {ticket.created}</p>
              </div>
              <Button size="sm" variant="outline" className="ml-2">
                <UserPlus className="h-3 w-3 mr-1" />
                Assign
              </Button>
            </div>
          ))}
          <Button variant="outline" className="w-full mt-2">
            <FileX className="h-4 w-4 mr-2" />
            View All Unassigned
          </Button>
        </CardContent>
      </Card>

      {/* Upcoming Deadlines */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <CardTitle className="text-lg">Upcoming Deadlines</CardTitle>
          </div>
          <Badge variant="outline" className="ml-auto">
            {upcomingDeadlines.length}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-3">
          {upcomingDeadlines.map((item) => (
            <div key={item.id} className="flex items-start justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <span className="text-sm font-medium text-blue-600">{item.id}</span>
                  <Clock className="h-3 w-3 text-gray-400" />
                </div>
                <p className="text-sm text-gray-900 truncate">{item.subject}</p>
                <p className="text-xs text-gray-600 mt-1">Assigned to: {item.assignee}</p>
                <p className={`text-xs mt-1 ${getDeadlineColor(item.deadline)}`}>
                  Due: {item.deadline}
                </p>
              </div>
              <Button size="sm" variant="outline" className="ml-2">
                <ExternalLink className="h-3 w-3 mr-1" />
                View
              </Button>
            </div>
          ))}
          <Button variant="outline" className="w-full mt-2">
            <Calendar className="h-4 w-4 mr-2" />
            View All Deadlines
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}