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
    // New KPI metrics
    {
      title: "Avg Resolution Time",
      value: "4.2h",
      change: "-15%",
      trend: "down",
      description: "Improved efficiency",
      subtitle: "Average time to resolve",
      icon: Timer,
      color: "text-orange-600",
      bgColor: "bg-orange-50"
    },
    {
      title: "Urgent Issues",
      value: "3",
      change: "-50%",
      trend: "down",
      description: "Significant improvement",
      subtitle: "High priority tickets",
      icon: AlertTriangle,
      color: "text-red-600",
      bgColor: "bg-red-50"
    },
    {
      title: "User Satisfaction",
      value: "4.6/5",
      change: "+0.3",
      trend: "up",
      description: "Excellent rating",
      subtitle: "Average user rating",
      icon: Star,
      color: "text-amber-600",
      bgColor: "bg-amber-50"
    },
    {
      title: "Feedback Count",
      value: "28",
      change: "+40%",
      trend: "up",
      description: "More engagement",
      subtitle: "This month's feedback",
      icon: MessageSquare,
      color: "text-indigo-600",
      bgColor: "bg-indigo-50"
    }
  ]

  return (
    <div className="space-y-4"> 
      
      {/* Main KPI Cards Grid */}
      <div className="grid gap-3 sm:gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4">
        {metrics.slice(0, 4).map((metric, index) => (
          <MetricCard key={index} metric={metric} />
        ))}
      </div>
      
      {/* Additional KPI Cards */}
      <div className="grid gap-3 sm:gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {metrics.slice(4).map((metric, index) => (
          <MetricCard key={index + 4} metric={metric} />
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