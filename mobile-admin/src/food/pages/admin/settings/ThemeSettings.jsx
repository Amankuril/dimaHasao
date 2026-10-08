/* Ported from Frontend/src/modules/Food/pages/admin/settings/ThemeSettings.jsx (tools/port.js first pass). */
import { useState } from 'react';
import { Info } from 'lucide-react-native';
import mobileImage1 from '../../../assets/Transaction-report-icons/mobile_image1.png';
import mobileImage2 from '../../../assets/Transaction-report-icons/mobile_image2.png';
import { Button, Div, H1, Img, ScrollDiv, Icon as UiIcon } from '../../../../components/web';
export default function ThemeSettings() {
  const [selectedTheme, setSelectedTheme] = useState('theme1');
  return (
    <ScrollDiv className="p-4 lg:p-6 bg-slate-50 min-h-screen">
      <Div className="max-w-7xl mx-auto">
        {/* Page Header */}
        <Div className="mb-6">
          <Div className="flex items-center gap-2">
            <H1 className="text-2xl font-bold text-slate-900">Change Theme For User App</H1>
            <UiIcon as={Info} className="w-5 h-5 text-slate-400" />
          </Div>
        </Div>

        {/* Mobile Screens Comparison */}
        <Div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <Div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Mobile Screen - Theme 1 */}
            <Div className="flex flex-col items-center">
              <Div
                className="relative border-4 border-slate-300 bg-white shadow-xl overflow-hidden"
                style={{ width: 280, height: 600, borderRadius: 40 }}
                onClick={() => setSelectedTheme('theme1')}
              >
                <Img src={mobileImage1} alt="Theme 1" className="w-full h-full object-contain" />
              </Div>
              {selectedTheme === 'theme1' && <Div className="mt-2 px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded-full">Selected</Div>}
            </Div>

            {/* Right Mobile Screen - Theme 2 */}
            <Div className="flex flex-col items-center">
              <Div
                className="relative border-4 border-slate-300 bg-white shadow-xl overflow-hidden"
                style={{ width: 280, height: 600, borderRadius: 40 }}
                onClick={() => setSelectedTheme('theme2')}
              >
                <Img src={mobileImage2} alt="Theme 2" className="w-full h-full object-contain" />
              </Div>
              {selectedTheme === 'theme2' && <Div className="mt-2 px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded-full">Selected</Div>}
            </Div>
          </Div>

          {/* Apply Button */}
          <Div className="flex justify-end mt-6">
            <Button className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">Apply</Button>
          </Div>
        </Div>
      </Div>
    </ScrollDiv>
  );
}
