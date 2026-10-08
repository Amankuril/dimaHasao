/* Ported from Frontend/src/modules/Food/pages/admin/settings/ThemeSettings.jsx (tools/port.js first pass). */
import { useState } from 'react';
import { Smartphone } from 'lucide-react-native';
import mobileImage1 from '../../../assets/Transaction-report-icons/mobile_image1.png';
import mobileImage2 from '../../../assets/Transaction-report-icons/mobile_image2.png';
import { Button, Div, Img, Span } from '../../../../components/web';
import { AdminPage, PageHeader, Card, SectionTitle, StatusBadge, BTN_PRIMARY, BTN_TEXT_PRIMARY, useLayoutWidth } from '../../../../admin/ui';

const THEMES = [
  { id: 'theme1', label: 'Theme 1', image: mobileImage1 },
  { id: 'theme2', label: 'Theme 2', image: mobileImage2 },
];

export default function ThemeSettings() {
  const [selectedTheme, setSelectedTheme] = useState('theme1');
  const { tablet, width } = useLayoutWidth();
  // The preview keeps a phone aspect ratio and never runs past the card.
  const frameWidth = Math.min(260, Math.max(160, (tablet ? Math.min(width, 900) / 2 : width) - 80));
  const frameHeight = Math.round(frameWidth * 2.1);
  return (
    <AdminPage maxWidth={900}>
      <PageHeader
        icon={Smartphone}
        title="Change theme for user app"
        subtitle="Pick the home layout customers see in the app, then apply it."
        breadcrumb={[{ label: 'Food' }, { label: 'Settings' }, { label: 'Theme' }]}
      />

      <Card>
        <SectionTitle>Available themes</SectionTitle>
        <Div className={tablet ? 'flex-row items-start gap-4' : 'gap-4'}>
          {THEMES.map((theme) => {
            const selected = selectedTheme === theme.id;
            return (
              <Div key={theme.id} className="flex-1 items-center gap-2">
                <Div
                  accessibilityRole="button"
                  accessibilityLabel={`Select ${theme.label}`}
                  className={`overflow-hidden bg-white ${selected ? 'border-2 border-blue-600' : 'border border-slate-200'}`}
                  style={{ width: frameWidth, height: frameHeight, borderRadius: 24 }}
                  onClick={() => setSelectedTheme(theme.id)}
                >
                  <Img src={theme.image} alt={theme.label} className="w-full h-full" contentFit="contain" />
                </Div>
                <Span className="text-sm font-semibold text-slate-900">{theme.label}</Span>
                {selected ? <StatusBadge status="active" label="Selected" /> : <Span className="text-xs text-slate-500">Tap to select</Span>}
              </Div>
            );
          })}
        </Div>
      </Card>

      <Div className="flex-row justify-end mt-4">
        <Button className={BTN_PRIMARY} accessibilityLabel="Apply selected theme">
          <Span className={BTN_TEXT_PRIMARY}>Apply</Span>
        </Button>
      </Div>
    </AdminPage>
  );
}
