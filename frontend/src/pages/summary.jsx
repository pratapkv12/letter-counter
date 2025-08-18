import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import SummaryCard from '@/components/SummaryCard'
import { Badge } from '@/components/ui/badge'
import { 
  TrendingUp,
  TrendingDown,
  Flame,
  Thermometer,
  Snowflake,
  Users,
  Mail,
  MousePointer,
  Reply,
  Download,
  RefreshCw,
  MessageSquare
} from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LineChart, Line } from 'recharts'
import { formatNumber, formatPercentage } from '@/lib/utils'
import api from '@/services/api'

// Mock data
const leadSegmentData = [
  { name: 'Hot Leads', value: 15, color: '#ef4444' },
  { name: 'Warm Leads', value: 45, color: '#f59e0b' },
  { name: 'Cold Leads', value: 52, color: '#3b82f6' },
  { name: 'Nurture', value: 13, color: '#6b7280' },
]

const campaignPerformanceData = [
  { name: 'Q4 Tech Outreach', sent: 156, opened: 44, replied: 12, interested: 8 },
  { name: 'SaaS Startup Follow-up', sent: 89, opened: 28, replied: 9, interested: 6 },
  { name: 'Enterprise Prospects', sent: 203, opened: 51, replied: 15, interested: 9 },
]

const replyTrendData = [
  { date: '2024-01-01', positive: 5, neutral: 2, negative: 1 },
  { date: '2024-01-02', positive: 7, neutral: 3, negative: 2 },
  { date: '2024-01-03', positive: 4, neutral: 1, negative: 1 },
  { date: '2024-01-04', positive: 9, neutral: 4, negative: 2 },
  { date: '2024-01-05', positive: 6, neutral: 2, negative: 1 },
  { date: '2024-01-06', positive: 8, neutral: 3, negative: 1 },
  { date: '2024-01-07', positive: 11, neutral: 5, negative: 3 },
]

const hotLeadsData = [
  {
    id: 1,
    name: 'Sarah Johnson',
    email: 'sarah@techstartup.com',
    company: 'TechStartup Inc',
    position: 'CTO',
    score: 0.92,
    lastActivity: 'Opened email 3 times',
    timeAgo: '2 hours ago',
    reason: 'High engagement, C-level position'
  },
  {
    id: 2,
    name: 'Michael Chen',
    email: 'mchen@innovate.co',
    company: 'Innovate Co',
    position: 'VP Engineering',
    score: 0.88,
    lastActivity: 'Clicked pricing link',
    timeAgo: '4 hours ago',
    reason: 'Clicked multiple links, decision maker'
  },
  {
    id: 3,
    name: 'Emma Rodriguez',
    email: 'emma@scaleco.com',
    company: 'Scale Co',
    position: 'Head of Growth',
    score: 0.85,
    lastActivity: 'Replied with interest',
    timeAgo: '6 hours ago',
    reason: 'Positive reply, growth role'
  },
  {
    id: 4,
    name: 'David Kim',
    email: 'david@futuretech.io',
    company: 'FutureTech',
    position: 'Founder & CEO',
    score: 0.91,
    lastActivity: 'Forwarded email internally',
    timeAgo: '1 day ago',
    reason: 'Founder, high engagement'
  },
]

export default function Summary() {
  const [loading, setLoading] = useState(false)
  const [selectedSegment, setSelectedSegment] = useState('all')

  const refreshData = () => {
    setLoading(true)
    setTimeout(() => setLoading(false), 1000)
  }

  const exportReport = () => {
    // In a real app, this would generate and download a report
    console.log('Exporting report...')
  }

  const sendWhatsAppSummary = () => {
    // In a real app, this would send a WhatsApp summary
    console.log('Sending WhatsApp summary...')
  }

  const totalLeads = leadSegmentData.reduce((sum, segment) => sum + segment.value, 0)
  const totalSent = campaignPerformanceData.reduce((sum, campaign) => sum + campaign.sent, 0)
  const totalOpened = campaignPerformanceData.reduce((sum, campaign) => sum + campaign.opened, 0)
  const totalReplied = campaignPerformanceData.reduce((sum, campaign) => sum + campaign.replied, 0)
  const totalInterested = campaignPerformanceData.reduce((sum, campaign) => sum + campaign.interested, 0)

  const openRate = totalSent > 0 ? totalOpened / totalSent : 0
  const replyRate = totalSent > 0 ? totalReplied / totalSent : 0
  const interestRate = totalReplied > 0 ? totalInterested / totalReplied : 0

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Campaign Summary</h1>
          <p className="text-gray-600 mt-1">
            Analyze lead segments and campaign performance
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" onClick={refreshData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" onClick={sendWhatsAppSummary}>
            <MessageSquare className="h-4 w-4 mr-2" />
            WhatsApp Summary
          </Button>
          <Button onClick={exportReport}>
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <SummaryCard
          title="Total Leads"
          value={formatNumber(totalLeads)}
          subtitle="Across all segments"
          icon={Users}
          trend={{
            type: 'positive',
            value: '+12%',
            label: 'from last week'
          }}
        />
        <SummaryCard
          title="Open Rate"
          value={formatPercentage(openRate)}
          subtitle={`${totalOpened} of ${totalSent} emails`}
          icon={MousePointer}
          trend={{
            type: 'positive',
            value: '+2.3%',
            label: 'from last week'
          }}
        />
        <SummaryCard
          title="Reply Rate"
          value={formatPercentage(replyRate)}
          subtitle={`${totalReplied} replies received`}
          icon={Reply}
          trend={{
            type: 'positive',
            value: '+1.2%',
            label: 'from last week'
          }}
        />
        <SummaryCard
          title="Interest Rate"
          value={formatPercentage(interestRate)}
          subtitle={`${totalInterested} positive responses`}
          icon={TrendingUp}
          trend={{
            type: 'positive',
            value: '+0.8%',
            label: 'from last week'
          }}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* Lead Segments Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Lead Segments</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={leadSegmentData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {leadSegmentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 space-y-2">
              {leadSegmentData.map((segment, index) => (
                <div key={segment.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center">
                    <div 
                      className="w-3 h-3 rounded-full mr-2"
                      style={{ backgroundColor: segment.color }}
                    />
                    {segment.name}
                  </div>
                  <div className="font-medium">{segment.value}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Campaign Performance */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Campaign Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={campaignPerformanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="sent" fill="#e5e7eb" name="Sent" />
                <Bar dataKey="opened" fill="#3b82f6" name="Opened" />
                <Bar dataKey="replied" fill="#10b981" name="Replied" />
                <Bar dataKey="interested" fill="#f59e0b" name="Interested" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Reply Sentiment Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Reply Sentiment (Last 7 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={replyTrendData}>
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
                  dataKey="positive" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  name="Positive"
                />
                <Line 
                  type="monotone" 
                  dataKey="neutral" 
                  stroke="#6b7280" 
                  strokeWidth={2}
                  name="Neutral"
                />
                <Line 
                  type="monotone" 
                  dataKey="negative" 
                  stroke="#ef4444" 
                  strokeWidth={2}
                  name="Negative"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Lead Temperature Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Lead Temperature</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg border border-red-200">
                <div className="flex items-center">
                  <Flame className="h-6 w-6 text-red-600 mr-3" />
                  <div>
                    <div className="font-medium text-red-900">Hot Leads</div>
                    <div className="text-sm text-red-700">Score 80-100%</div>
                  </div>
                </div>
                <div className="text-2xl font-bold text-red-600">15</div>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <div className="flex items-center">
                  <Thermometer className="h-6 w-6 text-yellow-600 mr-3" />
                  <div>
                    <div className="font-medium text-yellow-900">Warm Leads</div>
                    <div className="text-sm text-yellow-700">Score 60-79%</div>
                  </div>
                </div>
                <div className="text-2xl font-bold text-yellow-600">45</div>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center">
                  <Snowflake className="h-6 w-6 text-blue-600 mr-3" />
                  <div>
                    <div className="font-medium text-blue-900">Cold Leads</div>
                    <div className="text-sm text-blue-700">Score 40-59%</div>
                  </div>
                </div>
                <div className="text-2xl font-bold text-blue-600">52</div>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center">
                  <Users className="h-6 w-6 text-gray-600 mr-3" />
                  <div>
                    <div className="font-medium text-gray-900">Nurture</div>
                    <div className="text-sm text-gray-700">Score 0-39%</div>
                  </div>
                </div>
                <div className="text-2xl font-bold text-gray-600">13</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Hot Leads Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-lg">
            <Flame className="h-5 w-5 mr-2 text-red-500" />
            Hot Leads Requiring Immediate Attention
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {hotLeadsData.map((lead) => (
              <div key={lead.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                <div className="flex-1">
                  <div className="flex items-center space-x-4">
                    <div>
                      <h4 className="font-medium text-gray-900">{lead.name}</h4>
                      <p className="text-sm text-gray-600">{lead.position} at {lead.company}</p>
                      <p className="text-xs text-gray-500">{lead.email}</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <Badge className="bg-red-100 text-red-800">
                      {(lead.score * 100).toFixed(0)}% Score
                    </Badge>
                    <p className="text-xs text-gray-600 mt-1">{lead.lastActivity}</p>
                    <p className="text-xs text-gray-500">{lead.timeAgo}</p>
                  </div>
                  <Button size="sm">
                    <Mail className="h-4 w-4 mr-2" />
                    Follow Up
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}