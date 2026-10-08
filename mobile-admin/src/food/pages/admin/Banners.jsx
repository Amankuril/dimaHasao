/* Ported from Frontend/src/modules/Food/pages/admin/Banners.jsx. */
import { useState, useMemo, useEffect } from 'react';
import { Search, Download, ChevronDown, Plus, Edit, Trash2, Upload, Image as ImageIcon, Info, Loader2 } from 'lucide-react-native';
import api from '../../../api/food';
import { emptyBanners } from '../../utils/adminFallbackData';
import {
  Button,
  Div,
  Form,
  HScroll,
  H1,
  H2,
  Img,
  Input,
  Label,
  Option,
  P,
  ScrollDiv,
  Select,
  Span,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  Icon as UiIcon,
} from '../../../components/web';
import { alert, window } from '../../../lib/webShim';
const debugLog = (...args) => {};
const debugWarn = (...args) => {};
const debugError = (...args) => {};

// Using placeholders for banner images
const bannerImage1 = 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&h=400&fit=crop';
const bannerImage2 = 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800&h=400&fit=crop';
const bannerImage3 = 'https://images.unsplash.com/photo-1556910096-6f5e72db6803?w=800&h=400&fit=crop';
const bannerImage4 = 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&h=400&fit=crop';
const bannerImage5 = 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800&h=400&fit=crop';
const bannerImage6 = 'https://images.unsplash.com/photo-1556910096-6f5e72db6803?w=800&h=400&fit=crop';
const bannerImages = {
  1: bannerImage1,
  2: bannerImage2,
  3: bannerImage3,
  4: bannerImage4,
  5: bannerImage5,
  6: bannerImage6,
};
export default function Banners() {
  const [activeLanguage, setActiveLanguage] = useState('default');
  const [searchQuery, setSearchQuery] = useState('');
  const [bannerType, setBannerType] = useState('all');
  const [banners, setBanners] = useState(emptyBanners);
  const [formData, setFormData] = useState({
    title: '',
    zone: '',
    bannerType: 'Restaurant wise',
    restaurant: '',
  });
  const languageTabs = [
    {
      key: 'default',
      label: 'Default',
    },
    {
      key: 'en',
      label: 'English(EN)',
    },
    {
      key: 'bn',
      label: 'Bengali - বাংলা(BN)',
    },
    {
      key: 'ar',
      label: 'Arabic - العربية (AR)',
    },
    {
      key: 'es',
      label: 'Spanish - espa�ol(ES)',
    },
  ];
  const filteredBanners = useMemo(() => {
    let result = [...banners];
    if (bannerType !== 'all') {
      if (bannerType === 'Restaurant wise') {
        result = result.filter((banner) => banner.bannerType === 'Restaurant wise');
      } else if (bannerType === 'Zone wise') {
        result = result.filter((banner) => banner.bannerType === 'Zone wise');
      }
    }
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter((banner) => banner.title.toLowerCase().includes(query));
    }
    return result;
  }, [banners, searchQuery, bannerType]);
  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };
  const handleSubmit = (e) => {
    e.preventDefault();
    debugLog('Form submitted:', formData);
    alert('Banner added successfully!');
  };
  const handleReset = () => {
    setFormData({
      title: '',
      zone: '',
      bannerType: 'Restaurant wise',
      restaurant: '',
    });
  };
  const handleToggleStatus = (sl) => {
    setBanners(
      banners.map((banner) =>
        banner.sl === sl
          ? {
              ...banner,
              status: !banner.status,
            }
          : banner,
      ),
    );
  };
  const handleDelete = async (sl) => {
    if (await window.confirmAsync('Are you sure you want to delete this banner?')) {
      setBanners(banners.filter((banner) => banner.sl !== sl));
    }
  };
  return (
    <ScrollDiv className="p-4 lg:p-6 bg-slate-50 min-h-screen">
      <Div className="max-w-7xl mx-auto">
        {/* Add New Banner Section */}
        <Div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
          <Div className="flex items-center gap-3 mb-4">
            <UiIcon as={Plus} className="w-5 h-5 text-blue-600" />
            <H1 className="text-2xl font-bold text-slate-900">Add New Banner</H1>
          </Div>

          {/* Language Tabs */}
          <HScroll className="flex items-center gap-2 border-b border-slate-200 mb-6">
            {languageTabs.map((tab) => (
              <Button
                key={tab.key}
                onClick={() => setActiveLanguage(tab.key)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeLanguage === tab.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-600 hover:text-slate-900'}`}
              >
                {tab.label}
              </Button>
            ))}
          </HScroll>

          <Form onSubmit={handleSubmit}>
            <Div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <Div>
                <Label className="block text-sm font-semibold text-slate-700 mb-2">
                  Banner Title ({activeLanguage === 'default' ? 'Default' : languageTabs.find((t) => t.key === activeLanguage)?.label}){' '}
                  <Span className="text-red-500">*</Span>
                </Label>
                <Input
                  type="text"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder="New banner"
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-blue-500 text-sm"
                />
              </Div>

              <Div>
                <Label className="block text-sm font-semibold text-slate-700 mb-2">
                  Zone <Span className="text-red-500">*</Span>
                </Label>
                <Select
                  value={formData.zone}
                  onChange={(e) => handleInputChange('zone', e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-blue-500 text-sm"
                >
                  <Option value="">---Select---</Option>
                  <Option value="asia">Asia</Option>
                  <Option value="europe">Europe</Option>
                </Select>
              </Div>

              <Div>
                <Label className="block text-sm font-semibold text-slate-700 mb-2">
                  Banner Type <Span className="text-red-500">*</Span>
                </Label>
                <Select
                  value={formData.bannerType}
                  onChange={(e) => handleInputChange('bannerType', e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-blue-500 text-sm"
                >
                  <Option value="Restaurant wise">Restaurant wise</Option>
                  <Option value="Zone wise">Zone wise</Option>
                </Select>
              </Div>

              <Div>
                <Label className="block text-sm font-semibold text-slate-700 mb-2">
                  Restaurant <Span className="text-red-500">*</Span>
                </Label>
                <Select
                  value={formData.restaurant}
                  onChange={(e) => handleInputChange('restaurant', e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-blue-500 text-sm"
                >
                  <Option value="">Select</Option>
                  <Option value="cafe-monarch">Caf� Monarch</Option>
                  <Option value="hungry-puppets">Hungry Puppets</Option>
                </Select>
              </Div>
            </Div>

            {/* Banner Image Upload */}
            <Div className="mb-6">
              <Label className="block text-sm font-semibold text-slate-700 mb-2">
                Banner Image <Span className="text-red-500">*</Span>
              </Label>
              <P className="text-sm text-slate-600 mb-3">Upload your image here</P>
              <Div className="border-2 border-dashed border-slate-300 rounded-lg p-12 text-center hover:border-blue-500 transition-colors cursor-pointer">
                <UiIcon as={Upload} className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                <P className="text-sm font-medium text-blue-600 mb-1">Click to upload</P>
                <P className="text-xs text-slate-500 mb-2">Or drag and drop</P>
                <P className="text-xs text-slate-500">Supported format : JPG, JPEG, PNG, Gif image size : Max 2 MB (2:1)</P>
              </Div>
            </Div>

            <Div className="flex items-center justify-end gap-4">
              <Button
                type="button"
                onClick={handleReset}
                className="px-6 py-2.5 text-sm font-medium rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-all"
              >
                Reset
              </Button>
              <Button type="submit" className="px-6 py-2.5 text-sm font-medium rounded-lg bg-green-600 text-white hover:bg-blue-700 transition-all shadow-md">
                Submit
              </Button>
            </Div>
          </Form>
        </Div>

        {/* Banner List Section */}
        <Div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <Div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <Div className="flex items-center gap-2">
              <H2 className="text-xl font-bold text-slate-900">Banner List</H2>
              <Span className="px-3 py-1 rounded-full text-sm font-semibold bg-slate-100 text-slate-700">{filteredBanners.length}</Span>
            </Div>

            <Div className="flex items-center gap-3">
              <Select
                value={bannerType}
                onChange={(e) => setBannerType(e.target.value)}
                className="px-4 py-2.5 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-slate-400"
              >
                <Option value="all">All Banner</Option>
                <Option value="Restaurant wise">Restaurant wise</Option>
                <Option value="Zone wise">Zone wise</Option>
              </Select>

              <Div className="relative flex-1 sm:flex-initial min-w-[200px]">
                <Input
                  type="text"
                  placeholder="Ex: Search by title ..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2.5 w-full text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400"
                />
                <UiIcon as={Search} className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              </Div>
            </Div>
          </Div>

          {/* Table */}
          <Table cols={[60, 240, 120, 140, 100, 96]} className="w-full">
              <Thead className="bg-slate-50 border-b border-slate-200">
                <Tr>
                  <Th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">SI</Th>
                  <Th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">Banner Info</Th>
                  <Th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">Zone</Th>
                  <Th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">Banner Type</Th>
                  <Th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">Status</Th>
                  <Th className="px-6 py-4 text-center text-[10px] font-bold text-slate-700 uppercase tracking-wider">Action</Th>
                </Tr>
              </Thead>
              <Tbody className="bg-white divide-y divide-slate-100">
                {filteredBanners.map((banner) => (
                  <Tr key={banner.sl} className="hover:bg-slate-50 transition-colors">
                    <Td className="px-6 py-4 whitespace-nowrap">
                      <Span className="text-sm font-medium text-slate-700">{banner.sl}</Span>
                    </Td>
                    <Td className="px-6 py-4">
                      <Div className="flex items-center gap-3">
                        <Div className="w-16 h-16 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0">
                          <Img
                            src={bannerImages[banner.sl] || bannerImage1}
                            alt={banner.title}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.target.src = bannerImage1;
                            }}
                          />
                        </Div>
                        <Span className="text-sm font-medium text-slate-900">{banner.title}</Span>
                      </Div>
                    </Td>
                    <Td className="px-6 py-4 whitespace-nowrap">
                      <Span className="text-sm text-slate-700">{banner.zone}</Span>
                    </Td>
                    <Td className="px-6 py-4 whitespace-nowrap">
                      <Span className="text-sm text-slate-700">{banner.bannerType}</Span>
                    </Td>
                    <Td className="px-6 py-4 whitespace-nowrap">
                      <Button
                        onClick={() => handleToggleStatus(banner.sl)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 ${banner.status ? 'bg-green-600' : 'bg-slate-300'}`}
                      >
                        <Div
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${banner.status ? 'translate-x-6' : 'translate-x-1'}`}
                        />
                      </Button>
                    </Td>
                    <Td className="px-6 py-4 whitespace-nowrap text-center">
                      <Div className="flex items-center justify-center gap-2">
                        <Button className="p-1.5 rounded text-blue-600 hover:bg-blue-50 transition-colors">
                          <UiIcon as={Edit} className="w-4 h-4" />
                        </Button>
                        <Button onClick={() => handleDelete(banner.sl)} className="p-1.5 rounded text-red-600 hover:bg-red-50 transition-colors">
                          <UiIcon as={Trash2} className="w-4 h-4" />
                        </Button>
                      </Div>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
        </Div>
      </Div>
    </ScrollDiv>
  );
}
