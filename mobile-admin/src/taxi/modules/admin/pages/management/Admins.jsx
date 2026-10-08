/* Ported from Frontend/src/modules/Taxi/modules/admin/pages/management/Admins.jsx (tools/port.js first pass). */
import React, { useEffect, useMemo, useState, useRef } from 'react';
import {
  ChevronRight,
  Crown,
  FileSearch,
  Loader2,
  Pencil,
  Plus,
  Search,
  Shield,
  Trash2,
  UserCheck,
  Users,
  Building2,
  MoreVertical,
  Edit2,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  RefreshCw,
  Download,
  Upload,
  Activity,
  AlertTriangle,
  UserMinus,
  Lock,
  CheckCircle,
  Eye,
  KeyRound,
  X,
  Sparkles,
  Info,
  Calendar,
  Clock,
  Laptop,
  Check,
  FileText,
  Key,
} from 'lucide-react-native';
import { useNavigate } from '../../../../../lib/webRouter';
import { toast } from '../../../../../lib/notify';
import { motion } from '../../../../../lib/motion';
import { adminService } from '../../services/adminService';
import { ADMIN_PERMISSION_GROUPS } from '../../constants/adminAccess';
import {
  Button,
  Div,
  Form,
  H1,
  H3,
  H4,
  Input,
  Label,
  Option,
  Overlay,
  P,
  ScrollDiv,
  Select,
  Span,
  Strong,
  Table,
  Tbody,
  Td,
  Textarea,
  Th,
  Thead,
  Tr,
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
  const [saving, setSaving] = useState(false);

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
  return (
    <ScrollDiv className="min-h-screen bg-[#F6F8FC] p-6 lg:p-8 font-sans redigo-admin-root animate-in fade-in duration-300">
      <Div className="mx-auto max-w-7xl space-y-6">
        {/* HEADER SECTION */}
        <motion.div
          initial={{
            opacity: 0,
            y: -10,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            duration: 0.3,
          }}
          className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"
        >
          <Div>
            <Div className="flex items-center gap-1.5 mb-1.5 text-[9px] font-medium uppercase tracking-wider text-slate-500">
              <Span>Management</Span>
              <Span className="text-slate-300">/</Span>
              <Span className="text-slate-700">Access Center</Span>
            </Div>
            <Div className="flex items-center gap-2">
              <H1 className="text-2xl font-bold text-[#0B1220] tracking-tight">Admin Control Center</H1>
              <Span className="bg-[#FFC400]/20 text-[#0B1220] text-[9px] font-bold px-1.5 py-0.5 rounded-full border border-[#FFC400]/40">Hub</Span>
            </Div>
            <P className="text-xs text-[#64748B] mt-1 max-w-2xl leading-relaxed">
              Manage administrators, permissions, platform access, roles and cryptographic security logs.
            </P>
          </Div>
          <Div className="flex flex-wrap items-center gap-3">
            <Button onClick={loadData} className="admin-btn-secondary h-10 w-10 !p-0">
              <UiIcon as={RefreshCw} size={15} className={loading ? 'animate-spin' : ''} />
            </Button>
            <Button onClick={handleExport} className="admin-btn-secondary h-10 gap-2">
              <UiIcon as={Download} size={14} />
              <Span>Export CSV</Span>
            </Button>
            <Button
              onClick={() => {
                window.dispatchEvent(new Event('admin:closeDropdowns'));
                setForm(initialFormState);
                setIsCreateOpen(true);
              }}
              className="admin-btn-primary h-10 gap-2 !bg-[#FFC400] !text-[#0B1220] hover:brightness-95"
            >
              <UiIcon as={Plus} size={16} />
              <Span>Create Admin</Span>
            </Button>
          </Div>
        </motion.div>

        {/* KPI CARDS ROW */}
        <Div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {[
            {
              label: 'Total Admins',
              value: stats.total,
              icon: Users,
              cardBg: '!bg-violet-500',
              trend: '+2 from last month',
              isTrendPositive: true,
            },
            {
              label: 'Login Success Rate',
              value: '98.6%',
              icon: CheckCircle,
              cardBg: '!bg-emerald-500',
              trend: '↑ 1.3% from last month',
              isTrendPositive: true,
            },
            {
              label: 'Active Sessions',
              value: stats.active,
              icon: Laptop,
              cardBg: '!bg-blue-500',
              trend: '↑ 2 active now',
              isTrendPositive: true,
            },
            {
              label: 'Password Resets',
              value: '4',
              icon: KeyRound,
              cardBg: '!bg-fuchsia-500',
              trend: '— 0% from last month',
              isTrendPositive: false,
            },
            {
              label: 'Permission Changes',
              value: '12',
              icon: Info,
              cardBg: '!bg-orange-500',
              trend: '↑ 33% from last month',
              isTrendPositive: true,
            },
            {
              label: 'Suspended Today',
              value: stats.suspended,
              icon: UserMinus,
              cardBg: '!bg-rose-500',
              trend: '↑ 1 from last month',
              isTrendPositive: false,
            },
          ].map((insight, idx) => (
            <motion.div
              key={idx}
              initial={{
                opacity: 0,
                y: 15,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              transition={{
                duration: 0.3,
                delay: idx * 0.04,
              }}
              className={`bg-white border border-[#E5E7EB] rounded-lg p-6 shadow-sm !p-4 border-none !text-white hover:scale-[1.02] transition-transform shadow-lg ${insight.cardBg}`}
            >
              <Div className="flex items-center justify-between mb-2">
                <Span className="card-label text-[10px] font-bold opacity-80 uppercase tracking-wider">{insight.label}</Span>
                <Div className="p-2 rounded-full bg-white/20 backdrop-blur-sm">
                  <UiIcon as={insight.icon} size={16} strokeWidth={2.5} />
                </Div>
              </Div>
              <H3 className="text-2xl font-black !text-white tracking-tight drop-shadow-sm">{insight.value}</H3>
              <P className="text-[10px] mt-2 font-semibold opacity-80">{insight.trend}</P>
            </motion.div>
          ))}
        </Div>

        {/* MAIN ANALYTICS ROW (Growth, Role Distribution, Security) */}
        <motion.div
          initial={{
            opacity: 0,
            y: 15,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            duration: 0.35,
            delay: 0.12,
          }}
          className="grid grid-cols-1 gap-6 lg:grid-cols-4"
        >
          {/* Historical Admin Growth */}
          <Div className="bg-white border border-[#E5E7EB] rounded-lg p-6 shadow-sm lg:col-span-2 flex flex-col justify-between hover:shadow-md transition-shadow relative">
            <Div>
              <Div className="flex items-center justify-between mb-2">
                <Div className="flex items-center gap-2">
                  <H3 className="text-xs text-[#0B1220] uppercase tracking-wider font-bold">Historical Admin Growth</H3>
                  <Div className="h-1.5 w-1.5 rounded-full bg-[#FFC400]" />
                </Div>
                <Select
                  value={growthFilter}
                  onChange={(e) => setGrowthFilter(e.target.value)}
                  className="admin-input h-7 !py-0 !px-2 !w-32 text-[10px] font-bold"
                >
                  <Option value="Last 6 Months">Last 6 Months</Option>
                  <Option value="Last 12 Months">Last 12 Months</Option>
                </Select>
              </Div>
              <P className="text-[11px] text-[#64748B] mb-4">Cumulative administrative registration curve.</P>
            </Div>

            {/* Area SVG Chart */}
            {growthData.length === 0 ? (
              <Div className="h-[150px] flex flex-col items-center justify-center border border-dashed border-[#E5E7EB] rounded-2xl bg-slate-50/50 p-4 my-2">
                <P className="text-sm font-semibold text-[#0B1220] whitespace-normal text-center">No historical data available</P>
                <P className="text-[10px] text-[#64748B] mt-1 whitespace-normal text-center">Growth telemetry will automatically sync here.</P>
              </Div>
            ) : (
              <>
                <Div className="relative pt-2">
                  <Svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} width="100%" height={chartHeight}>
                    {/* Horizontal grid lines */}
                    {[0, 1, 2, 3].map((g, i) => (
                      <Line key={i} x1="0" y1={(chartHeight / 3) * g} x2={chartWidth} y2={(chartHeight / 3) * g} stroke="#F1F5F9" strokeWidth="1" />
                    ))}

                    {/* Shimmer Area Fill */}
                    <Path d={areaPath} fill="rgba(255, 196, 0, 0.05)" />
                    {/* Area Outline */}
                    <Path d={linePath} fill="none" stroke="#FFC400" strokeWidth="2.5" />

                    {/* Nodes */}
                    {growthPoints.map((pt, idx) => (
                      <Circle
                        key={idx}
                        cx={pt.x}
                        cy={pt.y}
                        r={hoveredGrowthIndex === idx ? 6 : 4}
                        fill={hoveredGrowthIndex === idx ? '#FFC400' : '#FFFFFF'}
                        stroke="#FFC400"
                        strokeWidth="2"
                        onPress={() => setHoveredGrowthIndex(hoveredGrowthIndex === idx ? null : idx)}
                      />
                    ))}
                  </Svg>

                  {/* Tooltip */}
                  {hoveredGrowthIndex !== null && growthPoints[hoveredGrowthIndex] && (
                    <Div
                      className="absolute bg-slate-900 !text-white rounded p-2.5 text-[10px] pointer-events-none shadow-xl border border-slate-800 animate-in fade-in duration-200"
                      style={{
                        left: `${(growthPoints[hoveredGrowthIndex].x / chartWidth) * 100}%`,
                        top: Math.max(0, growthPoints[hoveredGrowthIndex].y - 52),
                        transform: [{ translateX: -45 }],
                      }}
                    >
                      <Span className="font-semibold block">{growthPoints[hoveredGrowthIndex].label} 2026</Span>
                      <Span className="block mt-0.5">Admins Added: {growthPoints[hoveredGrowthIndex].value}</Span>
                    </Div>
                  )}
                </Div>

                {/* Bottom Labels */}
                <Div className="flex justify-between text-[9px] text-[#64748B] pt-3 border-t border-[#E5E7EB] mt-3">
                  {growthData.map((d, i) => (
                    <Span key={i}>{d.month}</Span>
                  ))}
                </Div>
              </>
            )}
          </Div>

          {/* Role Distribution */}
          <Div className="bg-white border border-[#E5E7EB] rounded-lg p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
            <Div>
              <Div className="flex items-center gap-2 mb-2">
                <H3 className="text-xs text-[#0B1220] uppercase tracking-wider font-bold">Role Distribution</H3>
                <Div className="h-1.5 w-1.5 rounded-full bg-[#3B82F6]" />
              </Div>
              <P className="text-[11px] text-[#64748B] mb-4">Distribution by access class.</P>
            </Div>

            {/* Donut SVG */}
            {roleDistribution.length === 0 ? (
              <Div className="h-[150px] flex flex-col items-center justify-center border border-dashed border-[#E5E7EB] rounded-2xl bg-slate-50/50 p-4 my-2">
                <P className="text-xs font-semibold text-[#0B1220] modal-title !text-sm">No historical data available</P>
                <P className="text-[10px] text-[#64748B] mt-1">Role distribution metrics will automatically sync here.</P>
              </Div>
            ) : (
              <>
                <Div className="flex items-center justify-center relative py-1">
                  <Svg width="110" height="110" viewBox="0 0 100 100" style={{ transform: [{ rotate: '-90deg' }] }}>
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

                  {/* Center count */}
                  <Div className="absolute text-center">
                    <Span className="text-[8px] text-[#64748B] uppercase tracking-wider block">
                      {hoveredDonutSegment ? hoveredDonutSegment.label : 'TOTAL'}
                    </Span>
                    <Span className="text-base font-bold text-[#0B1220] block leading-none mt-0.5">
                      {hoveredDonutSegment ? `${hoveredDonutSegment.percentage}%` : stats.total}
                    </Span>
                  </Div>
                </Div>

                {/* Donut Legend */}
                <Div className="space-y-1.5 pt-3 border-t border-[#E5E7EB] mt-3">
                  {donutSegments.map((seg, i) => (
                    <Div key={i} className="flex items-center justify-between text-[10px] text-slate-600">
                      <Div className="flex items-center gap-1.5">
                        <Div
                          className="w-1.5 h-1.5 rounded-full"
                          style={{
                            backgroundColor: seg.color,
                          }}
                        />
                        <Span className="truncate">{seg.label}</Span>
                      </Div>
                      <Span className="font-semibold text-[#0B1220]">
                        {seg.value} ({seg.percentage}%)
                      </Span>
                    </Div>
                  ))}
                </Div>
              </>
            )}
          </Div>

          {/* Security Health */}
          <Div className="bg-white border border-[#E5E7EB] rounded-lg p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
            <Div>
              <Div className="flex items-center gap-2 mb-2">
                <H3 className="text-xs text-[#0B1220] uppercase tracking-wider font-bold">Security Health</H3>
                <Div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              </Div>
              <P className="text-[11px] text-[#64748B] mb-3">Real-time authentication scoring.</P>
            </Div>

            {/* Gauge */}
            <Div className="flex items-center justify-center relative py-2">
              <Svg width={80} height={80} style={{ transform: [{ rotate: '-90deg' }] }}>
                <Circle cx="40" cy="40" r="33" stroke="#E5E7EB" strokeWidth="5" fill="transparent" />
                <Circle
                  cx="40"
                  cy="40"
                  r="33"
                  stroke="#22C55E"
                  strokeWidth="5"
                  fill="transparent"
                  strokeDasharray={207.2}
                  strokeDashoffset={207.2 - (207.2 * securityScore) / 100}
                />
              </Svg>
              <Div className="absolute text-center">
                <Span className="text-sm font-bold text-[#0B1220] block leading-none">{securityScore}%</Span>
                <Span className="text-[8px] text-emerald-600 font-bold block mt-0.5">Good</Span>
              </Div>
            </Div>

            {/* Metrics List */}
            <Div className="space-y-1.5 text-[10px] text-slate-600 pt-2.5 border-t border-[#E5E7EB] mt-2">
              <Div className="flex justify-between">
                <Span className="flex items-center gap-1">
                  <UiIcon as={Lock} size={10} className="text-[#64748B]" /> MFA Enabled
                </Span>
                <Span className="font-semibold text-[#0B1220]">
                  {stats.mfaEnabled} / {stats.total}
                </Span>
              </Div>
              <Div className="flex justify-between">
                <Span className="flex items-center gap-1">
                  <UiIcon as={AlertTriangle} size={10} className="text-[#64748B]" /> Locked Accounts
                </Span>
                <Span className="font-semibold text-[#0B1220]">{stats.locked}</Span>
              </Div>
              <Div className="flex justify-between">
                <Span className="flex items-center gap-1">
                  <UiIcon as={ShieldCheck} size={10} className="text-[#64748B]" /> Failed Logins
                </Span>
                <Span className="font-semibold text-[#0B1220]">2</Span>
              </Div>
              <Div className="flex justify-between">
                <Span className="flex items-center gap-1">
                  <UiIcon as={Clock} size={10} className="text-[#64748B]" /> Password Expiring
                </Span>
                <Span className="font-semibold text-[#0B1220]">1</Span>
              </Div>
            </Div>

            <Button
              onClick={() => toast.success('Security reports are up to date.')}
              className="admin-btn-secondary w-full text-[10px] h-8 justify-center gap-1.5 mt-3"
            >
              <UiIcon as={FileText} size={12} />
              <Span>View Full Security Report</Span>
              <UiIcon as={ChevronRight} size={10} />
            </Button>
          </Div>
        </motion.div>

        {/* SECONDARY INSIGHTS ROW */}
        <motion.div
          initial={{
            opacity: 0,
            y: 15,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            duration: 0.35,
            delay: 0.2,
          }}
          className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4"
        >
          {/* Recent Activity */}
          <Div className="bg-white border border-[#E5E7EB] rounded-lg p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
            <Div>
              <Div className="flex items-center justify-between mb-3">
                <H3 className="text-xs text-[#0B1220] uppercase tracking-wider font-bold">Recent Activity</H3>
                <Span className="text-[9px] text-[#64748B] hover:underline cursor-pointer">View All</Span>
              </Div>
              <ScrollDiv className="space-y-3.5 max-h-[160px] pr-1">
                {[
                  {
                    title: 'Rydon Superadmin',
                    desc: 'Super Admin logged in',
                    time: 'Just now',
                    type: 'login',
                  },
                  {
                    title: 'Finance Admin',
                    desc: 'Updated pricing permissions',
                    time: '12 mins ago',
                    type: 'role',
                  },
                  {
                    title: 'Support Admin',
                    desc: 'Created new admin account',
                    time: '28 mins ago',
                    type: 'create',
                  },
                  {
                    title: 'Operations Admin',
                    desc: 'Reset password for admin@test.com',
                    time: '45 mins ago',
                    type: 'reset',
                  },
                  {
                    title: 'Security Admin',
                    desc: 'Enabled MFA for 3 admins',
                    time: '1 hour ago',
                    type: 'mfa',
                  },
                ].map((act, idx) => (
                  <Div key={idx} className="flex items-start gap-2.5 text-[11px] border-l border-[#E5E7EB] pl-3 relative ml-1.5">
                    <Div className="absolute -left-[3.5px] top-1 w-1.5 h-1.5 rounded-full bg-[#FFC400]" />
                    <Div className="flex-1">
                      <P className="font-semibold text-[#0B1220]">{act.title}</P>
                      <P className="text-[10px] text-slate-400 mt-0.5">
                        {act.desc} · {act.time}
                      </P>
                    </Div>
                  </Div>
                ))}
              </ScrollDiv>
            </Div>
          </Div>

          {/* Quick Insights */}
          <Div className="bg-white border border-[#E5E7EB] rounded-lg p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
            <Div>
              <H3 className="text-xs text-[#0B1220] uppercase tracking-wider mb-3 font-bold">Quick Insights</H3>
              <Div className="grid grid-cols-2 gap-2">
                {[
                  {
                    label: 'New Admins',
                    value: '2',
                    desc: 'This week',
                  },
                  {
                    label: 'Total Admins',
                    value: stats.total,
                    desc: 'Nodes',
                  },
                  {
                    label: 'Active Sessions',
                    value: stats.active,
                    desc: 'Now',
                  },
                  {
                    label: 'Login Success',
                    value: '98.6%',
                    desc: 'Rate',
                  },
                  {
                    label: 'Password Resets',
                    value: '4',
                    desc: 'Completed',
                  },
                  {
                    label: 'Permission Changes',
                    value: '12',
                    desc: 'Logs',
                  },
                ].map((qi, i) => (
                  <Div key={i} className="bg-slate-50 border border-slate-100 rounded-lg p-2 text-center">
                    <Span className="text-[8px] text-[#64748B] block truncate">{qi.label}</Span>
                    <Span className="text-xs font-bold text-[#0B1220] block mt-0.5">{qi.value}</Span>
                    <Span className="text-[8px] text-slate-400 block mt-0.5 truncate">{qi.desc}</Span>
                  </Div>
                ))}
              </Div>
            </Div>
          </Div>

          {/* Top Departments */}
          <Div className="bg-white border border-[#E5E7EB] rounded-lg p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
            <Div>
              <H3 className="text-xs text-[#0B1220] uppercase tracking-wider mb-3 font-bold">Top Departments</H3>
              <Div className="space-y-3">
                {[
                  {
                    label: 'Operations',
                    count: 5,
                    color: 'bg-[#FFC400]',
                    percent: 80,
                  },
                  {
                    label: 'Finance',
                    count: 3,
                    color: 'bg-blue-500',
                    percent: 55,
                  },
                  {
                    label: 'Support',
                    count: 2,
                    color: 'bg-emerald-500',
                    percent: 35,
                  },
                  {
                    label: 'Engineering',
                    count: 2,
                    color: 'bg-purple-500',
                    percent: 35,
                  },
                  {
                    label: 'HR',
                    count: 1,
                    color: 'bg-pink-500',
                    percent: 15,
                  },
                  {
                    label: 'Marketing',
                    count: 1,
                    color: 'bg-slate-400',
                    percent: 15,
                  },
                ].map((dept, i) => (
                  <Div key={i} className="text-[10px]">
                    <Div className="flex justify-between mb-1 text-slate-600">
                      <Span>{dept.label}</Span>
                      <Span className="font-semibold text-[#0B1220]">{dept.count}</Span>
                    </Div>
                    <Div className="w-full bg-slate-100 rounded-full h-1.5">
                      <Div
                        className={`h-1.5 rounded-full ${dept.color}`}
                        style={{
                          width: `${dept.percent}%`,
                        }}
                      />
                    </Div>
                  </Div>
                ))}
              </Div>
            </Div>
          </Div>

          {/* Access by Module */}
          <Div className="bg-white border border-[#E5E7EB] rounded-lg p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
            <Div>
              <H3 className="text-xs text-[#0B1220] uppercase tracking-wider mb-3 font-bold">Access by Module</H3>
              <Div className="space-y-3">
                {[
                  {
                    label: 'Dashboard',
                    percent: 100,
                    color: 'bg-indigo-500',
                  },
                  {
                    label: 'Users',
                    percent: 92,
                    color: 'bg-blue-500',
                  },
                  {
                    label: 'Bookings',
                    percent: 85,
                    color: 'bg-emerald-500',
                  },
                  {
                    label: 'Finance',
                    percent: 70,
                    color: 'bg-purple-500',
                  },
                  {
                    label: 'Drivers',
                    percent: 63,
                    color: 'bg-pink-500',
                  },
                ].map((mod, i) => (
                  <Div key={i} className="text-[10px]">
                    <Div className="flex justify-between mb-1 text-slate-600">
                      <Span>{mod.label}</Span>
                      <Span className="font-semibold text-[#0B1220]">{mod.percent}%</Span>
                    </Div>
                    <Div className="w-full bg-slate-100 rounded-full h-1.5">
                      <Div
                        className={`h-1.5 rounded-full ${mod.color}`}
                        style={{
                          width: `${mod.percent}%`,
                        }}
                      />
                    </Div>
                  </Div>
                ))}
              </Div>
            </Div>
          </Div>
        </motion.div>

        {/* SEARCH & FILTER TOOLBAR */}
        <motion.div
          initial={{
            opacity: 0,
            y: 15,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            duration: 0.35,
            delay: 0.28,
          }}
          className="bg-white border border-[#E5E7EB] rounded-lg p-6 shadow-sm !p-4 bg-white space-y-4"
        >
          <Div className="flex flex-wrap items-center justify-between gap-4">
            <Div className="relative flex-1 max-w-sm">
              <UiIcon as={Search} size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name, email, employee ID or phone..."
                className="admin-input pl-10 h-10"
              />
            </Div>

            <Div className="flex flex-wrap items-center gap-3 text-xs">
              <Div>
                <Label className="block text-[8px] font-bold text-[#64748B] uppercase mb-0.5">Role</Label>
                <Select value={filterRole} onChange={(e) => setFilterRole(e.target.value)} className="admin-input h-9 !py-0 !px-2 !w-32">
                  <Option value="All">All Roles</Option>
                  <Option value="Super Admin">Super Admin</Option>
                  <Option value="Operations Subadmin">Operations Subadmin</Option>
                  <Option value="Billing Subadmin">Billing Subadmin</Option>
                  <Option value="Support Staff">Support Staff</Option>
                </Select>
              </Div>

              <Div>
                <Label className="block text-[8px] font-bold text-[#64748B] uppercase mb-0.5">Department</Label>
                <Select value={filterDepartment} onChange={(e) => setFilterDepartment(e.target.value)} className="admin-input h-9 !py-0 !px-2 !w-32">
                  <Option value="All">All Depts</Option>
                  <Option value="Operations">Operations</Option>
                  <Option value="Finance">Finance</Option>
                  <Option value="Support">Support</Option>
                  <Option value="Engineering">Engineering</Option>
                </Select>
              </Div>

              <Div>
                <Label className="block text-[8px] font-bold text-[#64748B] uppercase mb-0.5">Status</Label>
                <Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="admin-input h-9 !py-0 !px-2 !w-32">
                  <Option value="All">All Status</Option>
                  <Option value="Active">Active</Option>
                  <Option value="Suspended">Suspended</Option>
                </Select>
              </Div>

              <Div>
                <Label className="block text-[8px] font-bold text-[#64748B] uppercase mb-0.5">MFA</Label>
                <Select value={filterMfa} onChange={(e) => setFilterMfa(e.target.value)} className="admin-input h-9 !py-0 !px-2 !w-24">
                  <Option value="All">All</Option>
                  <Option value="Enabled">Enabled</Option>
                  <Option value="Disabled">Disabled</Option>
                </Select>
              </Div>

              <Div>
                <Label className="block text-[8px] font-bold text-[#64748B] uppercase mb-0.5">Verification</Label>
                <Select value={filterVerification} onChange={(e) => setFilterVerification(e.target.value)} className="admin-input h-9 !py-0 !px-2 !w-28">
                  <Option value="All">All</Option>
                  <Option value="Verified">Verified</Option>
                  <Option value="Unverified">Unverified</Option>
                </Select>
              </Div>

              <Div className="pt-3">
                <Button onClick={() => setShowAdvanced(!showAdvanced)} className="admin-btn-secondary h-9 gap-1.5 px-3 text-[11px]">
                  <UiIcon as={Info} size={13} />
                  <Span>Filters</Span>
                </Button>
              </Div>

              <Div className="pt-3">
                <Select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="admin-input h-9 !py-0 !px-2 !w-32">
                  <Option value="Newest">Newest Added</Option>
                  <Option value="Oldest">Oldest Added</Option>
                  <Option value="Alphabetical">Alphabetical</Option>
                </Select>
              </Div>
            </Div>
          </Div>
        </motion.div>

        {/* REGISTRY TABLE */}
        <motion.div
          initial={{
            opacity: 0,
            y: 20,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            duration: 0.4,
            delay: 0.35,
          }}
          className="admin-table-container bg-white shadow-sm overflow-hidden"
        >
          {loading ? (
            <Div className="py-20 flex flex-col items-center justify-center gap-3">
              <UiIcon as={Loader2} size={32} className="animate-spin text-[#0B1220]" />
              <Span className="text-[10px] font-semibold text-[#64748B] uppercase tracking-wider">Synchronizing Node Registry...</Span>
            </Div>
          ) : filteredAndSortedAdmins.length === 0 ? (
            <Div className="py-20 flex flex-col items-center text-center px-6">
              <Div className="w-16 h-16 bg-[#F6F8FC] rounded-full flex items-center justify-center text-slate-300 mb-4 border border-[#E5E7EB]">
                <UiIcon as={FileSearch} size={24} />
              </Div>
              <H3 className="text-sm text-[#0B1220] font-bold">No Nodes Located</H3>
              <P className="text-xs text-[#64748B] mt-1 max-w-sm leading-relaxed">
                We couldn&apos;t locate any administrators matching your search criteria. Check for typos or expand filters.
              </P>
            </Div>
          ) : (
            <Table cols={[44, 200, 130, 140, 150, 130, 120, 110, 150, 132]} className="admin-table">
              <Thead>
                <Tr>
                  <Th className="!w-10">
                    <Input
                      type="checkbox"
                      onChange={handleSelectAllRows}
                      checked={filteredAndSortedAdmins.length > 0 && selectedRowIds.length === filteredAndSortedAdmins.length}
                      className="rounded border-[#E5E7EB] text-[#FFC400] focus:ring-[#FFC400] h-4.5 w-4.5 cursor-pointer"
                    />
                  </Th>
                  <Th>Admin</Th>
                  <Th>Employee ID</Th>
                  <Th>Role</Th>
                  <Th>Department</Th>
                  <Th>Permissions</Th>
                  <Th>MFA Status</Th>
                  <Th>Status</Th>
                  <Th>Last Login</Th>
                  <Th className="text-right">Actions</Th>
                </Tr>
              </Thead>
              <Tbody>
                {filteredAndSortedAdmins.map((admin) => {
                  const isSuper = admin.admin_type === 'superadmin';
                  const isActive = admin.active !== false;
                  const id = admin.id || admin._id;
                  const isExpanded = selectedAdmin && (selectedAdmin.id === id || selectedAdmin._id === id) && isDrawerOpen;
                  const isEditExpanded = isEditOpen && (form.id === id || form._id === id);
                  const toggleExpand = (e) => {
                    e.stopPropagation();
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
                    <React.Fragment key={id}>
                      <Tr className={`hover:bg-slate-50/50 transition-colors ${isExpanded ? 'bg-[#FAFBFD]' : ''}`}>
                        {/* Checkbox */}
                        <Td>
                          <Input
                            type="checkbox"
                            checked={selectedRowIds.includes(id)}
                            onChange={(e) => handleSelectRow(id, e.target.checked)}
                            className="rounded border-[#E5E7EB] text-[#FFC400] focus:ring-[#FFC400] h-4.5 w-4.5 cursor-pointer"
                          />
                        </Td>

                        {/* Admin Avatar/Name/Email */}
                        <Td>
                          <Div className="flex items-center gap-3">
                            <Div
                              onClick={toggleExpand}
                              className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs border cursor-pointer select-none ${isSuper ? 'bg-[#FFC400]/10 border-[#FFC400]/40 text-[#0B1220]' : 'bg-slate-50 border-slate-200 text-[#0B1220]'}`}
                            >
                              {admin.name?.[0]?.toUpperCase() || <UiIcon as={Shield} size={14} />}
                            </Div>
                            <Div>
                              <Span onClick={toggleExpand} className="text-xs font-semibold text-[#0B1220] hover:underline cursor-pointer block">
                                {admin.name}
                              </Span>
                              <Span className="text-[10px] text-[#64748B] block mt-0.5">{admin.email}</Span>
                            </Div>
                          </Div>
                        </Td>

                        {/* Employee ID */}
                        <Td>
                          <Span className="text-xs font-medium text-[#0B1220]">{admin.employeeId || 'EMP-00' + ((String(id).charCodeAt(String(id).length - 1) % 9) + 1)}</Span>
                        </Td>

                        {/* Role */}
                        <Td>
                          <Div className="flex items-center gap-1">
                            {isSuper ? <UiIcon as={Crown} size={11} className="text-[#FFC400]" /> : <UiIcon as={Shield} size={11} className="text-slate-400" />}
                            <Span className={`text-[10px] font-bold uppercase tracking-wider ${isSuper ? 'text-[#FFC400]' : 'text-slate-600'}`}>
                              {isSuper ? 'Super Admin' : admin.role || 'Personnel'}
                            </Span>
                          </Div>
                        </Td>

                        {/* Department */}
                        <Td>
                          <Span className="text-xs text-[#0B1220] font-medium">{admin.department || 'Operations'}</Span>
                        </Td>

                        {/* Permissions */}
                        <Td>
                          <Span className="text-xs text-[#64748B] font-medium">{isSuper ? '18 Modules' : `${(admin.permissions || []).length} Modules`}</Span>
                        </Td>

                        {/* MFA status */}
                        <Td>
                          <Div className="flex items-center gap-1.5">
                            <Div className={`w-1.5 h-1.5 rounded-full ${admin.mfaEnabled ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                            <Span className="text-[10px] font-semibold text-slate-700">{admin.mfaEnabled ? 'Enabled' : 'Disabled'}</Span>
                          </Div>
                        </Td>

                        {/* Status */}
                        <Td>
                          <Span className={`admin-badge ${isActive ? 'admin-badge-success' : 'admin-badge-warning'}`}>
                            {isActive ? 'Verified' : 'Suspended'}
                          </Span>
                        </Td>

                        {/* Last Login */}
                        <Td>
                          <Span className="text-xs text-[#64748B] font-medium">
                            {admin.lastLogin ? new Date(admin.lastLogin).toLocaleDateString() : 'Just now'}
                          </Span>
                        </Td>

                        {/* Actions */}
                        <Td>
                          <Div className="flex items-center justify-end gap-1">
                            <Button
                              onClick={toggleExpand}
                              className="p-1.5 text-slate-400 hover:text-[#0B1220] rounded-md hover:bg-slate-100/60 view-btn-trigger"
                            >
                              <UiIcon as={Eye} size={14} />
                            </Button>
                            <Button
                              onClick={() => handleEditClick(admin)}
                              className="p-1.5 text-slate-400 hover:text-[#0B1220] rounded-md hover:bg-slate-100/60"
                            >
                              <UiIcon as={Edit2} size={14} />
                            </Button>
                            {!isSuper && (
                              <Button
                                onClick={() => {
                                  window.dispatchEvent(new Event('admin:closeDropdowns'));
                                  setDeletingAdmin(admin);
                                  setDeleteConfirmText('');
                                  setIsDeleteOpen(true);
                                }}
                                className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50"
                              >
                                <UiIcon as={Trash2} size={14} />
                              </Button>
                            )}
                          </Div>
                        </Td>
                      </Tr>
                      {isExpanded && (
                        <Tr className="bg-[#FAFBFD]">
                          <Td colSpan={10} className="px-6 py-4">
                            <motion.div
                              initial={{
                                opacity: 0,
                                height: 0,
                              }}
                              animate={{
                                opacity: 1,
                                height: 'auto',
                              }}
                              exit={{
                                opacity: 0,
                                height: 0,
                              }}
                              transition={{
                                duration: 0.2,
                              }}
                              className="bg-white border-l-4 border-l-[#FFC400] border border-[#E5E7EB] rounded-r-xl p-6 shadow-sm space-y-6 font-sans text-xs text-[#0B1220] overflow-hidden"
                            >
                              <Div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
                                <Div className="flex items-center gap-3">
                                  <Div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-sm text-[#0B1220]">
                                    {selectedAdmin.name?.[0]?.toUpperCase()}
                                  </Div>
                                  <Div>
                                    <H4 className="font-bold text-sm">{selectedAdmin.name}</H4>
                                    <P className="text-[#64748B] text-[11px]">{selectedAdmin.email}</P>
                                  </Div>
                                </Div>
                                <Button
                                  onClick={() => {
                                    setIsDrawerOpen(false);
                                    setSelectedAdmin(null);
                                  }}
                                  className="text-slate-400 hover:text-slate-600 p-1"
                                >
                                  <UiIcon as={X} size={16} />
                                </Button>
                              </Div>

                              <Div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <Div>
                                  <Span className="text-[#64748B] block font-medium">Employee ID</Span>
                                  <Span className="font-bold block mt-0.5">{selectedAdmin.employeeId || 'Not available'}</Span>
                                </Div>
                                <Div>
                                  <Span className="text-[#64748B] block font-medium">Phone Number</Span>
                                  <Span className="font-bold block mt-0.5">{selectedAdmin.phone || 'Not available'}</Span>
                                </Div>
                                <Div>
                                  <Span className="text-[#64748B] block font-medium">Department</Span>
                                  <Span className="font-bold block mt-0.5">{selectedAdmin.department || 'Operations'}</Span>
                                </Div>
                                <Div>
                                  <Span className="text-[#64748B] block font-medium">Designation</Span>
                                  <Span className="font-bold block mt-0.5">{selectedAdmin.designation || 'Not available'}</Span>
                                </Div>
                                <Div>
                                  <Span className="text-[#64748B] block font-medium">MFA Security</Span>
                                  <Span className="font-bold block mt-0.5">{selectedAdmin.mfaEnabled ? 'Enabled' : 'Disabled'}</Span>
                                </Div>
                                <Div>
                                  <Span className="text-[#64748B] block font-medium">Account Status</Span>
                                  <Span className="font-bold block mt-0.5">{selectedAdmin.active !== false ? 'Active' : 'Suspended'}</Span>
                                </Div>
                                <Div>
                                  <Span className="text-[#64748B] block font-medium">Registered Date</Span>
                                  <Span className="font-bold block mt-0.5">
                                    {selectedAdmin.createdAt || selectedAdmin.created_at
                                      ? new Date(selectedAdmin.createdAt || selectedAdmin.created_at).toLocaleDateString()
                                      : 'Not available'}
                                  </Span>
                                </Div>
                                <Div>
                                  <Span className="text-[#64748B] block font-medium">Last Login</Span>
                                  <Span className="font-bold block mt-0.5">
                                    {selectedAdmin.lastLogin ? new Date(selectedAdmin.lastLogin).toLocaleDateString() : 'Just now'}
                                  </Span>
                                </Div>
                              </Div>

                              <Div className="pt-4 border-t border-[#F1F5F9]">
                                <Span className="text-[#64748B] block font-medium mb-1.5">Module Permissions</Span>
                                <Div className="flex flex-wrap gap-1 mt-0.5">
                                  {selectedAdmin.admin_type === 'superadmin' ? (
                                    <Span className="admin-badge admin-badge-success text-[10px] py-0.5 px-2">Unrestricted Sovereignty</Span>
                                  ) : selectedAdmin.permissions && selectedAdmin.permissions.length > 0 ? (
                                    selectedAdmin.permissions.map((p) => (
                                      <Span key={p} className="admin-badge admin-badge-info py-0.5 px-2 text-[10px] rounded">
                                        {p}
                                      </Span>
                                    ))
                                  ) : (
                                    <Span className="text-slate-400 italic">No explicit modules allowed yet.</Span>
                                  )}
                                </Div>
                              </Div>

                              <Div className="pt-4 border-t border-[#F1F5F9] flex items-center justify-between gap-4">
                                <Div className="flex-1">
                                  <Span className="text-[#64748B] block font-medium">Administrative Notes</Span>
                                  <P className="text-[11px] mt-1 leading-relaxed bg-[#F8FAFC] p-2 rounded border border-[#E5E7EB] italic">
                                    {selectedAdmin.notes || 'No security log overrides recorded.'}
                                  </P>
                                </Div>
                                <Button
                                  onClick={() => {
                                    setIsDrawerOpen(false);
                                    handleEditClick(selectedAdmin);
                                  }}
                                  className="admin-btn-primary h-9 px-4 gap-1.5 !bg-[#FFC400] !text-[#0B1220] text-xs font-bold shrink-0 self-end"
                                >
                                  <Span>Modify Privileges</Span>
                                </Button>
                              </Div>
                            </motion.div>
                          </Td>
                        </Tr>
                      )}

                      {isEditExpanded && (
                        <Tr className="bg-[#FAFBFD]">
                          <Td colSpan={10} className="px-6 py-4">
                            <motion.div
                              initial={{
                                opacity: 0,
                                height: 0,
                              }}
                              animate={{
                                opacity: 1,
                                height: 'auto',
                              }}
                              exit={{
                                opacity: 0,
                                height: 0,
                              }}
                              transition={{
                                duration: 0.2,
                              }}
                              className="bg-white border-l-4 border-l-[#FFC400] border border-[#E5E7EB] rounded-r-xl shadow-sm space-y-4 font-sans text-xs text-[#0B1220] overflow-hidden"
                            >
                              <Div className="p-5 border-b border-[#E5E7EB] flex items-center justify-between bg-slate-50">
                                <H3 className="text-xs font-bold text-[#0B1220] uppercase tracking-wider">Modify Administrative Privileges</H3>
                                <Button type="button" onClick={() => setIsEditOpen(false)} className="text-slate-400 hover:text-slate-600">
                                  <UiIcon as={X} size={18} />
                                </Button>
                              </Div>

                              <Form onSubmit={handleEditSubmit} className="p-5 space-y-4">
                                <Div className="grid grid-cols-2 gap-4">
                                  <Div>
                                    <Label className="block text-[10px] font-semibold text-[#64748B] uppercase mb-1">Full Name</Label>
                                    <Input
                                      required
                                      value={form.name}
                                      onChange={(e) => setField('name', e.target.value)}
                                      placeholder="e.g. Marcus Aurelius"
                                      className="admin-input"
                                    />
                                  </Div>
                                  <Div>
                                    <Label className="block text-[10px] font-semibold text-[#64748B] uppercase mb-1">Email Identity</Label>
                                    <Input
                                      type="email"
                                      required
                                      value={form.email}
                                      onChange={(e) => setField('email', e.target.value)}
                                      placeholder="e.g. admin@rydon.com"
                                      className="admin-input"
                                    />
                                  </Div>
                                </Div>

                                <Div className="grid grid-cols-2 gap-4">
                                  <Div>
                                    <Label className="block text-[10px] font-semibold text-[#64748B] uppercase mb-1">Phone Number</Label>
                                    <Input
                                      value={form.phone}
                                      onChange={(e) => setField('phone', e.target.value)}
                                      placeholder="e.g. +1 555-0199"
                                      className="admin-input"
                                    />
                                  </Div>
                                  <Div>
                                    <Label className="block text-[10px] font-semibold text-[#64748B] uppercase mb-1">Admin Role</Label>
                                    <Select value={form.role} onChange={(e) => setField('role', e.target.value)} className="admin-input">
                                      <Option value="Operations Subadmin">Operations Subadmin</Option>
                                      <Option value="Billing Subadmin">Billing Subadmin</Option>
                                      <Option value="Support Staff">Support Staff</Option>
                                    </Select>
                                  </Div>
                                </Div>

                                <Div className="grid grid-cols-2 gap-4">
                                  <Div>
                                    <Label className="block text-[10px] font-semibold text-[#64748B] uppercase mb-1">Admin Type</Label>
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
                                      className="admin-input"
                                    >
                                      <Option value="subadmin">Sub-Admin (Scoped Rights)</Option>
                                      <Option value="superadmin">Super Admin (Unrestricted)</Option>
                                    </Select>
                                  </Div>
                                  <Div>
                                    <Label className="block text-[10px] font-semibold text-[#64748B] uppercase mb-1">Status</Label>
                                    <Select
                                      value={form.active ? 'active' : 'inactive'}
                                      onChange={(e) => setField('active', e.target.value === 'active')}
                                      className="admin-input"
                                    >
                                      <Option value="active">Active</Option>
                                      <Option value="inactive">Suspended</Option>
                                    </Select>
                                  </Div>
                                </Div>

                                {form.admin_type !== 'superadmin' && (
                                  <Div>
                                    <Label className="block text-[10px] font-semibold text-[#64748B] uppercase mb-1">Cryptographic Module Access</Label>
                                    <ScrollDiv className="border border-[#E5E7EB] rounded-lg p-3 max-h-36 grid grid-cols-2 gap-2 bg-[#F8FAFC]">
                                      {ADMIN_PERMISSION_GROUPS.flatMap((g) => g.items).map((perm) => (
                                        <Label key={perm.key} className="flex items-center gap-2 text-xs text-[#0B1220] cursor-pointer">
                                          <Input
                                            type="checkbox"
                                            checked={form.permissions.includes(perm.key)}
                                            onChange={() => togglePermission(perm.key)}
                                            className="rounded border-[#E5E7EB] text-[#FFC400] focus:ring-[#FFC400] h-4 w-4"
                                          />
                                          <Span>{perm.label}</Span>
                                        </Label>
                                      ))}
                                    </ScrollDiv>
                                  </Div>
                                )}

                                <Div className="grid grid-cols-2 gap-4">
                                  <Div>
                                    <Label className="block text-[10px] font-semibold text-[#64748B] uppercase mb-1">New Password (Optional)</Label>
                                    <Input
                                      type="password"
                                      value={form.password}
                                      onChange={(e) => setField('password', e.target.value)}
                                      placeholder="Leave blank to retain current"
                                      className="admin-input"
                                    />
                                  </Div>
                                  <Div>
                                    <Label className="block text-[10px] font-semibold text-[#64748B] uppercase mb-1">Confirm New Password</Label>
                                    <Input
                                      type="password"
                                      value={form.passwordConfirmation}
                                      onChange={(e) => setField('passwordConfirmation', e.target.value)}
                                      placeholder="Confirm new password"
                                      className="admin-input"
                                    />
                                  </Div>
                                </Div>

                                <Div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg p-3">
                                  <Div className="flex items-center gap-2">
                                    <Input
                                      type="checkbox"
                                      nativeID={`mfa-edit-${id}`}
                                      checked={form.mfaEnabled}
                                      onChange={(e) => setField('mfaEnabled', e.target.checked)}
                                      className="rounded border-[#E5E7EB] text-[#FFC400] focus:ring-[#FFC400] h-4 w-4"
                                    />
                                    <Label className="text-xs font-semibold text-[#0B1220] cursor-pointer">Require Multi-Factor Authentication</Label>
                                  </Div>
                                </Div>

                                <Div>
                                  <Label className="block text-[10px] font-semibold text-[#64748B] uppercase mb-1">Administrative Notes</Label>
                                  <Textarea
                                    value={form.notes}
                                    onChange={(e) => setField('notes', e.target.value)}
                                    placeholder="Enter special access notes..."
                                    className="admin-input min-h-[60px]"
                                  />
                                </Div>

                                <Div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E5E7EB]">
                                  <Button type="button" onClick={() => setIsEditOpen(false)} className="admin-btn-secondary h-10">
                                    Cancel
                                  </Button>
                                  <Button type="submit" disabled={saving} className="admin-btn-primary h-10 min-w-[120px] !bg-[#FFC400] !text-[#0B1220]">
                                    {saving ? <UiIcon as={Loader2} size={16} className="animate-spin" /> : 'Save Changes'}
                                  </Button>
                                </Div>
                              </Form>
                            </motion.div>
                          </Td>
                        </Tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </Tbody>
            </Table>
          )}
        </motion.div>

        {/* PERMISSION BADGES LEGEND */}
        <motion.div
          initial={{
            opacity: 0,
            y: 15,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            duration: 0.3,
            delay: 0.42,
          }}
          className="bg-white border border-[#E5E7EB] rounded-lg p-6 shadow-sm"
        >
          <H3 className="text-xs text-[#0B1220] uppercase tracking-wider mb-3 font-bold">System Permission Directory</H3>
          <Div className="flex flex-wrap gap-1.5">
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
              <Span key={i} className="admin-badge admin-badge-info text-[9px] py-0.5 px-2 bg-slate-50 border border-slate-200 text-slate-600 rounded">
                {mod}
              </Span>
            ))}
          </Div>
        </motion.div>
      </Div>

      {/* CREATE MODAL */}
      {isCreateOpen && (
        <Overlay onClose={() => setIsCreateOpen(false)} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Div className="w-full max-w-lg max-h-[85vh] bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden">
              <Div className="p-5 border-b border-[#E5E7EB] flex items-center justify-between">
                <H3 className="text-xs font-bold text-[#0B1220] uppercase tracking-wider">Initialize Admin Token</H3>
                <Button onClick={() => setIsCreateOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <UiIcon as={X} size={18} />
                </Button>
              </Div>

              <Form onSubmit={handleCreateSubmit} className="flex-1">
                <ScrollDiv className="p-5 space-y-4">
                <Div className="grid grid-cols-2 gap-4">
                  <Div>
                    <Label className="block text-[10px] font-semibold text-[#64748B] uppercase mb-1">Full Name</Label>
                    <Input
                      required
                      value={form.name}
                      onChange={(e) => setField('name', e.target.value)}
                      placeholder="e.g. Marcus Aurelius"
                      className="admin-input"
                    />
                  </Div>
                  <Div>
                    <Label className="block text-[10px] font-semibold text-[#64748B] uppercase mb-1">Email Identity</Label>
                    <Input
                      type="email"
                      required
                      value={form.email}
                      onChange={(e) => setField('email', e.target.value)}
                      placeholder="e.g. admin@rydon.com"
                      className="admin-input"
                    />
                  </Div>
                </Div>

                <Div className="grid grid-cols-2 gap-4">
                  <Div>
                    <Label className="block text-[10px] font-semibold text-[#64748B] uppercase mb-1">Phone Number</Label>
                    <Input value={form.phone} onChange={(e) => setField('phone', e.target.value)} placeholder="e.g. +1 555-0199" className="admin-input" />
                  </Div>
                  <Div>
                    <Label className="block text-[10px] font-semibold text-[#64748B] uppercase mb-1">Admin Role</Label>
                    <Select value={form.role} onChange={(e) => setField('role', e.target.value)} className="admin-input">
                      <Option value="Operations Subadmin">Operations Subadmin</Option>
                      <Option value="Billing Subadmin">Billing Subadmin</Option>
                      <Option value="Support Staff">Support Staff</Option>
                    </Select>
                  </Div>
                </Div>

                <Div className="grid grid-cols-2 gap-4">
                  <Div>
                    <Label className="block text-[10px] font-semibold text-[#64748B] uppercase mb-1">Admin Type</Label>
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
                      className="admin-input"
                    >
                      <Option value="subadmin">Sub-Admin (Scoped Rights)</Option>
                      <Option value="superadmin">Super Admin (Unrestricted)</Option>
                    </Select>
                  </Div>
                  <Div>
                    <Label className="block text-[10px] font-semibold text-[#64748B] uppercase mb-1">Status</Label>
                    <Select
                      value={form.active ? 'active' : 'inactive'}
                      onChange={(e) => setField('active', e.target.value === 'active')}
                      className="admin-input"
                    >
                      <Option value="active">Active</Option>
                      <Option value="inactive">Suspended</Option>
                    </Select>
                  </Div>
                </Div>

                {form.admin_type !== 'superadmin' && (
                  <Div>
                    <Label className="block text-[10px] font-semibold text-[#64748B] uppercase mb-1">Cryptographic Module Access</Label>
                    <ScrollDiv className="border border-[#E5E7EB] rounded-lg p-3 max-h-36 grid grid-cols-2 gap-2 bg-[#F8FAFC]">
                      {ADMIN_PERMISSION_GROUPS.flatMap((g) => g.items).map((perm) => (
                        <Label key={perm.key} className="flex items-center gap-2 text-xs text-[#0B1220] cursor-pointer">
                          <Input
                            type="checkbox"
                            checked={form.permissions.includes(perm.key)}
                            onChange={() => togglePermission(perm.key)}
                            className="rounded border-[#E5E7EB] text-[#FFC400] focus:ring-[#FFC400] h-4 w-4"
                          />
                          <Span>{perm.label}</Span>
                        </Label>
                      ))}
                    </ScrollDiv>
                  </Div>
                )}

                <Div className="grid grid-cols-2 gap-4">
                  <Div>
                    <Label className="block text-[10px] font-semibold text-[#64748B] uppercase mb-1">Password</Label>
                    <Input
                      type="password"
                      required
                      value={form.password}
                      onChange={(e) => setField('password', e.target.value)}
                      placeholder="Minimum 8 characters"
                      className="admin-input"
                    />
                  </Div>
                  <Div>
                    <Label className="block text-[10px] font-semibold text-[#64748B] uppercase mb-1">Confirm Password</Label>
                    <Input
                      type="password"
                      required
                      value={form.passwordConfirmation}
                      onChange={(e) => setField('passwordConfirmation', e.target.value)}
                      placeholder="Re-type password"
                      className="admin-input"
                    />
                  </Div>
                </Div>

                <Div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg p-3">
                  <Div className="flex items-center gap-2">
                    <Input
                      type="checkbox"
                      nativeID="mfa"
                      checked={form.mfaEnabled}
                      onChange={(e) => setField('mfaEnabled', e.target.checked)}
                      className="rounded border-[#E5E7EB] text-[#FFC400] focus:ring-[#FFC400] h-4 w-4"
                    />
                    <Label className="text-xs font-semibold text-[#0B1220] cursor-pointer">Require Multi-Factor Authentication</Label>
                  </Div>
                </Div>

                <Div>
                  <Label className="block text-[10px] font-semibold text-[#64748B] uppercase mb-1">Administrative Notes</Label>
                  <Textarea
                    value={form.notes}
                    onChange={(e) => setField('notes', e.target.value)}
                    placeholder="Enter special access notes..."
                    className="admin-input min-h-[60px]"
                  />
                </Div>

                <Div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E5E7EB]">
                  <Button type="button" onClick={() => setIsCreateOpen(false)} className="admin-btn-secondary h-10">
                    Cancel
                  </Button>
                  <Button type="submit" disabled={saving} className="admin-btn-primary h-10 min-w-[120px] !bg-[#FFC400] !text-[#0B1220]">
                    {saving ? <UiIcon as={Loader2} size={16} className="animate-spin" /> : 'Save Node'}
                  </Button>
                </Div>
                </ScrollDiv>
              </Form>
          </Div>
        </Overlay>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {isDeleteOpen && deletingAdmin && (
        <Overlay onClose={() => setIsDeleteOpen(false)} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Div className="w-full max-w-md bg-white rounded-xl shadow-2xl overflow-hidden">
              <Div className="p-5 border-b border-[#E5E7EB] flex items-center justify-between bg-rose-50">
                <Div className="flex items-center gap-2 text-rose-600">
                  <UiIcon as={AlertTriangle} size={18} />
                  <H3 className="text-xs font-bold uppercase tracking-wider">Revoke Access Credentials</H3>
                </Div>
                <Button onClick={() => setIsDeleteOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <UiIcon as={X} size={18} />
                </Button>
              </Div>

              <Div className="p-5 space-y-4">
                <Div className="flex items-center gap-3">
                  <Div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-sm text-[#0B1220]">
                    {deletingAdmin.name?.[0]?.toUpperCase()}
                  </Div>
                  <Div>
                    <H4 className="text-xs font-bold text-[#0B1220]">{deletingAdmin.name}</H4>
                    <P className="text-[10px] text-[#64748B] mt-0.5">{deletingAdmin.role || 'Personnel'}</P>
                  </Div>
                </Div>

                <Div className="bg-rose-50/50 border border-rose-100 rounded-lg p-3 text-xs text-rose-800 leading-relaxed">
                  ⚠️ <Strong>Warning:</Strong> Deleting this node will permanently invalidate all assigned security keys and completely restrict dashboard
                  access for this identity. This operation is irrevocable.
                </Div>

                <Div>
                  <Label className="block text-[10px] font-semibold text-[#64748B] uppercase mb-1">
                    Type <Span className="text-[#0B1220] font-black">DELETE</Span> to confirm
                  </Label>
                  <Input
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder="Type DELETE..."
                    className="admin-input h-10 border-rose-200 focus:border-rose-500 focus:ring-rose-500"
                  />
                </Div>

                <Div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E5E7EB]">
                  <Button type="button" onClick={() => setIsDeleteOpen(false)} className="admin-btn-secondary h-10">
                    Cancel
                  </Button>
                  <Button
                    onClick={handleDeleteConfirm}
                    disabled={deleteConfirmText !== 'DELETE' || saving}
                    className="admin-btn-primary h-10 bg-rose-600 hover:bg-rose-700 !text-white min-w-[120px] disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {saving ? <UiIcon as={Loader2} size={16} className="animate-spin" /> : 'Revoke Node'}
                  </Button>
                </Div>
              </Div>
          </Div>
        </Overlay>
      )}
    </ScrollDiv>
  );
};
export default Admins;
