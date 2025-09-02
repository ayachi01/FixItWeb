import { useState, useMemo } from 'react';
import { mockReports } from '../utils/mockData';
import type { Report, ReportType, ProgressStatus } from '../types';

export const useReportViewModel = () => {
  const [reports, setReports] = useState<Report[]>(mockReports);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<ReportType | 'all'>('all');
  const [progressFilter, setProgressFilter] = useState<ProgressStatus | 'all'>('all');

  const filteredReports = useMemo(() => {
    return reports.filter(report => {
      const matchesSearch = report.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           report.room.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           report.user.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesType = typeFilter === 'all' || report.type === typeFilter;
      const matchesProgress = progressFilter === 'all' || report.progress === progressFilter;

      return matchesSearch && matchesType && matchesProgress;
    });
  }, [reports, searchTerm, typeFilter, progressFilter]);

  const clearFilters = () => {
    setSearchTerm('');
    setTypeFilter('all');
    setProgressFilter('all');
  };

  const addReport = (report: Omit<Report, 'id'>) => {
    const newReport: Report = {
      ...report,
      id: Date.now().toString(), // Simple ID generation
    };
    setReports(prev => [newReport, ...prev]);
  };

  const updateReport = (id: string, updates: Partial<Report>) => {
    setReports(prev => prev.map(report => 
      report.id === id ? { ...report, ...updates } : report
    ));
  };

  const deleteReport = (id: string) => {
    setReports(prev => prev.filter(report => report.id !== id));
  };

  const getReportById = (id: string) => {
    return reports.find(report => report.id === id);
  };

  const getReportsByType = (type: ReportType) => {
    return reports.filter(report => report.type === type);
  };

  const getReportsByProgress = (progress: ProgressStatus) => {
    return reports.filter(report => report.progress === progress);
  };

  const getReportsByUser = (user: string) => {
    return reports.filter(report => report.user.toLowerCase().includes(user.toLowerCase()));
  };

  return {
    // State
    reports,
    filteredReports,
    searchTerm,
    typeFilter,
    progressFilter,
    
    // Actions
    setSearchTerm,
    setTypeFilter,
    setProgressFilter,
    clearFilters,
    addReport,
    updateReport,
    deleteReport,
    
    // Queries
    getReportById,
    getReportsByType,
    getReportsByProgress,
    getReportsByUser,
  };
};
