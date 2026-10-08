/* Ported from Frontend/src/modules/Food/pages/admin/settings/ReactRegistration.jsx (tools/port.js first pass). */
import { useState } from 'react';
import { Upload, X, RotateCcw, Plus, Save, ClipboardList, Image as ImageIcon } from 'lucide-react-native';
import { Button, Div, Img, Input, Span, Textarea, Icon as UiIcon } from '../../../../components/web';
import { AdminPage, PageHeader, Card, SectionTitle, Toolbar, Field, EmptyState, INPUT, BTN_PRIMARY, BTN_SECONDARY, BTN_TEXT_PRIMARY, BTN_TEXT_SECONDARY, useLayoutWidth } from '../../../../admin/ui';
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
  const { tablet } = useLayoutWidth();
  const TEXTAREA = 'px-3 py-3 rounded-lg border border-slate-300 bg-white text-sm text-slate-900';
  return (
    <AdminPage maxWidth={720}>
      <PageHeader
        icon={ClipboardList}
        title="Registration page"
        subtitle="The hero, steps, opportunities and FAQs partners see when they sign up."
        breadcrumb={[{ label: 'Food' }, { label: 'Settings' }, { label: 'Registration page' }]}
      />

      <Card className="mb-4">
        <SectionTitle>Section</SectionTitle>
        <Toolbar className="mb-0">
          {tabs.map((tab) => (
            <Button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={activeTab === tab.id ? BTN_PRIMARY : BTN_SECONDARY}
              accessibilityLabel={`Edit ${tab.label}`}
            >
              <Span className={activeTab === tab.id ? BTN_TEXT_PRIMARY : BTN_TEXT_SECONDARY}>{tab.label}</Span>
            </Button>
          ))}
        </Toolbar>
      </Card>

      {activeTab === 'hero-section' && (
        <Card className="mb-4">
          <SectionTitle>Hero image</SectionTitle>
          {heroImagePreview ? (
            <Div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <Img src={heroImagePreview} alt="Hero section preview" className="w-full h-56 rounded-lg" contentFit="contain" />
              <Button
                type="button"
                onClick={handleRemoveImage}
                accessibilityLabel="Remove hero image"
                className="absolute top-1 right-1 w-11 h-11 items-center justify-center"
              >
                <Div className="w-8 h-8 rounded-full bg-red-600 items-center justify-center">
                  <UiIcon as={X} size={16} className="text-white" />
                </Div>
              </Button>
            </Div>
          ) : (
            <EmptyState
              icon={ImageIcon}
              title="No hero image yet"
              message="JPG, JPEG or PNG under 5 MB, ideally 1200 × 750 px."
              actionLabel="Upload image"
              onAction={handleImageUpload}
              className="border-0"
            />
          )}
        </Card>
      )}

      {activeTab === 'steeper' && (
        <Card className="mb-4">
          <SectionTitle>Steps</SectionTitle>
          <Span className="text-sm text-slate-500 mb-3">How the step-by-step registration process is described.</Span>
          <Div className="gap-3">
            {steeperSteps.map((step, index) => (
              <Div key={step.id} className="rounded-xl border border-slate-200 p-3 gap-3">
                <Span className="text-sm font-semibold text-slate-900">Step {step.id}</Span>
                <Div className={tablet ? 'flex-row items-start gap-3' : 'gap-3'}>
                  <Field label="Step title" className={tablet ? 'flex-1' : null}>
                    <Input
                      type="text"
                      value={step.title}
                      onChange={(e) => {
                        const updated = [...steeperSteps];
                        updated[index].title = e.target.value;
                        setSteeperSteps(updated);
                      }}
                      placeholder={`Enter step ${step.id} title`}
                      className={INPUT}
                    />
                  </Field>
                  <Field label="Step description" className={tablet ? 'flex-1' : null}>
                    <Textarea
                      rows={3}
                      value={step.description}
                      onChange={(e) => {
                        const updated = [...steeperSteps];
                        updated[index].description = e.target.value;
                        setSteeperSteps(updated);
                      }}
                      placeholder={`Enter step ${step.id} description`}
                      className={TEXTAREA}
                    />
                  </Field>
                </Div>
              </Div>
            ))}
          </Div>
        </Card>
      )}

      {activeTab === 'opportunities' && (
        <Card className="mb-4">
          <SectionTitle>Opportunities</SectionTitle>
          {opportunities.length === 0 ? (
            <EmptyState
              title="No opportunities yet"
              message="Opportunities are the cards that tell partners what they can earn."
              actionLabel="Add an opportunity"
              onAction={() => {
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
              className="border-0"
            />
          ) : (
            <Div className="gap-3">
              {opportunities.map((opp, index) => (
                <Div key={opp.id} className="rounded-xl border border-slate-200 p-3 gap-3">
                  <Span className="text-sm font-semibold text-slate-900">Opportunity {opp.id}</Span>
                  <Div className={tablet ? 'flex-row items-start gap-3' : 'gap-3'}>
                    <Field label="Title" className={tablet ? 'flex-1' : null}>
                      <Input
                        type="text"
                        value={opp.title}
                        onChange={(e) => {
                          const updated = [...opportunities];
                          updated[index].title = e.target.value;
                          setOpportunities(updated);
                        }}
                        placeholder="Enter opportunity title"
                        className={INPUT}
                      />
                    </Field>
                    <Field label="Description" className={tablet ? 'flex-1' : null}>
                      <Textarea
                        rows={3}
                        value={opp.description}
                        onChange={(e) => {
                          const updated = [...opportunities];
                          updated[index].description = e.target.value;
                          setOpportunities(updated);
                        }}
                        placeholder="Enter opportunity description"
                        className={TEXTAREA}
                      />
                    </Field>
                  </Div>
                  <Field label="Icon">
                    <Div className="flex-row items-center gap-3">
                      {opp.icon ? (
                        <>
                          <Img src={opp.icon} alt="Opportunity icon" className="w-20 h-20 rounded-lg border border-slate-200" contentFit="cover" />
                          <Button
                            type="button"
                            onClick={() => {
                              const updated = [...opportunities];
                              updated[index].icon = null;
                              setOpportunities(updated);
                            }}
                            accessibilityLabel={`Remove opportunity ${opp.id} icon`}
                            className={BTN_SECONDARY}
                          >
                            <UiIcon as={X} size={16} className="text-slate-700" />
                            <Span className={BTN_TEXT_SECONDARY}>Remove</Span>
                          </Button>
                        </>
                      ) : (
                        <Button
                          type="button"
                          onClick={async () => {
                            const file = await pickImage();
                            if (file) {
                              const updated = [...opportunities];
                              updated[index].icon = objectUrl(file);
                              setOpportunities(updated);
                            }
                          }}
                          accessibilityLabel={`Upload opportunity ${opp.id} icon`}
                          className={BTN_SECONDARY}
                        >
                          <UiIcon as={Upload} size={16} className="text-slate-700" />
                          <Span className={BTN_TEXT_SECONDARY}>Upload icon</Span>
                        </Button>
                      )}
                    </Div>
                  </Field>
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
                accessibilityLabel="Add a new opportunity"
                className={BTN_SECONDARY}
              >
                <UiIcon as={Plus} size={16} className="text-slate-700" />
                <Span className={BTN_TEXT_SECONDARY}>Add opportunity</Span>
              </Button>
            </Div>
          )}
        </Card>
      )}

      {activeTab === 'faq' && (
        <Card className="mb-4">
          <SectionTitle>FAQ</SectionTitle>
          {faqs.length === 0 ? (
            <EmptyState
              title="No questions yet"
              message="FAQs answer what partners ask before signing up."
              actionLabel="Add a question"
              onAction={() => {
                setFaqs([
                  ...faqs,
                  {
                    id: faqs.length + 1,
                    question: '',
                    answer: '',
                  },
                ]);
              }}
              className="border-0"
            />
          ) : (
            <Div className="gap-3">
              {faqs.map((faq, index) => (
                <Div key={faq.id} className="rounded-xl border border-slate-200 p-3 gap-3">
                  <Span className="text-sm font-semibold text-slate-900">FAQ {faq.id}</Span>
                  <Field label="Question">
                    <Input
                      type="text"
                      value={faq.question}
                      onChange={(e) => {
                        const updated = [...faqs];
                        updated[index].question = e.target.value;
                        setFaqs(updated);
                      }}
                      placeholder="Enter question"
                      className={INPUT}
                    />
                  </Field>
                  <Field label="Answer">
                    <Textarea
                      rows={4}
                      value={faq.answer}
                      onChange={(e) => {
                        const updated = [...faqs];
                        updated[index].answer = e.target.value;
                        setFaqs(updated);
                      }}
                      placeholder="Enter answer"
                      className={TEXTAREA}
                    />
                  </Field>
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
                accessibilityLabel="Add a new FAQ"
                className={BTN_SECONDARY}
              >
                <UiIcon as={Plus} size={16} className="text-slate-700" />
                <Span className={BTN_TEXT_SECONDARY}>Add FAQ</Span>
              </Button>
            </Div>
          )}
        </Card>
      )}

      <Div className="flex-row flex-wrap justify-end gap-2">
        <Button type="button" onClick={handleReset} className={BTN_SECONDARY} accessibilityLabel="Reset the form">
          <UiIcon as={RotateCcw} size={16} className="text-slate-700" />
          <Span className={BTN_TEXT_SECONDARY}>Reset</Span>
        </Button>
        <Button type="button" onClick={handleSubmit} className={BTN_PRIMARY} accessibilityLabel="Save the registration page">
          <UiIcon as={Save} size={16} className="text-white" />
          <Span className={BTN_TEXT_PRIMARY}>Save</Span>
        </Button>
      </Div>
    </AdminPage>
  );
}
