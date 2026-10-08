/* Ported from Frontend/src/modules/Taxi/modules/admin/pages/management/Admins.jsx (tools/port.js first pass). */
import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useWindowDimensions } from 'react-native';
import { AlertTriangle, CheckCircle, Clock, Crown, Download, Edit2, Eye, FileSearch, FileText, Info, KeyRound, Laptop, Loader2, Lock, Plus, RefreshCw, Search, Shield, ShieldCheck, Trash2, UserMinus, Users, X } from 'lucide-react-native';
import { useNavigate } from '../../../../../lib/webRouter';
import { toast } from '../../../../../lib/notify';
import { adminService } from '../../services/adminService';
import { ADMIN_PERMISSION_GROUPS } from '../../constants/adminAccess';
import {
  A,
  AdminPage,
  PageHeader,
  Card,
  SectionTitle,
  StatCard,
  StatGrid,
  Toolbar,
  DataTable,
  THead,
  TBody,
  Row,
  Cell,
  StatusBadge,
  TableSkeleton,
  EmptyState,
  ErrorState,
  Field,
  INPUT,
  BTN_PRIMARY,
  BTN_SECONDARY,
  BTN_DANGER,
  BTN_TEXT_PRIMARY,
  BTN_TEXT_SECONDARY,
  useLayoutWidth,
} from '../../../../../admin/ui';
import {
  Button,
  CheckBox,
  Div,
  Form,
  Input,
  Option,
  Overlay,
  ScrollDiv,
  Select,
  Span,
  Textarea,
  Icon as UiIcon,
} from '../../../../../components/web';
import { Circle, Line, Path, Svg } from 'react-native-svg';
import { window } from '../../../../../lib/webShim';
import { saveTextFile } from '../../../../../lib/files';
const Admins = () => {
  const navigate = useNavigate();

  // Data State
  const [admins, setAdmins] = useState([]);
  const [serviceLocations, setServiceLocations] = useState([]);
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [saving, setSaving] = useState(false);
  const { width: windowWidth } = useWindowDimensions();
  const { tablet } = useLayoutWidth();

  // Search, Filters & Sorting State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('All');
  const [filterDepartment, setFilterDepartment] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterMfa, setFilterMfa] = useState('All');
  const [filterVerification, setFilterVerification] = useState('All');
  const [sortBy, setSortBy] = useState('Newest');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Timeline Filter State
  const [growthFilter, setGrowthFilter] = useState('Last 12 Months');

  // Chart hover states
  const [hoveredGrowthIndex, setHoveredGrowthIndex] = useState(null);
  const [hoveredDonutSegment, setHoveredDonutSegment] = useState(null);

  // Drawer / Modal States
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [popoverAnchor, setPopoverAnchor] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);
  const popoverRef = useRef(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deletingAdmin, setDeletingAdmin] = useState(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [activeTab, setActiveTab] = useState('details'); // details, permissions, activity

  // Selected row checkboxes
  const [selectedRowIds, setSelectedRowIds] = useState([]);

  // Form State (for Create / Edit)
  const initialFormState = {
    name: '',
    email: '',
    phone: '',
    role: 'Operations Subadmin',
    admin_type: 'subadmin',
    permissions: [],
    service_location_ids: [],
    zone_ids: [],
    password: '',
    passwordConfirmation: '',
    active: true,
    employeeId: '',
    department: 'Operations',
    designation: 'Subadmin Officer',
    notes: '',
    mfaEnabled: false,
  };
  const [form, setForm] = useState(initialFormState);

  // Load Initial Data
  const loadData = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [adminsResponse, locationsResponse, zonesResponse] = await Promise.all([
        adminService.getAdmins(),
        adminService.getServiceLocations().catch(() => ({
          data: [],
        })),
        adminService.getZones().catch(() => ({
          data: {
            results: [],
          },
        })),
      ]);
      setAdmins(Array.isArray(adminsResponse?.data?.results) ? adminsResponse.data.results : []);
      const locData = Array.isArray(locationsResponse?.data) ? locationsResponse.data : locationsResponse?.data?.results || [];
      setServiceLocations(locData);
      const zoneData = Array.isArray(zonesResponse?.data?.results) ? zonesResponse.data.results : zonesResponse?.data || [];
      setZones(zoneData);
    } catch (error) {
      setLoadError(error?.response?.data?.message || error?.message || 'Unable to load administration data.');
      toast.error(error?.response?.data?.message || error?.message || 'Unable to load administration data.');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    loadData();
  }, []);

  // Escape key listener to close details
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsDrawerOpen(false);
        setSelectedAdmin(null);
      }
    };
    if (isDrawerOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isDrawerOpen]);

  // Filter & Sort Logic
  const filteredAndSortedAdmins = useMemo(() => {
    let result = [...admins];

    // Search query
    const query = searchTerm.trim().toLowerCase();
    if (query) {
      result = result.filter((item) =>
        [item.name, item.email, item.phone, item.employeeId, item.role, item.admin_type, item.department, item.designation].some((val) =>
          String(val || '')
            .toLowerCase()
            .includes(query),
        ),
      );
    }

    // Role filter
    if (filterRole !== 'All') {
      result = result.filter((item) => {
        if (filterRole === 'Super Admin') return item.admin_type === 'superadmin';
        return item.role === filterRole;
      });
    }

    // Department filter
    if (filterDepartment !== 'All') {
      result = result.filter((item) => {
        const dept = item.department || 'Operations';
        return dept.toLowerCase() === filterDepartment.toLowerCase();
      });
    }

    // Status filter
    if (filterStatus !== 'All') {
      result = result.filter((item) => {
        const isActive = item.active !== false;
        if (filterStatus === 'Active') return isActive;
        return !isActive;
      });
    }

    // MFA filter
    if (filterMfa !== 'All') {
      result = result.filter((item) => {
        const hasMfa = item.mfaEnabled || false;
        return filterMfa === 'Enabled' ? hasMfa : !hasMfa;
      });
    }

    // Verification filter
    if (filterVerification !== 'All') {
      result = result.filter((item) => {
        const isVerified = item.active !== false; // derived status
        return filterVerification === 'Verified' ? isVerified : !isVerified;
      });
    }

    // Sorting
    result.sort((a, b) => {
      if (sortBy === 'Newest') {
        return new Date(b.createdAt || b.created_at || 0) - new Date(a.createdAt || a.created_at || 0);
      }
      if (sortBy === 'Oldest') {
        return new Date(a.createdAt || a.created_at || 0) - new Date(b.createdAt || b.created_at || 0);
      }
      if (sortBy === 'Alphabetical') {
        return String(a.name || '').localeCompare(String(b.name || ''));
      }
      if (sortBy === 'Last Login') {
        return new Date(b.lastLogin || 0) - new Date(a.lastLogin || 0);
      }
      if (sortBy === 'Role') {
        return String(a.admin_type || '').localeCompare(String(b.admin_type || ''));
      }
      return 0;
    });
    return result;
  }, [admins, searchTerm, filterRole, filterDepartment, filterStatus, filterMfa, filterVerification, sortBy]);

  // Executive Stats calculations
  const stats = useMemo(() => {
    const total = admins.length;
    const superadmins = admins.filter((item) => item.admin_type === 'superadmin').length;
    const subadmins = admins.filter((item) => item.admin_type === 'subadmin').length;
    const active = admins.filter((item) => item.active !== false).length;
    const offline = total - active;
    const mfaEnabled = admins.filter((item) => item.mfaEnabled).length;
    const suspended = admins.filter((item) => item.active === false).length;
    const locked = admins.filter((item) => item.locked).length;
    return {
      total,
      superadmins,
      subadmins,
      active,
      offline,
      mfaEnabled,
      suspended,
      locked,
    };
  }, [admins]);

  // Role distribution calculation for donut chart
  const roleDistribution = useMemo(() => {
    if (admins.length === 0) return [];
    const counts = {
      'Super Admin': 0,
      Operations: 0,
      Finance: 0,
      Support: 0,
      Others: 0,
    };
    admins.forEach((admin) => {
      if (admin.admin_type === 'superadmin') {
        counts['Super Admin']++;
      } else {
        const role = String(admin.role || '').toLowerCase();
        if (role.includes('operation')) counts['Operations']++;
        else if (role.includes('finance') || role.includes('billing')) counts['Finance']++;
        else if (role.includes('support') || role.includes('staff')) counts['Support']++;
        else counts['Others']++;
      }
    });
    const colors = {
      'Super Admin': '#FFC400',
      Operations: '#3B82F6',
      Finance: '#10B981',
      Support: '#8B5CF6',
      Others: '#6B7280',
    };
    const totalCount = admins.length;
    return Object.keys(counts)
      .map((key) => ({
        label: key,
        value: counts[key],
        percentage: totalCount > 0 ? Math.round((counts[key] / totalCount) * 1000) / 10 : 0,
        color: colors[key],
      }))
      .filter((item) => item.value > 0);
  }, [admins]);

  // Historical Growth calculation
  const growthData = useMemo(() => {
    if (admins.length === 0) return [];

    // Generate last 12 months list
    const months = [];
    const countMonths = growthFilter === 'Last 12 Months' ? 12 : 6;
    for (let i = countMonths - 1; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      months.push({
        name: d.toLocaleString('default', {
          month: 'short',
        }),
        count: 0,
      });
    }
    admins.forEach((admin) => {
      const dateStr = admin.createdAt || admin.created_at;
      if (!dateStr) return;
      const createdDate = new Date(dateStr);
      const diffMonths = (new Date().getFullYear() - createdDate.getFullYear()) * 12 + new Date().getMonth() - createdDate.getMonth();
      if (diffMonths >= 0 && diffMonths < countMonths) {
        months[countMonths - 1 - diffMonths].count++;
      }
    });
    let sum =
      admins.length -
      admins.filter((a) => {
        const dateStr = a.createdAt || a.created_at;
        if (!dateStr) return false;
        const createdDate = new Date(dateStr);
        const diffMonths = (new Date().getFullYear() - createdDate.getFullYear()) * 12 + new Date().getMonth() - createdDate.getMonth();
        return diffMonths < countMonths;
      }).length;
    return months.map((m) => {
      sum += m.count;
      return {
        month: m.name,
        total: sum,
      };
    });
  }, [admins, growthFilter]);

  // Security score
  const securityScore = useMemo(() => {
    if (stats.total === 0) return 0;
    const mfaRatio = stats.mfaEnabled / stats.total;
    const activeRatio = stats.active / stats.total;
    let score = 55 + mfaRatio * 25 + activeRatio * 20;
    return Math.max(0, Math.min(100, Math.round(score)));
  }, [stats]);

  // Form Field Updater
  const setField = (key, value) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  // Toggle permissions
  const togglePermission = (key) => {
    setForm((current) => {
      const next = current.permissions.includes(key) ? current.permissions.filter((p) => p !== key) : [...current.permissions, key];
      return {
        ...current,
        permissions: next,
      };
    });
  };

  // Checkbox handlers
  const handleSelectAllRows = (e) => {
    if (e.target.checked) {
      setSelectedRowIds(filteredAndSortedAdmins.map((a) => a.id || a._id));
    } else {
      setSelectedRowIds([]);
    }
  };
  const handleSelectRow = (id, checked) => {
    setSelectedRowIds((prev) => (checked ? [...prev, id] : prev.filter((item) => item !== id)));
  };

  // Handle Create Submit
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) {
      toast.error('Name and email are required');
      return;
    }
    if (!form.password) {
      toast.error('Password is required for new accounts');
      return;
    }
    if (form.password !== form.passwordConfirmation) {
      toast.error('Passwords do not match');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        role: form.admin_type === 'superadmin' ? 'superadmin' : form.role,
        admin_type: form.admin_type,
        permissions: form.admin_type === 'superadmin' ? ['*'] : form.permissions,
        service_location_ids: form.service_location_ids,
        zone_ids: form.zone_ids,
        password: form.password,
        active: form.active,
        employeeId: form.employeeId,
        department: form.department,
        designation: form.designation,
        notes: form.notes,
        mfaEnabled: form.mfaEnabled,
      };
      await adminService.createAdminAccount(payload);
      toast.success('Administrator created successfully');
      setIsCreateOpen(false);
      loadData();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Creation failed');
    } finally {
      setSaving(false);
    }
  };

  // Handle Edit Click
  const handleEditClick = (admin) => {
    window.dispatchEvent(new Event('admin:closeDropdowns'));
    setIsDrawerOpen(false); // Close details drawer if open
    setForm({
      id: admin.id || admin._id,
      name: admin.name || '',
      email: admin.email || '',
      phone: admin.phone || '',
      role: admin.role || 'Operations Subadmin',
      admin_type: admin.admin_type || 'subadmin',
      permissions: admin.permissions || [],
      service_location_ids: admin.service_location_ids || [],
      zone_ids: admin.zone_ids || [],
      password: '',
      passwordConfirmation: '',
      active: admin.active !== false,
      employeeId: admin.employeeId || '',
      department: admin.department || 'Operations',
      designation: admin.designation || 'Subadmin Officer',
      notes: admin.notes || '',
      mfaEnabled: admin.mfaEnabled || false,
    });
    setIsEditOpen(true);
  };

  // Handle Edit Submit
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) {
      toast.error('Name and email are required');
      return;
    }
    if (form.password && form.password !== form.passwordConfirmation) {
      toast.error('Passwords do not match');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        role: form.admin_type === 'superadmin' ? 'superadmin' : form.role,
        admin_type: form.admin_type,
        permissions: form.admin_type === 'superadmin' ? ['*'] : form.permissions,
        service_location_ids: form.service_location_ids,
        zone_ids: form.zone_ids,
        active: form.active,
        employeeId: form.employeeId,
        department: form.department,
        designation: form.designation,
        notes: form.notes,
        mfaEnabled: form.mfaEnabled,
      };
      if (form.password) {
        payload.password = form.password;
      }
      await adminService.updateAdminAccount(form.id, payload);
      toast.success('Administrator profile updated successfully');
      setIsEditOpen(false);
      loadData();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  // Handle Delete Confirmation
  const handleDeleteConfirm = async () => {
    if (deleteConfirmText !== 'DELETE') {
      toast.error('Please type DELETE to confirm');
      return;
    }
    setSaving(true);
    try {
      const id = deletingAdmin.id || deletingAdmin._id;
      await adminService.deleteAdminAccount(id);
      toast.success('Admin deleted successfully');
      setIsDeleteOpen(false);
      setDeletingAdmin(null);
      setDeleteConfirmText('');
      loadData();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Delete failed');
    } finally {
      setSaving(false);
    }
  };

  // Handle Export CSV
  const handleExport = async () => {
    const headers = 'Name,Email,Phone,Role,Type,Active,MFA,Created Date\n';
    const rows = admins
      .map(
        (admin) =>
          `"${admin.name}","${admin.email}","${admin.phone}","${admin.role}","${admin.admin_type}",${admin.active !== false},${admin.mfaEnabled || false},"${admin.createdAt || admin.created_at || ''}"`,
      )
      .join('\n');
    await saveTextFile(`Administrators_${new Date().toISOString().split('T')[0]}.csv`, headers + rows, 'text/csv');
    toast.success('Exported administration logs');
  };

  // Custom SVG line calculations
  const chartWidth = 500;
  const chartHeight = 150;
  const growthPoints = useMemo(() => {
    if (growthData.length === 0) return [];
    const maxVal = Math.max(...growthData.map((d) => d.total), 5);
    return growthData.map((d, i) => {
      const x = (i / (growthData.length - 1)) * chartWidth;
      const y = chartHeight - (d.total / maxVal) * (chartHeight - 30) - 15;
      return {
        x,
        y,
        label: d.month,
        value: d.total,
      };
    });
  }, [growthData]);
  const linePath = useMemo(() => {
    if (growthPoints.length === 0) return '';
    return 'M ' + growthPoints.map((p) => `${p.x} ${p.y}`).join(' L ');
  }, [growthPoints]);
  const areaPath = useMemo(() => {
    if (growthPoints.length === 0) return '';
    return `${linePath} L ${chartWidth} ${chartHeight} L 0 ${chartHeight} Z`;
  }, [growthPoints, linePath]);

  // Donut calculations
  const donutRadius = 30;
  const donutCircumference = 2 * Math.PI * donutRadius;
  const donutSegments = useMemo(() => {
    const totalVal = roleDistribution.reduce((acc, curr) => acc + curr.value, 0);
    let accumulatedAngle = 0;
    return roleDistribution.map((r) => {
      const percentage = totalVal > 0 ? r.value / totalVal : 0;
      const strokeDasharray = `${percentage * donutCircumference} ${donutCircumference}`;
      const strokeDashoffset = -accumulatedAngle;
      accumulatedAngle += percentage * donutCircumference;
      return {
        ...r,
        strokeDasharray,
        strokeDashoffset,
        percentage: Math.round(percentage * 100),
      };
    });
  }, [roleDistribution, donutCircumference]);
  const half = tablet ? 'flex-1' : '';
  const COLS = [48, 190, 120, 140, 130, 110, 110, 110, 130, 150];
  const svgWidth = Math.max(240, windowWidth - 64);
  const permissionFields = (
    <Field label="Module access" hint="Pick the modules this subadmin can open.">
      <Div className={tablet ? 'grid grid-cols-2 gap-2' : 'gap-2'}>
        {ADMIN_PERMISSION_GROUPS.flatMap((g) => g.items).map((perm) => (
          <Div key={perm.key} className="flex-row items-center gap-2 min-h-11">
            <CheckBox checked={form.permissions.includes(perm.key)} onChange={() => togglePermission(perm.key)} />
            <Span className="text-sm text-slate-700 flex-1">{perm.label}</Span>
          </Div>
        ))}
      </Div>
    </Field>
  );
  const identityFields = (
    <>
      <Div className={`gap-3 ${tablet ? 'flex-row' : ''}`}>
        <Field label="Full name" required className={half}>
          <Input required value={form.name} onChange={(e) => setField('name', e.target.value)} placeholder="e.g. Marcus Aurelius" className={INPUT} />
        </Field>
        <Field label="Email" required className={half}>
          <Input
            type="email"
            required
            value={form.email}
            onChange={(e) => setField('email', e.target.value)}
            placeholder="e.g. admin@example.com"
            className={INPUT}
          />
        </Field>
      </Div>

      <Div className={`gap-3 ${tablet ? 'flex-row' : ''}`}>
        <Field label="Phone number" className={half}>
          <Input value={form.phone} onChange={(e) => setField('phone', e.target.value)} placeholder="e.g. +91 98000 00000" className={INPUT} />
        </Field>
        <Field label="Admin role" className={half}>
          <Select value={form.role} onChange={(e) => setField('role', e.target.value)} className={INPUT}>
            <Option value="Operations Subadmin">Operations Subadmin</Option>
            <Option value="Billing Subadmin">Billing Subadmin</Option>
            <Option value="Support Staff">Support Staff</Option>
          </Select>
        </Field>
      </Div>

      <Div className={`gap-3 ${tablet ? 'flex-row' : ''}`}>
        <Field label="Admin type" className={half}>
          <Select
            value={form.admin_type}
            onChange={(e) => {
              setField('admin_type', e.target.value);
              if (e.target.value === 'superadmin') {
                setField('role', 'superadmin');
              } else {
                setField('role', 'Operations Subadmin');
              }
            }}
            className={INPUT}
          >
            <Option value="subadmin">Sub-admin (scoped rights)</Option>
            <Option value="superadmin">Super admin (unrestricted)</Option>
          </Select>
        </Field>
        <Field label="Status" className={half}>
          <Select value={form.active ? 'active' : 'inactive'} onChange={(e) => setField('active', e.target.value === 'active')} className={INPUT}>
            <Option value="active">Active</Option>
            <Option value="inactive">Suspended</Option>
          </Select>
        </Field>
      </Div>
    </>
  );
  const mfaAndNotes = (
    <>
      <Div className="flex-row items-center gap-2 min-h-11 rounded-lg border border-slate-300 bg-white px-3">
        <CheckBox checked={form.mfaEnabled} onChange={(e) => setField('mfaEnabled', e.target.checked)} />
        <Span className="text-sm text-slate-700 flex-1">Require multi-factor authentication</Span>
      </Div>

      <Field label="Administrative notes">
        <Textarea
          value={form.notes}
          onChange={(e) => setField('notes', e.target.value)}
          placeholder="Enter special access notes…"
          className="min-h-[80px] px-3 py-2.5 rounded-lg border border-slate-300 bg-white text-sm text-slate-900"
        />
      </Field>
    </>
  );
  return (
    <AdminPage maxWidth={1200}>
      <PageHeader
        icon={Shield}
        title="Admin control center"
        subtitle="Administrators, permissions, platform access, roles and security logs."
        breadcrumb={[{ label: 'Management' }, { label: 'Access center' }]}
        actions={
          <>
            <Button
              onClick={() => {
                window.dispatchEvent(new Event('admin:closeDropdowns'));
                setForm(initialFormState);
                setIsCreateOpen(true);
              }}
              className={BTN_PRIMARY}
            >
              <UiIcon as={Plus} size={16} className="text-white" />
              <Span className={BTN_TEXT_PRIMARY}>Create admin</Span>
            </Button>
            <Button onClick={handleExport} className={BTN_SECONDARY}>
              <UiIcon as={Download} size={16} className="text-slate-600" />
              <Span className={BTN_TEXT_SECONDARY}>Export CSV</Span>
            </Button>
            <Button onClick={loadData} accessibilityLabel="Refresh admins" className={BTN_SECONDARY}>
              <UiIcon as={RefreshCw} size={16} className="text-slate-600" />
              <Span className={BTN_TEXT_SECONDARY}>Refresh</Span>
            </Button>
          </>
        }
      />

      <StatGrid className="mb-4">
        <StatCard label="Total admins" value={String(stats.total)} hint="+2 from last month" icon={Users} tone="info" />
        <StatCard label="Login success rate" value="98.6%" hint="↑ 1.3% from last month" icon={CheckCircle} tone="success" />
        <StatCard label="Active sessions" value={String(stats.active)} hint="↑ 2 active now" icon={Laptop} tone="info" />
        <StatCard label="Password resets" value="4" hint="— 0% from last month" icon={KeyRound} tone="neutral" />
        <StatCard label="Permission changes" value="12" hint="↑ 33% from last month" icon={Info} tone="warning" />
        <StatCard label="Suspended today" value={String(stats.suspended)} hint="↑ 1 from last month" icon={UserMinus} tone="danger" />
      </StatGrid>

      <Card className="mb-4">
        <SectionTitle
          action={
            <Select value={growthFilter} onChange={(e) => setGrowthFilter(e.target.value)} className={`${INPUT} w-40`}>
              <Option value="Last 6 Months">Last 6 Months</Option>
              <Option value="Last 12 Months">Last 12 Months</Option>
            </Select>
          }
        >
          Admin growth
        </SectionTitle>
        <Span className="text-sm text-slate-500 mb-3">Cumulative administrative registration curve.</Span>

        {growthData.length === 0 ? (
          <EmptyState
            className="border-0"
            title="No historical data available"
            message="Growth telemetry syncs here automatically."
          />
        ) : (
          <>
            <Svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} width={svgWidth} height={chartHeight}>
              {[0, 1, 2, 3].map((g, i) => (
                <Line key={i} x1="0" y1={(chartHeight / 3) * g} x2={chartWidth} y2={(chartHeight / 3) * g} stroke="#F1F5F9" strokeWidth="1" />
              ))}
              <Path d={areaPath} fill="rgba(21, 93, 252, 0.08)" />
              <Path d={linePath} fill="none" stroke={A.primary} strokeWidth="2.5" />
              {growthPoints.map((pt, idx) => (
                <Circle
                  key={idx}
                  cx={pt.x}
                  cy={pt.y}
                  r={hoveredGrowthIndex === idx ? 6 : 4}
                  fill={hoveredGrowthIndex === idx ? A.primary : '#FFFFFF'}
                  stroke={A.primary}
                  strokeWidth="2"
                  onPress={() => setHoveredGrowthIndex(hoveredGrowthIndex === idx ? null : idx)}
                />
              ))}
            </Svg>

            {hoveredGrowthIndex !== null && growthPoints[hoveredGrowthIndex] ? (
              <Div className="mt-2 px-3 py-2 rounded-lg bg-slate-100 self-start">
                <Span className="text-xs font-semibold text-slate-900">{growthPoints[hoveredGrowthIndex].label}</Span>
                <Span className="text-xs text-slate-500">Admins: {growthPoints[hoveredGrowthIndex].value}</Span>
              </Div>
            ) : null}

            <Div className="flex-row justify-between pt-3 mt-3 border-t border-slate-200">
              {growthData.map((d, i) => (
                <Span key={i} className="text-[11px]" style={{ color: A.textMuted }} numberOfLines={1}>
                  {d.month}
                </Span>
              ))}
            </Div>
          </>
        )}
      </Card>

      <Card className="mb-4">
        <SectionTitle>Role distribution</SectionTitle>
        {roleDistribution.length === 0 ? (
          <EmptyState className="border-0" title="No role data available" message="Role distribution metrics sync here automatically." />
        ) : (
          <>
            <Div className="items-center justify-center py-1">
              <Svg width="120" height="120" viewBox="0 0 100 100" style={{ transform: [{ rotate: '-90deg' }] }}>
                {donutSegments.map((seg, i) => (
                  <Circle
                    key={i}
                    cx="50"
                    cy="50"
                    r={donutRadius}
                    fill="transparent"
                    stroke={seg.color}
                    strokeWidth="9"
                    strokeDasharray={seg.strokeDasharray}
                    strokeDashoffset={seg.strokeDashoffset}
                    onPress={() => setHoveredDonutSegment(hoveredDonutSegment === seg ? null : seg)}
                  />
                ))}
              </Svg>
              <Div className="items-center mt-2">
                <Span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {hoveredDonutSegment ? hoveredDonutSegment.label : 'Total'}
                </Span>
                <Span className="text-xl font-bold text-slate-900">{hoveredDonutSegment ? `${hoveredDonutSegment.percentage}%` : stats.total}</Span>
              </Div>
            </Div>

            <Div className="gap-2 pt-3 border-t border-slate-200 mt-3">
              {donutSegments.map((seg, i) => (
                <Div key={i} className="flex-row items-center justify-between gap-3">
                  <Div className="flex-row items-center gap-2 flex-1 min-w-0">
                    <Div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: seg.color }} />
                    <Span className="text-sm text-slate-700 flex-1" numberOfLines={1}>
                      {seg.label}
                    </Span>
                  </Div>
                  <Span className="text-sm font-semibold text-slate-900">
                    {seg.value} ({seg.percentage}%)
                  </Span>
                </Div>
              ))}
            </Div>
          </>
        )}
      </Card>

      <Card className="mb-4">
        <SectionTitle>Security health</SectionTitle>
        <Div className="items-center justify-center py-2">
          <Svg width={90} height={90} style={{ transform: [{ rotate: '-90deg' }] }}>
            <Circle cx="45" cy="45" r="33" stroke={A.border} strokeWidth="6" fill="transparent" />
            <Circle
              cx="45"
              cy="45"
              r="33"
              stroke={A.success}
              strokeWidth="6"
              fill="transparent"
              strokeDasharray={207.2}
              strokeDashoffset={207.2 - (207.2 * securityScore) / 100}
            />
          </Svg>
          <Div className="items-center mt-2">
            <Span className="text-xl font-bold text-slate-900">{securityScore}%</Span>
            <Span className="text-xs font-semibold text-green-700">Good</Span>
          </Div>
        </Div>

        <Div className="gap-2 pt-3 border-t border-slate-200 mt-2">
          {[
            { icon: Lock, label: 'MFA enabled', value: `${stats.mfaEnabled} / ${stats.total}` },
            { icon: AlertTriangle, label: 'Locked accounts', value: String(stats.locked) },
            { icon: ShieldCheck, label: 'Failed logins', value: '2' },
            { icon: Clock, label: 'Password expiring', value: '1' },
          ].map((item) => (
            <Div key={item.label} className="flex-row items-center justify-between gap-3">
              <Div className="flex-row items-center gap-2 flex-1 min-w-0">
                <UiIcon as={item.icon} size={14} className="text-slate-400" />
                <Span className="text-sm text-slate-700 flex-1" numberOfLines={1}>
                  {item.label}
                </Span>
              </Div>
              <Span className="text-sm font-semibold text-slate-900">{item.value}</Span>
            </Div>
          ))}
        </Div>

        <Button onClick={() => toast.success('Security reports are up to date.')} className={`${BTN_SECONDARY} mt-3`}>
          <UiIcon as={FileText} size={16} className="text-slate-600" />
          <Span className={BTN_TEXT_SECONDARY}>View full security report</Span>
        </Button>
      </Card>

      <Card className="mb-4">
        <SectionTitle>Recent activity</SectionTitle>
        <Div className="gap-3">
          {[
            { title: 'Rydon Superadmin', desc: 'Super Admin logged in', time: 'Just now', type: 'login' },
            { title: 'Finance Admin', desc: 'Updated pricing permissions', time: '12 mins ago', type: 'role' },
            { title: 'Support Admin', desc: 'Created new admin account', time: '28 mins ago', type: 'create' },
            { title: 'Operations Admin', desc: 'Reset password for admin@test.com', time: '45 mins ago', type: 'reset' },
            { title: 'Security Admin', desc: 'Enabled MFA for 3 admins', time: '1 hour ago', type: 'mfa' },
          ].map((act, idx) => (
            <Div key={idx} className="flex-row items-start gap-3">
              <Div className="w-2 h-2 rounded-full bg-blue-600 mt-1.5" />
              <Div className="flex-1 min-w-0">
                <Span className="text-sm font-semibold text-slate-900">{act.title}</Span>
                <Span className="text-xs text-slate-500">
                  {act.desc} · {act.time}
                </Span>
              </Div>
            </Div>
          ))}
        </Div>
      </Card>

      <Card className="mb-4">
        <SectionTitle>Top departments</SectionTitle>
        <Div className="gap-3">
          {[
            { label: 'Operations', count: 5, percent: 80 },
            { label: 'Finance', count: 3, percent: 55 },
            { label: 'Support', count: 2, percent: 35 },
            { label: 'Engineering', count: 2, percent: 35 },
            { label: 'HR', count: 1, percent: 15 },
            { label: 'Marketing', count: 1, percent: 15 },
          ].map((dept) => (
            <Div key={dept.label} className="gap-1.5">
              <Div className="flex-row items-center justify-between gap-3">
                <Span className="text-sm text-slate-700 flex-1">{dept.label}</Span>
                <Span className="text-sm font-semibold text-slate-900">{dept.count}</Span>
              </Div>
              <Div className="w-full bg-slate-100 rounded-full h-2">
                <Div className="h-2 rounded-full bg-blue-600" style={{ width: `${dept.percent}%` }} />
              </Div>
            </Div>
          ))}
        </Div>
      </Card>

      <Card className="mb-4">
        <SectionTitle>Access by module</SectionTitle>
        <Div className="gap-3">
          {[
            { label: 'Dashboard', percent: 100 },
            { label: 'Users', percent: 92 },
            { label: 'Bookings', percent: 85 },
            { label: 'Finance', percent: 70 },
            { label: 'Drivers', percent: 63 },
          ].map((mod) => (
            <Div key={mod.label} className="gap-1.5">
              <Div className="flex-row items-center justify-between gap-3">
                <Span className="text-sm text-slate-700 flex-1">{mod.label}</Span>
                <Span className="text-sm font-semibold text-slate-900">{mod.percent}%</Span>
              </Div>
              <Div className="w-full bg-slate-100 rounded-full h-2">
                <Div className="h-2 rounded-full bg-blue-600" style={{ width: `${mod.percent}%` }} />
              </Div>
            </Div>
          ))}
        </Div>
      </Card>

      <Card className="mb-4 gap-3">
        <SectionTitle className="mb-0">Search and filters</SectionTitle>
        <Div className="flex-row items-center h-11 px-3 rounded-lg border border-slate-300 bg-white gap-2">
          <UiIcon as={Search} size={16} className="text-slate-400" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, email, employee ID or phone…"
            className="flex-1 text-sm text-slate-900"
          />
        </Div>

        <Div className={`gap-3 ${tablet ? 'flex-row' : ''}`}>
          <Field label="Role" className={half}>
            <Select value={filterRole} onChange={(e) => setFilterRole(e.target.value)} className={INPUT}>
              <Option value="All">All Roles</Option>
              <Option value="Super Admin">Super Admin</Option>
              <Option value="Operations Subadmin">Operations Subadmin</Option>
              <Option value="Billing Subadmin">Billing Subadmin</Option>
              <Option value="Support Staff">Support Staff</Option>
            </Select>
          </Field>
          <Field label="Department" className={half}>
            <Select value={filterDepartment} onChange={(e) => setFilterDepartment(e.target.value)} className={INPUT}>
              <Option value="All">All Depts</Option>
              <Option value="Operations">Operations</Option>
              <Option value="Finance">Finance</Option>
              <Option value="Support">Support</Option>
              <Option value="Engineering">Engineering</Option>
            </Select>
          </Field>
        </Div>

        <Div className={`gap-3 ${tablet ? 'flex-row' : ''}`}>
          <Field label="Status" className={half}>
            <Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className={INPUT}>
              <Option value="All">All Status</Option>
              <Option value="Active">Active</Option>
              <Option value="Suspended">Suspended</Option>
            </Select>
          </Field>
          <Field label="MFA" className={half}>
            <Select value={filterMfa} onChange={(e) => setFilterMfa(e.target.value)} className={INPUT}>
              <Option value="All">All</Option>
              <Option value="Enabled">Enabled</Option>
              <Option value="Disabled">Disabled</Option>
            </Select>
          </Field>
        </Div>

        <Div className={`gap-3 ${tablet ? 'flex-row' : ''}`}>
          <Field label="Verification" className={half}>
            <Select value={filterVerification} onChange={(e) => setFilterVerification(e.target.value)} className={INPUT}>
              <Option value="All">All</Option>
              <Option value="Verified">Verified</Option>
              <Option value="Unverified">Unverified</Option>
            </Select>
          </Field>
          <Field label="Sort by" className={half}>
            <Select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className={INPUT}>
              <Option value="Newest">Newest Added</Option>
              <Option value="Oldest">Oldest Added</Option>
              <Option value="Alphabetical">Alphabetical</Option>
            </Select>
          </Field>
        </Div>

        <Toolbar className="mb-0">
          <Button onClick={() => setShowAdvanced(!showAdvanced)} className={BTN_SECONDARY}>
            <UiIcon as={Info} size={16} className="text-slate-600" />
            <Span className={BTN_TEXT_SECONDARY}>{showAdvanced ? 'Hide advanced' : 'Advanced filters'}</Span>
          </Button>
          <Div className="flex-row items-center gap-2 min-h-11">
            <CheckBox
              checked={filteredAndSortedAdmins.length > 0 && selectedRowIds.length === filteredAndSortedAdmins.length}
              onChange={handleSelectAllRows}
            />
            <Span className="text-sm text-slate-700">
              Select all{selectedRowIds.length > 0 ? ` · ${selectedRowIds.length} selected` : ''}
            </Span>
          </Div>
        </Toolbar>
      </Card>

      {loading ? (
        <TableSkeleton rows={6} />
      ) : loadError ? (
        <ErrorState title="Could not load administrators" message={loadError} onRetry={loadData} />
      ) : filteredAndSortedAdmins.length === 0 ? (
        <EmptyState
          icon={FileSearch}
          title="No administrators found"
          message="No administrator matches your search or filters. Check for typos or widen the filters."
          actionLabel="Create admin"
          onAction={() => {
            setForm(initialFormState);
            setIsCreateOpen(true);
          }}
        />
      ) : (
        <DataTable cols={COLS}>
          <THead
            cols={COLS}
            labels={['', 'Admin', 'Employee ID', 'Role', 'Department', 'Permissions', 'MFA', 'Status', 'Last login', 'Actions']}
          />
          <TBody>
            {filteredAndSortedAdmins.map((admin, rowIndex) => {
              const isSuper = admin.admin_type === 'superadmin';
              const isActive = admin.active !== false;
              const id = admin.id || admin._id;
              const isExpanded = selectedAdmin && (selectedAdmin.id === id || selectedAdmin._id === id) && isDrawerOpen;
              const toggleExpand = () => {
                if (isExpanded) {
                  setIsDrawerOpen(false);
                  setSelectedAdmin(null);
                } else {
                  window.dispatchEvent(new Event('admin:closeDropdowns'));
                  setSelectedAdmin(admin);
                  setIsDrawerOpen(true);
                }
              };
              return (
                <Row key={id} last={rowIndex === filteredAndSortedAdmins.length - 1}>
                  <Cell width={COLS[0]}>
                    <CheckBox checked={selectedRowIds.includes(id)} onChange={(e) => handleSelectRow(id, e.target.checked)} />
                  </Cell>
                  <Cell width={COLS[1]}>
                    <Div className="flex-row items-center gap-2">
                      <Div
                        className={`w-9 h-9 rounded-full items-center justify-center border shrink-0 ${
                          isSuper ? 'bg-blue-100 border-blue-200' : 'bg-slate-100 border-slate-200'
                        }`}
                      >
                        {admin.name?.[0] ? (
                          <Span className="text-sm font-semibold text-slate-900">{admin.name[0].toUpperCase()}</Span>
                        ) : (
                          <UiIcon as={Shield} size={14} className="text-slate-500" />
                        )}
                      </Div>
                      <Div className="flex-1 min-w-0" onClick={toggleExpand}>
                        <Span className="text-sm font-semibold text-slate-900" numberOfLines={1}>
                          {admin.name}
                        </Span>
                        <Span className="text-xs text-slate-500" numberOfLines={1}>
                          {admin.email}
                        </Span>
                      </Div>
                    </Div>
                  </Cell>
                  <Cell width={COLS[2]} numberOfLines={1}>
                    {admin.employeeId || 'EMP-00' + ((String(id).charCodeAt(String(id).length - 1) % 9) + 1)}
                  </Cell>
                  <Cell width={COLS[3]}>
                    <Div className="flex-row items-center gap-1.5">
                      <UiIcon as={isSuper ? Crown : Shield} size={12} className={isSuper ? 'text-blue-600' : 'text-slate-400'} />
                      <Span className="text-sm text-slate-700 flex-1" numberOfLines={2}>
                        {isSuper ? 'Super Admin' : admin.role || 'Personnel'}
                      </Span>
                    </Div>
                  </Cell>
                  <Cell width={COLS[4]}>{admin.department || 'Operations'}</Cell>
                  <Cell width={COLS[5]}>{isSuper ? '18 modules' : `${(admin.permissions || []).length} modules`}</Cell>
                  <Cell width={COLS[6]}>
                    <StatusBadge status={admin.mfaEnabled ? 'enabled' : 'disabled'} label={admin.mfaEnabled ? 'Enabled' : 'Disabled'} />
                  </Cell>
                  <Cell width={COLS[7]}>
                    <StatusBadge status={isActive ? 'verified' : 'suspended'} label={isActive ? 'Verified' : 'Suspended'} />
                  </Cell>
                  <Cell width={COLS[8]} numberOfLines={1}>
                    {admin.lastLogin ? new Date(admin.lastLogin).toLocaleDateString() : 'Just now'}
                  </Cell>
                  <Cell width={COLS[9]} align="right">
                    <Div className="flex-row items-center justify-end gap-1">
                      <Button
                        onClick={toggleExpand}
                        accessibilityLabel={`View ${admin.name}`}
                        className="w-11 h-11 items-center justify-center rounded-lg border border-slate-200 bg-white"
                      >
                        <UiIcon as={Eye} size={16} className="text-slate-600" />
                      </Button>
                      <Button
                        onClick={() => handleEditClick(admin)}
                        accessibilityLabel={`Edit ${admin.name}`}
                        className="w-11 h-11 items-center justify-center rounded-lg border border-slate-200 bg-white"
                      >
                        <UiIcon as={Edit2} size={16} className="text-slate-600" />
                      </Button>
                      {!isSuper && (
                        <Button
                          onClick={() => {
                            window.dispatchEvent(new Event('admin:closeDropdowns'));
                            setDeletingAdmin(admin);
                            setDeleteConfirmText('');
                            setIsDeleteOpen(true);
                          }}
                          accessibilityLabel={`Delete ${admin.name}`}
                          className="w-11 h-11 items-center justify-center rounded-lg border border-slate-200 bg-white"
                        >
                          <UiIcon as={Trash2} size={16} className="text-red-600" />
                        </Button>
                      )}
                    </Div>
                  </Cell>
                </Row>
              );
            })}
          </TBody>
        </DataTable>
      )}

      {isDrawerOpen && selectedAdmin ? (
        <Card className="mt-4 gap-4">
          <Div className="flex-row items-center gap-3">
            <Div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 items-center justify-center shrink-0">
              <Span className="text-sm font-semibold text-slate-900">{selectedAdmin.name?.[0]?.toUpperCase()}</Span>
            </Div>
            <Div className="flex-1 min-w-0">
              <Span className="text-base font-semibold text-slate-900" numberOfLines={1}>
                {selectedAdmin.name}
              </Span>
              <Span className="text-sm text-slate-500" numberOfLines={1}>
                {selectedAdmin.email}
              </Span>
            </Div>
            <Button
              onClick={() => {
                setIsDrawerOpen(false);
                setSelectedAdmin(null);
              }}
              accessibilityLabel="Close details"
              className="w-11 h-11 items-center justify-center"
            >
              <UiIcon as={X} size={18} className="text-slate-600" />
            </Button>
          </Div>

          <Div className={tablet ? 'grid grid-cols-2 gap-3' : 'gap-3'}>
            {[
              { label: 'Employee ID', value: selectedAdmin.employeeId || 'Not available' },
              { label: 'Phone number', value: selectedAdmin.phone || 'Not available' },
              { label: 'Department', value: selectedAdmin.department || 'Operations' },
              { label: 'Designation', value: selectedAdmin.designation || 'Not available' },
              { label: 'MFA security', value: selectedAdmin.mfaEnabled ? 'Enabled' : 'Disabled' },
              { label: 'Account status', value: selectedAdmin.active !== false ? 'Active' : 'Suspended' },
              {
                label: 'Registered date',
                value:
                  selectedAdmin.createdAt || selectedAdmin.created_at
                    ? new Date(selectedAdmin.createdAt || selectedAdmin.created_at).toLocaleDateString()
                    : 'Not available',
              },
              { label: 'Last login', value: selectedAdmin.lastLogin ? new Date(selectedAdmin.lastLogin).toLocaleDateString() : 'Just now' },
            ].map((item) => (
              <Div key={item.label} className="gap-1">
                <Span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{item.label}</Span>
                <Span className="text-sm font-semibold text-slate-900">{item.value}</Span>
              </Div>
            ))}
          </Div>

          <Div className="gap-2 pt-3 border-t border-slate-200">
            <Span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Module permissions</Span>
            <Div className="flex-row flex-wrap gap-1.5">
              {selectedAdmin.admin_type === 'superadmin' ? (
                <StatusBadge tone="success" label="Unrestricted access" />
              ) : selectedAdmin.permissions && selectedAdmin.permissions.length > 0 ? (
                selectedAdmin.permissions.map((perm) => <StatusBadge key={perm} tone="info" label={perm} />)
              ) : (
                <Span className="text-sm text-slate-500">No explicit modules allowed yet.</Span>
              )}
            </Div>
          </Div>

          <Div className="gap-2 pt-3 border-t border-slate-200">
            <Span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Administrative notes</Span>
            <Div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <Span className="text-sm text-slate-700">{selectedAdmin.notes || 'No security log overrides recorded.'}</Span>
            </Div>
          </Div>

          <Button
            onClick={() => {
              setIsDrawerOpen(false);
              handleEditClick(selectedAdmin);
            }}
            className={`${BTN_PRIMARY} self-start`}
          >
            <Span className={BTN_TEXT_PRIMARY}>Modify privileges</Span>
          </Button>
        </Card>
      ) : null}

      {isEditOpen ? (
        <Card className="mt-4">
          <Div className="flex-row items-center gap-3 mb-3">
            <Span className="text-base font-semibold text-slate-900 flex-1">Modify administrative privileges</Span>
            <Button type="button" onClick={() => setIsEditOpen(false)} accessibilityLabel="Close edit form" className="w-11 h-11 items-center justify-center">
              <UiIcon as={X} size={18} className="text-slate-600" />
            </Button>
          </Div>

          <Form onSubmit={handleEditSubmit}>
            <Div className="gap-4">
              {identityFields}
              {form.admin_type !== 'superadmin' ? permissionFields : null}

              <Div className={`gap-3 ${tablet ? 'flex-row' : ''}`}>
                <Field label="New password" hint="Leave blank to keep the current one." className={half}>
                  <Input
                    type="password"
                    value={form.password}
                    onChange={(e) => setField('password', e.target.value)}
                    placeholder="Leave blank to retain current"
                    className={INPUT}
                  />
                </Field>
                <Field label="Confirm new password" className={half}>
                  <Input
                    type="password"
                    value={form.passwordConfirmation}
                    onChange={(e) => setField('passwordConfirmation', e.target.value)}
                    placeholder="Confirm new password"
                    className={INPUT}
                  />
                </Field>
              </Div>

              {mfaAndNotes}

              <Div className="gap-2">
                <Button type="submit" disabled={saving} className={`${BTN_PRIMARY} ${saving ? 'opacity-60' : ''}`}>
                  {saving ? <UiIcon as={Loader2} size={16} className="text-white" /> : null}
                  <Span className={BTN_TEXT_PRIMARY}>Save changes</Span>
                </Button>
                <Button type="button" onClick={() => setIsEditOpen(false)} className={BTN_SECONDARY}>
                  <Span className={BTN_TEXT_SECONDARY}>Cancel</Span>
                </Button>
              </Div>
            </Div>
          </Form>
        </Card>
      ) : null}

      <Card className="mt-4">
        <SectionTitle>System permission directory</SectionTitle>
        <Div className="flex-row flex-wrap gap-1.5">
          {[
            'Dashboard',
            'Users',
            'Drivers',
            'Bookings',
            'Finance',
            'Taxi',
            'Rental',
            'Bus',
            'Delivery',
            'Support',
            'Pricing',
            'Promotion',
            'Reports',
            'Settings',
            'Analytics',
          ].map((mod, i) => (
            <StatusBadge key={i} tone="neutral" label={mod} />
          ))}
        </Div>
      </Card>

      {isCreateOpen && (
        <Overlay onClose={() => setIsCreateOpen(false)} className="absolute inset-0 z-50 items-center justify-center bg-black/50 p-4">
          <Div className="w-full max-w-lg max-h-[85vh] bg-white rounded-xl overflow-hidden">
            <Div className="p-4 border-b border-slate-200 flex-row items-center gap-3">
              <Span className="text-base font-semibold text-slate-900 flex-1">Create administrator</Span>
              <Button onClick={() => setIsCreateOpen(false)} accessibilityLabel="Close" className="w-11 h-11 items-center justify-center">
                <UiIcon as={X} size={18} className="text-slate-600" />
              </Button>
            </Div>

            <Form onSubmit={handleCreateSubmit}>
              <ScrollDiv className="p-4" contentClassName="gap-4">
                {identityFields}
                {form.admin_type !== 'superadmin' ? permissionFields : null}

                <Div className={`gap-3 ${tablet ? 'flex-row' : ''}`}>
                  <Field label="Password" required className={half}>
                    <Input
                      type="password"
                      required
                      value={form.password}
                      onChange={(e) => setField('password', e.target.value)}
                      placeholder="Minimum 8 characters"
                      className={INPUT}
                    />
                  </Field>
                  <Field label="Confirm password" required className={half}>
                    <Input
                      type="password"
                      required
                      value={form.passwordConfirmation}
                      onChange={(e) => setField('passwordConfirmation', e.target.value)}
                      placeholder="Re-type password"
                      className={INPUT}
                    />
                  </Field>
                </Div>

                {mfaAndNotes}

                <Div className="gap-2">
                  <Button type="submit" disabled={saving} className={`${BTN_PRIMARY} ${saving ? 'opacity-60' : ''}`}>
                    {saving ? <UiIcon as={Loader2} size={16} className="text-white" /> : null}
                    <Span className={BTN_TEXT_PRIMARY}>Save admin</Span>
                  </Button>
                  <Button type="button" onClick={() => setIsCreateOpen(false)} className={BTN_SECONDARY}>
                    <Span className={BTN_TEXT_SECONDARY}>Cancel</Span>
                  </Button>
                </Div>
              </ScrollDiv>
            </Form>
          </Div>
        </Overlay>
      )}

      {isDeleteOpen && deletingAdmin && (
        <Overlay onClose={() => setIsDeleteOpen(false)} className="absolute inset-0 z-50 items-center justify-center bg-black/50 p-4">
          <Div className="w-full max-w-md bg-white rounded-xl overflow-hidden">
            <Div className="p-4 border-b border-slate-200 flex-row items-center gap-2">
              <UiIcon as={AlertTriangle} size={18} className="text-red-600" />
              <Span className="text-base font-semibold text-slate-900 flex-1">Revoke access</Span>
              <Button onClick={() => setIsDeleteOpen(false)} accessibilityLabel="Close" className="w-11 h-11 items-center justify-center">
                <UiIcon as={X} size={18} className="text-slate-600" />
              </Button>
            </Div>

            <Div className="p-4 gap-4">
              <Div className="flex-row items-center gap-3">
                <Div className="w-10 h-10 rounded-full bg-slate-100 items-center justify-center shrink-0">
                  <Span className="text-sm font-semibold text-slate-900">{deletingAdmin.name?.[0]?.toUpperCase()}</Span>
                </Div>
                <Div className="flex-1 min-w-0">
                  <Span className="text-sm font-semibold text-slate-900" numberOfLines={1}>
                    {deletingAdmin.name}
                  </Span>
                  <Span className="text-xs text-slate-500" numberOfLines={1}>
                    {deletingAdmin.role || 'Personnel'}
                  </Span>
                </Div>
              </Div>

              <Div className="p-3 rounded-lg bg-red-100 border border-red-200">
                <Span className="text-sm text-red-700">
                  Deleting this account permanently invalidates its security keys and removes dashboard access. This cannot be undone.
                </Span>
              </Div>

              <Field label="Type DELETE to confirm">
                <Input
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="Type DELETE…"
                  className={INPUT}
                />
              </Field>

              <Div className="gap-2">
                <Button
                  onClick={handleDeleteConfirm}
                  disabled={deleteConfirmText !== 'DELETE' || saving}
                  className={`${BTN_DANGER} ${deleteConfirmText !== 'DELETE' || saving ? 'opacity-40' : ''}`}
                >
                  {saving ? <UiIcon as={Loader2} size={16} className="text-white" /> : null}
                  <Span className={BTN_TEXT_PRIMARY}>Revoke access</Span>
                </Button>
                <Button type="button" onClick={() => setIsDeleteOpen(false)} className={BTN_SECONDARY}>
                  <Span className={BTN_TEXT_SECONDARY}>Cancel</Span>
                </Button>
              </Div>
            </Div>
          </Div>
        </Overlay>
      )}
    </AdminPage>
  );
};
export default Admins;
