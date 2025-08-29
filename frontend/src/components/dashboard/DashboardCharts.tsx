"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell, 
  LineChart, 
  Line,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts'

export function DashboardCharts() {
  // Sample data for charts
  const categoryData = [
    { name: 'Technical', value: 45, color: '#3B82F6' },
    { name: 'Account', value: 25, color: '#EF4444' },
    { name: 'Feature Request', value: 20, color: '#10B981' },
    { name: 'General', value: 10, color: '#F59E0B' }
  ]

  const departmentData = [
    { department: 'IT', issues: 28, resolved: 22 },
    { department: 'HR', issues: 15, resolved: 12 },
    { department: 'Finance', issues: 12, resolved: 10 },
    { department: 'Marketing', issues: 8, resolved: 6 },
    { department: 'Sales', issues: 18, resolved: 14 }
  ]

  const trendData = [
    { month: 'Jan', thisMonth: 45, lastMonth: 38 },
    { month: 'Feb', thisMonth: 52, lastMonth: 45 },
    { month: 'Mar', thisMonth: 48, lastMonth: 52 },
    { month: 'Apr', thisMonth: 61, lastMonth: 48 },
    { month: 'May', thisMonth: 55, lastMonth: 61 },
    { month: 'Jun', thisMonth: 67, lastMonth: 55 }
  ]

  const resolutionTrendData = [
    { week: 'Week 1', resolved: 12, created: 15 },
    { week: 'Week 2', resolved: 18, created: 12 },
    { week: 'Week 3', resolved: 14, created: 16 },
    { week: 'Week 4', resolved: 22, created: 18 }
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Analytics & Insights</h2>
      </div>
      
      {/* First Row - Pie Chart and Bar Chart */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Issue Categories Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="h-2 w-2 bg-blue-600 rounded-full"></div>
              Issues by Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-2 gap-2 mt-4">
              {categoryData.map((item, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <div 
                    className="h-3 w-3 rounded-full" 
                    style={{ backgroundColor: item.color }}
                  ></div>
                  <span className="text-sm text-gray-600">{item.name}: {item.value}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Department Issues Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="h-2 w-2 bg-green-600 rounded-full"></div>
              Issues by Department
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={departmentData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="department" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="issues" fill="#EF4444" name="Total Issues" />
                <Bar dataKey="resolved" fill="#10B981" name="Resolved" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Second Row - Trend Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Monthly Comparison Line Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="h-2 w-2 bg-purple-600 rounded-full"></div>
              Monthly Trend Comparison
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="thisMonth" 
                  stroke="#8B5CF6" 
                  strokeWidth={3}
                  name="This Year"
                />
                <Line 
                  type="monotone" 
                  dataKey="lastMonth" 
                  stroke="#6B7280" 
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  name="Last Year"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Resolution Trend Area Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="h-2 w-2 bg-orange-600 rounded-full"></div>
              Weekly Resolution Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={resolutionTrendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="created" 
                  stackId="1"
                  stroke="#F59E0B" 
                  fill="#FEF3C7"
                  name="Created"
                />
                <Area 
                  type="monotone" 
                  dataKey="resolved" 
                  stackId="1"
                  stroke="#10B981" 
                  fill="#D1FAE5"
                  name="Resolved"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}