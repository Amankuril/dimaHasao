/* Ported from Frontend/src/modules/Food/pages/admin/settings/ReactRegistration.jsx (tools/port.js first pass). */
import { useState } from 'react';
import { Upload, X, RotateCcw, Plus, Save, Info } from 'lucide-react-native';
import { Button, Div, H1, H2, H3, Img, Input, Label, P, ScrollDiv, Textarea, Icon as UiIcon } from '../../../../components/web';
import { objectUrl, pickImage } from '../../../../lib/files';
const debugLog = (...args) => {};
const debugWarn = (...args) => {};
const debugError = (...args) => {};
export default function ReactRegistration() {
  const [activeTab, setActiveTab] = useState('hero-section');
  const [heroImage, setHeroImage] = useState(null);
  const [heroImagePreview, setHeroImagePreview] = useState(null);

  // Steeper state
  const [steeperSteps, setSteeperSteps] = useState([
    {
      id: 1,
      title: 'Step 1',
      description: '',
    },
    {
      id: 2,
      title: 'Step 2',
      description: '',
    },
    {
      id: 3,
      title: 'Step 3',
      description: '',
    },
  ]);

  // Opportunities state
  const [opportunities, setOpportunities] = useState([
    {
      id: 1,
      title: '',
      description: '',
      icon: null,
    },
    {
      id: 2,
      title: '',
      description: '',
      icon: null,
    },
  ]);

  // FAQ state
  const [faqs, setFaqs] = useState([
    {
      id: 1,
      question: '',
      answer: '',
    },
    {
      id: 2,
      question: '',
      answer: '',
    },
  ]);
  const tabs = [
    {
      id: 'hero-section',
      label: 'Hero Section',
    },
    {
      id: 'steeper',
      label: 'Steeper',
    },
    {
      id: 'opportunities',
      label: 'Opportunities',
    },
    {
      id: 'faq',
      label: 'FAQ',
    },
  ];
  const handleImageUpload = async () => {
    const file = await pickImage();
    if (file) {
      setHeroImage(file);
      setHeroImagePreview(objectUrl(file));
    }
  };
  const handleRemoveImage = () => {
    setHeroImage(null);
    setHeroImagePreview(null);
  };
  const handleReset = () => {
    setHeroImage(null);
    setHeroImagePreview(null);
  };
  const handleSubmit = (e) => {
    e.preventDefault();
    debugLog('Form submitted:', {
      heroImage,
      activeTab,
    });
  };
  return (
    <ScrollDiv className="p-4 lg:p-6 bg-slate-50 min-h-screen">
      <Div className="max-w-4xl mx-auto">
        {/* Page Header */}
        <Div className="mb-6">
          <H1 className="text-2xl font-bold text-slate-900">React Registration Page</H1>
        </Div>

        {/* Tabs */}
        <Div className="bg-white rounded-lg shadow-sm border border-slate-200 p-2 mb-6">
          <Div className="flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <Button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === tab.id ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                {tab.label}
              </Button>
            ))}
          </Div>
        </Div>

        {/* Hero Section Content */}
        {activeTab === 'hero-section' && (
          <Div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            <H2 className="text-lg font-semibold text-slate-900 mb-4">Hero Section Image</H2>

            {/* Image Upload Area */}
            <Div className="mb-4">
              {heroImagePreview ? (
                <Div className="relative border-2 border-slate-200 rounded-lg p-4 bg-slate-50">
                  <Img src={heroImagePreview} alt="Hero section preview" className="w-full h-auto rounded-lg max-h-96 object-contain mx-auto" />
                  <Button
                    type="button"
                    onClick={handleRemoveImage}
                    className="absolute top-2 right-2 p-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
                  >
                    <UiIcon as={X} className="w-4 h-4" />
                  </Button>
                </Div>
              ) : (
                <Div
                  onClick={handleImageUpload}
                  className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-slate-300 rounded-lg bg-slate-50"
                >
                  <Div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <UiIcon as={Upload} className="w-10 h-10 text-slate-400 mb-3" />
                    <P className="text-sm font-medium text-slate-700 mb-1">Upload Image</P>
                    <P className="text-xs text-slate-500">JPG, JPEG, PNG Less Than 5MB (1200 x 750 px)</P>
                  </Div>
                </Div>
              )}
            </Div>

            {/* File Requirements */}
            <Div className="text-xs text-slate-500 mb-6">
              <P>JPG, JPEG, PNG Less Than 5MB (1200 x 750 px)</P>
            </Div>
          </Div>
        )}

        {/* Steeper Section */}
        {activeTab === 'steeper' && (
          <Div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            <H2 className="text-lg font-semibold text-slate-900 mb-4">Steeper Section</H2>
            <P className="text-sm text-slate-600 mb-6">Configure step-by-step registration process display.</P>

            <Div className="space-y-6">
              {steeperSteps.map((step, index) => (
                <Div key={step.id} className="border border-slate-200 rounded-lg p-4">
                  <H3 className="text-sm font-semibold text-slate-700 mb-4">Step {step.id}</H3>
                  <Div className="space-y-3">
                    <Div>
                      <Div className="text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                        Step Title
                        <UiIcon as={Info} className="w-3 h-3 text-slate-400" />
                      </Div>
                      <Input
                        type="text"
                        value={step.title}
                        onChange={(e) => {
                          const updated = [...steeperSteps];
                          updated[index].title = e.target.value;
                          setSteeperSteps(updated);
                        }}
                        placeholder={`Enter step ${step.id} title`}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </Div>
                    <Div>
                      <Div className="text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                        Step Description
                        <UiIcon as={Info} className="w-3 h-3 text-slate-400" />
                      </Div>
                      <Textarea
                        rows={3}
                        value={step.description}
                        onChange={(e) => {
                          const updated = [...steeperSteps];
                          updated[index].description = e.target.value;
                          setSteeperSteps(updated);
                        }}
                        placeholder={`Enter step ${step.id} description`}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </Div>
                  </Div>
                </Div>
              ))}
            </Div>
          </Div>
        )}

        {/* Opportunities Section */}
        {activeTab === 'opportunities' && (
          <Div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            <H2 className="text-lg font-semibold text-slate-900 mb-4">Opportunities Section</H2>
            <P className="text-sm text-slate-600 mb-6">Configure available opportunities for registration.</P>

            <Div className="space-y-6">
              {opportunities.map((opp, index) => (
                <Div key={opp.id} className="border border-slate-200 rounded-lg p-4">
                  <H3 className="text-sm font-semibold text-slate-700 mb-4">Opportunity {opp.id}</H3>
                  <Div className="space-y-3">
                    <Div>
                      <Div className="text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                        Opportunity Title
                        <UiIcon as={Info} className="w-3 h-3 text-slate-400" />
                      </Div>
                      <Input
                        type="text"
                        value={opp.title}
                        onChange={(e) => {
                          const updated = [...opportunities];
                          updated[index].title = e.target.value;
                          setOpportunities(updated);
                        }}
                        placeholder="Enter opportunity title"
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </Div>
                    <Div>
                      <Div className="text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                        Opportunity Description
                        <UiIcon as={Info} className="w-3 h-3 text-slate-400" />
                      </Div>
                      <Textarea
                        rows={3}
                        value={opp.description}
                        onChange={(e) => {
                          const updated = [...opportunities];
                          updated[index].description = e.target.value;
                          setOpportunities(updated);
                        }}
                        placeholder="Enter opportunity description"
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </Div>
                    <Div>
                      <Label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">Opportunity Icon</Label>
                      <Div className="relative inline-block">
                        {opp.icon ? (
                          <Div className="relative">
                            <Img src={opp.icon} alt="Icon" className="w-24 h-24 object-cover rounded-lg border border-slate-300" />
                            <Button
                              type="button"
                              onClick={() => {
                                const updated = [...opportunities];
                                updated[index].icon = null;
                                setOpportunities(updated);
                              }}
                              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                            >
                              <UiIcon as={X} className="w-3 h-3" />
                            </Button>
                          </Div>
                        ) : (
                          <Div
                            onClick={async () => {
                              const file = await pickImage();
                              if (file) {
                                const updated = [...opportunities];
                                updated[index].icon = objectUrl(file);
                                setOpportunities(updated);
                              }
                            }}
                            className="w-24 h-24 border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center"
                          >
                            <UiIcon as={Upload} className="w-6 h-6 text-slate-400" />
                          </Div>
                        )}
                      </Div>
                    </Div>
                  </Div>
                </Div>
              ))}
              <Button
                type="button"
                onClick={() => {
                  setOpportunities([
                    ...opportunities,
                    {
                      id: opportunities.length + 1,
                      title: '',
                      description: '',
                      icon: null,
                    },
                  ]);
                }}
                className="w-full py-2 border-2 border-dashed border-slate-300 rounded-lg text-slate-600 hover:border-blue-500 hover:text-blue-600 transition-colors flex items-center justify-center gap-2"
              >
                <UiIcon as={Plus} className="w-4 h-4" />
                Add New Opportunity
              </Button>
            </Div>
          </Div>
        )}

        {/* FAQ Section */}
        {activeTab === 'faq' && (
          <Div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            <H2 className="text-lg font-semibold text-slate-900 mb-4">FAQ Section</H2>
            <P className="text-sm text-slate-600 mb-6">Configure frequently asked questions for registration.</P>

            <Div className="space-y-6">
              {faqs.map((faq, index) => (
                <Div key={faq.id} className="border border-slate-200 rounded-lg p-4">
                  <H3 className="text-sm font-semibold text-slate-700 mb-4">FAQ {faq.id}</H3>
                  <Div className="space-y-3">
                    <Div>
                      <Div className="text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                        Question
                        <UiIcon as={Info} className="w-3 h-3 text-slate-400" />
                      </Div>
                      <Input
                        type="text"
                        value={faq.question}
                        onChange={(e) => {
                          const updated = [...faqs];
                          updated[index].question = e.target.value;
                          setFaqs(updated);
                        }}
                        placeholder="Enter question"
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </Div>
                    <Div>
                      <Div className="text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                        Answer
                        <UiIcon as={Info} className="w-3 h-3 text-slate-400" />
                      </Div>
                      <Textarea
                        rows={4}
                        value={faq.answer}
                        onChange={(e) => {
                          const updated = [...faqs];
                          updated[index].answer = e.target.value;
                          setFaqs(updated);
                        }}
                        placeholder="Enter answer"
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </Div>
                  </Div>
                </Div>
              ))}
              <Button
                type="button"
                onClick={() => {
                  setFaqs([
                    ...faqs,
                    {
                      id: faqs.length + 1,
                      question: '',
                      answer: '',
                    },
                  ]);
                }}
                className="w-full py-2 border-2 border-dashed border-slate-300 rounded-lg text-slate-600 hover:border-blue-500 hover:text-blue-600 transition-colors flex items-center justify-center gap-2"
              >
                <UiIcon as={Plus} className="w-4 h-4" />
                Add New FAQ
              </Button>
            </Div>
          </Div>
        )}

        {/* Action Buttons */}
        <Div className="flex justify-end gap-3 mt-6">
          <Button
            type="button"
            onClick={handleReset}
            className="px-6 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium flex items-center gap-2"
          >
            <UiIcon as={RotateCcw} className="w-4 h-4" />
            Reset
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2"
          >
            <UiIcon as={Save} className="w-4 h-4" />
            Save
          </Button>
        </Div>
      </Div>
    </ScrollDiv>
  );
}
