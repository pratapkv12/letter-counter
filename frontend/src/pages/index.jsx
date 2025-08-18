import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import SummaryCard from '@/components/SummaryCard'
import { Button } from '@/components/ui/button'
import { 
  Mail, 
  Users, 
  TrendingUp, 
  MousePointer,
  Reply,
  AlertCircle,
  Plus,
  RefreshCw
} from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'
import { formatNumber, formatPercentage } from '@/lib/utils'
import api from '@/services/api'

// Mock data for charts
const emailActivityData = [
  { date: '2024-01-01', sent: 45, opened: 12, replied: 3 },
  { date: '2024-01-02', sent: 52, opened: 18, replied: 5 },
  { date: '2024-01-03', sent: 38, opened: 15, replied: 4 },
  { date: '2024-01-04', sent: 61, opened: 22, replied: 7 },
  { date: '2024-01-05', sent: 55, opened: 19, replied: 6 },
  { date: '2024-01-06', sent: 48, opened: 16, replied: 4 },
  { date: '2024-01-07', sent: 67, opened: 25, replied: 8 },
]

const leadSegmentData = [
  { segment: 'Hot', count: 15, percentage: 12 },
  { segment: 'Warm', count: 45, percentage: 36 },
  { segment: 'Cold', count: 52, percentage: 42 },
  { segment: 'Nurture', count: 13, percentage: 10 },
]

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalLeads: 125,
    emailsSent: 348,
    openRate: 0.285,
    replyRate: 0.087,
    hotLeads: 15,
    campaigns: 3
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    setLoading(true)
    try {
      // In a real app, this would fetch from your API
      // const response = await api.get('/dashboard/stats')
      // setStats(response.data)
      
      // For now, using mock data
      setTimeout(() => {
        setLoading(false)
      }, 1000)
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
      setLoading(false)
    }
  }

  const refreshData = () => {
    loadDashboardData()
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Welcome back! Here's what's happening with your cold email campaigns.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" onClick={refreshData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Campaign
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <SummaryCard
          title="Total Leads"
          value={formatNumber(stats.totalLeads)}
          subtitle="Across all campaigns"
          icon={Users}
          trend={{
            type: 'positive',
            value: '+12%',
            label: 'from last month'
          }}
        />
        <SummaryCard
          title="Emails Sent"
          value={formatNumber(stats.emailsSent)}
          subtitle="This month"
          icon={Mail}
          trend={{
            type: 'positive',
            value: '+8%',
            label: 'from last month'
          }}
        />
        <SummaryCard
          title="Open Rate"
          value={formatPercentage(stats.openRate)}
          subtitle="Average across campaigns"
          icon={MousePointer}
          trend={{
            type: 'positive',
            value: '+2.3%',
            label: 'from last month'
          }}
        />
        <SummaryCard
          title="Reply Rate"
          value={formatPercentage(stats.replyRate)}
          subtitle="Positive responses"
          icon={Reply}
          trend={{
            type: 'positive',
            value: '+1.2%',
            label: 'from last month'
          }}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* Hot Leads Alert */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <AlertCircle className="h-5 w-5 mr-2 text-red-500" />
              Hot Leads
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600 mb-2">
              {stats.hotLeads}
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Leads that need immediate attention
            </p>
            <Button size="sm" className="w-full">
              View Hot Leads
            </Button>
          </CardContent>
        </Card>

        {/* Active Campaigns */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Active Campaigns</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <h4 className="font-medium">Q4 Tech Outreach</h4>
                  <p className="text-sm text-gray-600">Started 3 days ago</p>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium">156 sent</div>
                  <div className="text-sm text-gray-600">28.5% open rate</div>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <h4 className="font-medium">SaaS Startup Follow-up</h4>
                  <p className="text-sm text-gray-600">Started 1 week ago</p>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium">89 sent</div>
                  <div className="text-sm text-gray-600">31.2% open rate</div>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <h4 className="font-medium">Enterprise Prospects</h4>
                  <p className="text-sm text-gray-600">Started 2 weeks ago</p>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium">203 sent</div>
                  <div className="text-sm text-gray-600">25.1% open rate</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Email Activity Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Email Activity (Last 7 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={emailActivityData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                />
                <YAxis />
                <Tooltip 
                  labelFormatter={(date) => new Date(date).toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    month: 'short', 
                    day: 'numeric' 
                  })}
                />
                <Line 
                  type="monotone" 
                  dataKey="sent" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  name="Emails Sent"
                />
                <Line 
                  type="monotone" 
                  dataKey="opened" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  name="Opened"
                />
                <Line 
                  type="monotone" 
                  dataKey="replied" 
                  stroke="#f59e0b" 
                  strokeWidth={2}
                  name="Replied"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Lead Segments */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Lead Segments</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={leadSegmentData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="segment" />
                <YAxis />
                <Tooltip />
                <Bar 
                  dataKey="count" 
                  fill="#3b82f6"
                  name="Number of Leads"
                />
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-4 space-y-2">
              {leadSegmentData.map((segment, index) => (
                <div key={segment.segment} className="flex items-center justify-between text-sm">
                  <div className="flex items-center">
                    <div 
                      className={`w-3 h-3 rounded-full mr-2 ${
                        segment.segment === 'Hot' ? 'bg-red-500' :
                        segment.segment === 'Warm' ? 'bg-yellow-500' :
                        segment.segment === 'Cold' ? 'bg-blue-500' :
                        'bg-gray-500'
                      }`}
                    />
                    {segment.segment}
                  </div>
                  <div className="text-right">
                    <span className="font-medium">{segment.count}</span>
                    <span className="text-gray-600 ml-2">({segment.percentage}%)</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}