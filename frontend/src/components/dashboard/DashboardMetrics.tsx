import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  Users, 
  Timer, 
  Shield, 
  AlertTriangle,
  Star,
  MessageSquare
} from "lucide-react"

export function DashboardMetrics() {
  const metrics = [
    // Existing metrics
    {
      title: "Total Resolved",
      value: "55",
      change: "+12.5%",
      trend: "up",
      description: "Trending up this month",
      subtitle: "Issues resolved last 30 days",
      icon: CheckCircle,
      color: "text-green-600",
      bgColor: "bg-green-50"
    },
    {
      title: "In Progress", 
      value: "12",
      change: "-20%",
      trend: "down",
      description: "Down 20% this period",
      subtitle: "Currently being worked on",
      icon: Clock,
      color: "text-blue-600",
      bgColor: "bg-blue-50"
    },
    {
      title: "Pending",
      value: "10", 
      change: "+12.5%",
      trend: "up",
      description: "Strong user retention",
      subtitle: "Awaiting assignment",
      icon: AlertCircle,
      color: "text-yellow-600",
      bgColor: "bg-yellow-50"
    },
    {
      title: "Issues",
      value: "12",
      change: "+4.5%", 
      trend: "up",
      description: "Steady performance increase",
      subtitle: "Total open issues",
      icon: Users,
      color: "text-purple-600",
      bgColor: "bg-purple-50"
    },
  ]

  return (
    <div className="space-y-4"> 
      
      {/* Main KPI Cards Grid */}
      <div className="grid gap-3 sm:gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4">
        {metrics.slice(0, 4).map((metric, index) => (
          <MetricCard key={index} metric={metric} />
        ))}
      </div>
    </div>
  )
}

function MetricCard({ metric }: { metric: any }) {
  const Icon = metric.icon
  
  return (
    <Card className="relative overflow-hidden hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
          {metric.title}
        </CardTitle>
        <div className={`p-2 rounded-lg ${metric.bgColor}`}>
          <Icon className={`h-4 w-4 ${metric.color}`} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center space-x-2 mb-2">
          <div className="text-xl sm:text-2xl lg:text-3xl font-bold">
            {metric.value}
          </div>
          <div className={`flex items-center text-xs sm:text-sm px-2 py-1 rounded-full ${
            metric.trend === "up" 
              ? "text-green-700 bg-green-100" 
              : "text-red-700 bg-red-100"
          }`}>
            {metric.change}
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-xs sm:text-sm font-medium text-gray-900">
            {metric.description}
          </p>
          <p className="text-xs text-muted-foreground">
            {metric.subtitle}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}