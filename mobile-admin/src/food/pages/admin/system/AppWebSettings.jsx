/* Ported from Frontend/src/modules/Food/pages/admin/system/AppWebSettings.jsx (tools/port.js first pass). */
import { useState } from 'react';
import { Settings, Smartphone, Apple } from 'lucide-react-native';
import {
  AdminPage,
  PageHeader,
  Card,
  SectionTitle,
  Field,
  INPUT,
  BTN_PRIMARY,
  BTN_SECONDARY,
  BTN_TEXT_PRIMARY,
  BTN_TEXT_SECONDARY,
  useLayoutWidth,
} from '../../../../admin/ui';
import { Button, Div, Input, Span, Icon as UiIcon } from '../../../../components/web';
import { Text } from '../../../../components/Text';
import { tw } from '../../../../lib/tw';
function ToggleSwitch({ enabled, onToggle, label }) {
  return (
    <Button type="button" onClick={onToggle} accessibilityLabel={label} className="w-11 h-11 flex-row items-center justify-end shrink-0">
      <Div className={`flex-row items-center w-11 h-6 rounded-full border px-0.5 ${enabled ? 'bg-blue-600 border-blue-600 justify-end' : 'bg-slate-200 border-slate-300 justify-start'}`}>
        <Span className="h-5 w-5 rounded-full bg-white" />
      </Div>
    </Button>
  );
}
/** One platform's two fields, laid out in two columns from tablet width. */
function PlatformFields({ icon, title, appLabel, state, setState, col }) {
  return (
    <Div className="gap-2">
      <Div className="flex-row items-center gap-2">
        <UiIcon as={icon} size={16} className="text-slate-600" />
        <Text style={tw`text-sm font-semibold text-slate-700`}>{title}</Text>
      </Div>
      <Div className="flex-row flex-wrap gap-3">
        <Div style={col}>
          <Field label="Minimum version for force update" hint={`Lowest ${appLabel} build allowed`}>
            <Input
              type="text"
              value={state.minVersion}
              onChange={(e) =>
                setState((prev) => ({
                  ...prev,
                  minVersion: e.target.value,
                }))
              }
              placeholder="App minimum version"
              className={INPUT}
            />
          </Field>
        </Div>
        <Div style={col}>
          <Field label="Download URL" hint={`Where ${appLabel} users get the update`}>
            <Input
              type="text"
              value={state.downloadUrl}
              onChange={(e) =>
                setState((prev) => ({
                  ...prev,
                  downloadUrl: e.target.value,
                }))
              }
              placeholder="Download Url"
              className={INPUT}
            />
          </Field>
        </Div>
      </Div>
    </Div>
  );
}
/** A version-control card: Android fields, iOS fields, then the card's actions. */
function VersionCard({ title, appLabel, android, setAndroid, ios, setIos, onReset, col, className }) {
  return (
    <Card className={className}>
      <SectionTitle>{title}</SectionTitle>
      <Div className="gap-4">
        <PlatformFields icon={Smartphone} title="For Android" appLabel={`${appLabel} (Android)`} state={android} setState={setAndroid} col={col} />
        <PlatformFields icon={Apple} title="For iOS" appLabel={`${appLabel} (iOS)`} state={ios} setState={setIos} col={col} />
      </Div>
      <Div className="flex-row flex-wrap justify-end gap-2 mt-4">
        <Button type="button" onClick={onReset} className={BTN_SECONDARY}>
          <Span className={BTN_TEXT_SECONDARY}>Reset</Span>
        </Button>
        <Button type="button" className={BTN_PRIMARY}>
          <Span className={BTN_TEXT_PRIMARY}>Submit</Span>
        </Button>
      </Div>
    </Card>
  );
}
const GENERAL_TOGGLES = [
  { key: 'popularFoods', label: 'Popular Foods' },
  { key: 'newRestaurants', label: 'New Restaurants' },
  { key: 'popularRestaurants', label: 'Popular Restaurants' },
  { key: 'mostReviewedFoods', label: 'Most Reviewed Foods' },
];
export default function AppWebSettings() {
  const [generalSettings, setGeneralSettings] = useState({
    popularFoods: true,
    newRestaurants: true,
    popularRestaurants: true,
    mostReviewedFoods: true,
  });
  const [userAppAndroid, setUserAppAndroid] = useState({
    minVersion: '',
    downloadUrl: '',
  });
  const [userAppIOS, setUserAppIOS] = useState({
    minVersion: '',
    downloadUrl: '',
  });
  const [restaurantAppAndroid, setRestaurantAppAndroid] = useState({
    minVersion: '',
    downloadUrl: '',
  });
  const [restaurantAppIOS, setRestaurantAppIOS] = useState({
    minVersion: '',
    downloadUrl: '',
  });
  const [deliverymanAppAndroid, setDeliverymanAppAndroid] = useState({
    minVersion: '',
    downloadUrl: '',
  });
  const [deliverymanAppIOS, setDeliverymanAppIOS] = useState({
    minVersion: '',
    downloadUrl: '',
  });
  const handleGeneralToggle = (key) => {
    setGeneralSettings((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };
  const handleUserAppAndroidReset = () => {
    setUserAppAndroid({
      minVersion: '',
      downloadUrl: '',
    });
  };
  const handleUserAppIOSReset = () => {
    setUserAppIOS({
      minVersion: '',
      downloadUrl: '',
    });
  };
  const handleRestaurantAppAndroidReset = () => {
    setRestaurantAppAndroid({
      minVersion: '',
      downloadUrl: '',
    });
  };
  const handleRestaurantAppIOSReset = () => {
    setRestaurantAppIOS({
      minVersion: '',
      downloadUrl: '',
    });
  };
  const handleDeliverymanAppAndroidReset = () => {
    setDeliverymanAppAndroid({
      minVersion: '',
      downloadUrl: '',
    });
  };
  const handleDeliverymanAppIOSReset = () => {
    setDeliverymanAppIOS({
      minVersion: '',
      downloadUrl: '',
    });
  };
  const { tablet } = useLayoutWidth();
  const col = tablet ? { width: '48.5%' } : { width: '100%' };
  return (
    <AdminPage maxWidth={900}>
      <PageHeader
        icon={Settings}
        title="App & Web Settings"
        subtitle="Storefront sections and force-update versions for the three apps"
        breadcrumb={[{ label: 'Food' }, { label: 'System' }, { label: 'App & web' }]}
      />

      <Card className="mb-4">
        <SectionTitle>General Web Settings</SectionTitle>
        <Div className="flex-row flex-wrap gap-x-4">
          {GENERAL_TOGGLES.map((t) => (
            <Div key={t.key} style={col} className="flex-row items-center justify-between gap-2 min-h-11">
              <Text style={tw`text-sm text-slate-700 flex-1`} numberOfLines={2}>
                {t.label}
              </Text>
              <ToggleSwitch enabled={generalSettings[t.key]} onToggle={() => handleGeneralToggle(t.key)} label={`Toggle ${t.label}`} />
            </Div>
          ))}
        </Div>
      </Card>

      <VersionCard
        className="mb-4"
        title="User App Version Control"
        appLabel="user app"
        android={userAppAndroid}
        setAndroid={setUserAppAndroid}
        ios={userAppIOS}
        setIos={setUserAppIOS}
        onReset={handleUserAppAndroidReset}
        col={col}
      />

      <VersionCard
        className="mb-4"
        title="Restaurant App Version Control"
        appLabel="restaurant app"
        android={restaurantAppAndroid}
        setAndroid={setRestaurantAppAndroid}
        ios={restaurantAppIOS}
        setIos={setRestaurantAppIOS}
        onReset={handleRestaurantAppAndroidReset}
        col={col}
      />

      <VersionCard
        title="Deliveryman App Version Control"
        appLabel="deliveryman app"
        android={deliverymanAppAndroid}
        setAndroid={setDeliverymanAppAndroid}
        ios={deliverymanAppIOS}
        setIos={setDeliverymanAppIOS}
        onReset={handleDeliverymanAppAndroidReset}
        col={col}
      />
    </AdminPage>
  );
}
