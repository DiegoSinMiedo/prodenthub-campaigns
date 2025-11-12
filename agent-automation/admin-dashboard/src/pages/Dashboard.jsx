import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import api from '../services/api';

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalCampaigns: 0,
    activeCampaigns: 0,
    contentGenerated: 0,
    pendingApprovals: 0,
    publishedToday: 0,
    totalImpressions: 0
  });

  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      // In production, these would be actual API calls
      // For now, showing example data
      setStats({
        totalCampaigns: 5,
        activeCampaigns: 3,
        contentGenerated: 127,
        pendingApprovals: 4,
        publishedToday: 2,
        totalImpressions: 45230
      });

      setRecentActivity([
        { type: 'content_published', campaign: 'Team Creation', time: '2 hours ago' },
        { type: 'content_generated', campaign: 'Scholarship Application', time: '4 hours ago' },
        { type: 'campaign_activated', campaign: 'Mock Exam Registration', time: '1 day ago' }
      ]);

      setLoading(false);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setLoading(false);
    }
  };

  const chartData = [
    { name: 'Mon', content: 4, impressions: 2400 },
    { name: 'Tue', content: 3, impressions: 1398 },
    { name: 'Wed', content: 5, impressions: 9800 },
    { name: 'Thu', content: 2, impressions: 3908 },
    { name: 'Fri', content: 4, impressions: 4800 },
    { name: 'Sat', content: 3, impressions: 3800 },
    { name: 'Sun', content: 2, impressions: 4300 }
  ];

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Dashboard</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 mb-8">
        <StatCard
          title="Total Campaigns"
          value={stats.totalCampaigns}
          subtitle={`${stats.activeCampaigns} active`}
          color="blue"
        />
        <StatCard
          title="Content Generated"
          value={stats.contentGenerated}
          subtitle={`${stats.publishedToday} published today`}
          color="green"
        />
        <StatCard
          title="Pending Approvals"
          value={stats.pendingApprovals}
          subtitle="Awaiting review"
          color="orange"
        />
      </div>

      {/* Charts */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Content Performance (Last 7 Days)</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="content" fill="#cf4520" name="Content Published" />
            <Bar dataKey="impressions" fill="#82ca9d" name="Impressions" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Recent Activity</h2>
        </div>
        <ul className="divide-y divide-gray-200">
          {recentActivity.map((activity, index) => (
            <li key={index} className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {activity.type.replace('_', ' ').toUpperCase()}
                  </p>
                  <p className="text-sm text-gray-500">{activity.campaign}</p>
                </div>
                <span className="text-sm text-gray-500">{activity.time}</span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function StatCard({ title, value, subtitle, color }) {
  const colors = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    orange: 'bg-orange-500'
  };

  return (
    <div className="bg-white overflow-hidden shadow rounded-lg">
      <div className="p-5">
        <div className="flex items-center">
          <div className={`flex-shrink-0 ${colors[color]} rounded-md p-3`}>
            <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">{title}</dt>
              <dd className="flex items-baseline">
                <div className="text-2xl font-semibold text-gray-900">{value}</div>
              </dd>
            </dl>
            <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
