/* Ported from Frontend/src/modules/Food/pages/admin/settings/LoginSetup.jsx (tools/port.js first pass). */
import { useState, useMemo } from 'react';
import { Monitor, Info, Check, Copy, Edit, ExternalLink, Settings, ArrowUpDown, Columns } from 'lucide-react-native';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../../components/shadcn';
import { A, Button, Div, H1, H3, Input, P, ScrollDiv, Span, Table, Tbody, Td, Th, Thead, Tr, Icon as UiIcon } from '../../../../components/web';
import { LinearGradient } from 'expo-linear-gradient';
import { alert, navigator } from '../../../../lib/webShim';
const debugLog = (...args) => {};
const debugWarn = (...args) => {};
const debugError = (...args) => {};
const panelLoginUrls = [
  {
    id: 1,
    panelName: 'Admin Panel',
    loginUrl: 'https://admin.stackfood.com/login',
    status: 'active',
  },
  {
    id: 2,
    panelName: 'Restaurant Panel',
    loginUrl: 'https://restaurant.stackfood.com/login',
    status: 'active',
  },
  {
    id: 3,
    panelName: 'Deliveryman Panel',
    loginUrl: 'https://delivery.stackfood.com/login',
    status: 'active',
  },
  {
    id: 4,
    panelName: 'Customer Panel',
    loginUrl: 'https://app.stackfood.com/login',
    status: 'active',
  },
];
export default function LoginSetup() {
  const [activeTab, setActiveTab] = useState('customer-login');
  const [loginOptions, setLoginOptions] = useState({
    manualLogin: true,
    otpLogin: true,
    socialMediaLogin: true,
  });
  const [socialMedia, setSocialMedia] = useState({
    google: true,
    facebook: false,
    apple: false,
  });
  const [verification, setVerification] = useState({
    emailVerification: true,
    phoneVerification: true,
  });
  const [panelUrls, setPanelUrls] = useState(panelLoginUrls);
  const [editingId, setEditingId] = useState(null);
  const [editUrl, setEditUrl] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState({
    si: true,
    panelName: true,
    loginUrl: true,
    status: true,
    actions: true,
  });
  const handleLoginOptionChange = (option) => {
    setLoginOptions((prev) => ({
      ...prev,
      [option]: !prev[option],
    }));
  };
  const handleSocialMediaChange = (platform) => {
    setSocialMedia((prev) => ({
      ...prev,
      [platform]: !prev[platform],
    }));
  };
  const handleVerificationChange = (type) => {
    setVerification((prev) => ({
      ...prev,
      [type]: !prev[type],
    }));
  };
  const handleSubmit = (e) => {
    e.preventDefault();
    if (activeTab === 'customer-login') {
      debugLog('Form submitted:', {
        loginOptions,
        socialMedia,
        verification,
      });
    } else {
      debugLog('Panel URLs submitted:', panelUrls);
    }
    alert('Settings saved successfully!');
  };
  const handleReset = () => {
    if (activeTab === 'customer-login') {
      setLoginOptions({
        manualLogin: true,
        otpLogin: true,
        socialMediaLogin: true,
      });
      setSocialMedia({
        google: true,
        facebook: false,
        apple: false,
      });
      setVerification({
        emailVerification: true,
        phoneVerification: true,
      });
    } else {
      setPanelUrls(panelLoginUrls);
      setEditingId(null);
      setEditUrl('');
    }
  };
  const handleCopyUrl = (url) => {
    navigator.clipboard.writeText(url);
    alert('URL copied to clipboard!');
  };
  const handleEditUrl = (id, currentUrl) => {
    setEditingId(id);
    setEditUrl(currentUrl);
  };
  const handleSaveUrl = (id) => {
    setPanelUrls((prev) =>
      prev.map((panel) =>
        panel.id === id
          ? {
              ...panel,
              loginUrl: editUrl,
            }
          : panel,
      ),
    );
    setEditingId(null);
    setEditUrl('');
  };
  const handleCancelEdit = () => {
    setEditingId(null);
    setEditUrl('');
  };
  const toggleColumn = (columnKey) => {
    setVisibleColumns((prev) => ({
      ...prev,
      [columnKey]: !prev[columnKey],
    }));
  };
  const resetColumns = () => {
    setVisibleColumns({
      si: true,
      panelName: true,
      loginUrl: true,
      status: true,
      actions: true,
    });
  };
  const columnWidths = {
    si: 70,
    panelName: 180,
    loginUrl: 320,
    status: 120,
    actions: 96,
  };
  const tableCols = Object.keys(columnWidths).filter((key) => visibleColumns[key]).map((key) => columnWidths[key]);
  const columnsConfig = {
    si: 'Serial Number',
    panelName: 'Panel Name',
    loginUrl: 'Login Page URL',
    status: 'Status',
    actions: 'Actions',
  };
  return (
    <ScrollDiv className="p-4 lg:p-6 bg-slate-50 min-h-screen">
      <Div className="max-w-4xl mx-auto">
        {/* Page Header */}
        <Div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
          <Div className="flex items-center gap-3">
            <LinearGradient colors={['#FB923C', '#EA580C']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: 40, height: 40, borderRadius: 8, alignItems: 'center', justifyContent: 'center' }}>
              <UiIcon as={Monitor} className="w-5 h-5 text-white" />
            </LinearGradient>
            <H1 className="text-2xl font-bold text-slate-900">Login Setup</H1>
          </Div>
        </Div>

        {/* Tabs */}
        <Div className="bg-white rounded-lg shadow-sm border border-slate-200 p-2 mb-6">
          <Div className="flex gap-2">
            <Button
              onClick={() => setActiveTab('customer-login')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'customer-login' ? 'bg-orange-500 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              Customer Login
            </Button>
            <Button
              onClick={() => setActiveTab('panel-login')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'panel-login' ? 'bg-orange-500 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              Panel login page Url
            </Button>
          </Div>
        </Div>

        {/* Customer Login Content */}
        {activeTab === 'customer-login' && (
          <Div className="space-y-6">
            {/* Setup Login Option */}
            <Div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
              <P className="text-sm text-slate-600 mb-4">The option you select customer will have the option to login</P>
              <Div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  {
                    key: 'manualLogin',
                    label: 'Manual Login',
                    icon: '??',
                  },
                  {
                    key: 'otpLogin',
                    label: 'OTP Login',
                    icon: '??',
                  },
                  {
                    key: 'socialMediaLogin',
                    label: 'Social Media Login',
                    icon: '??',
                  },
                ].map((option) => (
                  <Div
                    key={option.key}
                    onClick={() => handleLoginOptionChange(option.key)}
                    className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${loginOptions[option.key] ? 'border-orange-500 bg-orange-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                  >
                    <Div className="flex items-start justify-between mb-2">
                      <Div className="flex items-center gap-2">
                        <Span className="text-2xl">{option.icon}</Span>
                        <Span className="text-sm font-semibold text-slate-700">{option.label}</Span>
                      </Div>
                      <Div className="flex items-center gap-2">
                        <Button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleLoginOptionChange(option.key);
                          }}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 ${loginOptions[option.key] ? 'bg-orange-500 justify-end' : 'bg-slate-300 justify-start'}`}
                        >
                          <Span
                            className={`inline-block h-4 w-4 mx-1 rounded-full bg-white`}
                          />
                        </Button>
                        <UiIcon as={Info} className="w-4 h-4 text-slate-400 cursor-help" />
                      </Div>
                    </Div>
                  </Div>
                ))}
              </Div>
            </Div>

            {/* Social Media Login Setup */}
            <Div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
              <P className="text-sm text-slate-600 mb-4">
                <Span className="text-orange-500">Connect 3rd party login system from here</Span>
              </P>

              <Div className="mb-4">
                <H3 className="text-sm font-semibold text-slate-700 mb-3">Choose social media</H3>
                <Div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    {
                      key: 'google',
                      label: 'Google',
                      icon: '??',
                      color: 'blue',
                    },
                    {
                      key: 'facebook',
                      label: 'Facebook',
                      icon: '??',
                      color: 'blue',
                    },
                    {
                      key: 'apple',
                      label: 'Apple',
                      icon: '?',
                      color: 'black',
                    },
                  ].map((platform) => (
                    <Div
                      key={platform.key}
                      onClick={() => handleSocialMediaChange(platform.key)}
                      className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${socialMedia[platform.key] ? 'border-orange-500 bg-orange-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                    >
                      <Div className="flex items-start justify-between">
                        <Div className="flex items-center gap-2">
                          <Span className="text-2xl">{platform.icon}</Span>
                          <Span className="text-sm font-semibold text-slate-700">{platform.label}</Span>
                        </Div>
                        <Div className="flex items-center gap-2">
                          <Button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSocialMediaChange(platform.key);
                            }}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 ${socialMedia[platform.key] ? 'bg-orange-500 justify-end' : 'bg-slate-300 justify-start'}`}
                          >
                            <Span
                              className={`inline-block h-4 w-4 mx-1 rounded-full bg-white`}
                            />
                          </Button>
                          <UiIcon as={Info} className="w-4 h-4 text-slate-400 cursor-help" />
                        </Div>
                      </Div>
                    </Div>
                  ))}
                </Div>
              </Div>
            </Div>

            {/* Verification */}
            <Div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
              <P className="text-sm text-slate-600 mb-4">The option you select from below will need to verify by customer from customer app/website.</P>
              <Div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  {
                    key: 'emailVerification',
                    label: 'Email Verification',
                    icon: '??',
                  },
                  {
                    key: 'phoneVerification',
                    label: 'Phone Number Verification',
                    icon: '??',
                  },
                ].map((verify) => (
                  <Div
                    key={verify.key}
                    onClick={() => handleVerificationChange(verify.key)}
                    className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${verification[verify.key] ? 'border-orange-500 bg-orange-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                  >
                    <Div className="flex items-start justify-between">
                      <Div className="flex items-center gap-2">
                        <Span className="text-2xl">{verify.icon}</Span>
                        <Span className="text-sm font-semibold text-slate-700">{verify.label}</Span>
                      </Div>
                      <Div className="flex items-center gap-2">
                        <Button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleVerificationChange(verify.key);
                          }}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 ${verification[verify.key] ? 'bg-orange-500 justify-end' : 'bg-slate-300 justify-start'}`}
                        >
                          <Span
                            className={`inline-block h-4 w-4 mx-1 rounded-full bg-white`}
                          />
                        </Button>
                        <UiIcon as={Info} className="w-4 h-4 text-slate-400 cursor-help" />
                      </Div>
                    </Div>
                  </Div>
                ))}
              </Div>
            </Div>
          </Div>
        )}

        {/* Panel Login Content */}
        {activeTab === 'panel-login' && (
          <Div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            <Div className="mb-4 flex items-center justify-between">
              <P className="text-sm text-slate-600">Manage login page URLs for different panels. You can edit and copy the URLs as needed.</P>
              <Button
                onClick={() => setIsSettingsOpen(true)}
                className="p-2.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 transition-all"
              >
                <UiIcon as={Settings} className="w-5 h-5" />
              </Button>
            </Div>

            {/* Table */}
            <Table cols={tableCols}>
                <Thead className="bg-slate-50 border-b border-slate-200">
                  <Tr>
                    {visibleColumns.si && (
                      <Th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                        <Div className="flex items-center gap-2">
                          <Span>SI</Span>
                          <UiIcon as={ArrowUpDown} className="w-3 h-3 text-slate-400 cursor-pointer hover:text-slate-600" />
                        </Div>
                      </Th>
                    )}
                    {visibleColumns.panelName && (
                      <Th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                        <Div className="flex items-center gap-2">
                          <Span>Panel Name</Span>
                          <UiIcon as={ArrowUpDown} className="w-3 h-3 text-slate-400 cursor-pointer hover:text-slate-600" />
                        </Div>
                      </Th>
                    )}
                    {visibleColumns.loginUrl && (
                      <Th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                        <Div className="flex items-center gap-2">
                          <Span>Login Page URL</Span>
                          <UiIcon as={ArrowUpDown} className="w-3 h-3 text-slate-400 cursor-pointer hover:text-slate-600" />
                        </Div>
                      </Th>
                    )}
                    {visibleColumns.status && (
                      <Th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                        <Div className="flex items-center gap-2">
                          <Span>Status</Span>
                          <UiIcon as={ArrowUpDown} className="w-3 h-3 text-slate-400 cursor-pointer hover:text-slate-600" />
                        </Div>
                      </Th>
                    )}
                    {visibleColumns.actions && <Th className="px-6 py-4 text-center text-[10px] font-bold text-slate-700 uppercase tracking-wider">Action</Th>}
                  </Tr>
                </Thead>
                <Tbody className="bg-white divide-y divide-slate-100">
                  {panelUrls.length === 0 ? (
                    <Tr>
                      <Td colSpan={Object.values(visibleColumns).filter((v) => v).length} className="px-6 py-8 text-center text-slate-500">
                        No panels found
                      </Td>
                    </Tr>
                  ) : (
                    panelUrls.map((panel, index) => (
                      <Tr key={panel.id} className="hover:bg-slate-50 transition-colors">
                        {visibleColumns.si && (
                          <Td className="px-6 py-4 whitespace-nowrap">
                            <Span className="text-sm font-medium text-slate-700">{index + 1}</Span>
                          </Td>
                        )}
                        {visibleColumns.panelName && (
                          <Td className="px-6 py-4 whitespace-nowrap">
                            <Span className="text-sm font-medium text-slate-900">{panel.panelName}</Span>
                          </Td>
                        )}
                        {visibleColumns.loginUrl && (
                          <Td className="px-6 py-4">
                            {editingId === panel.id ? (
                              <Div className="flex items-center gap-2">
                                <Input
                                  type="text"
                                  value={editUrl}
                                  onChange={(e) => setEditUrl(e.target.value)}
                                  className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                  placeholder="Enter login URL"
                                />
                                <Button
                                  onClick={() => handleSaveUrl(panel.id)}
                                  className="px-3 py-2 text-sm bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                                >
                                  Save
                                </Button>
                                <Button
                                  onClick={handleCancelEdit}
                                  className="px-3 py-2 text-sm bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors"
                                >
                                  Cancel
                                </Button>
                              </Div>
                            ) : (
                              <Div className="flex items-center gap-2">
                                <Span className="text-sm text-slate-600 break-all">{panel.loginUrl}</Span>
                                <A href={panel.loginUrl} className="text-orange-500 hover:text-orange-600">
                                  <UiIcon as={ExternalLink} className="w-4 h-4" />
                                </A>
                              </Div>
                            )}
                          </Td>
                        )}
                        {visibleColumns.status && (
                          <Td className="px-6 py-4 whitespace-nowrap">
                            <Span className="px-3 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full">{panel.status}</Span>
                          </Td>
                        )}
                        {visibleColumns.actions && (
                          <Td className="px-6 py-4 whitespace-nowrap text-center">
                            <Div className="flex items-center justify-center gap-2">
                              {editingId !== panel.id && (
                                <>
                                  <Button
                                    onClick={() => handleEditUrl(panel.id, panel.loginUrl)}
                                    className="p-1.5 rounded text-orange-500 hover:bg-orange-50 transition-colors"
                                  >
                                    <UiIcon as={Edit} className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    onClick={() => handleCopyUrl(panel.loginUrl)}
                                    className="p-1.5 rounded text-slate-600 hover:bg-slate-100 transition-colors"
                                  >
                                    <UiIcon as={Copy} className="w-4 h-4" />
                                  </Button>
                                </>
                              )}
                            </Div>
                          </Td>
                        )}
                      </Tr>
                    ))
                  )}
                </Tbody>
            </Table>
          </Div>
        )}

        {/* Action Buttons */}
        <Div className="flex justify-end gap-3 mt-6">
          <Button
            type="button"
            onClick={handleReset}
            className="px-6 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
          >
            Reset
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            className="px-6 py-2.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium"
          >
            Submit
          </Button>
        </Div>
      </Div>

      {/* Settings Dialog */}
      {activeTab === 'panel-login' && (
        <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
          <DialogContent className="max-w-md bg-white p-0 opacity-0 data-[state=open]:opacity-100 data-[state=closed]:opacity-0 transition-opacity duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 data-[state=open]:scale-100 data-[state=closed]:scale-100">
            <DialogHeader className="px-6 pt-6 pb-4">
              <DialogTitle className="flex items-center gap-2">
                <UiIcon as={Settings} className="w-5 h-5" />
                Table Settings
              </DialogTitle>
            </DialogHeader>
            <Div className="px-6 pb-6 space-y-4">
              <Div>
                <H3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                  <UiIcon as={Columns} className="w-4 h-4" />
                  Visible Columns
                </H3>
                <Div className="space-y-2">
                  {Object.entries(columnsConfig).map(([key, label]) => (
                    <Div key={key} className="flex items-center gap-3 p-2 rounded-lg">
                      <Input
                        type="checkbox"
                        checked={visibleColumns[key]}
                        onChange={() => toggleColumn(key)}
                        className="w-4 h-4 text-orange-500 border-slate-300 rounded focus:ring-orange-500"
                      />
                      <Span className="text-sm text-slate-700">{label}</Span>
                      {visibleColumns[key] && <UiIcon as={Check} className="w-4 h-4 text-orange-500 ml-auto" />}
                    </Div>
                  ))}
                </Div>
              </Div>
              <Div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <Button
                  onClick={resetColumns}
                  className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-all"
                >
                  Reset
                </Button>
                <Button
                  onClick={() => setIsSettingsOpen(false)}
                  className="px-4 py-2 text-sm font-medium rounded-lg bg-orange-500 text-white hover:bg-orange-600 transition-all shadow-md"
                >
                  Apply
                </Button>
              </Div>
            </Div>
          </DialogContent>
        </Dialog>
      )}
    </ScrollDiv>
  );
}
