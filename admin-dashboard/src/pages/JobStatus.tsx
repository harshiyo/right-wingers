import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Play, 
  Pause, 
  RefreshCw,
  Calendar,
  TrendingUp,
  Activity,
  Settings,
  Users,
  ShoppingCart,
  Package,
  ChevronLeft,
  ChevronRight,
  Zap,
  AlertTriangle,
  Info,
  BarChart3,
  Timer,
  Cpu,
  Database,
  Globe,
  Smartphone,
  Server,
  List,
  Gauge,
  Target,
  Shield,
  Rocket
} from 'lucide-react';
import { jobScheduler, type JobStatus, type JobSchedule, type QueueItem } from '../services/jobScheduler';

const JobStatus = () => {
  const [jobStatuses, setJobStatuses] = useState<JobStatus[]>([]);
  const [jobSchedules, setJobSchedules] = useState<JobSchedule[]>([]);
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'queue' | 'schedules' | 'history'>('overview');
  const [automationStatus, setAutomationStatus] = useState<any>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  useEffect(() => {
    fetchData();
    // Initialize job scheduler
    jobScheduler.initialize();
    
    // Set up real-time updates
    const interval = setInterval(() => {
      fetchData();
    }, 10000); // Update every 10 seconds

    return () => clearInterval(interval);
  }, []);

  // Pagination calculations
  const totalPages = Math.ceil(jobStatuses.length / itemsPerPage);
  const paginatedJobStatuses = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return jobStatuses.slice(startIndex, startIndex + itemsPerPage);
  }, [jobStatuses, currentPage, itemsPerPage]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    return pages;
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statuses, schedules, queue, automation] = await Promise.all([
        jobScheduler.getJobStatus(100),
        jobScheduler.getJobSchedules(),
        jobScheduler.getQueueStatus(),
        jobScheduler.getAutomationStatus()
      ]);
      setJobStatuses(statuses);
      setJobSchedules(schedules);
      setQueueItems(queue);
      setAutomationStatus(automation);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const handleRunManualJob = async (jobType: string) => {
    try {
      setRefreshing(true);
      await jobScheduler.runManualJob(jobType);
      await fetchData();
    } catch (error) {
      console.error('Error running manual job:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleToggleSchedule = async (schedule: JobSchedule) => {
    try {
      await jobScheduler.updateJobSchedule(schedule.id, {
        isActive: !schedule.isActive
      });
      await fetchData();
    } catch (error) {
      console.error('Error toggling schedule:', error);
    }
  };

  const handleAddManualJob = async (jobType: string, priority: 'low' | 'medium' | 'high' | 'critical' = 'medium') => {
    try {
      await jobScheduler.addManualJob(jobType, priority);
      await fetchData();
    } catch (error) {
      console.error('Error adding manual job:', error);
    }
  };

  const handleResetToDefault = async () => {
    if (window.confirm('This will reset all schedules to default (only customer sync active). Continue?')) {
      try {
        await jobScheduler.resetToDefaultSchedules();
        await fetchData();
      } catch (error) {
        console.error('Error resetting schedules:', error);
      }
    }
  };

  const handleCleanupDuplicates = async () => {
    if (window.confirm('This will remove any duplicate job schedules. Continue?')) {
      try {
        await jobScheduler.cleanupDuplicateSchedules();
        await fetchData();
      } catch (error) {
        console.error('Error cleaning up duplicates:', error);
      }
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'running':
        return <Activity className="h-5 w-5 text-blue-500 animate-pulse" />;
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'queued':
        return <List className="h-5 w-5 text-purple-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-50 text-green-800 border-green-200';
      case 'failed':
        return 'bg-red-50 text-red-800 border-red-200';
      case 'running':
        return 'bg-blue-50 text-blue-800 border-blue-200';
      case 'pending':
        return 'bg-yellow-50 text-yellow-800 border-yellow-200';
      case 'queued':
        return 'bg-purple-50 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-50 text-gray-800 border-gray-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getJobTypeIcon = (type: string) => {
    switch (type) {
      case 'customer_sync':
        return <Users className="h-4 w-4" />;
      case 'order_sync':
        return <ShoppingCart className="h-4 w-4" />;
      case 'inventory_sync':
        return <Package className="h-4 w-4" />;
      case 'online_order_sync':
        return <Globe className="h-4 w-4" />;
      case 'pos_order_sync':
        return <Smartphone className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const formatDuration = (duration?: number) => {
    if (!duration) return 'N/A';
    const seconds = Math.floor(duration / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const formatDateTime = (date?: Date) => {
    if (!date) return 'N/A';
    return date.toLocaleString();
  };

  const getUpcomingRuns = (schedule: JobSchedule) => {
    if (!schedule.isActive || !schedule.nextRun) return [];
    
    const runs = [];
    let currentTime = new Date(schedule.nextRun);
    
    for (let i = 0; i < 5; i++) {
      runs.push(new Date(currentTime));
      currentTime = new Date(currentTime.getTime() + (schedule.interval * 60 * 1000));
    }
    
    return runs;
  };

  const getJobTypeLabel = (type: string) => {
    switch (type) {
      case 'customer_sync':
        return 'Customer Sync';
      case 'order_sync':
        return 'Order Sync';
      case 'inventory_sync':
        return 'Inventory Sync';
      case 'online_order_sync':
        return 'Online Order Sync';
      case 'pos_order_sync':
        return 'POS Order Sync';
      default:
        return type;
    }
  };

  // Statistics calculations
  const stats = useMemo(() => {
    const totalJobs = jobStatuses.length;
    const completedJobs = jobStatuses.filter(job => job.status === 'completed').length;
    const failedJobs = jobStatuses.filter(job => job.status === 'failed').length;
    const runningJobs = jobStatuses.filter(job => job.status === 'running').length;
    const queuedJobs = queueItems.filter(item => item.status === 'queued').length;
    const processingJobs = queueItems.filter(item => item.status === 'processing').length;

    const successRate = totalJobs > 0 ? ((completedJobs / totalJobs) * 100).toFixed(1) : '0';
    const avgDuration = jobStatuses
      .filter(job => job.duration)
      .reduce((acc, job) => acc + (job.duration || 0), 0) / 
      jobStatuses.filter(job => job.duration).length || 0;

    return {
      totalJobs,
      completedJobs,
      failedJobs,
      runningJobs,
      queuedJobs,
      processingJobs,
      successRate,
      avgDuration: Math.round(avgDuration / 1000) // Convert to seconds
    };
  }, [jobStatuses, queueItems]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Job Queue System</h1>
              <p className="text-gray-600 mt-1">Professional queue management and job monitoring</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <button
                onClick={handleResetToDefault}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                <Rocket className="h-4 w-4" />
                Reset Defaults
              </button>
              <button
                onClick={handleCleanupDuplicates}
                className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 transition-colors"
              >
                <Shield className="h-4 w-4" />
                Cleanup Duplicates
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {[
              { id: 'overview', label: 'Overview', icon: BarChart3 },
                             { id: 'queue', label: 'Queue', icon: List },
              { id: 'schedules', label: 'Schedules', icon: Settings },
              { id: 'history', label: 'History', icon: Clock }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Server className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Jobs</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalJobs}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Success Rate</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.successRate}%</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                                     <div className="p-2 bg-purple-100 rounded-lg">
                     <List className="h-6 w-6 text-purple-600" />
                   </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">In Queue</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.queuedJobs}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <Timer className="h-6 w-6 text-orange-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Avg Duration</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.avgDuration}s</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Automation Status */}
            {automationStatus && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Automation Status</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <p className="text-2xl font-bold text-blue-600">{automationStatus.totalSchedules}</p>
                    <p className="text-sm text-gray-600">Total Schedules</p>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <p className="text-2xl font-bold text-green-600">{automationStatus.activeJobs}</p>
                    <p className="text-sm text-gray-600">Active Jobs</p>
                  </div>
                  <div className="text-center p-4 bg-orange-50 rounded-lg">
                    <p className="text-2xl font-bold text-orange-600">{automationStatus.intervalMinutes}</p>
                    <p className="text-sm text-gray-600">Interval (min)</p>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <p className="text-lg font-bold text-purple-600">{automationStatus.defaultActiveJob}</p>
                    <p className="text-sm text-gray-600">Default Active</p>
                  </div>
                </div>
                {automationStatus.activeJobTypes.length > 0 && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm font-medium text-gray-700 mb-2">Currently Active Jobs:</p>
                    <div className="flex flex-wrap gap-2">
                      {automationStatus.activeJobTypes.map((jobType: string) => (
                        <span key={jobType} className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full">
                          {getJobTypeLabel(jobType)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Quick Actions */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { type: 'order_sync', label: 'Order Sync', priority: 'high' as const, icon: ShoppingCart },
                  { type: 'customer_sync', label: 'Customer Sync', priority: 'medium' as const, icon: Users },
                  { type: 'inventory_sync', label: 'Inventory Sync', priority: 'medium' as const, icon: Package },
                  { type: 'online_order_sync', label: 'Online Orders', priority: 'critical' as const, icon: Globe },
                  { type: 'pos_order_sync', label: 'POS Orders', priority: 'critical' as const, icon: Smartphone }
                ].map((job) => (
                  <div key={job.type} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center gap-3">
                      <job.icon className="h-5 w-5 text-gray-600" />
                      <div>
                        <p className="font-medium text-gray-900">{job.label}</p>
                        <p className="text-sm text-gray-500">{job.priority} priority</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleAddManualJob(job.type, job.priority)}
                      className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                    >
                      Add to Queue
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
              <div className="space-y-3">
                {jobStatuses.slice(0, 5).map((job, index) => (
                  <div key={`${job.id}-${index}`} className="flex items-center justify-between p-3 border border-gray-100 rounded-lg">
                    <div className="flex items-center gap-3">
                      {getJobTypeIcon(job.type)}
                      <div>
                        <p className="font-medium text-gray-900">{getJobTypeLabel(job.type)}</p>
                        <p className="text-sm text-gray-500">{formatDateTime(job.startTime)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(job.status)}
                      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(job.status)}`}>
                        {job.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'queue' && (
          <div className="space-y-6">
            {/* Queue Status */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Queue Status</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <p className="text-2xl font-bold text-purple-600">{stats.queuedJobs}</p>
                  <p className="text-sm text-gray-600">Queued</p>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">{stats.processingJobs}</p>
                  <p className="text-sm text-gray-600">Processing</p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">{stats.completedJobs}</p>
                  <p className="text-sm text-gray-600">Completed</p>
                </div>
              </div>

              {/* Queue Items */}
              <div className="space-y-3">
                {queueItems.map((item, index) => (
                  <div key={`${item.id}-${index}`} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center gap-3">
                      {getJobTypeIcon(item.jobType)}
                      <div>
                        <p className="font-medium text-gray-900">{getJobTypeLabel(item.jobType)}</p>
                        <p className="text-sm text-gray-500">
                          {formatDateTime(item.createdAt)} • {item.source}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(item.priority)}`}>
                        {item.priority}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(item.status)}`}>
                        {item.status}
                      </span>
                    </div>
                  </div>
                ))}
                {queueItems.length === 0 && (
                                     <div className="text-center py-8 text-gray-500">
                     <List className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                     <p>No items in queue</p>
                   </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'schedules' && (
          <div className="space-y-6">
            {/* Automation Status Note */}
            {automationStatus && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-blue-900">Automation Status</h4>
                    <p className="text-sm text-blue-700 mt-1">
                      Currently {automationStatus.activeJobs} of {automationStatus.totalSchedules} jobs are active. 
                      By default, only the <strong>Customer Sync</strong> job runs automatically every {automationStatus.intervalMinutes} minutes.
                      Other jobs can be manually activated as needed.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Job Schedules */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Job Schedules</h3>
                <div className="text-sm text-gray-500">
                  Total: {jobSchedules.length} schedules
                </div>
              </div>
              

              
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-gray-600 mt-2">Loading schedules...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {jobSchedules.map((schedule) => (
                    <div key={schedule.id} className="border border-gray-200 rounded-lg p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          {getJobTypeIcon(schedule.type)}
                          <div>
                            <h4 className="font-semibold text-gray-900">
                              {getJobTypeLabel(schedule.type)}
                            </h4>
                            <p className="text-sm text-gray-600">
                              Every {schedule.interval} minutes • {schedule.priority} priority
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleRunManualJob(schedule.type)}
                            disabled={refreshing}
                            className="flex items-center gap-1 px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 disabled:opacity-50 transition-colors"
                          >
                            <Play className="h-3 w-3" />
                            Run Now
                          </button>
                          <button
                            onClick={() => handleToggleSchedule(schedule)}
                            className={`flex items-center gap-1 px-3 py-1 rounded text-sm transition-colors ${
                              schedule.isActive
                                ? 'bg-red-600 text-white hover:bg-red-700'
                                : 'bg-green-600 text-white hover:bg-green-700'
                            }`}
                          >
                            {schedule.isActive ? (
                              <>
                                <Pause className="h-3 w-3" />
                                Pause
                              </>
                            ) : (
                              <>
                                <Play className="h-3 w-3" />
                                Start
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600">Status</p>
                          <p className={`font-medium ${schedule.isActive ? 'text-green-600' : 'text-red-600'}`}>
                            {schedule.isActive ? 'Active' : 'Paused'}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600">Last Run</p>
                          <p className="font-medium">
                            {schedule.lastRun ? formatDateTime(schedule.lastRun) : 'Never'}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600">Next Run</p>
                          <p className="font-medium">
                            {schedule.nextRun ? formatDateTime(schedule.nextRun) : 'N/A'}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600">Retries</p>
                          <p className="font-medium">
                            {schedule.retryCount}/{schedule.maxRetries}
                          </p>
                        </div>
                      </div>

                      {/* Upcoming Runs */}
                      {schedule.isActive && (
                        <div className="mt-4">
                          <p className="text-sm font-medium text-gray-700 mb-2">Upcoming Runs:</p>
                          <div className="flex flex-wrap gap-2">
                            {getUpcomingRuns(schedule).map((run, index) => (
                              <div
                                key={index}
                                className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-xs"
                              >
                                <Calendar className="h-3 w-3" />
                                {run.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-6">
            {/* Job History */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Job History</h3>
              
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-gray-600 mt-2">Loading job history...</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Job Type</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Status</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Priority</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Duration</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Records</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Started</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Completed</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedJobStatuses.map((job, index) => (
                        <tr key={`${job.id}-${index}`} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              {getJobTypeIcon(job.type)}
                              <span className="font-medium">{getJobTypeLabel(job.type)}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              {getStatusIcon(job.status)}
                              <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(job.status)}`}>
                                {job.status}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(job.priority)}`}>
                              {job.priority}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-sm">
                            {formatDuration(job.duration)}
                          </td>
                          <td className="py-3 px-4 text-sm">
                            {job.recordsProcessed || 0} / {job.recordsFailed || 0}
                          </td>
                          <td className="py-3 px-4 text-sm">
                            {formatDateTime(job.startTime)}
                          </td>
                          <td className="py-3 px-4 text-sm">
                            {job.endTime ? formatDateTime(job.endTime) : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  {jobStatuses.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      No job history records found
                    </div>
                  )}

                  {totalPages > 1 && (
                    <div className="flex justify-center items-center gap-2 mt-4">
                      <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="p-2 rounded-full hover:bg-gray-200 disabled:opacity-50"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      {getPageNumbers().map((page) => (
                        <button
                          key={page}
                          onClick={() => handlePageChange(page)}
                          className={`p-2 rounded-full hover:bg-gray-200 ${
                            currentPage === page ? 'bg-blue-600 text-white' : ''
                          }`}
                        >
                          {page}
                        </button>
                      ))}
                      <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="p-2 rounded-full hover:bg-gray-200 disabled:opacity-50"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default JobStatus; 