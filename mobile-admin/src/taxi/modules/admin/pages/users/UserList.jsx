/* Ported from Frontend/src/modules/Taxi/modules/admin/pages/users/UserList.jsx (tools/port.js first pass). */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from '../../../../../lib/webRouter';
import { Search, Download, UserPlus, MoreHorizontal, UserCheck, Edit2, Lock, Trash2, Ban, FileText, Users } from 'lucide-react-native';
import UserModal from './UserModal';
import { adminService } from '../../services/adminService';
import { A, Button, Div, Img, Input, Option, Overlay, Select, Span, Icon as UiIcon } from '../../../../../components/web';
import { alert, window } from '../../../../../lib/webShim';
import { toast } from '../../../../../lib/notify';
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
  BTN_PRIMARY,
  BTN_SECONDARY,
  BTN_TEXT_PRIMARY,
  BTN_TEXT_SECONDARY,
} from '../../../../../admin/ui';

const GENDER_LABELS = {
  male: 'Male',
  female: 'Female',
  other: 'Other',
};

const COLS = [180, 90, 130, 190, 140, 110, 56];
const LABELS = ['User', 'Gender', 'Mobile', 'Email', 'ID Proof', 'Status', ''];

/* A 44 px-tall switch: the row's status control, large enough to hit on a phone. */
const StatusToggle = ({ status, onToggle }) => {
  const on = status === 'Active';
  return (
    <Button
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      accessibilityLabel={on ? 'Block this user' : 'Activate this user'}
      className="h-11 w-11 items-center justify-center"
    >
      <Div className={`h-6 w-11 rounded-full justify-center ${on ? 'bg-green-600' : 'bg-slate-300'}`}>
        <Div className={`h-5 w-5 rounded-full bg-white ${on ? 'ml-5' : 'ml-0.5'}`} />
      </Div>
    </Button>
  );
};

const UserList = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeMenu, setActiveMenu] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [users, setUsers] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [page, setPage] = useState(1);
  const [paginator, setPaginator] = useState(null);
  const latestRequestId = useRef(0);
  const hasLoadedUsersRef = useRef(false);
  const fetchUsers = useCallback(
    async ({ nextPage = page, nextLimit = itemsPerPage, nextSearch = searchTerm } = {}) => {
      const requestId = latestRequestId.current + 1;
      latestRequestId.current = requestId;
      const showInitialLoader = !hasLoadedUsersRef.current;
      try {
        setIsLoading(showInitialLoader);
        setIsRefreshing(!showInitialLoader);
        setError(null);
        const resData = await adminService.getUsers(nextPage, nextLimit, String(nextSearch || '').trim());
        if (requestId !== latestRequestId.current) return;
        if (resData.success) {
          const mapped = (resData.data?.results || []).map((u) => ({
            id: u._id,
            name: u.name || 'Anonymous',
            gender: GENDER_LABELS[u.gender] || 'N/A',
            email: u.email || 'N/A',
            phone: u.mobile || 'N/A',
            profileImage: u.profileImage || '',
            governmentIdProof: u.governmentIdProof || null,
            status: u.active ? 'Active' : 'Suspended',
          }));
          setUsers(mapped);
          setPaginator(resData.data?.paginator || null);
          hasLoadedUsersRef.current = true;
        } else {
          setError(resData.message || 'Failed to fetch users');
        }
      } catch (err) {
        if (requestId !== latestRequestId.current) return;
        setError(err.message || 'Network error');
      } finally {
        if (requestId === latestRequestId.current) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    },
    [itemsPerPage, page, searchTerm],
  );
  useEffect(() => {
    const trimmedSearch = String(searchTerm || '').trim();
    const timeoutId = window.setTimeout(
      () => {
        fetchUsers({
          nextPage: page,
          nextLimit: itemsPerPage,
          nextSearch: trimmedSearch,
        });
      },
      trimmedSearch ? 350 : 0,
    );
    return () => window.clearTimeout(timeoutId);
  }, [fetchUsers, page, itemsPerPage, searchTerm]);
  const handleToggleStatus = async (userId, currentStatus) => {
    const newStatus = currentStatus === 'Active' ? false : true;
    const confirmed = await window.confirmAsync(`Are you sure you want to ${newStatus ? 'activate' : 'block'} this user?`);
    if (!confirmed) return;
    try {
      const resData = await adminService.updateUser(userId, {
        active: newStatus,
      });
      if (resData.success) {
        setUsers(
          users.map((u) =>
            u.id === userId
              ? {
                  ...u,
                  status: newStatus ? 'Active' : 'Suspended',
                }
              : u,
          ),
        );
        toast?.success?.(`User ${newStatus ? 'activated' : 'blocked'} successfully`) || console.log('Status updated');
      }
    } catch (err) {
      console.error('Failed to toggle status', err);
      alert('Failed to update status');
    }
  };
  const handleBlockUser = async (user) => {
    if (!user) return;
    const shouldBlock = user.status === 'Active';
    const confirmed = await window.confirmAsync(
      shouldBlock
        ? `Block ${user.name}? They will not be able to log in, open their profile, or register again with ${user.phone}.`
        : `Unblock ${user.name}? They will be able to use their account again.`,
    );
    if (!confirmed) return;
    await handleToggleStatus(user.id, user.status);
    setActiveMenu(null);
  };
  const handleAddUser = () => {
    navigate('/taxi/admin/users/create');
  };
  const handleEditUser = (user) => {
    setEditingUser(user);
    setIsModalOpen(true);
  };
  const handleDeleteUser = async (userId) => {
    if (await window.confirmAsync('Are you sure you want to delete this user?')) {
      try {
        const resData = await adminService.deleteUser(userId);
        if (resData.success) setUsers(users.filter((u) => u.id !== userId));
      } catch (err) {
        console.error('Failed to delete user', err);
      }
    }
  };
  const handleModalSubmit = async (formData) => {
    try {
      setIsSubmitting(true);
      const resData = editingUser ? await adminService.updateUser(editingUser.id, formData) : await adminService.createUser(formData);
      if (resData.success) {
        setIsModalOpen(false);
        fetchUsers();
      } else {
        alert(resData.message || 'Operation failed');
      }
    } catch (err) {
      alert(err.message || 'Network error');
    } finally {
      setIsSubmitting(false);
    }
  };
  const toggleMenu = (e, userId) => {
    e.stopPropagation();
    setActiveMenu(activeMenu === userId ? null : userId);
  };
  const totalPages = Math.max(1, Number(paginator?.last_page || 1));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const totalEntries = Number(paginator?.total || 0);
  const menuUser = users.find((item) => item.id === activeMenu);
  const MENU_ITEM = 'flex-row items-center gap-2 px-4 h-11';

  const header = (
    <PageHeader
      icon={Users}
      title="Passengers"
      subtitle="Every rider account on the taxi module"
      breadcrumb={[{ label: 'Users' }, { label: 'All Users' }]}
      actions={
        <>
          <Button onClick={handleAddUser} className={BTN_PRIMARY}>
            <UiIcon as={UserPlus} size={16} className="text-white" />
            <Span className={BTN_TEXT_PRIMARY}>New User</Span>
          </Button>
          <Button className={BTN_SECONDARY}>
            <UiIcon as={Download} size={16} className="text-slate-600" />
            <Span className={BTN_TEXT_SECONDARY}>Export</Span>
          </Button>
        </>
      }
    />
  );

  if (isLoading) {
    return (
      <AdminPage maxWidth={1200}>
        {header}
        <LoadingState label="Loading users…" />
      </AdminPage>
    );
  }

  return (
    <AdminPage maxWidth={1200}>
      {header}

      <Card className="mb-4">
        <Toolbar className="mb-0">
          <Div className="flex-row items-center gap-2 flex-1 min-w-[200px] h-11 px-3 rounded-lg border border-slate-300 bg-white">
            <UiIcon as={Search} size={16} className="text-slate-400" />
            <Input
              type="text"
              placeholder="Search by name, mobile, or email"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              className="flex-1 text-sm text-slate-900"
            />
          </Div>
          <Div className="flex-row items-center gap-2">
            <Span className="text-sm text-slate-500">Show</Span>
            <Select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value) || 10);
                setPage(1);
              }}
              className={`${INPUT} w-24`}
            >
              {[10, 25, 50].map((value) => (
                <Option key={value} value={value}>
                  {value}
                </Option>
              ))}
            </Select>
          </Div>
        </Toolbar>
      </Card>

      {error ? (
        <ErrorState title="Could not load users" message={error} onRetry={() => fetchUsers()} />
      ) : users.length === 0 ? (
        <EmptyState
          icon={Users}
          title={searchTerm ? 'No matching passengers' : 'No passengers yet'}
          message={searchTerm ? 'No rider matches that name, mobile or email.' : 'Riders appear here once they register, or you can add one.'}
          actionLabel={searchTerm ? undefined : 'New User'}
          onAction={searchTerm ? undefined : handleAddUser}
        />
      ) : (
        <>
          {isRefreshing ? <Span className="text-xs text-slate-500 mb-2">Updating users…</Span> : null}
          <DataTable cols={COLS}>
            <THead cols={COLS} labels={LABELS} />
            <TBody>
              {users.map((user, i) => (
                <Row key={user.id} last={i === users.length - 1}>
                  <Cell width={COLS[0]}>
                    <Div className="flex-row items-center gap-2">
                      <Div className="w-8 h-8 rounded-full bg-slate-100 items-center justify-center overflow-hidden shrink-0">
                        {user.profileImage ? (
                          <Img src={user.profileImage} alt={user.name} className="h-8 w-8 rounded-full" contentFit="cover" />
                        ) : (
                          <Span className="text-xs font-semibold text-slate-600">
                            {user.name
                              .split(' ')
                              .map((n) => n[0])
                              .join('')}
                          </Span>
                        )}
                      </Div>
                      <Button type="button" onClick={() => navigate(`/taxi/admin/users/${user.id}`)} className="flex-1 min-w-0 py-1">
                        <Span className="text-sm font-medium text-slate-900" numberOfLines={2}>
                          {user.name}
                        </Span>
                      </Button>
                    </Div>
                  </Cell>
                  <Cell width={COLS[1]}>{user.gender}</Cell>
                  <Cell width={COLS[2]}>{user.phone}</Cell>
                  <Cell width={COLS[3]}>{user.email}</Cell>
                  <Cell width={COLS[4]}>
                    {user.governmentIdProof?.imageUrl ? (
                      <A href={user.governmentIdProof.imageUrl} onClick={(e) => e.stopPropagation()}>
                        <StatusBadge tone="success" icon={FileText} label={String(user.governmentIdProof.type || 'ID').replace(/_/g, ' ')} />
                      </A>
                    ) : (
                      <StatusBadge tone="danger" label="Missing" />
                    )}
                  </Cell>
                  <Cell width={COLS[5]}>
                    <Div className="flex-row items-center gap-2">
                      <StatusToggle status={user.status} onToggle={() => handleToggleStatus(user.id, user.status)} />
                      <StatusBadge status={user.status.toLowerCase()} label={user.status} />
                    </Div>
                  </Cell>
                  <Cell width={COLS[6]} align="center">
                    <Button onClick={(e) => toggleMenu(e, user.id)} accessibilityLabel={`Actions for ${user.name}`} className="w-11 h-11 items-center justify-center rounded-lg">
                      <UiIcon as={MoreHorizontal} size={18} className="text-slate-500" />
                    </Button>
                  </Cell>
                </Row>
              ))}
            </TBody>
          </DataTable>
          <Pagination
            page={safePage}
            pages={totalPages}
            total={totalEntries}
            onPrev={() => setPage((current) => Math.max(1, current - 1))}
            onNext={() => setPage((current) => Math.min(totalPages, current + 1))}
          />
        </>
      )}

      {activeMenu && (
        <Overlay onClose={() => setActiveMenu(null)} className="flex-1 items-center justify-center p-4" onClick={() => setActiveMenu(null)}>
          <Div className="w-56 bg-white rounded-xl border border-slate-200 py-1" onClick={(e) => e.stopPropagation()}>
            <Button
              onClick={() => {
                setActiveMenu(null);
                navigate(`/taxi/admin/users/${activeMenu}`);
              }}
              className={MENU_ITEM}
            >
              <UiIcon as={UserCheck} size={16} className="text-slate-500" />
              <Span className="text-sm font-medium text-slate-700">View Profile</Span>
            </Button>
            <Button
              onClick={() => {
                setActiveMenu(null);
                handleEditUser(users.find((item) => item.id === activeMenu));
              }}
              className={MENU_ITEM}
            >
              <UiIcon as={Edit2} size={16} className="text-slate-500" />
              <Span className="text-sm font-medium text-slate-700">Edit</Span>
            </Button>
            <Button
              onClick={() => {
                setActiveMenu(null);
                handleEditUser(users.find((item) => item.id === activeMenu));
              }}
              className={MENU_ITEM}
            >
              <UiIcon as={Lock} size={16} className="text-slate-500" />
              <Span className="text-sm font-medium text-slate-700">Update Password</Span>
            </Button>
            <Button
              onClick={() => {
                setActiveMenu(null);
                handleBlockUser(users.find((item) => item.id === activeMenu));
              }}
              className={MENU_ITEM}
            >
              <UiIcon as={Ban} size={16} className="text-slate-500" />
              <Span className="text-sm font-medium text-slate-700">{menuUser?.status === 'Active' ? 'Block User' : 'Unblock User'}</Span>
            </Button>
            <Div className="h-px bg-slate-100 my-1" />
            <Button
              onClick={() => {
                setActiveMenu(null);
                handleDeleteUser(activeMenu);
              }}
              className={MENU_ITEM}
            >
              <UiIcon as={Trash2} size={16} className="text-red-600" />
              <Span className="text-sm font-medium text-red-600">Delete</Span>
            </Button>
          </Div>
        </Overlay>
      )}

      <UserModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSubmit={handleModalSubmit} editingUser={editingUser} isLoading={isSubmitting} />
    </AdminPage>
  );
};
export default UserList;
