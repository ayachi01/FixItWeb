import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, TrendingDown, Users, Clock, AlertCircle, CheckCircle } from "lucide-react"

export function SectionCards() {
  const cards = [
    {
      title: "Total Resolved",
      value: "55",
      change: "+12.5%",
      trend: "up",
      description: "Trending up this month",
      subtitle: "Visitors for the last 6 months",
      icon: CheckCircle,
      color: "text-green-600"
    },
    {
      title: "In Progress", 
      value: "12",
      change: "-20%",
      trend: "down",
      description: "Down 20% this period",
      subtitle: "Acquisition needs attention",
      icon: Clock,
      color: "text-blue-600"
    },
    {
      title: "Pending",
      value: "10", 
      change: "+12.5%",
      trend: "up",
      description: "Strong user retention",
      subtitle: "Engagement exceed targets",
      icon: AlertCircle,
      color: "text-yellow-600"
    },
    {
      title: "Issue",
      value: "12",
      change: "+4.5%", 
      trend: "up",
      description: "Steady performance increase",
      subtitle: "Meets growth projections",
      icon: Users,
      color: "text-purple-600"
    }
  ]

  return (
    <div className="grid gap-3 sm:gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card, index) => {
        const Icon = card.icon
        const TrendIcon = card.trend === "up" ? TrendingUp : TrendingDown
        
        return (
          <Card key={index} className="relative overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <Icon className={`h-4 w-4 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2 mb-2">
                <div className="text-xl sm:text-2xl lg:text-3xl font-bold">
                  {card.value}
                </div>
                <div className={`flex items-center text-xs sm:text-sm ${
                  card.trend === "up" ? "text-green-600" : "text-red-600"
                }`}>
                  <TrendIcon className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                  {card.change}
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-xs sm:text-sm font-medium text-gray-900">
                  {card.description}
                </p>
                <p className="text-xs text-muted-foreground">
                  {card.subtitle}
                </p>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}