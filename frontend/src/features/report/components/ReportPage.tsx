import React from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Search, 
  Filter, 
  Plus, 
  FileText, 
  Calendar, 
  MapPin, 
  User, 
  Clock 
} from 'lucide-react';
import { formatDate, getProgressBadgeVariant } from '../utils/reportUtils';
import { useReportViewModel } from '../hooks/useReportViewModel';

const ReportPage: React.FC = () => {
  const {
    filteredReports,
    searchTerm,
    typeFilter,
    progressFilter,
    setSearchTerm,
    setTypeFilter,
    setProgressFilter,
    clearFilters,
  } = useReportViewModel();

  return (
    <div className="w-full mx-auto space-y-6">
      {/* Filters and Search */}
      <Card>
      <CardHeader>
        <div className="flex items-center justify-between w-full">
            <CardTitle className="flex items-center gap-2">
                <Filter className="w-5 h-5" />
                Filters & Search
            </CardTitle>
            <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                New Report
            </Button>
        </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search reports..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <option value="all">All Types</option>
              <option value="Maintenance">Maintenance</option>
              <option value="Cleaning">Cleaning</option>
              <option value="Security">Security</option>
              <option value="Technical">Technical</option>
              <option value="General">General</option>
            </select>

            <select
              value={progressFilter}
              onChange={(e) => setProgressFilter(e.target.value as any)}
              className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <option value="all">All Progress</option>
              <option value="Pending">Pending</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
              <option value="On Hold">On Hold</option>
              <option value="Cancelled">Cancelled</option>
            </select>

            <Button variant="outline" onClick={clearFilters}>
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Reports Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Reports ({filteredReports.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-semibold">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Report
                    </div>
                  </TableHead>
                  <TableHead className="font-semibold">Type</TableHead>
                  <TableHead className="font-semibold">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      Room
                    </div>
                  </TableHead>
                  <TableHead className="font-semibold">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Date Assigned
                    </div>
                  </TableHead>
                  <TableHead className="font-semibold">Progress</TableHead>
                  <TableHead className="font-semibold">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      User
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReports.map((report) => (
                  <TableRow key={report.id} className="hover:bg-gray-50">
                    <TableCell>
                      <div>
                        <div className="font-medium text-gray-900">{report.title}</div>
                        {report.description && (
                          <div className="text-sm text-gray-500 mt-1">{report.description}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        {report.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{report.room}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-400" />
                        {formatDate(report.dateAssigned)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getProgressBadgeVariant(report.progress)}>
                        {report.progress}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{report.user}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          {filteredReports.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No reports found matching your criteria.</p>
              <p className="text-sm">Try adjusting your filters or search terms.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ReportPage;
