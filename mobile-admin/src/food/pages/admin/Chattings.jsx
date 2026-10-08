/* Ported from Frontend/src/modules/Food/pages/admin/Chattings.jsx (tools/port.js first pass). */
import { useState } from 'react';
import { Search, MessageSquare, Send } from 'lucide-react-native';
import { emptyConversations } from '../../utils/adminFallbackData';
import { AdminPage, PageHeader, Card, SectionTitle, EmptyState, Field, INPUT, BTN_PRIMARY, BTN_TEXT_PRIMARY, useLayoutWidth } from '../../../admin/ui';
import { Button, Div, Img, Input, P, Span, Icon as UiIcon } from '../../../components/web';
export default function Chattings() {
  const { tablet } = useLayoutWidth();
  const [activeTab, setActiveTab] = useState('customer');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedConversation, setSelectedConversation] = useState(null);
  const filteredConversations = emptyConversations.filter((conv) => {
    if (activeTab === 'customer' && conv.type !== 'customer') return false;
    if (activeTab === 'restaurant' && conv.type !== 'restaurant') return false;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      return conv.name.toLowerCase().includes(query) || conv.phone.includes(query);
    }
    return true;
  });
  const tabs = [
    { key: 'customer', label: 'Customer' },
    { key: 'restaurant', label: 'Restaurant' },
  ];
  return (
    <AdminPage maxWidth={1200}>
      <PageHeader
        icon={MessageSquare}
        title="Chattings"
        subtitle="Conversations with customers and restaurant partners"
        breadcrumb={[{ label: 'Food' }, { label: 'Customers' }, { label: 'Chattings' }]}
      />

      <Div className={tablet ? 'flex-row items-start gap-3' : 'gap-3'}>
        {/* Conversation list */}
        <Div className={tablet ? 'flex-1 min-w-0' : null}>
          <Card className="mb-3">
            <SectionTitle>Conversation list</SectionTitle>
            <Field className="mb-3">
              <Div className="flex-row items-center gap-2">
                <UiIcon as={Search} size={16} className="text-slate-400" />
                <Input
                  type="text"
                  placeholder="Search by name or phone"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`${INPUT} flex-1`}
                />
              </Div>
            </Field>

            <Div className="flex-row items-center gap-2 border-b border-slate-200 mb-1">
              {tabs.map((tab) => (
                <Button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-4 h-11 justify-center border-b-2 ${activeTab === tab.key ? 'border-blue-600' : 'border-transparent'}`}
                >
                  <Span className={`text-sm font-semibold ${activeTab === tab.key ? 'text-blue-600' : 'text-slate-600'}`}>{tab.label}</Span>
                </Button>
              ))}
            </Div>
          </Card>

          {filteredConversations.length === 0 ? (
            <EmptyState icon={MessageSquare} title="No conversations found" message="Conversations appear here once customers or restaurants message support." />
          ) : (
            <Card padded={false} className="overflow-hidden">
              {filteredConversations.map((conversation, i, arr) => (
                <Button
                  key={conversation.id}
                  onClick={() => setSelectedConversation(conversation)}
                  className={`p-3 ${i < arr.length - 1 ? 'border-b border-slate-100' : ''} ${selectedConversation?.id === conversation.id ? 'bg-blue-50' : 'bg-white'}`}
                >
                  <Div className="flex-row items-center gap-3">
                    <Div className="w-11 h-11 rounded-full bg-slate-100 items-center justify-center shrink-0 overflow-hidden">
                      {conversation.avatar ? (
                        <Img src={conversation.avatar} alt={conversation.name} className="w-full h-full object-cover" />
                      ) : (
                        <Span className="text-base">{'\u{1F464}'}</Span>
                      )}
                    </Div>
                    <Div className="flex-1 min-w-0">
                      <Div className="flex-row items-center justify-between gap-2">
                        <Span className="text-sm font-semibold text-slate-900 flex-1" numberOfLines={1}>
                          {conversation.name}
                        </Span>
                        <Span className="text-xs text-slate-500 shrink-0">{conversation.timestamp}</Span>
                      </Div>
                      <Span className="text-xs text-slate-500" numberOfLines={1}>
                        {conversation.phone}
                      </Span>
                      <Span className="text-sm text-slate-600" numberOfLines={1}>
                        {conversation.lastMessage}
                      </Span>
                    </Div>
                  </Div>
                </Button>
              ))}
            </Card>
          )}
        </Div>

        {/* Conversation view */}
        <Div className={tablet ? 'flex-1 min-w-0' : null}>
          {selectedConversation ? (
            <Card className="gap-4">
              <Div className="flex-row items-center gap-3 pb-3 border-b border-slate-200">
                <Div className="w-11 h-11 rounded-full bg-slate-100 items-center justify-center shrink-0 overflow-hidden">
                  {selectedConversation.avatar ? (
                    <Img src={selectedConversation.avatar} alt={selectedConversation.name} className="w-full h-full object-cover" />
                  ) : (
                    <Span className="text-base">{'\u{1F464}'}</Span>
                  )}
                </Div>
                <Div className="flex-1 min-w-0">
                  <Span className="text-base font-semibold text-slate-900" numberOfLines={1}>
                    {selectedConversation.name}
                  </Span>
                  <Span className="text-sm text-slate-500" numberOfLines={1}>
                    {selectedConversation.phone}
                  </Span>
                </Div>
              </Div>

              <Div className="gap-3">
                <Div className="self-start max-w-[85%] bg-slate-100 rounded-xl p-3">
                  <P className="text-sm text-slate-900">{selectedConversation.lastMessage}</P>
                  <P className="text-xs text-slate-500 mt-1">{selectedConversation.timestamp}</P>
                </Div>
              </Div>

              <Div className="flex-row items-center gap-2 pt-3 border-t border-slate-200">
                <Input type="text" placeholder="Type a message…" className={`${INPUT} flex-1`} />
                <Button className={BTN_PRIMARY} accessibilityLabel="Send message">
                  <UiIcon as={Send} size={16} className="text-white" />
                  <Span className={BTN_TEXT_PRIMARY}>Send</Span>
                </Button>
              </Div>
            </Card>
          ) : (
            <EmptyState icon={MessageSquare} title="No conversation selected" message="Pick a user from the list to read and reply to their messages." />
          )}
        </Div>
      </Div>
    </AdminPage>
  );
}
