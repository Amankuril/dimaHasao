/* Ported from Frontend/src/modules/Food/pages/admin/system/ArchivedAccounts.jsx (tools/port.js first pass). */
import { useState, useMemo, useEffect } from 'react';
import { Search, User, Smartphone, Mail, Calendar, Trash2, Shield, UserX, Store, Truck, Filter, RefreshCcw } from 'lucide-react-native';
import { adminAPI } from '../../../../api/food';
import { toast } from '../../../../lib/notify';
import { Button, Div, H1, H3, Img, Input, P, ScrollDiv, Span, Table, Tbody, Td, Th, Thead, Tr, Icon as UiIcon } from '../../../../components/web';
export default function ArchivedAccounts() {
  const [searchQuery, setSearchQuery] = useState('');
  const [archivedAccounts, setArchivedAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('all');
  const filteredAccounts = useMemo(() => {
    let result = [...archivedAccounts];

    // Filter by role
    if (roleFilter !== 'all') {
      result = result.filter((acc) => acc.type === roleFilter);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter((acc) => acc.name?.toLowerCase().includes(query) || (acc.email || '').toLowerCase().includes(query) || acc.phone?.includes(query));
    }
    return result;
  }, [archivedAccounts, searchQuery, roleFilter]);
  const fetchArchivedAccounts = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getArchivedAccounts();
      const data = response?.data?.data;
      const list = Array.isArray(data?.accounts) ? data.accounts : Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
      setArchivedAccounts(list);
    } catch (error) {
      console.error('Error fetching archived accounts:', error);
      toast.error('Failed to load archived accounts');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchArchivedAccounts();
  }, []);
  const getInitials = (name) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };
  const getRoleIcon = (type) => {
    switch (type) {
      case 'user':
        return <UiIcon as={User} className="w-4 h-4" />;
      case 'restaurant':
        return <UiIcon as={Store} className="w-4 h-4" />;
      case 'delivery':
        return <UiIcon as={Truck} className="w-4 h-4" />;
      default:
        return <UiIcon as={User} className="w-4 h-4" />;
    }
  };
  const getRoleColor = (type) => {
    switch (type) {
      case 'user':
        return 'bg-blue-50 text-blue-600 border-blue-100';
      case 'restaurant':
        return 'bg-orange-50 text-orange-600 border-orange-100';
      case 'delivery':
        return 'bg-purple-50 text-purple-600 border-purple-100';
      default:
        return 'bg-gray-50 text-gray-600 border-gray-100';
    }
  };

  // Clean phone number for display (remove _deleted_ suffix)
  const formatPhone = (phone) => {
    if (!phone) return 'N/A';
    return phone.split('_')[0];
  };
  return (
    <ScrollDiv className="p-4 lg:p-8 bg-[#F8FAFC] min-h-screen">
      <Div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <Div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <Div>
            <Div className="flex items-center gap-3">
              <H1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-3">
                <Div className="p-2 bg-red-50 rounded-xl">
                  <UiIcon as={UserX} className="w-6 h-6 text-red-600" />
                </Div>
                Archived Accounts
              </H1>
            </Div>
            <P className="text-slate-500 mt-2 text-sm font-medium">View and track deleted users, restaurants, and delivery partners.</P>
          </Div>

          <Div className="flex items-center gap-2">
            <Button
              onClick={fetchArchivedAccounts}
              disabled={loading}
              className={`group p-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl hover:border-red-500 hover:text-red-600 transition-all flex items-center justify-center shadow-sm ${loading ? 'opacity-50' : ''}`}
            >
              <UiIcon as={RefreshCcw} className={`w-5 h-5 ${loading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
            </Button>
          </Div>
        </Div>

        {/* Filters Card */}
        <Div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 mb-8">
          <Div className="flex flex-col lg:flex-row gap-4">
            <Div className="relative flex-1">
              <UiIcon as={Search} className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                type="text"
                placeholder="Search by name, phone or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all text-sm font-medium"
              />
            </Div>

            <Div className="flex flex-wrap items-center gap-3">
              <Div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-200">
                <Button
                  onClick={() => setRoleFilter('all')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${roleFilter === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  All Entities
                </Button>
                <Button
                  onClick={() => setRoleFilter('user')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${roleFilter === 'user' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Users
                </Button>
                <Button
                  onClick={() => setRoleFilter('restaurant')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${roleFilter === 'restaurant' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Restaurants
                </Button>
                <Button
                  onClick={() => setRoleFilter('delivery')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${roleFilter === 'delivery' ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Delivery
                </Button>
              </Div>
            </Div>
          </Div>
        </Div>

        {/* Content Section */}
        <Div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
            <Table cols={[220, 200, 150, 170, 200]} className="w-full text-left border-collapse">
              <Thead>
                <Tr className="bg-slate-50/50 border-b border-slate-100">
                  <Th className="px-6 py-5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Account Information</Th>
                  <Th className="px-6 py-5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Contact Details</Th>
                  <Th className="px-6 py-5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Role & Status</Th>
                  <Th className="px-6 py-5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Deletion Activity</Th>
                  <Th className="px-6 py-5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Re-registration Activity</Th>
                </Tr>
              </Thead>
              <Tbody className="divide-y divide-slate-50">
                {loading ? (
                  Array.from({
                    length: 5,
                  }).map((_, i) => (
                    <Tr key={i} className="animate-pulse">
                      <Td className="px-6 py-6" colSpan="5">
                        <Div className="flex items-center gap-4">
                          <Div className="w-12 h-12 bg-slate-300 rounded-2xl" />
                          <Div className="space-y-2">
                            <Div className="h-4 w-48 bg-slate-300 rounded" />
                            <Div className="h-3 w-32 bg-slate-200 rounded" />
                          </Div>
                        </Div>
                      </Td>
                    </Tr>
                  ))
                ) : filteredAccounts.length > 0 ? (
                  filteredAccounts.map((account) => (
                    <Tr key={account.id} className="hover:bg-slate-50/50 transition-all group">
                      <Td className="px-6 py-6">
                        <Div className="flex items-center gap-4">
                          <Div className="relative">
                            <Div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden">
                              {account.profileImage ? (
                                <Img src={account.profileImage} alt={account.name} className="w-full h-full object-cover" />
                              ) : (
                                <Span className="text-sm font-bold text-slate-400">{getInitials(account.name)}</Span>
                              )}
                            </Div>
                            <Div
                              className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-lg border-2 border-white flex items-center justify-center ${getRoleColor(account.type)}`}
                            >
                              {getRoleIcon(account.type)}
                            </Div>
                          </Div>
                          <Div>
                            <H3 className="text-sm font-bold text-slate-900 group-hover:text-red-600 transition-colors">{account.name}</H3>
                            <Div className="flex items-center gap-2 mt-1">
                              <Span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-500 rounded-md uppercase tracking-tight">
                                ID: {account.id.substring(account.id.length - 8)}
                              </Span>
                            </Div>
                          </Div>
                        </Div>
                      </Td>
                      <Td className="px-6 py-6">
                        <Div className="space-y-1.5">
                          <Div className="flex items-center gap-2 text-xs font-medium text-slate-600">
                            <UiIcon as={Smartphone} className="w-3.5 h-3.5 text-slate-400" />
                            {formatPhone(account.phone)}
                          </Div>
                          <Div className="flex items-center gap-2 text-xs font-medium text-slate-600">
                            <UiIcon as={Mail} className="w-3.5 h-3.5 text-slate-400" />
                            {account.email}
                          </Div>
                        </Div>
                      </Td>
                      <Td className="px-6 py-6">
                        <Div className="space-y-2">
                          <Div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl border text-[11px] font-bold ${getRoleColor(account.type)}`}>
                            {account.role}
                          </Div>
                          <Div className="flex items-center gap-1.5">
                            <Span className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                            <Span className="text-[11px] font-bold text-red-600 uppercase tracking-wider">{account.status}</Span>
                          </Div>
                        </Div>
                      </Td>
                      <Td className="px-6 py-6">
                        <Div className="space-y-1.5">
                          <Div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                            <UiIcon as={Calendar} className="w-3.5 h-3.5 text-slate-400" />
                            {formatDate(account.deletedAt)}
                          </Div>
                          <Div className="flex items-center gap-2 text-[10px] font-medium text-slate-400">
                            <UiIcon as={Trash2} className="w-3 h-3" />
                            Soft Deleted
                          </Div>
                        </Div>
                      </Td>
                      <Td className="px-6 py-6">
                        {account.newAccountCreatedAt ? (
                          <Div className="space-y-1.5">
                            <Div className="flex items-center gap-2 text-xs font-bold text-green-600">
                              <UiIcon as={Calendar} className="w-3.5 h-3.5 text-green-400" />
                              {formatDate(account.newAccountCreatedAt)}
                            </Div>
                            <Div className="flex items-center gap-2 text-[10px] font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded-md border border-green-100 w-fit">
                              New Account Created
                            </Div>
                          </Div>
                        ) : (
                          <Div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100 w-fit">
                            No Re-registration
                          </Div>
                        )}
                      </Td>
                    </Tr>
                  ))
                ) : (
                  <Tr>
                    <Td colSpan="5" className="px-6 py-20 text-center">
                      <Div className="flex flex-col items-center gap-4">
                        <Div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center">
                          <UiIcon as={Shield} className="w-8 h-8 text-slate-200" />
                        </Div>
                        <Div>
                          <H3 className="text-lg font-bold text-slate-900">No archived accounts found</H3>
                          <P className="text-slate-400 text-sm mt-1 max-w-xs mx-auto">
                            {searchQuery
                              ? "Try adjusting your search or filters to find what you're looking for."
                              : 'When accounts are deleted, they will appear here for archival tracking.'}
                          </P>
                        </Div>
                        {searchQuery && (
                          <Button onClick={() => setSearchQuery('')} className="text-red-600 text-sm font-bold hover:underline">
                            Clear Search
                          </Button>
                        )}
                      </Div>
                    </Td>
                  </Tr>
                )}
              </Tbody>
            </Table>

          <Div className="bg-slate-50/50 px-6 py-4 border-t border-slate-100 flex items-center justify-between">
            <Span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Archived Records: {filteredAccounts.length}</Span>
            <Div className="flex items-center gap-2">
              <Span className="text-[10px] font-medium text-slate-400 italic">
                {"* Only records with 'deleted' status are shown here. Restored records are automatically moved to active lists."}
              </Span>
            </Div>
          </Div>
        </Div>
      </Div>
    </ScrollDiv>
  );
}
