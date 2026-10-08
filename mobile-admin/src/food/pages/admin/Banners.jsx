/* Ported from Frontend/src/modules/Food/pages/admin/Banners.jsx. */
import { useState, useMemo } from 'react';
import { Search, Edit, Trash2, Upload, Image as ImageIcon } from 'lucide-react-native';
import { emptyBanners } from '../../utils/adminFallbackData';
import {
  AdminPage,
  PageHeader,
  Card,
  SectionTitle,
  Toolbar,
  DataTable,
  THead,
  TBody,
  Row,
  Cell,
  StatusBadge,
  EmptyState,
  Field,
  INPUT,
  BTN_PRIMARY,
  BTN_SECONDARY,
  BTN_TEXT_PRIMARY,
  BTN_TEXT_SECONDARY,
  useLayoutWidth,
} from '../../../admin/ui';
import { Button, Div, Form, HScroll, Img, Input, Option, P, Select, Span, Icon as UiIcon } from '../../../components/web';
import { alert, window } from '../../../lib/webShim';
const debugLog = (...args) => {};

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

const COLS = [56, 230, 130, 150, 120, 104];
const LABELS = ['SI', 'Banner Info', 'Zone', 'Banner Type', 'Status', 'Action'];

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
  const { tablet } = useLayoutWidth();
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
      label: 'Spanish - español(ES)',
    },
  ];
  const activeLanguageLabel = activeLanguage === 'default' ? 'Default' : languageTabs.find((t) => t.key === activeLanguage)?.label;
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
    <AdminPage maxWidth={1200}>
      <PageHeader
        icon={ImageIcon}
        title="Banners"
        subtitle="Add a promotional banner and manage the ones already running"
        breadcrumb={[{ label: 'Food' }, { label: 'Promotions' }, { label: 'Banners' }]}
      />

      {/* Add New Banner */}
      <Card className="mb-4">
        <SectionTitle>Add New Banner</SectionTitle>

        {/* Language Tabs */}
        <HScroll className="mb-4 border-b border-slate-200" contentClassName="flex-row items-center">
          {languageTabs.map((tab) => (
            <Button
              key={tab.key}
              onClick={() => setActiveLanguage(tab.key)}
              className={`px-4 h-11 justify-center border-b-2 ${activeLanguage === tab.key ? 'border-blue-600' : 'border-transparent'}`}
            >
              <Span className={`text-sm font-semibold ${activeLanguage === tab.key ? 'text-blue-600' : 'text-slate-600'}`}>{tab.label}</Span>
            </Button>
          ))}
        </HScroll>

        <Form onSubmit={handleSubmit}>
          <Div className={`grid grid-cols-${tablet ? 2 : 1} gap-3 mb-4`}>
            <Field label={`Banner Title (${activeLanguageLabel})`} required>
              <Input
                type="text"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="New banner"
                className={INPUT}
              />
            </Field>

            <Field label="Zone" required>
              <Select value={formData.zone} onChange={(e) => handleInputChange('zone', e.target.value)} className={INPUT}>
                <Option value="">---Select---</Option>
                <Option value="asia">Asia</Option>
                <Option value="europe">Europe</Option>
              </Select>
            </Field>

            <Field label="Banner Type" required>
              <Select value={formData.bannerType} onChange={(e) => handleInputChange('bannerType', e.target.value)} className={INPUT}>
                <Option value="Restaurant wise">Restaurant wise</Option>
                <Option value="Zone wise">Zone wise</Option>
              </Select>
            </Field>

            <Field label="Restaurant" required>
              <Select value={formData.restaurant} onChange={(e) => handleInputChange('restaurant', e.target.value)} className={INPUT}>
                <Option value="">Select</Option>
                <Option value="cafe-monarch">Café Monarch</Option>
                <Option value="hungry-puppets">Hungry Puppets</Option>
              </Select>
            </Field>
          </Div>

          {/* Banner Image Upload */}
          <Field
            label="Banner Image"
            required
            hint="Supported format: JPG, JPEG, PNG, GIF — max 2 MB, ratio 2:1"
            className="mb-4"
          >
            <Div className="border border-dashed border-slate-300 rounded-lg py-8 px-4 items-center gap-1 bg-slate-50">
              <UiIcon as={Upload} size={28} className="text-slate-400 mb-1" />
              <P className="text-sm font-semibold text-blue-600">Click to upload</P>
              <P className="text-xs text-slate-500">Or drag and drop</P>
            </Div>
          </Field>

          <Div className={`flex-row items-center gap-2 ${tablet ? 'justify-end' : ''}`}>
            <Button type="button" onClick={handleReset} className={`${BTN_SECONDARY} ${tablet ? '' : 'flex-1'}`}>
              <Span className={BTN_TEXT_SECONDARY}>Reset</Span>
            </Button>
            <Button type="submit" className={`${BTN_PRIMARY} ${tablet ? '' : 'flex-1'}`}>
              <Span className={BTN_TEXT_PRIMARY}>Submit</Span>
            </Button>
          </Div>
        </Form>
      </Card>

      {/* Banner List */}
      <Card className="mb-4">
        <SectionTitle>{`Banner List (${filteredBanners.length})`}</SectionTitle>
        <Toolbar className="mb-0">
          <Select value={bannerType} onChange={(e) => setBannerType(e.target.value)} className={`${INPUT} min-w-[160px]`}>
            <Option value="all">All Banner</Option>
            <Option value="Restaurant wise">Restaurant wise</Option>
            <Option value="Zone wise">Zone wise</Option>
          </Select>

          <Div className="flex-row items-center gap-2 h-11 px-3 rounded-lg border border-slate-300 bg-white flex-1 min-w-[200px]">
            <UiIcon as={Search} size={16} className="text-slate-400" />
            <Input
              type="text"
              placeholder="Ex: Search by title ..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 text-sm text-slate-900"
            />
          </Div>
        </Toolbar>
      </Card>

      {filteredBanners.length === 0 ? (
        <EmptyState
          icon={ImageIcon}
          title="No banners yet"
          message={searchQuery || bannerType !== 'all' ? 'No banners match your search or filter.' : 'Add a banner above and it will appear in this list.'}
        />
      ) : (
        <DataTable cols={COLS}>
          <THead cols={COLS} labels={LABELS} />
          <TBody>
            {filteredBanners.map((banner, i, all) => (
              <Row key={banner.sl} last={i === all.length - 1}>
                <Cell width={COLS[0]}>{String(banner.sl)}</Cell>
                <Cell width={COLS[1]}>
                  <Div className="flex-row items-center gap-3">
                    <Div className="w-12 h-12 rounded-lg overflow-hidden bg-slate-100 shrink-0">
                      <Img src={bannerImages[banner.sl] || bannerImage1} alt={banner.title} className="w-full h-full object-cover" fallback={bannerImage1} />
                    </Div>
                    <Span className="text-sm font-semibold text-slate-900 flex-1">{banner.title}</Span>
                  </Div>
                </Cell>
                <Cell width={COLS[2]}>{banner.zone}</Cell>
                <Cell width={COLS[3]}>{banner.bannerType}</Cell>
                <Cell width={COLS[4]}>
                  <Button onClick={() => handleToggleStatus(banner.sl)} className="h-11 justify-center" accessibilityLabel={`Toggle status for ${banner.title}`}>
                    <StatusBadge status={banner.status ? 'active' : 'inactive'} />
                  </Button>
                </Cell>
                <Cell width={COLS[5]}>
                  <Div className="flex-row items-center gap-1">
                    <Button className="w-11 h-11 rounded-lg items-center justify-center" accessibilityLabel={`Edit ${banner.title}`}>
                      <UiIcon as={Edit} size={16} className="text-blue-600" />
                    </Button>
                    <Button
                      onClick={() => handleDelete(banner.sl)}
                      className="w-11 h-11 rounded-lg items-center justify-center"
                      accessibilityLabel={`Delete ${banner.title}`}
                    >
                      <UiIcon as={Trash2} size={16} className="text-red-600" />
                    </Button>
                  </Div>
                </Cell>
              </Row>
            ))}
          </TBody>
        </DataTable>
      )}
    </AdminPage>
  );
}
