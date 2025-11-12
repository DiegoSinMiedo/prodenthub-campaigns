import React, { useEffect, useState } from 'react';
import api from '../services/api';

export default function Approvals() {
  const [pendingContent, setPendingContent] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPendingContent();
  }, []);

  const fetchPendingContent = async () => {
    try {
      setLoading(true);
      const response = await api.get('/content/list?status=draft');
      setPendingContent(response.data.items || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching pending content:', error);
      setLoading(false);
    }
  };

  const handleApprove = async (contentId) => {
    try {
      await api.put('/content/update', {
        contentId,
        status: 'approved',
        reviewedBy: 'admin',
        reviewedAt: new Date().toISOString()
      });

      // Refresh list
      fetchPendingContent();
    } catch (error) {
      console.error('Error approving content:', error);
      alert('Failed to approve content');
    }
  };

  const handleReject = async (contentId) => {
    const reason = prompt('Enter rejection reason:');
    if (!reason) return;

    try {
      await api.put('/content/update', {
        contentId,
        status: 'rejected',
        reviewedBy: 'admin',
        reviewedAt: new Date().toISOString(),
        rejectionReason: reason
      });

      // Refresh list
      fetchPendingContent();
    } catch (error) {
      console.error('Error rejecting content:', error);
      alert('Failed to reject content');
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Content Approvals</h1>
          <p className="mt-2 text-sm text-gray-700">
            Review and approve AI-generated content before publication
          </p>
        </div>
      </div>

      {pendingContent.length === 0 ? (
        <div className="text-center py-12">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No pending approvals</h3>
          <p className="mt-1 text-sm text-gray-500">All content has been reviewed.</p>
        </div>
      ) : (
        <div className="mt-8 flow-root">
          <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
            <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
              <div className="space-y-6">
                {pendingContent.map((content) => (
                  <ContentCard
                    key={content.contentId}
                    content={content}
                    onApprove={handleApprove}
                    onReject={handleReject}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ContentCard({ content, onApprove, onReject }) {
  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900">{content.title}</h3>
            <p className="text-sm text-gray-500 mt-1">
              Campaign: {content.campaignId} | Type: {content.type}
            </p>
          </div>
          <span className="inline-flex items-center px-3 py-0.5 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
            Pending Review
          </span>
        </div>
      </div>

      <div className="px-6 py-4">
        <div className="prose max-w-none">
          <p className="text-gray-700 whitespace-pre-wrap">{content.body}</p>
        </div>

        {content.metadata?.ctaUrl && (
          <div className="mt-4">
            <a
              href={content.metadata.ctaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              {content.metadata.ctaUrl}
            </a>
          </div>
        )}

        {content.metadata?.hashtags && content.metadata.hashtags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {content.metadata.hashtags.map((tag, index) => (
              <span
                key={index}
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="px-6 py-4 bg-gray-50 flex justify-end space-x-3">
        <button
          onClick={() => onReject(content.contentId)}
          className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
        >
          Reject
        </button>
        <button
          onClick={() => onApprove(content.contentId)}
          className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
        >
          Approve
        </button>
      </div>
    </div>
  );
}
