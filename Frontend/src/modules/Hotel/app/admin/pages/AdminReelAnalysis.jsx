import React, { useState, useEffect } from 'react';
import {
  Video,
  Users,
  Heart,
  Loader2,
  Search,
  CheckCircle,
  XCircle,
  Ban,
  Star,
  Eye,
  ExternalLink,
} from 'lucide-react';
import adminService from '../../../services/adminService';
import toast from 'react-hot-toast';

const AdminReelAnalysis = () => {
  const [activeTab, setActiveTab] = useState('moderation'); // 'moderation', 'analytics'
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ totalReels: 0, userStats: [] });
  const [searchTerm, setSearchTerm] = useState('');
  const [couponSettings, setCouponSettings] = useState({
    reelCouponTarget: 1000,
    reelCouponDiscount: 500,
  });
  const [saving, setSaving] = useState(false);

  // Admin Reels State
  const [adminReels, setAdminReels] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [reelsLoading, setReelsLoading] = useState(false);

  useEffect(() => {
    fetchData();
    fetchAdminReels();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await adminService.getReelAnalysis();
      if (res.success) {
        setData({
          totalReels: res.totalReels,
          userStats: res.userStats || [],
        });
        if (res.settings) {
          setCouponSettings(res.settings);
        }
      }
    } catch (error) {
      console.error('Error fetching reel analysis:', error);
      toast.error('Failed to load reel analysis');
    } finally {
      setLoading(false);
    }
  };

  const fetchAdminReels = async () => {
    try {
      setReelsLoading(true);
      const res = await adminService.getAdminReels({
        status: statusFilter,
        search: searchTerm,
      });
      if (res.success) {
        setAdminReels(res.reels || []);
      }
    } catch (error) {
      console.error('Error fetching admin reels:', error);
    } finally {
      setReelsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'moderation') {
      fetchAdminReels();
    }
  }, [statusFilter, activeTab]);

  const handleUpdateStatus = async (id, newStatus) => {
    try {
      const res = await adminService.updateReelStatus(id, newStatus);
      if (res.success) {
        toast.success(res.message);
        setAdminReels((prev) =>
          prev.map((r) => (r._id === id ? { ...r, status: newStatus } : r))
        );
      }
    } catch (error) {
      toast.error('Failed to update reel status');
    }
  };

  const handleToggleFeature = async (id) => {
    try {
      const res = await adminService.toggleFeatureReel(id);
      if (res.success) {
        toast.success(res.message);
        setAdminReels((prev) =>
          prev.map((r) => (r._id === id ? { ...r, isFeatured: res.isFeatured } : r))
        );
      }
    } catch (error) {
      toast.error('Failed to toggle featured status');
    }
  };

  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      const res = await adminService.updatePlatformSettings(couponSettings);
      if (res.success) {
        toast.success('Coupon settings updated successfully');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  const filteredStats = (data.userStats || []).filter(
    (user) =>
      user.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.userPhone?.includes(searchTerm)
  );

  const totalLikes = (data.userStats || []).reduce((acc, curr) => acc + (curr.totalLikes || 0), 0);
  const totalUsers = (data.userStats || []).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 animate-spin text-teal-500" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reels Management & Analysis</h1>
          <p className="text-gray-500 text-sm">Monitor reel engagement, feature content, and moderate uploads</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-gray-100 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('moderation')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                activeTab === 'moderation'
                  ? 'bg-white text-teal-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Reel Moderation
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                activeTab === 'analytics'
                  ? 'bg-white text-teal-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Analytics & Rewards
            </button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Total Reels"
          value={data.totalReels}
          icon={<Video className="w-6 h-6 text-blue-500" />}
          color="bg-blue-50"
        />
        <StatCard
          title="Contributors"
          value={totalUsers}
          icon={<Users className="w-6 h-6 text-purple-500" />}
          color="bg-purple-50"
        />
        <StatCard
          title="Total Engagement"
          value={totalLikes}
          subtitle="Total Likes"
          icon={<Heart className="w-6 h-6 text-red-500" />}
          color="bg-red-50"
        />
      </div>

      {/* TAB 1: MODERATION TAB */}
      {activeTab === 'moderation' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden space-y-4 p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              {['all', 'pending', 'published', 'rejected', 'blocked'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all ${
                    statusFilter === st
                      ? 'bg-teal-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            <button
              onClick={fetchAdminReels}
              className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold text-gray-600 hover:bg-gray-100"
            >
              Refresh List
            </button>
          </div>

          {reelsLoading ? (
            <div className="py-12 flex justify-center">
              <Loader2 className="animate-spin text-teal-600" size={28} />
            </div>
          ) : adminReels.length === 0 ? (
            <div className="py-12 text-center text-gray-500 italic">No reels found for this filter.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
              {adminReels.map((reel) => (
                <div
                  key={reel._id}
                  className="bg-gray-50 rounded-2xl border border-gray-200 p-4 space-y-3 relative flex flex-col justify-between"
                >
                  <div>
                    {/* Top Creator Info & Status Badge */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-teal-600 text-white font-bold flex items-center justify-center text-xs overflow-hidden">
                          {reel.user?.profileImage ? (
                            <img src={reel.user.profileImage} alt="" className="w-full h-full object-cover" />
                          ) : (
                            (reel.user?.name || 'U').charAt(0)
                          )}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-gray-900">{reel.user?.name || 'Unknown'}</p>
                          <span className="text-[10px] text-gray-500 capitalize">{reel.creatorType || 'User'}</span>
                        </div>
                      </div>

                      <span
                        className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                          reel.status === 'published'
                            ? 'bg-emerald-100 text-emerald-800'
                            : reel.status === 'pending'
                            ? 'bg-amber-100 text-amber-800'
                            : reel.status === 'rejected'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-200 text-gray-800'
                        }`}
                      >
                        {reel.status}
                      </span>
                    </div>

                    {/* Thumbnail / Video */}
                    <div className="relative aspect-[9/16] max-h-48 rounded-xl overflow-hidden bg-black mb-3 group">
                      <img
                        src={reel.thumbnailUrl || reel.videoUrl}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                      <a
                        href={reel.videoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white font-bold text-xs gap-1"
                      >
                        <Eye size={16} /> Preview
                      </a>
                    </div>

                    {/* Caption & Category */}
                    <p className="text-xs text-gray-800 line-clamp-2 font-medium">{reel.caption || 'No caption'}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[10px] font-bold bg-teal-100 text-teal-800 px-2 py-0.5 rounded-full">
                        #{reel.category?.toLowerCase() || 'general'}
                      </span>
                      {reel.property && (
                        <span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full flex items-center gap-1 truncate max-w-[140px]">
                          <ExternalLink size={10} />
                          {reel.property.propertyName}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Stats & Actions */}
                  <div className="pt-3 border-t border-gray-200 space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-gray-500">
                      <span>❤️ {reel.likesCount || 0}</span>
                      <span>💬 {reel.commentsCount || 0}</span>
                      <span>🔖 {reel.savesCount || 0}</span>
                      <span>👁️ {reel.viewsCount || 0}</span>
                    </div>

                    <div className="flex items-center justify-between gap-1 pt-1">
                      <button
                        onClick={() => handleToggleFeature(reel._id)}
                        className={`p-1.5 rounded-lg text-xs font-semibold border flex items-center gap-1 ${
                          reel.isFeatured
                            ? 'bg-amber-500 text-white border-amber-500'
                            : 'bg-white text-gray-600 border-gray-200 hover:border-amber-400'
                        }`}
                      >
                        <Star size={14} className={reel.isFeatured ? 'fill-current' : ''} />
                        {reel.isFeatured ? 'Featured' : 'Feature'}
                      </button>

                      <div className="flex gap-1">
                        {reel.status !== 'published' && (
                          <button
                            onClick={() => handleUpdateStatus(reel._id, 'published')}
                            className="p-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700"
                            title="Approve & Publish"
                          >
                            <CheckCircle size={14} />
                          </button>
                        )}
                        {reel.status !== 'rejected' && (
                          <button
                            onClick={() => handleUpdateStatus(reel._id, 'rejected')}
                            className="p-1.5 bg-amber-600 text-white rounded-lg text-xs font-bold hover:bg-amber-700"
                            title="Reject"
                          >
                            <XCircle size={14} />
                          </button>
                        )}
                        {reel.status !== 'blocked' && (
                          <button
                            onClick={() => handleUpdateStatus(reel._id, 'blocked')}
                            className="p-1.5 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700"
                            title="Block"
                          >
                            <Ban size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: ANALYTICS & REWARDS TAB */}
      {activeTab === 'analytics' && (
        <>
          {/* Reward Settings */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 bg-amber-50 rounded-lg">
                <Heart className="w-5 h-5 text-amber-500 fill-current" />
              </div>
              <h2 className="text-lg font-bold text-gray-800">Reel Reward Logic</h2>
            </div>
            <p className="text-sm text-gray-500">
              Automatically generate a PG-only discount coupon when a user's reel reaches a specific like count.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Target Likes per Reel
                </label>
                <input
                  type="number"
                  value={couponSettings.reelCouponTarget}
                  onChange={(e) =>
                    setCouponSettings({ ...couponSettings, reelCouponTarget: e.target.value })
                  }
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                  placeholder="e.g. 1000"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Discount Amount (Flat ₹)
                </label>
                <input
                  type="number"
                  value={couponSettings.reelCouponDiscount}
                  onChange={(e) =>
                    setCouponSettings({ ...couponSettings, reelCouponDiscount: e.target.value })
                  }
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                  placeholder="e.g. 500"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={handleSaveSettings}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 bg-teal-600 text-white rounded-xl text-sm font-semibold hover:bg-teal-700 disabled:opacity-50 transition-all shadow-md shadow-teal-500/20"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : 'Save reward Logic'}
              </button>
            </div>
          </div>

          {/* User Performance Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <h2 className="text-lg font-bold text-gray-800">User Performance</h2>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name or phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 w-full md:w-64"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/50">
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">
                      Reels Posted
                    </th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">
                      Total Likes
                    </th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">
                      Engagement Rate
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredStats.map((user) => (
                    <tr key={user._id} className="hover:bg-gray-50/50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-gray-900">{user.userName}</span>
                          <span className="text-xs text-gray-500">{user.userPhone}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center text-sm text-gray-700 font-medium">
                        {user.reelCount}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center gap-1 text-sm text-red-600 font-bold bg-red-50 px-3 py-1 rounded-full">
                          <Heart size={14} className="fill-current" />
                          {user.totalLikes}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-1 text-sm text-emerald-600 font-bold">
                          {(user.totalLikes / Math.max(1, user.reelCount)).toFixed(1)}{' '}
                          <span className="text-[10px] text-gray-400 font-normal">avg/reel</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredStats.length === 0 && (
                    <tr>
                      <td colSpan="4" className="px-6 py-12 text-center text-gray-500 italic">
                        No matching users found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const StatCard = ({ title, value, icon, color, subtitle }) => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-start gap-4">
    <div className={`p-3 rounded-xl ${color}`}>{icon}</div>
    <div>
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <div className="flex items-baseline gap-2">
        <h3 className="text-2xl font-black text-gray-900 mt-1">{value}</h3>
        {subtitle && <span className="text-xs text-gray-400 font-medium">{subtitle}</span>}
      </div>
    </div>
  </div>
);

export default AdminReelAnalysis;
