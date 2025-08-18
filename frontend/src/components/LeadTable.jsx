import React, { useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  Search, 
  Filter, 
  Download,
  Mail,
  ExternalLink,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { cn } from '@/lib/utils'

const ITEMS_PER_PAGE = 10

const getScoreBadge = (score) => {
  if (score >= 0.8) {
    return <Badge className="bg-green-100 text-green-800">Hot</Badge>
  } else if (score >= 0.6) {
    return <Badge className="bg-yellow-100 text-yellow-800">Warm</Badge>
  } else if (score >= 0.4) {
    return <Badge className="bg-blue-100 text-blue-800">Cold</Badge>
  } else {
    return <Badge className="bg-gray-100 text-gray-800">Nurture</Badge>
  }
}

const getStatusBadge = (status) => {
  const statusConfig = {
    'not_contacted': { label: 'Not Contacted', className: 'bg-gray-100 text-gray-800' },
    'contacted': { label: 'Contacted', className: 'bg-blue-100 text-blue-800' },
    'replied': { label: 'Replied', className: 'bg-green-100 text-green-800' },
    'interested': { label: 'Interested', className: 'bg-green-100 text-green-800' },
    'not_interested': { label: 'Not Interested', className: 'bg-red-100 text-red-800' },
    'bounced': { label: 'Bounced', className: 'bg-red-100 text-red-800' },
  }
  
  const config = statusConfig[status] || statusConfig['not_contacted']
  return <Badge className={config.className}>{config.label}</Badge>
}

export default function LeadTable({ leads = [], onLeadSelect, onSendEmail }) {
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedLeads, setSelectedLeads] = useState(new Set())

  // Filter leads based on search term
  const filteredLeads = leads.filter(lead =>
    lead.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.position?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Pagination
  const totalPages = Math.ceil(filteredLeads.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const currentLeads = filteredLeads.slice(startIndex, endIndex)

  const handleSelectLead = (leadId) => {
    const newSelected = new Set(selectedLeads)
    if (newSelected.has(leadId)) {
      newSelected.delete(leadId)
    } else {
      newSelected.add(leadId)
    }
    setSelectedLeads(newSelected)
  }

  const handleSelectAll = () => {
    if (selectedLeads.size === currentLeads.length) {
      setSelectedLeads(new Set())
    } else {
      setSelectedLeads(new Set(currentLeads.map(lead => lead.id || lead.email)))
    }
  }

  const handleSendBulkEmail = () => {
    const selectedLeadData = currentLeads.filter(lead => 
      selectedLeads.has(lead.id || lead.email)
    )
    onSendEmail?.(selectedLeadData)
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search leads..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 w-80"
            />
          </div>
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
        </div>
        <div className="flex items-center space-x-2">
          {selectedLeads.size > 0 && (
            <Button onClick={handleSendBulkEmail} size="sm">
              <Mail className="h-4 w-4 mr-2" />
              Send Email ({selectedLeads.size})
            </Button>
          )}
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <input
                  type="checkbox"
                  checked={selectedLeads.size === currentLeads.length && currentLeads.length > 0}
                  onChange={handleSelectAll}
                  className="rounded"
                />
              </TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Position</TableHead>
              <TableHead>Score</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentLeads.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  {searchTerm ? 'No leads found matching your search.' : 'No leads available. Upload a CSV file to get started.'}
                </TableCell>
              </TableRow>
            ) : (
              currentLeads.map((lead, index) => {
                const leadId = lead.id || lead.email
                const isSelected = selectedLeads.has(leadId)
                
                return (
                  <TableRow 
                    key={leadId} 
                    className={cn(
                      "cursor-pointer hover:bg-muted/50",
                      isSelected && "bg-muted/50"
                    )}
                    onClick={() => onLeadSelect?.(lead)}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleSelectLead(leadId)}
                        className="rounded"
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      {lead.name || 'N/A'}
                    </TableCell>
                    <TableCell>
                      <a 
                        href={`mailto:${lead.email}`}
                        className="text-blue-600 hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {lead.email}
                      </a>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        {lead.company || 'N/A'}
                        {lead.website && (
                          <a
                            href={lead.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ml-1 text-muted-foreground hover:text-foreground"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{lead.position || 'N/A'}</TableCell>
                    <TableCell>
                      {getScoreBadge(lead.score || 0.5)}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(lead.status || 'not_contacted')}
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onSendEmail?.([lead])}
                      >
                        <Mail className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {startIndex + 1} to {Math.min(endIndex, filteredLeads.length)} of {filteredLeads.length} leads
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <div className="flex items-center space-x-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <Button
                  key={page}
                  variant={currentPage === page ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentPage(page)}
                  className="w-8 h-8 p-0"
                >
                  {page}
                </Button>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}