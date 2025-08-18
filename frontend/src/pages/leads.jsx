import React, { useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import LeadTable from '@/components/LeadTable'
import { useDropzone } from 'react-dropzone'
import { 
  Upload, 
  FileText, 
  Users, 
  Mail,
  AlertCircle,
  CheckCircle,
  X
} from 'lucide-react'
import api from '@/services/api'

export default function Leads() {
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState(null)
  const [selectedLead, setSelectedLead] = useState(null)
  const [campaignName, setCampaignName] = useState('')

  const onDrop = useCallback(async (acceptedFiles) => {
    const file = acceptedFiles[0]
    if (!file) return

    if (!file.name.endsWith('.csv')) {
      setUploadStatus({
        type: 'error',
        message: 'Please upload a CSV file'
      })
      return
    }

    setLoading(true)
    setUploadStatus(null)

    try {
      const formData = new FormData()
      formData.append('csv', file)

      const response = await api.post('/email/upload-leads', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })

      const { validLeads, invalidLeads, summary } = response.data

      setLeads(validLeads.map((lead, index) => ({
        ...lead,
        id: `lead-${index}`,
        score: Math.random() * 0.6 + 0.2, // Mock score
        status: 'not_contacted'
      })))

      setUploadStatus({
        type: 'success',
        message: `Successfully processed ${summary.valid} leads${invalidLeads.length > 0 ? ` (${invalidLeads.length} invalid)` : ''}`
      })

    } catch (error) {
      console.error('Upload error:', error)
      setUploadStatus({
        type: 'error',
        message: error.response?.data?.message || 'Failed to upload CSV file'
      })
    } finally {
      setLoading(false)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv']
    },
    maxFiles: 1
  })

  const handleSendEmail = async (selectedLeads) => {
    if (!campaignName.trim()) {
      setUploadStatus({
        type: 'error',
        message: 'Please enter a campaign name'
      })
      return
    }

    setLoading(true)
    try {
      const response = await api.post('/email/send-batch', {
        leads: selectedLeads,
        campaign_name: campaignName,
        template_type: 'cold_outreach'
      })

      const { summary } = response.data
      
      setUploadStatus({
        type: 'success',
        message: `Campaign sent! ${summary.sent} emails sent successfully${summary.failed > 0 ? `, ${summary.failed} failed` : ''}`
      })

      // Update lead statuses
      setLeads(prevLeads => 
        prevLeads.map(lead => {
          const wasSelected = selectedLeads.some(selected => 
            (selected.id || selected.email) === (lead.id || lead.email)
          )
          return wasSelected ? { ...lead, status: 'contacted' } : lead
        })
      )

    } catch (error) {
      console.error('Send email error:', error)
      setUploadStatus({
        type: 'error',
        message: error.response?.data?.message || 'Failed to send emails'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleLeadSelect = (lead) => {
    setSelectedLead(lead)
  }

  const dismissStatus = () => {
    setUploadStatus(null)
  }

  const stats = {
    total: leads.length,
    hot: leads.filter(lead => lead.score >= 0.8).length,
    warm: leads.filter(lead => lead.score >= 0.6 && lead.score < 0.8).length,
    cold: leads.filter(lead => lead.score >= 0.4 && lead.score < 0.6).length,
    contacted: leads.filter(lead => lead.status === 'contacted').length
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Leads</h1>
          <p className="text-gray-600 mt-1">
            Upload, manage, and track your lead database
          </p>
        </div>
      </div>

      {/* Status Alert */}
      {uploadStatus && (
        <div className={`mb-6 p-4 rounded-lg border flex items-center justify-between ${
          uploadStatus.type === 'success' 
            ? 'bg-green-50 border-green-200 text-green-800'
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          <div className="flex items-center">
            {uploadStatus.type === 'success' ? (
              <CheckCircle className="h-5 w-5 mr-2" />
            ) : (
              <AlertCircle className="h-5 w-5 mr-2" />
            )}
            {uploadStatus.message}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={dismissStatus}
            className={uploadStatus.type === 'success' ? 'text-green-600 hover:text-green-700' : 'text-red-600 hover:text-red-700'}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Users className="h-5 w-5 text-blue-600 mr-2" />
              <div>
                <div className="text-2xl font-bold">{stats.total}</div>
                <div className="text-sm text-gray-600">Total Leads</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
              <div>
                <div className="text-2xl font-bold">{stats.hot}</div>
                <div className="text-sm text-gray-600">Hot Leads</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
              <div>
                <div className="text-2xl font-bold">{stats.warm}</div>
                <div className="text-sm text-gray-600">Warm Leads</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
              <div>
                <div className="text-2xl font-bold">{stats.cold}</div>
                <div className="text-sm text-gray-600">Cold Leads</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Mail className="h-5 w-5 text-green-600 mr-2" />
              <div>
                <div className="text-2xl font-bold">{stats.contacted}</div>
                <div className="text-sm text-gray-600">Contacted</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-3 space-y-6">
          {/* Upload Section */}
          {leads.length === 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Upload className="h-5 w-5 mr-2" />
                  Upload Leads
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                    isDragActive
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-300 hover:border-primary hover:bg-gray-50'
                  }`}
                >
                  <input {...getInputProps()} />
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  {isDragActive ? (
                    <p className="text-lg text-primary font-medium">Drop your CSV file here...</p>
                  ) : (
                    <>
                      <p className="text-lg font-medium text-gray-900 mb-2">
                        Drop your CSV file here, or click to select
                      </p>
                      <p className="text-sm text-gray-600">
                        CSV should include: name, email, company, position, industry, website
                      </p>
                    </>
                  )}
                </div>
                {loading && (
                  <div className="mt-4 text-center">
                    <div className="inline-flex items-center px-4 py-2 rounded-lg bg-blue-50 text-blue-700">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-700 mr-2"></div>
                      Processing CSV file...
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Campaign Setup */}
          {leads.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Campaign Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-4">
                  <div className="flex-1">
                    <Input
                      placeholder="Enter campaign name (e.g., Q4 Tech Outreach)"
                      value={campaignName}
                      onChange={(e) => setCampaignName(e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Leads Table */}
          {leads.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Lead Database</CardTitle>
              </CardHeader>
              <CardContent>
                <LeadTable
                  leads={leads}
                  onLeadSelect={handleLeadSelect}
                  onSendEmail={handleSendEmail}
                />
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1">
          {selectedLead && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Lead Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Name</label>
                  <p className="text-sm">{selectedLead.name || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Email</label>
                  <p className="text-sm">{selectedLead.email}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Company</label>
                  <p className="text-sm">{selectedLead.company || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Position</label>
                  <p className="text-sm">{selectedLead.position || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Industry</label>
                  <p className="text-sm">{selectedLead.industry || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Score</label>
                  <p className="text-sm">{(selectedLead.score * 100).toFixed(0)}%</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Status</label>
                  <p className="text-sm capitalize">{selectedLead.status?.replace('_', ' ') || 'Not Contacted'}</p>
                </div>
                {selectedLead.website && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Website</label>
                    <a 
                      href={selectedLead.website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline block"
                    >
                      {selectedLead.website}
                    </a>
                  </div>
                )}
                <Button 
                  size="sm" 
                  className="w-full"
                  onClick={() => handleSendEmail([selectedLead])}
                  disabled={!campaignName.trim()}
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Send Email
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Help Card */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-lg">CSV Format</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <p className="text-gray-600">Your CSV should include these columns:</p>
              <ul className="list-disc list-inside space-y-1 text-gray-600">
                <li>name</li>
                <li>email (required)</li>
                <li>company (required)</li>
                <li>position</li>
                <li>industry</li>
                <li>website</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}