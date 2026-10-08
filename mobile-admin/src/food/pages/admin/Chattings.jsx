/* Ported from Frontend/src/modules/Food/pages/admin/Chattings.jsx (tools/port.js first pass). */
import { useState } from 'react';
import { Search, Info, Settings } from 'lucide-react-native';
import { emptyConversations } from '../../utils/adminFallbackData';
import { Button, Div, H1, H2, H3, Img, Input, P, ScrollDiv, Span, Icon as UiIcon } from '../../../components/web';
export default function Chattings() {
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
  return (
    <ScrollDiv className="p-4 lg:p-6 bg-slate-50 min-h-screen">
      <Div className="max-w-7xl mx-auto">
        <Div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <Div className="grid grid-cols-1 lg:grid-cols-2">
            {/* Left Panel - Conversation List */}
            <Div className="border-r border-slate-200 flex flex-col">
              <Div className="p-6 border-b border-slate-200">
                <H1 className="text-2xl font-bold text-slate-900 mb-4">Conversation List</H1>

                {/* Search Bar */}
                <Div className="relative mb-4">
                  <Input
                    type="text"
                    placeholder="Search by name or phone"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400"
                  />
                  <UiIcon as={Search} className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                </Div>

                {/* Tabs */}
                <Div className="flex items-center gap-2 border-b border-slate-200">
                  <Button
                    onClick={() => setActiveTab('customer')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'customer' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-600 hover:text-slate-900'}`}
                  >
                    Customer
                  </Button>
                  <Button
                    onClick={() => setActiveTab('restaurant')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'restaurant' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-600 hover:text-slate-900'}`}
                  >
                    Restaurant
                  </Button>
                </Div>
              </Div>

              {/* Conversation List */}
              <Div className="flex-1">
                {filteredConversations.length === 0 ? (
                  <Div className="flex flex-col items-center justify-center p-6 py-12">
                    <Div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                      <UiIcon as={Info} className="w-8 h-8 text-slate-400" />
                    </Div>
                    <P className="text-sm text-slate-500">No conversations found</P>
                  </Div>
                ) : (
                  <Div className="divide-y divide-slate-100">
                    {filteredConversations.map((conversation) => (
                      <Button
                        key={conversation.id}
                        onClick={() => setSelectedConversation(conversation)}
                        className={`w-full p-4 text-left hover:bg-slate-50 transition-colors ${selectedConversation?.id === conversation.id ? 'bg-blue-50' : ''}`}
                      >
                        <Div className="flex items-center gap-3">
                          <Div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0 overflow-hidden">
                            {conversation.avatar ? (
                              <Img src={conversation.avatar} alt={conversation.name} className="w-full h-full object-cover" />
                            ) : (
                              <Span className="text-lg">👤</Span>
                            )}
                          </Div>
                          <Div className="flex-1 min-w-0">
                            <Div className="flex items-center justify-between mb-1">
                              <H3 className="text-sm font-semibold text-slate-900 truncate">{conversation.name}</H3>
                              <Span className="text-xs text-slate-500 ml-2 flex-shrink-0">{conversation.timestamp}</Span>
                            </Div>
                            <P className="text-xs text-slate-500 truncate mb-1">{conversation.phone}</P>
                            <P className="text-sm text-slate-600 truncate">{conversation.lastMessage}</P>
                          </Div>
                        </Div>
                      </Button>
                    ))}
                  </Div>
                )}
              </Div>
            </Div>

            {/* Right Panel - Conversation View */}
            <Div className="flex flex-col relative">
              {selectedConversation ? (
                <>
                  {/* Conversation Header */}
                  <Div className="p-6 border-b border-slate-200">
                    <Div className="flex items-center gap-3">
                      <Div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {selectedConversation.avatar ? (
                          <Img src={selectedConversation.avatar} alt={selectedConversation.name} className="w-full h-full object-cover" />
                        ) : (
                          <Span className="text-lg">👤</Span>
                        )}
                      </Div>
                      <Div>
                        <H2 className="text-lg font-semibold text-slate-900">{selectedConversation.name}</H2>
                        <P className="text-sm text-slate-500">{selectedConversation.phone}</P>
                      </Div>
                    </Div>
                  </Div>

                  {/* Messages Area */}
                  <Div className="flex-1 p-6">
                    <Div className="space-y-4">
                      {/* Sample messages */}
                      <Div className="flex justify-start">
                        <Div className="max-w-[70%] bg-slate-100 rounded-lg p-3">
                          <P className="text-sm text-slate-900">{selectedConversation.lastMessage}</P>
                          <P className="text-xs text-slate-500 mt-1">{selectedConversation.timestamp}</P>
                        </Div>
                      </Div>
                    </Div>
                  </Div>

                  {/* Message Input */}
                  <Div className="p-6 border-t border-slate-200">
                    <Div className="flex items-center gap-3">
                      <Input
                        type="text"
                        placeholder="Type a message..."
                        className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      />
                      <Button className="px-6 py-2.5 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-all">Send</Button>
                    </Div>
                  </Div>
                </>
              ) : (
                <Div className="flex-1 flex items-center justify-center py-16">
                  <Div className="text-center">
                    <Div className="w-24 h-24 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                      <UiIcon as={Info} className="w-12 h-12 text-slate-400" />
                    </Div>
                    <P className="text-sm text-slate-600">Please select a user to view the conversation.</P>
                  </Div>
                </Div>
              )}

              {/* Settings Icon */}
              <Button className="absolute top-6 right-6 p-2 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors">
                <UiIcon as={Settings} className="w-5 h-5 text-slate-600" />
              </Button>
            </Div>
          </Div>
        </Div>
      </Div>
    </ScrollDiv>
  );
}
