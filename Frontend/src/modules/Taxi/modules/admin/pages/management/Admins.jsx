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
  Key
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { adminService } from '../../services/adminService';
import { ADMIN_PERMISSION_GROUPS } from '../../constants/adminAccess';

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
    mfaEnabled: false
  };

  const [form, setForm] = useState(initialFormState);

  // Load Initial Data
  const loadData = async () => {
    setLoading(true);
    try {
      const [adminsResponse, locationsResponse, zonesResponse] = await Promise.all([
        adminService.getAdmins(),
        adminService.getServiceLocations().catch(() => ({ data: [] })),
        adminService.getZones().catch(() => ({ data: { results: [] } }))
      ]);

      setAdmins(Array.isArray(adminsResponse?.data?.results) ? adminsResponse.data.results : []);
      
      const locData = Array.isArray(locationsResponse?.data)
        ? locationsResponse.data
        : locationsResponse?.data?.results || [];
      setServiceLocations(locData);

      const zoneData = Array.isArray(zonesResponse?.data?.results)
        ? zonesResponse.data.results
        : zonesResponse?.data || [];
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
        [
          item.name,
          item.email,
          item.phone,
          item.employeeId,
          item.role,
          item.admin_type,
          item.department,
          item.designation
        ].some((val) => String(val || '').toLowerCase().includes(query))
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
      locked
    };
  }, [admins]);

  // Role distribution calculation for donut chart
  const roleDistribution = useMemo(() => {
    if (admins.length === 0) return [];

    const counts = {
      'Super Admin': 0,
      'Operations': 0,
      'Finance': 0,
      'Support': 0,
      'Others': 0
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
      'Super Admin': '#0a4d2b',
      'Operations': '#3f6f8f',
      'Finance': '#10B981',
      'Support': '#8B5CF6',
      'Others': '#6B7280'
    };

    const totalCount = admins.length;
    return Object.keys(counts).map((key) => ({
      label: key,
      value: counts[key],
      percentage: totalCount > 0 ? Math.round((counts[key] / totalCount) * 1000) / 10 : 0,
      color: colors[key]
    })).filter(item => item.value > 0);
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
        name: d.toLocaleString('default', { month: 'short' }),
        count: 0
      });
    }

    admins.forEach((admin) => {
      const dateStr = admin.createdAt || admin.created_at;
      if (!dateStr) return;
      const createdDate = new Date(dateStr);
      const diffMonths = (new Date().getFullYear() - createdDate.getFullYear()) * 12 + new Date().getMonth() - createdDate.getMonth();
      if (diffMonths >= 0 && diffMonths < countMonths) {
        months[(countMonths - 1) - diffMonths].count++;
      }
    });

    let sum = admins.length - admins.filter(a => {
      const dateStr = a.createdAt || a.created_at;
      if (!dateStr) return false;
      const createdDate = new Date(dateStr);
      const diffMonths = (new Date().getFullYear() - createdDate.getFullYear()) * 12 + new Date().getMonth() - createdDate.getMonth();
      return diffMonths < countMonths;
    }).length;

    return months.map(m => {
      sum += m.count;
      return {
        month: m.name,
        total: sum
      };
    });
  }, [admins, growthFilter]);

  // Security score
  const securityScore = useMemo(() => {
    if (stats.total === 0) return 0;
    const mfaRatio = stats.mfaEnabled / stats.total;
    const activeRatio = stats.active / stats.total;
    let score = 55 + (mfaRatio * 25) + (activeRatio * 20);
    return Math.max(0, Math.min(100, Math.round(score)));
  }, [stats]);

  // Form Field Updater
  const setField = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  // Toggle permissions
  const togglePermission = (key) => {
    setForm((current) => {
      const next = current.permissions.includes(key)
        ? current.permissions.filter((p) => p !== key)
        : [...current.permissions, key];
      return { ...current, permissions: next };
    });
  };

  // Checkbox handlers
  const handleSelectAllRows = (e) => {
    if (e.target.checked) {
      setSelectedRowIds(filteredAndSortedAdmins.map(a => a.id || a._id));
    } else {
      setSelectedRowIds([]);
    }
  };

  const handleSelectRow = (id, checked) => {
    setSelectedRowIds(prev =>
      checked ? [...prev, id] : prev.filter(item => item !== id)
    );
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
        mfaEnabled: form.mfaEnabled
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
      mfaEnabled: admin.mfaEnabled || false
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
        mfaEnabled: form.mfaEnabled
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
  const handleExport = () => {
    const headers = 'Name,Email,Phone,Role,Type,Active,MFA,Created Date\n';
    const rows = admins.map(
      (admin) =>
        `"${admin.name}","${admin.email}","${admin.phone}","${admin.role}","${admin.admin_type}",${admin.active !== false},${admin.mfaEnabled || false},"${admin.createdAt || admin.created_at || ''}"`
    ).join('\n');
    
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', `Administrators_${new Date().toISOString().split('T')[0]}.csv`);
    a.click();
    toast.success('Exported administration logs');
  };

  // Custom SVG line calculations
  const chartWidth = 500;
  const chartHeight = 150;
  const growthPoints = useMemo(() => {
    if (growthData.length === 0) return [];
    const maxVal = Math.max(...growthData.map(d => d.total), 5);
    return growthData.map((d, i) => {
      const x = (i / (growthData.length - 1)) * chartWidth;
      const y = chartHeight - (d.total / maxVal) * (chartHeight - 30) - 15;
      return { x, y, label: d.month, value: d.total };
    });
  }, [growthData]);

  const linePath = useMemo(() => {
    if (growthPoints.length === 0) return '';
    return 'M ' + growthPoints.map(p => `${p.x} ${p.y}`).join(' L ');
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
        percentage: Math.round(percentage * 100)
      };
    });
  }, [roleDistribution, donutCircumference]);

  return (
    <div className="min-h-screen bg-neutral-50 p-6 lg:p-8 font-sans redigo-admin-root">
      <div className="mx-auto max-w-7xl space-y-6">
        
        {/* HEADER SECTION */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"
        >
          <div>
            <div className="flex items-center gap-1.5 mb-1.5 text-xs font-medium text-neutral-500">
              <span>Management</span>
              <span className="text-neutral-300">/</span>
              <span className="text-neutral-700">Access center</span>
            </div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-medium text-neutral-900">Admin control center</h1>
              <span className="bg-[#0a4d2b]/10 text-[#0a4d2b] text-xs font-medium px-1.5 py-0.5 rounded-full border border-[#0a4d2b]">
                Hub
              </span>
            </div>
            <p className="text-xs text-neutral-500 mt-1 max-w-2xl leading-relaxed">
              Manage administrators, permissions, platform access, roles and cryptographic security logs
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={loadData}
              className="admin-btn-secondary h-10 w-10 !p-0"
              title="Refresh registry"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={handleExport}
              className="admin-btn-secondary h-10 gap-2"
            >
              <Download size={14} />
              <span>Export CSV</span>
            </button>
            <button
              onClick={() => {
                window.dispatchEvent(new Event('admin:closeDropdowns'));
                setForm(initialFormState);
                setIsCreateOpen(true);
              }}
              className="admin-btn-primary h-10 gap-2 !bg-[#0a4d2b] !text-white hover:brightness-95"
            >
              <Plus size={16} />
              <span>Create admin</span>
            </button>
          </div>
        </motion.div>

        {/* KPI CARDS ROW */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {[
            { label: "Total admins", value: stats.total, icon: Users, cardBg: "!bg-neutral-900", trend: "+2 from last month", isTrendPositive: true },
            { label: "Login success rate", value: "98.6%", icon: CheckCircle, cardBg: "!bg-emerald-500", trend: "↑ 1.3% from last month", isTrendPositive: true },
            { label: "Active sessions", value: stats.active, icon: Laptop, cardBg: "!bg-neutral-900", trend: "↑ 2 active now", isTrendPositive: true },
            { label: "Password resets", value: "4", icon: KeyRound, cardBg: "!bg-fuchsia-500", trend: "— 0% from last month", isTrendPositive: false },
            { label: "Permission changes", value: "12", icon: Info, cardBg: "!bg-orange-500", trend: "↑ 33% from last month", isTrendPositive: true },
            { label: "Suspended today", value: stats.suspended, icon: UserMinus, cardBg: "!bg-rose-500", trend: "↑ 1 from last month", isTrendPositive: false }
          ].map((insight, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
              className="rounded-xl border border-neutral-900/[0.08] bg-white p-4"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-[13px] text-neutral-500">{insight.label}</span>
                <insight.icon size={16} strokeWidth={1.5} className="shrink-0 text-neutral-400" />
              </div>
              <p className="mt-2 font-mono text-2xl font-medium leading-8 text-neutral-900 tabular-nums">{insight.value}</p>
              <p className={`mt-1 text-xs ${insight.isTrendPositive ? 'text-green-700' : 'text-neutral-500'}`}>
                {insight.trend}
              </p>
            </motion.div>
          ))}
        </div>

        {/* MAIN ANALYTICS ROW (Growth, Role Distribution, Security) */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.12 }}
          className="grid grid-cols-1 gap-6 lg:grid-cols-4"
        >
          {/* Historical Admin Growth */}
          <div className="admin-card lg:col-span-2 flex flex-col justify-between relative">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs text-neutral-900 font-medium">Historical admin growth</h3>
                  <div className="h-1.5 w-1.5 rounded-full bg-[#0a4d2b] text-white" />
                </div>
                <select
                  value={growthFilter}
                  onChange={(e) => setGrowthFilter(e.target.value)}
                  className="admin-input h-7 !py-0 !px-2 !w-32 text-xs font-medium"
                >
                  <option value="Last 6 Months">Last 6 Months</option>
                  <option value="Last 12 Months">Last 12 Months</option>
                </select>
              </div>
              <p className="text-xs text-neutral-500 mb-4">Cumulative administrative registration curve</p>
            </div>

            {/* Area SVG Chart */}
            {growthData.length === 0 ? (
              <div className="h-[150px] flex flex-col items-center justify-center border border-dashed border-neutral-900/[0.08] rounded-2xl bg-neutral-50/50 p-4 my-2">
                <p className="text-sm font-medium text-neutral-900 whitespace-normal text-center">No historical data available</p>
                <p className="text-xs text-neutral-500 mt-1 whitespace-normal text-center">Growth telemetry will automatically sync here</p>
              </div>
            ) : (
              <>
                <div className="relative pt-2">
                  <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full overflow-visible">
                    {/* Horizontal grid lines */}
                    {[0, 1, 2, 3].map((g, i) => (
                      <line
                        key={i}
                        x1="0"
                        y1={(chartHeight / 3) * g}
                        x2={chartWidth}
                        y2={(chartHeight / 3) * g}
                        stroke="#F1F5F9"
                        strokeWidth="1"
                      />
                    ))}

                    {/* Shimmer Area Fill */}
                    <path d={areaPath} fill="rgba(255, 196, 0, 0.05)" />
                    {/* Area Outline */}
                    <path d={linePath} fill="none" stroke="#0a4d2b" strokeWidth="2.5" />

                    {/* Nodes */}
                    {growthPoints.map((pt, idx) => (
                      <circle
                        key={idx}
                        cx={pt.x}
                        cy={pt.y}
                        r={hoveredGrowthIndex === idx ? 6 : 4}
                        fill={hoveredGrowthIndex === idx ? '#0a4d2b' : '#FFFFFF'}
                        stroke="#0a4d2b"
                        strokeWidth="2"
                        className="cursor-pointer transition-colors"
                        onMouseEnter={() => setHoveredGrowthIndex(idx)}
                        onMouseLeave={() => setHoveredGrowthIndex(null)}
                      />
                    ))}
                  </svg>

                  {/* Tooltip */}
                  {hoveredGrowthIndex !== null && growthPoints[hoveredGrowthIndex] && (
                    <div
                      className="absolute bg-neutral-900 !text-white rounded p-2.5 text-xs pointer-events-none shadow-xl border border-neutral-800 animate-in fade-in duration-200"
                      style={{
                        left: `${(growthPoints[hoveredGrowthIndex].x / chartWidth) * 100}%`,
                        top: `${(growthPoints[hoveredGrowthIndex].y / chartHeight) * 100 - 40}%`,
                        transform: 'translateX(-50%)',
                      }}
                    >
                      <span className="font-medium block">{growthPoints[hoveredGrowthIndex].label} 2026</span>
                      <span className="block mt-0.5">Admins Added: {growthPoints[hoveredGrowthIndex].value}</span>
                    </div>
                  )}
                </div>

                {/* Bottom Labels */}
                <div className="flex justify-between text-xs text-neutral-500 pt-3 border-t border-neutral-900/[0.08] mt-3">
                  {growthData.map((d, i) => (
                    <span key={i}>{d.month}</span>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Role Distribution */}
          <div className="admin-card flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-xs text-neutral-900 font-medium">Role distribution</h3>
                <div className="h-1.5 w-1.5 rounded-full bg-[#3f6f8f]" />
              </div>
              <p className="text-xs text-neutral-500 mb-4">Distribution by access class</p>
            </div>

            {/* Donut SVG */}
            {roleDistribution.length === 0 ? (
              <div className="h-[150px] flex flex-col items-center justify-center border border-dashed border-neutral-900/[0.08] rounded-2xl bg-neutral-50/50 p-4 my-2">
                <p className="text-xs font-medium text-neutral-900 modal-title !text-sm">No historical data available</p>
                <p className="text-xs text-neutral-500 mt-1">Role distribution metrics will automatically sync here</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-center relative py-1">
                  <svg width="110" height="110" viewBox="0 0 100 100" className="transform -rotate-90">
                    {donutSegments.map((seg, i) => (
                      <circle
                        key={i}
                        cx="50"
                        cy="50"
                        r={donutRadius}
                        fill="transparent"
                        stroke={seg.color}
                        strokeWidth="9"
                        strokeDasharray={seg.strokeDasharray}
                        strokeDashoffset={seg.strokeDashoffset}
                        className="cursor-pointer transition-colors hover:stroke-[11px]"
                        onMouseEnter={() => setHoveredDonutSegment(seg)}
                        onMouseLeave={() => setHoveredDonutSegment(null)}
                      />
                    ))}
                  </svg>

                  {/* Center count */}
                  <div className="absolute text-center">
                    <span className="text-xs text-neutral-500 block">
                      {hoveredDonutSegment ? hoveredDonutSegment.label : 'TOTAL'}
                    </span>
                    <span className="text-base font-medium text-neutral-900 block leading-none mt-0.5">
                      {hoveredDonutSegment ? `${hoveredDonutSegment.percentage}%` : stats.total}
                    </span>
                  </div>
                </div>

                {/* Donut Legend */}
                <div className="space-y-1.5 pt-3 border-t border-neutral-900/[0.08] mt-3">
                  {donutSegments.map((seg, i) => (
                    <div key={i} className="flex items-center justify-between text-xs text-neutral-600">
                      <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: seg.color }} />
                        <span className="truncate">{seg.label}</span>
                      </div>
                      <span className="font-medium text-neutral-900">{seg.value} ({seg.percentage}%)</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Security Health */}
          <div className="admin-card flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-xs text-neutral-900 font-medium">Security health</h3>
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              </div>
              <p className="text-xs text-neutral-500 mb-3">Real-time authentication scoring</p>
            </div>

            {/* Gauge */}
            <div className="flex items-center justify-center relative py-2">
              <svg className="w-20 h-20 transform -rotate-90">
                <circle cx="40" cy="40" r="33" stroke="#E5E7EB" strokeWidth="5" fill="transparent" />
                <circle cx="40" cy="40" r="33" stroke="#22C55E" strokeWidth="5" fill="transparent"
                  strokeDasharray={207.2}
                  strokeDashoffset={207.2 - (207.2 * securityScore) / 100}
                />
              </svg>
              <div className="absolute text-center">
                <span className="text-sm font-medium text-neutral-900 block leading-none">{securityScore}%</span>
                <span className="text-xs text-emerald-600 font-medium block mt-0.5">Good</span>
              </div>
            </div>

            {/* Metrics List */}
            <div className="space-y-1.5 text-xs text-neutral-600 pt-2.5 border-t border-neutral-900/[0.08] mt-2">
              <div className="flex justify-between">
                <span className="flex items-center gap-1"><Lock size={10} className="text-neutral-500" /> MFA enabled</span>
                <span className="font-medium text-neutral-900">{stats.mfaEnabled} / {stats.total}</span>
              </div>
              <div className="flex justify-between">
                <span className="flex items-center gap-1"><AlertTriangle size={10} className="text-neutral-500" /> Locked accounts</span>
                <span className="font-medium text-neutral-900">{stats.locked}</span>
              </div>
              <div className="flex justify-between">
                <span className="flex items-center gap-1"><ShieldCheck size={10} className="text-neutral-500" /> Failed logins</span>
                <span className="font-medium text-neutral-900">2</span>
              </div>
              <div className="flex justify-between">
                <span className="flex items-center gap-1"><Clock size={10} className="text-neutral-500" /> Password expiring</span>
                <span className="font-medium text-neutral-900">1</span>
              </div>
            </div>

            <button
              onClick={() => toast.success('Security reports are up to date.')}
              className="admin-btn-secondary w-full text-xs h-8 justify-center gap-1.5 mt-3"
            >
              <FileText size={12} />
              <span>View full security report</span>
              <ChevronRight size={10} />
            </button>
          </div>
        </motion.div>

        {/* SECONDARY INSIGHTS ROW */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.2 }}
          className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4"
        >
          {/* Recent Activity */}
          <div className="admin-card flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs text-neutral-900 font-medium">Recent activity</h3>
                <span className="text-xs text-neutral-500 hover:underline cursor-pointer">View all</span>
              </div>
              <div className="space-y-3.5 max-h-[160px] overflow-y-auto pr-1">
                {[
                  { title: "Rydon Superadmin", desc: "Super Admin logged in", time: "Just now", type: "login" },
                  { title: "Finance Admin", desc: "Updated pricing permissions", time: "12 mins ago", type: "role" },
                  { title: "Support Admin", desc: "Created new admin account", time: "28 mins ago", type: "create" },
                  { title: "Operations Admin", desc: "Reset password for admin@test.com", time: "45 mins ago", type: "reset" },
                  { title: "Security Admin", desc: "Enabled MFA for 3 admins", time: "1 hour ago", type: "mfa" }
                ].map((act, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 text-xs border-l border-neutral-900/[0.08] pl-3 relative ml-1.5">
                    <div className="absolute -left-[3.5px] top-1 w-1.5 h-1.5 rounded-full bg-[#0a4d2b] text-white" />
                    <div className="flex-1">
                      <p className="font-medium text-neutral-900">{act.title}</p>
                      <p className="text-xs text-neutral-400 mt-0.5">{act.desc} · {act.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Insights */}
          <div className="admin-card flex flex-col justify-between">
            <div>
              <h3 className="text-xs text-neutral-900 mb-3 font-medium">Quick insights</h3>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "New admins", value: "2", desc: "This week" },
                  { label: "Total admins", value: stats.total, desc: "Nodes" },
                  { label: "Active sessions", value: stats.active, desc: "Now" },
                  { label: "Login success", value: "98.6%", desc: "Rate" },
                  { label: "Password resets", value: "4", desc: "Completed" },
                  { label: "Permission changes", value: "12", desc: "Logs" }
                ].map((qi, i) => (
                  <div key={i} className="bg-neutral-50 border border-neutral-100 rounded-lg p-2 text-center">
                    <span className="text-xs text-neutral-500 block truncate">{qi.label}</span>
                    <span className="text-xs font-medium text-neutral-900 block mt-0.5">{qi.value}</span>
                    <span className="text-xs text-neutral-400 block mt-0.5 truncate">{qi.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Top Departments */}
          <div className="admin-card flex flex-col justify-between">
            <div>
              <h3 className="text-xs text-neutral-900 mb-3 font-medium">Top departments</h3>
              <div className="space-y-3">
                {[
                  { label: "Operations", count: 5, color: "bg-[#0a4d2b]", percent: 80 },
                  { label: "Finance", count: 3, color: "bg-neutral-900", percent: 55 },
                  { label: "Support", count: 2, color: "bg-emerald-500", percent: 35 },
                  { label: "Engineering", count: 2, color: "bg-neutral-900", percent: 35 },
                  { label: "HR", count: 1, color: "bg-neutral-900", percent: 15 },
                  { label: "Marketing", count: 1, color: "bg-neutral-400", percent: 15 }
                ].map((dept, i) => (
                  <div key={i} className="text-xs">
                    <div className="flex justify-between mb-1 text-neutral-600">
                      <span>{dept.label}</span>
                      <span className="font-medium text-neutral-900">{dept.count}</span>
                    </div>
                    <div className="w-full bg-neutral-100 rounded-full h-1.5">
                      <div className={`h-1.5 rounded-full ${dept.color}`} style={{ width: `${dept.percent}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Access by Module */}
          <div className="admin-card flex flex-col justify-between">
            <div>
              <h3 className="text-xs text-neutral-900 mb-3 font-medium">Access by module</h3>
              <div className="space-y-3">
                {[
                  { label: "Dashboard", percent: 100, color: "bg-neutral-900" },
                  { label: "Users", percent: 92, color: "bg-neutral-900" },
                  { label: "Bookings", percent: 85, color: "bg-emerald-500" },
                  { label: "Finance", percent: 70, color: "bg-neutral-900" },
                  { label: "Drivers", percent: 63, color: "bg-neutral-900" }
                ].map((mod, i) => (
                  <div key={i} className="text-xs">
                    <div className="flex justify-between mb-1 text-neutral-600">
                      <span>{mod.label}</span>
                      <span className="font-medium text-neutral-900">{mod.percent}%</span>
                    </div>
                    <div className="w-full bg-neutral-100 rounded-full h-1.5">
                      <div className={`h-1.5 rounded-full ${mod.color}`} style={{ width: `${mod.percent}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* SEARCH & FILTER TOOLBAR */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.28 }}
          className="admin-card !p-4 bg-white space-y-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name, email, employee ID or phone"
                className="admin-input pl-10 h-10"
              />
            </div>
            
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <div>
                <label className="block text-xs font-medium text-neutral-500 mb-0.5">Role</label>
                <select
                  value={filterRole}
                  onChange={(e) => setFilterRole(e.target.value)}
                  className="admin-input h-9 !py-0 !px-2 !w-32"
                >
                  <option value="All">All Roles</option>
                  <option value="Super Admin">Super Admin</option>
                  <option value="Operations Subadmin">Operations Subadmin</option>
                  <option value="Billing Subadmin">Billing Subadmin</option>
                  <option value="Support Staff">Support Staff</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-500 mb-0.5">Department</label>
                <select
                  value={filterDepartment}
                  onChange={(e) => setFilterDepartment(e.target.value)}
                  className="admin-input h-9 !py-0 !px-2 !w-32"
                >
                  <option value="All">All Depts</option>
                  <option value="Operations">Operations</option>
                  <option value="Finance">Finance</option>
                  <option value="Support">Support</option>
                  <option value="Engineering">Engineering</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-500 mb-0.5">Status</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="admin-input h-9 !py-0 !px-2 !w-32"
                >
                  <option value="All">All Status</option>
                  <option value="Active">Active</option>
                  <option value="Suspended">Suspended</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-500 mb-0.5">MFA</label>
                <select
                  value={filterMfa}
                  onChange={(e) => setFilterMfa(e.target.value)}
                  className="admin-input h-9 !py-0 !px-2 !w-24"
                >
                  <option value="All">All</option>
                  <option value="Enabled">Enabled</option>
                  <option value="Disabled">Disabled</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-500 mb-0.5">Verification</label>
                <select
                  value={filterVerification}
                  onChange={(e) => setFilterVerification(e.target.value)}
                  className="admin-input h-9 !py-0 !px-2 !w-28"
                >
                  <option value="All">All</option>
                  <option value="Verified">Verified</option>
                  <option value="Unverified">Unverified</option>
                </select>
              </div>

              <div className="pt-3">
                <button
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="admin-btn-secondary h-9 gap-1.5 px-3 text-xs"
                >
                  <Info size={13} />
                  <span>Filters</span>
                </button>
              </div>

              <div className="pt-3">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="admin-input h-9 !py-0 !px-2 !w-32"
                >
                  <option value="Newest">Newest Added</option>
                  <option value="Oldest">Oldest Added</option>
                  <option value="Alphabetical">Alphabetical</option>
                </select>
              </div>
            </div>
          </div>
        </motion.div>

        {/* REGISTRY TABLE */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.35 }}
          className="admin-table-container bg-white shadow-sm overflow-hidden"
        >
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3">
              <Loader2 size={32} className="animate-spin text-neutral-900" />
              <span className="text-xs font-medium text-neutral-500">Synchronizing Node Registry...</span>
            </div>
          ) : filteredAndSortedAdmins.length === 0 ? (
            <div className="py-20 flex flex-col items-center text-center px-6">
              <div className="w-16 h-16 bg-neutral-50 rounded-full flex items-center justify-center text-neutral-300 mb-4 border border-neutral-900/[0.08]">
                <FileSearch size={24} />
              </div>
              <h3 className="text-sm text-neutral-900 font-medium">No nodes located</h3>
              <p className="text-xs text-neutral-500 mt-1 max-w-sm leading-relaxed">
                We couldn't locate any administrators matching your search criteria. Check for typos or expand filters.
              </p>
            </div>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th className="!w-10">
                    <input
                      type="checkbox"
                      onChange={handleSelectAllRows}
                      checked={filteredAndSortedAdmins.length > 0 && selectedRowIds.length === filteredAndSortedAdmins.length}
                      className="rounded border-neutral-900/[0.08] text-[#0a4d2b] focus:ring-[#0a4d2b]/30 h-4.5 w-4.5 cursor-pointer"
                    />
                  </th>
                  <th>Admin</th>
                  <th>Employee ID</th>
                  <th>Role</th>
                  <th>Department</th>
                  <th>Permissions</th>
                  <th>MFA status</th>
                  <th>Status</th>
                  <th>Last login</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
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
                      <tr className={`hover:bg-neutral-50/50 transition-colors ${isExpanded ? 'bg-[#FAFBFD]' : ''}`}>
                        {/* Checkbox */}
                        <td>
                          <input
                            type="checkbox"
                            checked={selectedRowIds.includes(id)}
                            onChange={(e) => handleSelectRow(id, e.target.checked)}
                            className="rounded border-neutral-900/[0.08] text-[#0a4d2b] focus:ring-[#0a4d2b]/30 h-4.5 w-4.5 cursor-pointer"
                          />
                        </td>

                        {/* Admin Avatar/Name/Email */}
                        <td>
                          <div className="flex items-center gap-3">
                            <div
                              onClick={toggleExpand}
                              className={`w-9 h-9 rounded-full flex items-center justify-center font-medium text-xs border cursor-pointer select-none ${isSuper ? 'bg-[#0a4d2b]/10 text-[#0a4d2b] border-[#0a4d2b]' : 'bg-neutral-50 border-neutral-200 text-neutral-900'}`}
                            >
                              {admin.name?.[0]?.toUpperCase() || <Shield size={14} />}
                            </div>
                            <div>
                              <span
                                onClick={toggleExpand}
                                className="text-xs font-medium text-neutral-900 hover:underline cursor-pointer block"
                              >
                                {admin.name}
                              </span>
                              <span className="text-xs text-neutral-500 block mt-0.5">{admin.email}</span>
                            </div>
                          </div>
                        </td>

                        {/* Employee ID */}
                        <td>
                          <span className="text-xs font-medium text-neutral-900">{admin.employeeId || 'EMP-00' + Math.floor(Math.random() * 9 + 1)}</span>
                        </td>

                        {/* Role */}
                        <td>
                          <div className="flex items-center gap-1">
                            {isSuper ? (
                              <Crown size={11} className="text-[#0a4d2b]" />
                            ) : (
                              <Shield size={11} className="text-neutral-400" />
                            )}
                            <span className={`text-xs font-medium   ${isSuper ? 'text-[#0a4d2b]' : 'text-neutral-600'}`}>
                              {isSuper ? 'Super Admin' : (admin.role || 'Personnel')}
                            </span>
                          </div>
                        </td>

                        {/* Department */}
                        <td>
                          <span className="text-xs text-neutral-900 font-medium">{admin.department || 'Operations'}</span>
                        </td>

                        {/* Permissions */}
                        <td>
                          <span className="text-xs text-neutral-500 font-medium">
                            {isSuper ? '18 Modules' : `${(admin.permissions || []).length} Modules`}
                          </span>
                        </td>

                        {/* MFA status */}
                        <td>
                          <div className="flex items-center gap-1.5">
                            <div className={`w-1.5 h-1.5 rounded-full ${admin.mfaEnabled ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                            <span className="text-xs font-medium text-neutral-700">
                              {admin.mfaEnabled ? 'Enabled' : 'Disabled'}
                            </span>
                          </div>
                        </td>

                        {/* Status */}
                        <td>
                          <span className={`admin-badge ${isActive ? 'admin-badge-success' : 'admin-badge-warning'}`}>
                            {isActive ? 'Verified' : 'Suspended'}
                          </span>
                        </td>

                        {/* Last Login */}
                        <td>
                          <span className="text-xs text-neutral-500 font-medium">
                            {admin.lastLogin ? new Date(admin.lastLogin).toLocaleDateString() : 'Just now'}
                          </span>
                        </td>

                        {/* Actions */}
                        <td>
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={toggleExpand}
                              className="p-1.5 text-neutral-400 hover:text-neutral-900 rounded-md hover:bg-neutral-100/60 view-btn-trigger"
                              title="View"
                            >
                              <Eye size={14} />
                            </button>
                            <button
                              onClick={() => handleEditClick(admin)}
                              className="p-1.5 text-neutral-400 hover:text-neutral-900 rounded-md hover:bg-neutral-100/60"
                              title="Edit"
                            >
                              <Edit2 size={14} />
                            </button>
                            {!isSuper && (
                              <button
                                onClick={() => {
                                  window.dispatchEvent(new Event('admin:closeDropdowns'));
                                  setDeletingAdmin(admin);
                                  setDeleteConfirmText('');
                                  setIsDeleteOpen(true);
                                }}
                                className="p-1.5 text-neutral-400 hover:text-rose-600 rounded-md hover:bg-rose-50"
                                title="Delete"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-[#FAFBFD]">
                          <td colSpan={10} className="px-6 py-4">
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.2 }}
                              className="bg-white border-l-4 border-l-[#0a4d2b] border border-neutral-900/[0.08] rounded-r-xl p-6 shadow-sm space-y-6 font-sans text-xs text-neutral-900 overflow-hidden"
                            >
                              <div className="flex items-center justify-between border-b border-neutral-900/[0.06] pb-3">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-full bg-neutral-100 border border-neutral-200 flex items-center justify-center font-medium text-sm text-neutral-900">
                                    {selectedAdmin.name?.[0]?.toUpperCase()}
                                  </div>
                                  <div>
                                    <h4 className="font-medium text-sm">{selectedAdmin.name}</h4>
                                    <p className="text-neutral-500 text-xs">{selectedAdmin.email}</p>
                                  </div>
                                </div>
                                <button
                                  onClick={() => {
                                    setIsDrawerOpen(false);
                                    setSelectedAdmin(null);
                                  }}
                                  className="text-neutral-400 hover:text-neutral-600 p-1"
                                >
                                  <X size={16} />
                                </button>
                              </div>

                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div>
                                  <span className="text-neutral-500 block font-medium">Employee ID</span>
                                  <span className="font-medium block mt-0.5">{selectedAdmin.employeeId || 'Not available'}</span>
                                </div>
                                <div>
                                  <span className="text-neutral-500 block font-medium">Phone number</span>
                                  <span className="font-medium block mt-0.5">{selectedAdmin.phone || 'Not available'}</span>
                                </div>
                                <div>
                                  <span className="text-neutral-500 block font-medium">Department</span>
                                  <span className="font-medium block mt-0.5">{selectedAdmin.department || 'Operations'}</span>
                                </div>
                                <div>
                                  <span className="text-neutral-500 block font-medium">Designation</span>
                                  <span className="font-medium block mt-0.5">{selectedAdmin.designation || 'Not available'}</span>
                                </div>
                                <div>
                                  <span className="text-neutral-500 block font-medium">MFA security</span>
                                  <span className="font-medium block mt-0.5">{selectedAdmin.mfaEnabled ? 'Enabled' : 'Disabled'}</span>
                                </div>
                                <div>
                                  <span className="text-neutral-500 block font-medium">Account status</span>
                                  <span className="font-medium block mt-0.5">{selectedAdmin.active !== false ? 'Active' : 'Suspended'}</span>
                                </div>
                                <div>
                                  <span className="text-neutral-500 block font-medium">Registered date</span>
                                  <span className="font-medium block mt-0.5">
                                    {selectedAdmin.createdAt || selectedAdmin.created_at ? new Date(selectedAdmin.createdAt || selectedAdmin.created_at).toLocaleDateString() : 'Not available'}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-neutral-500 block font-medium">Last login</span>
                                  <span className="font-medium block mt-0.5">
                                    {selectedAdmin.lastLogin ? new Date(selectedAdmin.lastLogin).toLocaleDateString() : 'Just now'}
                                  </span>
                                </div>
                              </div>

                              <div className="pt-4 border-t border-neutral-900/[0.06]">
                                <span className="text-neutral-500 block font-medium mb-1.5">Module permissions</span>
                                <div className="flex flex-wrap gap-1 mt-0.5">
                                  {selectedAdmin.admin_type === 'superadmin' ? (
                                    <span className="admin-badge admin-badge-success text-xs py-0.5 px-2">Unrestricted sovereignty</span>
                                  ) : selectedAdmin.permissions && selectedAdmin.permissions.length > 0 ? (
                                    selectedAdmin.permissions.map((p) => (
                                      <span key={p} className="admin-badge admin-badge-info py-0.5 px-2 text-xs rounded">
                                        {p}
                                      </span>
                                    ))
                                  ) : (
                                    <span className="text-neutral-400">No explicit modules allowed yet</span>
                                  )}
                                </div>
                              </div>

                              <div className="pt-4 border-t border-neutral-900/[0.06] flex items-center justify-between gap-4">
                                <div className="flex-1">
                                  <span className="text-neutral-500 block font-medium">Administrative notes</span>
                                  <p className="text-xs mt-1 leading-relaxed bg-neutral-50 p-2 rounded border border-neutral-900/[0.08]">
                                    {selectedAdmin.notes || 'No security log overrides recorded.'}
                                  </p>
                                </div>
                                <button
                                  onClick={() => {
                                    setIsDrawerOpen(false);
                                    handleEditClick(selectedAdmin);
                                  }}
                                  className="admin-btn-primary h-9 px-4 gap-1.5 !bg-[#0a4d2b] !text-white text-xs font-medium shrink-0 self-end"
                                >
                                  <span>Modify privileges</span>
                                </button>
                              </div>
                            </motion.div>
                          </td>
                        </tr>
                      )}

                      {isEditExpanded && (
                        <tr className="bg-[#FAFBFD]">
                          <td colSpan={10} className="px-6 py-4">
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.2 }}
                              className="bg-white border-l-4 border-l-[#0a4d2b] border border-neutral-900/[0.08] rounded-r-xl shadow-sm space-y-4 font-sans text-xs text-neutral-900 overflow-hidden"
                            >
                              <div className="p-5 border-b border-neutral-900/[0.08] flex items-center justify-between bg-neutral-50">
                                <h3 className="text-xs font-medium text-neutral-900">Modify administrative privileges</h3>
                                <button type="button" onClick={() => setIsEditOpen(false)} className="text-neutral-400 hover:text-neutral-600">
                                  <X size={18} />
                                </button>
                              </div>

                              <form onSubmit={handleEditSubmit} className="p-5 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <label className="block text-xs font-medium text-neutral-500 mb-1">Full name</label>
                                    <input
                                      required
                                      value={form.name}
                                      onChange={(e) => setField('name', e.target.value)}
                                      placeholder="e.g. Marcus aurelius"
                                      className="admin-input"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-medium text-neutral-500 mb-1">Email identity</label>
                                    <input
                                      type="email"
                                      required
                                      value={form.email}
                                      onChange={(e) => setField('email', e.target.value)}
                                      placeholder="e.g. admin@rydon.com"
                                      className="admin-input"
                                    />
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <label className="block text-xs font-medium text-neutral-500 mb-1">Phone number</label>
                                    <input
                                      value={form.phone}
                                      onChange={(e) => setField('phone', e.target.value)}
                                      placeholder="e.g. +1 555-0199"
                                      className="admin-input"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-medium text-neutral-500 mb-1">Admin role</label>
                                    <select
                                      value={form.role}
                                      onChange={(e) => setField('role', e.target.value)}
                                      className="admin-input"
                                    >
                                      <option value="Operations Subadmin">Operations Subadmin</option>
                                      <option value="Billing Subadmin">Billing Subadmin</option>
                                      <option value="Support Staff">Support Staff</option>
                                    </select>
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <label className="block text-xs font-medium text-neutral-500 mb-1">Admin type</label>
                                    <select
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
                                      <option value="subadmin">Sub-Admin (Scoped Rights)</option>
                                      <option value="superadmin">Super Admin (Unrestricted)</option>
                                    </select>
                                  </div>
                                  <div>
                                    <label className="block text-xs font-medium text-neutral-500 mb-1">Status</label>
                                    <select
                                      value={form.active ? 'active' : 'inactive'}
                                      onChange={(e) => setField('active', e.target.value === 'active')}
                                      className="admin-input"
                                    >
                                      <option value="active">Active</option>
                                      <option value="inactive">Suspended</option>
                                    </select>
                                  </div>
                                </div>

                                {form.admin_type !== 'superadmin' && (
                                  <div>
                                    <label className="block text-xs font-medium text-neutral-500 mb-1">Cryptographic module access</label>
                                    <div className="border border-neutral-900/[0.08] rounded-lg p-3 max-h-36 overflow-y-auto grid grid-cols-2 gap-2 bg-neutral-50">
                                      {ADMIN_PERMISSION_GROUPS.flatMap(g => g.items).map((perm) => (
                                        <label key={perm.key} className="flex items-center gap-2 text-xs text-neutral-900 cursor-pointer">
                                          <input
                                            type="checkbox"
                                            checked={form.permissions.includes(perm.key)}
                                            onChange={() => togglePermission(perm.key)}
                                            className="rounded border-neutral-900/[0.08] text-[#0a4d2b] focus:ring-[#0a4d2b]/30 h-4 w-4"
                                          />
                                          <span>{perm.label}</span>
                                        </label>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <label className="block text-xs font-medium text-neutral-500 mb-1">New Password (Optional)</label>
                                    <input
                                      type="password"
                                      value={form.password}
                                      onChange={(e) => setField('password', e.target.value)}
                                      placeholder="Leave blank to retain current"
                                      className="admin-input"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-medium text-neutral-500 mb-1">Confirm new password</label>
                                    <input
                                      type="password"
                                      value={form.passwordConfirmation}
                                      onChange={(e) => setField('passwordConfirmation', e.target.value)}
                                      placeholder="Confirm new password"
                                      className="admin-input"
                                    />
                                  </div>
                                </div>

                                <div className="flex items-center justify-between bg-neutral-50 border border-neutral-200 rounded-lg p-3">
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="checkbox"
                                      id={`mfa-edit-${id}`}
                                      checked={form.mfaEnabled}
                                      onChange={(e) => setField('mfaEnabled', e.target.checked)}
                                      className="rounded border-neutral-900/[0.08] text-[#0a4d2b] focus:ring-[#0a4d2b]/30 h-4 w-4"
                                    />
                                    <label htmlFor={`mfa-edit-${id}`} className="text-xs font-medium text-neutral-900 cursor-pointer">Require Multi-Factor Authentication</label>
                                  </div>
                                </div>

                                <div>
                                  <label className="block text-xs font-medium text-neutral-500 mb-1">Administrative notes</label>
                                  <textarea
                                    value={form.notes}
                                    onChange={(e) => setField('notes', e.target.value)}
                                    placeholder="Enter special access notes"
                                    className="admin-input min-h-[60px]"
                                  />
                                </div>

                                <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-900/[0.08]">
                                  <button type="button" onClick={() => setIsEditOpen(false)} className="admin-btn-secondary h-10">
                                    Cancel
                                  </button>
                                  <button type="submit" disabled={saving} className="admin-btn-primary h-10 min-w-[120px] !bg-[#0a4d2b] !text-white">
                                    {saving ? <Loader2 size={16} className="animate-spin" /> : 'Save Changes'}
                                  </button>
                                </div>
                              </form>
                            </motion.div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          )}
        </motion.div>

        {/* PERMISSION BADGES LEGEND */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.42 }}
          className="admin-card"
        >
          <h3 className="text-xs text-neutral-900 mb-3 font-medium">System permission directory</h3>
          <div className="flex flex-wrap gap-1.5">
            {['Dashboard', 'Users', 'Drivers', 'Bookings', 'Finance', 'Taxi', 'Rental', 'Bus', 'Delivery', 'Support', 'Pricing', 'Promotion', 'Reports', 'Settings', 'Analytics'].map((mod, i) => (
              <span key={i} className="admin-badge admin-badge-info text-xs py-0.5 px-2 bg-neutral-50 border border-neutral-200 text-neutral-600 rounded">
                {mod}
              </span>
            ))}
          </div>
        </motion.div>

      </div>

      {/* CREATE MODAL */}
      <AnimatePresence>
        {isCreateOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCreateOpen(false)}
              className="admin-modal-overlay"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="fixed inset-0 m-auto w-full max-w-lg h-fit max-h-[85vh] bg-white rounded-xl shadow-2xl z-50 flex flex-col overflow-hidden"
            >
              <div className="p-5 border-b border-neutral-900/[0.08] flex items-center justify-between">
                <h3 className="text-xs font-medium text-neutral-900">Initialize admin token</h3>
                <button onClick={() => setIsCreateOpen(false)} className="text-neutral-400 hover:text-neutral-600">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCreateSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-neutral-500 mb-1">Full name</label>
                    <input
                      required
                      value={form.name}
                      onChange={(e) => setField('name', e.target.value)}
                      placeholder="e.g. Marcus aurelius"
                      className="admin-input"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-500 mb-1">Email identity</label>
                    <input
                      type="email"
                      required
                      value={form.email}
                      onChange={(e) => setField('email', e.target.value)}
                      placeholder="e.g. admin@rydon.com"
                      className="admin-input"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-neutral-500 mb-1">Phone number</label>
                    <input
                      value={form.phone}
                      onChange={(e) => setField('phone', e.target.value)}
                      placeholder="e.g. +1 555-0199"
                      className="admin-input"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-500 mb-1">Admin role</label>
                    <select
                      value={form.role}
                      onChange={(e) => setField('role', e.target.value)}
                      className="admin-input"
                    >
                      <option value="Operations Subadmin">Operations Subadmin</option>
                      <option value="Billing Subadmin">Billing Subadmin</option>
                      <option value="Support Staff">Support Staff</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-neutral-500 mb-1">Admin type</label>
                    <select
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
                      <option value="subadmin">Sub-Admin (Scoped Rights)</option>
                      <option value="superadmin">Super Admin (Unrestricted)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-500 mb-1">Status</label>
                    <select
                      value={form.active ? 'active' : 'inactive'}
                      onChange={(e) => setField('active', e.target.value === 'active')}
                      className="admin-input"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Suspended</option>
                    </select>
                  </div>
                </div>

                {form.admin_type !== 'superadmin' && (
                  <div>
                    <label className="block text-xs font-medium text-neutral-500 mb-1">Cryptographic module access</label>
                    <div className="border border-neutral-900/[0.08] rounded-lg p-3 max-h-36 overflow-y-auto grid grid-cols-2 gap-2 bg-neutral-50">
                      {ADMIN_PERMISSION_GROUPS.flatMap(g => g.items).map((perm) => (
                        <label key={perm.key} className="flex items-center gap-2 text-xs text-neutral-900 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={form.permissions.includes(perm.key)}
                            onChange={() => togglePermission(perm.key)}
                            className="rounded border-neutral-900/[0.08] text-[#0a4d2b] focus:ring-[#0a4d2b]/30 h-4 w-4"
                          />
                          <span>{perm.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-neutral-500 mb-1">Password</label>
                    <input
                      type="password"
                      required
                      value={form.password}
                      onChange={(e) => setField('password', e.target.value)}
                      placeholder="Minimum 8 characters"
                      className="admin-input"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-500 mb-1">Confirm password</label>
                    <input
                      type="password"
                      required
                      value={form.passwordConfirmation}
                      onChange={(e) => setField('passwordConfirmation', e.target.value)}
                      placeholder="Re-type password"
                      className="admin-input"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between bg-neutral-50 border border-neutral-200 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="mfa"
                      checked={form.mfaEnabled}
                      onChange={(e) => setField('mfaEnabled', e.target.checked)}
                      className="rounded border-neutral-900/[0.08] text-[#0a4d2b] focus:ring-[#0a4d2b]/30 h-4 w-4"
                    />
                    <label htmlFor="mfa" className="text-xs font-medium text-neutral-900 cursor-pointer">Require Multi-Factor Authentication</label>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-500 mb-1">Administrative notes</label>
                  <textarea
                    value={form.notes}
                    onChange={(e) => setField('notes', e.target.value)}
                    placeholder="Enter special access notes"
                    className="admin-input min-h-[60px]"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-900/[0.08]">
                  <button type="button" onClick={() => setIsCreateOpen(false)} className="admin-btn-secondary h-10">
                    Cancel
                  </button>
                  <button type="submit" disabled={saving} className="admin-btn-primary h-10 min-w-[120px] !bg-[#0a4d2b] !text-white">
                    {saving ? <Loader2 size={16} className="animate-spin" /> : 'Save Node'}
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* DELETE CONFIRMATION MODAL */}
      <AnimatePresence>
        {isDeleteOpen && deletingAdmin && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDeleteOpen(false)}
              className="admin-modal-overlay"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="fixed inset-0 m-auto w-full max-w-md h-fit bg-white rounded-xl shadow-2xl z-50 overflow-hidden"
            >
              <div className="p-5 border-b border-neutral-900/[0.08] flex items-center justify-between bg-rose-50">
                <div className="flex items-center gap-2 text-rose-600">
                  <AlertTriangle size={18} />
                  <h3 className="text-xs font-medium">Revoke access credentials</h3>
                </div>
                <button onClick={() => setIsDeleteOpen(false)} className="text-neutral-400 hover:text-neutral-600">
                  <X size={18} />
                </button>
              </div>

              <div className="p-5 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center font-medium text-sm text-neutral-900">
                    {deletingAdmin.name?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <h4 className="text-xs font-medium text-neutral-900">{deletingAdmin.name}</h4>
                    <p className="text-xs text-neutral-500 mt-0.5">{deletingAdmin.role || 'Personnel'}</p>
                  </div>
                </div>

                <div className="bg-rose-50/50 border border-rose-100 rounded-lg p-3 text-xs text-rose-800 leading-relaxed">
                  ⚠️ <strong>Warning:</strong> Deleting this node will permanently invalidate all assigned security keys and completely restrict dashboard access for this identity. This operation is irrevocable.
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-500 mb-1">
                    Type <span className="text-neutral-900 font-medium">Delete</span> to confirm
                  </label>
                  <input
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder="Type DELETE"
                    className="admin-input h-10 border-rose-200 focus:border-rose-500 focus:ring-rose-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-900/[0.08]">
                  <button type="button" onClick={() => setIsDeleteOpen(false)} className="admin-btn-secondary h-10">
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteConfirm}
                    disabled={deleteConfirmText !== 'DELETE' || saving}
                    className="admin-btn-primary h-10 bg-rose-600 hover:bg-rose-700 !text-white min-w-[120px] disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {saving ? <Loader2 size={16} className="animate-spin" /> : 'Revoke Node'}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
};

export default Admins;
