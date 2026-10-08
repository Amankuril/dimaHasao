/* Ported from Frontend/src/modules/Hotel/app/admin/pages/AdminUsers.jsx (tools/port.js first pass). */
import React, { useState, useEffect, useCallback } from 'react';
import { Search, MoreVertical, Ban, Mail, Phone, Trash2, Unlock, Eye, Download, Users } from 'lucide-react-native';
import ConfirmationModal from '../components/ConfirmationModal';
import adminService from '../../../services/adminService';
import { toast } from '../../../../lib/notify';
import { Button, Div, Input, Link, Option, Overlay, Select, Span, Icon as UiIcon } from '../../../../components/web';
import { saveTextFile } from '../../../../lib/files';
import {
  AdminPage,
  PageHeader,
  Card,
  Toolbar,
  DataTable,
  THead,
  TBody,
  Row,
  Cell,
  StatusBadge,
  Pagination,
  LoadingState,
  EmptyState,
  ErrorState,
  INPUT,
  BTN_SECONDARY,
  BTN_TEXT_SECONDARY,
} from '../../../../admin/ui';

const COLS = [190, 200, 110, 120, 130, 56];
const LABELS = ['User', 'Contact', 'Role', 'Status', 'Joined', ''];
const MENU_ITEM = 'flex-row items-center gap-2 px-4 h-11';

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [totalUsers, setTotalUsers] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [limit] = useState(10);
  const [filters, setFilters] = useState({
    search: '',
    role: '',
    status: '',
  });
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'danger',
    onConfirm: () => {},
  });
  const fetchUsers = useCallback(
    async (page, currentFilters) => {
      const token = localStorage.getItem('adminToken');
      if (!token) return;
      try {
        setLoading(true);
        const params = {
          page,
          limit,
          search: currentFilters.search,
          role: 'user',
          status: currentFilters.status,
        };
        const data = await adminService.getUsers(params);
        if (data.success) {
          setLoadError(null);
          setUsers(data.users);
          setTotalUsers(data.total);
          setTotalPages(Math.ceil(data.total / limit));
        }
      } catch (error) {
        if (error.response?.status !== 401) {
          console.error('Error fetching users:', error);
          setLoadError(error.message || 'Failed to load users');
          toast.error('Failed to load users');
        }
      } finally {
        setLoading(false);
      }
    },
    [limit],
  );
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers(currentPage, filters);
    }, 300); // 300ms debounce for search
    return () => clearTimeout(timer);
  }, [currentPage, filters, fetchUsers]);

  // Handlers
  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
    setCurrentPage(1); // Reset to first page on filter change
  };
  const handleUpdateStatus = async (userId, isBlocked) => {
    try {
      const res = await adminService.updateUserStatus(userId, isBlocked);
      if (res.success) {
        toast.success(`User ${isBlocked ? 'blocked' : 'unblocked'} successfully`);
        fetchUsers(currentPage, filters);
      }
    } catch {
      toast.error('Failed to update user status');
    }
  };
  const handleAction = (action, user) => {
    setActiveDropdown(null);
    if (action === 'block') {
      setModalConfig({
        isOpen: true,
        title: 'Block User?',
        message: `Are you sure you want to block ${user.name}? They will not be able to login or make bookings.`,
        type: 'danger',
        confirmText: 'Block User',
        onConfirm: () => handleUpdateStatus(user._id, true),
      });
    } else if (action === 'unblock') {
      setModalConfig({
        isOpen: true,
        title: 'Unblock User?',
        message: `Are you sure you want to unblock ${user.name}?`,
        type: 'success',
        confirmText: 'Unblock User',
        onConfirm: () => handleUpdateStatus(user._id, false),
      });
    } else if (action === 'delete') {
      setModalConfig({
        isOpen: true,
        title: 'Delete User?',
        message: `Are you sure you want to delete ${user.name}? This action cannot be undone and all their data will be lost.`,
        type: 'danger',
        confirmText: 'Delete User',
        onConfirm: async () => {
          try {
            const res = await adminService.deleteUser(user._id);
            if (res.success) {
              toast.success('User deleted successfully');
              fetchUsers(currentPage, filters);
            }
          } catch {
            toast.error('Failed to delete user');
          }
        },
      });
    }
  };
  const handleExportCSV = () => {
    if (users.length === 0) {
      toast.error('No data to export');
      return;
    }
    const headers = ['ID', 'Name', 'Email', 'Phone', 'Role', 'Status', 'Joined Date'];
    const csvContent = [
      headers.join(','),
      ...users.map((u) =>
        [u._id, `"${u.name}"`, u.email, u.phone, u.role, u.isBlocked ? 'Blocked' : 'Active', new Date(u.createdAt).toLocaleDateString()].join(','),
      ),
    ].join('\n');
    saveTextFile(`users-export-${new Date().toISOString().split('T')[0]}.csv`, csvContent, 'text/csv;charset=utf-8;');
    toast.success('CSV exported successfully');
  };

  const menuUser = users.find((u) => u._id === activeDropdown);

  const header = (
    <PageHeader
      icon={Users}
      title="User management"
      subtitle={`${totalUsers} registered guest${totalUsers === 1 ? '' : 's'} — view, track and manage accounts`}
      breadcrumb={[{ label: 'Hotel' }, { label: 'Users' }]}
      actions={
        <Button onClick={handleExportCSV} className={BTN_SECONDARY} accessibilityLabel="Export users as CSV">
          <UiIcon as={Download} size={16} className="text-slate-600" />
          <Span className={BTN_TEXT_SECONDARY}>Export CSV</Span>
        </Button>
      }
    />
  );

  return (
    <AdminPage maxWidth={1200}>
      <ConfirmationModal
        isOpen={modalConfig.isOpen}
        onClose={() =>
          setModalConfig({
            ...modalConfig,
            isOpen: false,
          })
        }
        {...modalConfig}
      />

      {header}

      <Card className="mb-4">
        <Toolbar className="mb-0">
          <Div className="flex-row items-center gap-2 flex-1 min-w-[200px] h-11 px-3 rounded-lg border border-slate-300 bg-white">
            <UiIcon as={Search} size={16} className="text-slate-400" />
            <Input
              type="text"
              placeholder="Search name, email or phone"
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="flex-1 text-sm text-slate-900"
            />
          </Div>
          <Select value={filters.role} onChange={(e) => handleFilterChange('role', e.target.value)} className={`${INPUT} w-36`} placeholder="All roles">
            <Option value="">All roles</Option>
            <Option value="user">User</Option>
            <Option value="partner">Partner</Option>
            <Option value="admin">Admin</Option>
          </Select>
          <Select value={filters.status} onChange={(e) => handleFilterChange('status', e.target.value)} className={`${INPUT} w-36`} placeholder="All status">
            <Option value="">All status</Option>
            <Option value="active">Active</Option>
            <Option value="blocked">Blocked</Option>
          </Select>
        </Toolbar>
      </Card>

      {loading ? (
        <LoadingState label="Loading users…" />
      ) : loadError ? (
        <ErrorState title="Could not load users" message={loadError} onRetry={() => fetchUsers(currentPage, filters)} />
      ) : users.length === 0 ? (
        <EmptyState
          icon={Users}
          title={filters.search || filters.status ? 'No matching users' : 'No users yet'}
          message={filters.search || filters.status ? 'No account matches the current search or filter.' : 'Guests appear here once they register on the hotel app.'}
        />
      ) : (
        <>
          <DataTable cols={COLS}>
            <THead cols={COLS} labels={LABELS} />
            <TBody>
              {users.map((user, i) => (
                <Row key={user._id} last={i === users.length - 1}>
                  <Cell width={COLS[0]}>
                    <Div className="flex-row items-center gap-2">
                      <Div className="w-9 h-9 rounded-full bg-slate-100 items-center justify-center shrink-0">
                        <Span className="text-xs font-semibold text-slate-600">{user.name?.charAt(0)?.toUpperCase() || 'U'}</Span>
                      </Div>
                      <Link to={`/hotel/admin/users/${user._id}`} className="flex-1 min-w-0">
                        <Span className="text-sm font-medium text-slate-900" numberOfLines={2}>
                          {user.name}
                        </Span>
                        <Span className="text-xs text-slate-500" numberOfLines={1}>
                          ID: {user._id.slice(-6)}
                        </Span>
                      </Link>
                    </Div>
                  </Cell>
                  <Cell width={COLS[1]}>
                    <Div className="gap-1">
                      <Div className="flex-row items-center gap-1.5">
                        <UiIcon as={Mail} size={12} className="text-slate-400" />
                        <Span className="text-xs text-slate-600 flex-1" numberOfLines={1}>
                          {user.email || 'N/A'}
                        </Span>
                      </Div>
                      <Div className="flex-row items-center gap-1.5">
                        <UiIcon as={Phone} size={12} className="text-slate-400" />
                        <Span className="text-xs text-slate-600 flex-1" numberOfLines={1}>
                          {user.phone}
                        </Span>
                      </Div>
                    </Div>
                  </Cell>
                  <Cell width={COLS[2]}>
                    <StatusBadge tone={user.role === 'admin' ? 'info' : user.role === 'partner' ? 'info' : 'neutral'} label={String(user.role || 'user')} />
                  </Cell>
                  <Cell width={COLS[3]}>
                    <StatusBadge status={user.isBlocked ? 'blocked' : 'active'} label={user.isBlocked ? 'Blocked' : 'Active'} />
                  </Cell>
                  <Cell width={COLS[4]}>
                    {new Date(user.createdAt).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </Cell>
                  <Cell width={COLS[5]} align="center">
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveDropdown(activeDropdown === user._id ? null : user._id);
                      }}
                      accessibilityLabel={`Actions for ${user.name}`}
                      className="w-11 h-11 items-center justify-center rounded-lg"
                    >
                      <UiIcon as={MoreVertical} size={18} className="text-slate-500" />
                    </Button>
                  </Cell>
                </Row>
              ))}
            </TBody>
          </DataTable>
          <Pagination
            page={currentPage}
            pages={totalPages}
            total={totalUsers}
            onPrev={() => setCurrentPage((p) => Math.max(1, p - 1))}
            onNext={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
          />
        </>
      )}

      {activeDropdown && menuUser ? (
        <Overlay onClose={() => setActiveDropdown(null)} className="flex-1 items-center justify-center p-4 bg-black/40" onClick={() => setActiveDropdown(null)}>
          <Div className="w-60 bg-white rounded-xl border border-slate-200 py-1" onClick={(e) => e.stopPropagation()}>
            <Link to={`/hotel/admin/users/${menuUser._id}`} onClick={() => setActiveDropdown(null)} className={MENU_ITEM}>
              <UiIcon as={Eye} size={16} className="text-slate-500" />
              <Span className="text-sm font-medium text-slate-700">View profile</Span>
            </Link>
            {menuUser.isBlocked ? (
              <Button onClick={() => handleAction('unblock', menuUser)} className={MENU_ITEM}>
                <UiIcon as={Unlock} size={16} className="text-slate-500" />
                <Span className="text-sm font-medium text-slate-700">Unblock</Span>
              </Button>
            ) : (
              <Button onClick={() => handleAction('block', menuUser)} className={MENU_ITEM}>
                <UiIcon as={Ban} size={16} className="text-slate-500" />
                <Span className="text-sm font-medium text-slate-700">Block</Span>
              </Button>
            )}
            <Div className="h-px bg-slate-100 my-1" />
            <Button onClick={() => handleAction('delete', menuUser)} className={MENU_ITEM} disabled={menuUser.role === 'admin'}>
              <UiIcon as={Trash2} size={16} className="text-red-600" />
              <Span className="text-sm font-medium text-red-600">Delete</Span>
            </Button>
          </Div>
        </Overlay>
      ) : null}
    </AdminPage>
  );
};
export default AdminUsers;
