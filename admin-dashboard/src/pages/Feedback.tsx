import React, { useState, useEffect } from 'react';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, orderBy, where } from 'firebase/firestore';
import { db } from '../services/firebase';
import { 
  Search, 
  Filter, 
  Star, 
  MessageSquare, 
  Calendar, 
  Eye, 
  Trash2, 
  Reply, 
  ThumbsUp, 
  ThumbsDown, 
  AlertTriangle,
  TrendingUp,
  Users,
  Download,
  RefreshCw,
  CheckCircle,
  Clock
} from 'lucide-react';

interface Feedback {
  id: string;
  customerName: string;
  customerEmail?: string;
  rating: number;
  comment: string;
  orderNumber?: string;
  category: 'food' | 'service' | 'delivery' | 'app' | 'general';
  status: 'new' | 'reviewed' | 'responded' | 'resolved';
  adminResponse?: string;
  adminResponseDate?: string;
  createdAt: string;
  sentiment?: 'positive' | 'neutral' | 'negative';
  tags?: string[];
}

const Feedback = () => {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [filteredFeedbacks, setFilteredFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [ratingFilter, setRatingFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const [showFeedbackDetail, setShowFeedbackDetail] = useState(false);
  const [responseText, setResponseText] = useState('');

  useEffect(() => {
    fetchFeedbacks();
  }, []);

  useEffect(() => {
    filterFeedbacks();
  }, [feedbacks, searchQuery, ratingFilter, categoryFilter, statusFilter]);

  const fetchFeedbacks = async () => {
    try {
      const feedbacksQuery = query(collection(db, 'feedback'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(feedbacksQuery);
      const feedbacksData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Feedback[];
      setFeedbacks(feedbacksData);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching feedbacks:', error);
      setLoading(false);
    }
  };

  const filterFeedbacks = () => {
    let filtered = feedbacks;

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(feedback =>
        feedback.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        feedback.comment.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (feedback.orderNumber && feedback.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // Apply rating filter
    if (ratingFilter !== 'all') {
      const rating = parseInt(ratingFilter);
      filtered = filtered.filter(feedback => feedback.rating === rating);
    }

    // Apply category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(feedback => feedback.category === categoryFilter);
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(feedback => feedback.status === statusFilter);
    }

    setFilteredFeedbacks(filtered);
  };

  const updateFeedbackStatus = async (feedbackId: string, newStatus: Feedback['status']) => {
    try {
      await updateDoc(doc(db, 'feedback', feedbackId), {
        status: newStatus,
        updatedAt: new Date().toISOString()
      });
      fetchFeedbacks();
    } catch (error) {
      console.error('Error updating feedback status:', error);
      alert('Failed to update feedback status.');
    }
  };

  const respondToFeedback = async (feedbackId: string) => {
    if (!responseText.trim()) {
      alert('Please enter a response.');
      return;
    }

    try {
      await updateDoc(doc(db, 'feedback', feedbackId), {
        adminResponse: responseText,
        adminResponseDate: new Date().toISOString(),
        status: 'responded',
        updatedAt: new Date().toISOString()
      });
      setResponseText('');
      setShowFeedbackDetail(false);
      fetchFeedbacks();
    } catch (error) {
      console.error('Error responding to feedback:', error);
      alert('Failed to send response.');
    }
  };

  const deleteFeedback = async (feedbackId: string) => {
    if (window.confirm('Are you sure you want to delete this feedback?')) {
      try {
        await deleteDoc(doc(db, 'feedback', feedbackId));
        fetchFeedbacks();
      } catch (error) {
        console.error('Error deleting feedback:', error);
        alert('Failed to delete feedback.');
      }
    }
  };

  const getStarRating = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
      />
    ));
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 4) return 'text-green-600';
    if (rating >= 3) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getStatusColor = (status: Feedback['status']) => {
    switch (status) {
      case 'new':
        return 'bg-blue-100 text-blue-800';
      case 'reviewed':
        return 'bg-yellow-100 text-yellow-800';
      case 'responded':
        return 'bg-green-100 text-green-800';
      case 'resolved':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryIcon = (category: Feedback['category']) => {
    switch (category) {
      case 'food':
        return '🍕';
      case 'service':
        return '👨‍💼';
      case 'delivery':
        return '🚚';
      case 'app':
        return '📱';
      default:
        return '💬';
    }
  };

  const exportFeedbacks = () => {
    const csvContent = [
      ['Customer', 'Rating', 'Category', 'Status', 'Comment', 'Order Number', 'Date', 'Admin Response'].join(','),
      ...filteredFeedbacks.map(feedback => [
        feedback.customerName,
        feedback.rating,
        feedback.category,
        feedback.status,
        `"${feedback.comment.replace(/"/g, '""')}"`,
        feedback.orderNumber || '',
        new Date(feedback.createdAt).toLocaleString(),
        feedback.adminResponse ? `"${feedback.adminResponse.replace(/"/g, '""')}"` : ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'feedback.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Calculate stats
  const stats = {
    total: feedbacks.length,
    averageRating: feedbacks.length > 0 ? (feedbacks.reduce((sum, f) => sum + f.rating, 0) / feedbacks.length).toFixed(1) : '0',
    newFeedbacks: feedbacks.filter(f => f.status === 'new').length,
    positiveRating: feedbacks.filter(f => f.rating >= 4).length,
    negativeRating: feedbacks.filter(f => f.rating <= 2).length,
    responseRate: feedbacks.length > 0 ? ((feedbacks.filter(f => f.adminResponse).length / feedbacks.length) * 100).toFixed(1) : '0'
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="text-lg">Loading feedback...</div></div>;
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Customer Feedback</h1>
          <p className="text-gray-600 mt-1">Monitor and respond to customer feedback</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={fetchFeedbacks}
            className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </button>
          <button
            onClick={exportFeedbacks}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-blue-500">
          <div className="flex items-center">
            <MessageSquare className="h-8 w-8 text-blue-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Feedback</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-yellow-500">
          <div className="flex items-center">
            <Star className="h-8 w-8 text-yellow-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Avg Rating</p>
              <p className="text-2xl font-bold text-gray-900">{stats.averageRating}/5</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-red-500">
          <div className="flex items-center">
            <Clock className="h-8 w-8 text-red-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">New Feedback</p>
              <p className="text-2xl font-bold text-gray-900">{stats.newFeedbacks}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-green-500">
          <div className="flex items-center">
            <ThumbsUp className="h-8 w-8 text-green-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Positive (4-5★)</p>
              <p className="text-2xl font-bold text-gray-900">{stats.positiveRating}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-red-500">
          <div className="flex items-center">
            <ThumbsDown className="h-8 w-8 text-red-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Negative (1-2★)</p>
              <p className="text-2xl font-bold text-gray-900">{stats.negativeRating}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-purple-500">
          <div className="flex items-center">
            <Reply className="h-8 w-8 text-purple-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Response Rate</p>
              <p className="text-2xl font-bold text-gray-900">{stats.responseRate}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search feedback..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={ratingFilter}
            onChange={(e) => setRatingFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Ratings</option>
            <option value="5">5 Stars</option>
            <option value="4">4 Stars</option>
            <option value="3">3 Stars</option>
            <option value="2">2 Stars</option>
            <option value="1">1 Star</option>
          </select>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Categories</option>
            <option value="food">Food</option>
            <option value="service">Service</option>
            <option value="delivery">Delivery</option>
            <option value="app">App</option>
            <option value="general">General</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="new">New</option>
            <option value="reviewed">Reviewed</option>
            <option value="responded">Responded</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>
      </div>

      {/* Feedback List */}
      <div className="grid grid-cols-1 gap-4">
        {filteredFeedbacks.length === 0 ? (
          <div className="bg-white p-12 rounded-lg shadow text-center text-gray-500">
            {searchQuery || ratingFilter !== 'all' || categoryFilter !== 'all' || statusFilter !== 'all'
              ? 'No feedback found matching your criteria.'
              : 'No feedback received yet.'}
          </div>
        ) : (
          filteredFeedbacks.map((feedback) => (
            <div key={feedback.id} className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-4 mb-3">
                    <div className="flex items-center">
                      <span className="text-2xl mr-2">{getCategoryIcon(feedback.category)}</span>
                      <div>
                        <h3 className="font-semibold text-gray-900">{feedback.customerName}</h3>
                        <div className="flex items-center gap-2">
                          <div className="flex">{getStarRating(feedback.rating)}</div>
                          <span className={`text-sm font-medium ${getRatingColor(feedback.rating)}`}>
                            {feedback.rating}/5
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(feedback.status)}`}>
                        {feedback.status}
                      </span>
                      <span className="text-sm text-gray-500 capitalize">
                        {feedback.category}
                      </span>
                    </div>
                  </div>

                  <p className="text-gray-700 mb-3">{feedback.comment}</p>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>{new Date(feedback.createdAt).toLocaleDateString()}</span>
                      {feedback.orderNumber && (
                        <span>Order #{feedback.orderNumber}</span>
                      )}
                      {feedback.adminResponse && (
                        <span className="flex items-center text-green-600">
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Responded
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setSelectedFeedback(feedback);
                          setShowFeedbackDetail(true);
                        }}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <select
                        value={feedback.status}
                        onChange={(e) => updateFeedbackStatus(feedback.id, e.target.value as Feedback['status'])}
                        className="text-sm border-0 bg-transparent cursor-pointer text-gray-600 hover:text-gray-900"
                      >
                        <option value="new">New</option>
                        <option value="reviewed">Reviewed</option>
                        <option value="responded">Responded</option>
                        <option value="resolved">Resolved</option>
                      </select>
                      <button
                        onClick={() => deleteFeedback(feedback.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {feedback.adminResponse && (
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                      <div className="flex items-center mb-2">
                        <Reply className="h-4 w-4 text-blue-600 mr-1" />
                        <span className="text-sm font-medium text-blue-900">Admin Response</span>
                        <span className="text-xs text-blue-600 ml-2">
                          {new Date(feedback.adminResponseDate!).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-blue-800">{feedback.adminResponse}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Feedback Detail Modal */}
      {showFeedbackDetail && selectedFeedback && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-bold text-gray-900">Feedback Details</h2>
              <button 
                onClick={() => setShowFeedbackDetail(false)}
                className="p-2 rounded-full hover:bg-gray-200"
              >
                ✕
              </button>
            </div>
            <div className="p-6 space-y-6">
              {/* Customer Info */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-3">Customer Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-gray-600">Name:</span>
                    <p className="font-medium">{selectedFeedback.customerName}</p>
                  </div>
                  {selectedFeedback.customerEmail && (
                    <div>
                      <span className="text-sm text-gray-600">Email:</span>
                      <p className="font-medium">{selectedFeedback.customerEmail}</p>
                    </div>
                  )}
                  {selectedFeedback.orderNumber && (
                    <div>
                      <span className="text-sm text-gray-600">Order Number:</span>
                      <p className="font-medium">#{selectedFeedback.orderNumber}</p>
                    </div>
                  )}
                  <div>
                    <span className="text-sm text-gray-600">Date:</span>
                    <p className="font-medium">{new Date(selectedFeedback.createdAt).toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {/* Feedback Details */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Feedback</h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="flex">{getStarRating(selectedFeedback.rating)}</div>
                    <span className={`text-lg font-medium ${getRatingColor(selectedFeedback.rating)}`}>
                      {selectedFeedback.rating}/5 Stars
                    </span>
                    <span className="text-2xl">{getCategoryIcon(selectedFeedback.category)}</span>
                    <span className="capitalize text-gray-600">{selectedFeedback.category}</span>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-gray-800">{selectedFeedback.comment}</p>
                  </div>
                </div>
              </div>

              {/* Existing Response */}
              {selectedFeedback.adminResponse && (
                <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500">
                  <h3 className="font-semibold text-blue-900 mb-2">Previous Response</h3>
                  <p className="text-blue-800 mb-2">{selectedFeedback.adminResponse}</p>
                  <p className="text-xs text-blue-600">
                    Responded on {new Date(selectedFeedback.adminResponseDate!).toLocaleString()}
                  </p>
                </div>
              )}

              {/* Response Form */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">
                  {selectedFeedback.adminResponse ? 'Update Response' : 'Send Response'}
                </h3>
                <textarea
                  value={responseText}
                  onChange={(e) => setResponseText(e.target.value)}
                  rows={4}
                  placeholder="Type your response to this customer..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <div className="flex justify-end gap-3 mt-3">
                  <button
                    onClick={() => setShowFeedbackDetail(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => respondToFeedback(selectedFeedback.id)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    {selectedFeedback.adminResponse ? 'Update Response' : 'Send Response'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Feedback; 