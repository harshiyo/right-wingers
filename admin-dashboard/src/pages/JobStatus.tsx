import React, { useState, useEffect } from 'react';
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
  Package
} from 'lucide-react';
import { jobScheduler, type JobStatus, type JobSchedule } from '../services/jobScheduler';

const JobStatus = () => {
  const [jobStatuses, setJobStatuses] = useState<JobStatus[]>([]);
  const [jobSchedules, setJobSchedules] = useState<JobSchedule[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchData();
    // Initialize job scheduler
    jobScheduler.initialize();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statuses, schedules] = await Promise.all([
        jobScheduler.getJobStatus(100),
        jobScheduler.getJobSchedules()
      ]);
      setJobStatuses(statuses);
      setJobSchedules(schedules);
    } catch (error) {
      console.error('Error fetching job data:', error);
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
      await fetchData(); // Refresh data after manual run
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
      default:
        return 'bg-gray-50 text-gray-800 border-gray-200';
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
      default:
        return type;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Job Status & Schedules</h1>
          <p className="text-gray-600 mt-1">Monitor automated jobs and manage schedules</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Job Schedules */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Job Schedules
        </h2>
        
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-2">Loading schedules...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {jobSchedules.map((schedule) => (
              <div key={schedule.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {getJobTypeIcon(schedule.type)}
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {getJobTypeLabel(schedule.type)}
                      </h3>
                      <p className="text-sm text-gray-600">
                        Every {schedule.interval} minutes
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleRunManualJob(schedule.type)}
                      disabled={refreshing}
                      className="flex items-center gap-1 px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 disabled:opacity-50"
                    >
                      <Play className="h-3 w-3" />
                      Run Now
                    </button>
                    <button
                      onClick={() => handleToggleSchedule(schedule)}
                      className={`flex items-center gap-1 px-3 py-1 rounded text-sm ${
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
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
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

      {/* Recent Job Status */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Recent Job Status
        </h2>
        
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-2">Loading job status...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Job Type</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Duration</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Records</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Started</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Completed</th>
                </tr>
              </thead>
              <tbody>
                {jobStatuses.map((job) => (
                  <tr key={job.id} className="border-b border-gray-100 hover:bg-gray-50">
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
                    <td className="py-3 px-4 text-sm">
                      {formatDuration(job.duration)}
                    </td>
                    <td className="py-3 px-4 text-sm">
                      {job.recordsProcessed || 0}
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
                No job status records found
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default JobStatus; 