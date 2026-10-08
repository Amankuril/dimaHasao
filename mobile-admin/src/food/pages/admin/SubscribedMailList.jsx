/* Ported from Frontend/src/modules/Food/pages/admin/SubscribedMailList.jsx (tools/port.js first pass). */
import { useState, useMemo } from 'react';
import { Search, Download, ChevronDown, Mail, Calendar, Settings } from 'lucide-react-native';
import { emptySubscribedEmails } from '../../utils/adminFallbackData';
import { Button, Div, H1, H2, Input, Label, Option, ScrollDiv, Select, Span, Table, Tbody, Td, Th, Thead, Tr, Icon as UiIcon } from '../../../components/web';
export default function SubscribedMailList() {
  const [searchQuery, setSearchQuery] = useState('');
  const [emails, setEmails] = useState(emptySubscribedEmails);
  const [filters, setFilters] = useState({
    subscriptionDate: '',
    sortBy: '',
    chooseFirst: '',
  });
  const filteredEmails = useMemo(() => {
    if (!searchQuery.trim()) {
      return emails;
    }
    const query = searchQuery.toLowerCase().trim();
    return emails.filter((email) => email.email.toLowerCase().includes(query));
  }, [emails, searchQuery]);
  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
  };
  return (
    <ScrollDiv className="p-4 lg:p-6 bg-slate-50 min-h-screen">
      <Div className="max-w-7xl mx-auto">
        {/* Header */}
        <Div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
          <Div className="flex items-center gap-3 mb-6">
            <UiIcon as={Mail} className="w-5 h-5 text-blue-600" />
            <H1 className="text-2xl font-bold text-slate-900">Subscribed Mail List</H1>
          </Div>

          {/* Filter Section */}
          <Div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Div>
              <Label className="block text-sm font-semibold text-slate-700 mb-2">Subscription Date</Label>
              <Div className="relative">
                <Input
                  type="date"
                  value={filters.subscriptionDate}
                  onChange={(e) => handleFilterChange('subscriptionDate', e.target.value)}
                  className="w-full px-4 py-2.5 pr-10 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
                <UiIcon as={Calendar} className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </Div>
            </Div>

            <Div>
              <Label className="block text-sm font-semibold text-slate-700 mb-2">Sort By</Label>
              <Select
                value={filters.sortBy}
                onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                <Option value="">Select Mail Sorting Order</Option>
                <Option value="email-asc">Email (A-Z)</Option>
                <Option value="email-desc">Email (Z-A)</Option>
                <Option value="date-asc">Date (Oldest First)</Option>
                <Option value="date-desc">Date (Newest First)</Option>
              </Select>
            </Div>

            <Div>
              <Label className="block text-sm font-semibold text-slate-700 mb-2">Choose First</Label>
              <Input
                type="number"
                value={filters.chooseFirst}
                onChange={(e) => handleFilterChange('chooseFirst', e.target.value)}
                placeholder="Ex: 100"
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </Div>

            <Div className="flex items-end">
              <Button className="px-6 py-2.5 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-all">Filter</Button>
            </Div>
          </Div>
        </Div>

        {/* Mail List Section */}
        <Div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 relative">
          {/* Settings Icon */}
          <Button className="absolute top-6 right-6 p-2 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors">
            <UiIcon as={Settings} className="w-5 h-5 text-slate-600" />
          </Button>

          <Div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <Div className="flex items-center gap-2">
              <H2 className="text-xl font-bold text-slate-900">Mail List</H2>
              <Span className="px-3 py-1 rounded-full text-sm font-semibold bg-slate-100 text-slate-700">{filteredEmails.length}</Span>
            </Div>

            <Div className="flex items-center gap-3">
              <Div className="relative flex-1 sm:flex-initial min-w-[200px]">
                <Input
                  type="text"
                  placeholder="Ex: search email"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2.5 w-full text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400"
                />
                <UiIcon as={Search} className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              </Div>

              <Button className="px-4 py-2.5 text-sm font-medium rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 flex items-center gap-2 transition-all">
                <UiIcon as={Download} className="w-4 h-4" />
                <Span>Export</Span>
                <UiIcon as={ChevronDown} className="w-3 h-3" />
              </Button>
            </Div>
          </Div>

          {/* Table */}
          <Table className="w-full" cols={[70, 240, 170]}>
              <Thead className="bg-slate-50 border-b border-slate-200">
                <Tr>
                  <Th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">SI</Th>
                  <Th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">Email</Th>
                  <Th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">Created At</Th>
                </Tr>
              </Thead>
              <Tbody className="bg-white divide-y divide-slate-100">
                {filteredEmails.map((email) => (
                  <Tr key={email.sl} className="hover:bg-slate-50 transition-colors">
                    <Td className="px-6 py-4 whitespace-nowrap">
                      <Span className="text-sm font-medium text-slate-700">{email.sl}</Span>
                    </Td>
                    <Td className="px-6 py-4 whitespace-nowrap">
                      <Span className="text-sm font-medium text-slate-900">{email.email || 'NA'}</Span>
                    </Td>
                    <Td className="px-6 py-4 whitespace-nowrap">
                      <Span className="text-sm text-slate-700">{email.createdAt}</Span>
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
