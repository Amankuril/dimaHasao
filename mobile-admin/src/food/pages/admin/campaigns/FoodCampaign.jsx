/* Ported from Frontend/src/modules/Food/pages/admin/campaigns/FoodCampaign.jsx (tools/port.js first pass). */
import { useState, useMemo } from 'react';
import { Search, Download, ChevronDown, ArrowUpDown, Plus, Edit, Trash2, Megaphone, Settings } from 'lucide-react-native';
import { emptyFoodCampaigns } from '../../../utils/adminFallbackData';
import { Button, Div, H1, Input, P, ScrollDiv, Span, Table, Tbody, Td, Th, Thead, Tr, Icon as UiIcon } from '../../../../components/web';
import { window } from '../../../../lib/webShim';
export default function FoodCampaign() {
  const [searchQuery, setSearchQuery] = useState('');
  const [campaigns, setCampaigns] = useState(emptyFoodCampaigns);
  const filteredCampaigns = useMemo(() => {
    if (!searchQuery.trim()) {
      return campaigns;
    }
    const query = searchQuery.toLowerCase().trim();
    return campaigns.filter((campaign) => campaign.title.toLowerCase().includes(query));
  }, [campaigns, searchQuery]);
  const handleToggleStatus = (sl) => {
    setCampaigns(
      campaigns.map((campaign) =>
        campaign.sl === sl
          ? {
              ...campaign,
              status: !campaign.status,
            }
          : campaign,
      ),
    );
  };
  const handleDelete = async (sl) => {
    if (await window.confirmAsync('Are you sure you want to delete this campaign?')) {
      setCampaigns(campaigns.filter((campaign) => campaign.sl !== sl));
    }
  };
  return (
    <ScrollDiv className="p-4 lg:p-6 bg-slate-50 min-h-screen">
      {/* Header */}
      <Div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
        <Div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <Div className="flex items-center gap-3">
            <Div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center">
              <UiIcon as={Megaphone} className="w-5 h-5 text-white" />
            </Div>
            <Div className="flex items-center gap-2">
              <H1 className="text-2xl font-bold text-slate-900">Food Campaign</H1>
              <Span className="px-3 py-1 rounded-full text-sm font-semibold bg-slate-100 text-slate-700">{filteredCampaigns.length}</Span>
            </Div>
          </Div>

          <Button className="px-4 py-2.5 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-2 transition-all shadow-md">
            <UiIcon as={Plus} className="w-4 h-4" />
            Add New Campaign
          </Button>
        </Div>

        <Div className="flex items-center gap-3">
          <Div className="relative flex-1 sm:flex-initial min-w-[200px]">
            <Input
              type="text"
              placeholder="Ex : title"
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

          <Button className="p-2.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 transition-all">
            <UiIcon as={Settings} className="w-5 h-5" />
          </Button>
        </Div>
      </Div>

      {/* Table */}
      <Div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <Div>
          <Table className="w-full" cols={[90, 180, 170, 150, 110, 110, 96]}>
            <Thead className="bg-slate-50 border-b border-slate-200">
              <Tr>
                <Th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                  <Div className="flex items-center gap-2">
                    <Span>SI</Span>
                    <UiIcon as={ArrowUpDown} className="w-3 h-3 text-slate-400 cursor-pointer hover:text-slate-600" />
                  </Div>
                </Th>
                <Th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                  <Div className="flex items-center gap-2">
                    <Span>Title</Span>
                    <UiIcon as={ArrowUpDown} className="w-3 h-3 text-slate-400 cursor-pointer hover:text-slate-600" />
                  </Div>
                </Th>
                <Th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                  <Div className="flex items-center gap-2">
                    <Span>Date</Span>
                    <UiIcon as={ArrowUpDown} className="w-3 h-3 text-slate-400 cursor-pointer hover:text-slate-600" />
                  </Div>
                </Th>
                <Th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                  <Div className="flex items-center gap-2">
                    <Span>Time</Span>
                    <UiIcon as={ArrowUpDown} className="w-3 h-3 text-slate-400 cursor-pointer hover:text-slate-600" />
                  </Div>
                </Th>
                <Th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                  <Div className="flex items-center gap-2">
                    <Span>Price</Span>
                    <UiIcon as={ArrowUpDown} className="w-3 h-3 text-slate-400 cursor-pointer hover:text-slate-600" />
                  </Div>
                </Th>
                <Th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                  <Div className="flex items-center gap-2">
                    <Span>Status</Span>
                    <UiIcon as={ArrowUpDown} className="w-3 h-3 text-slate-400 cursor-pointer hover:text-slate-600" />
                  </Div>
                </Th>
                <Th className="px-6 py-4 text-center text-[10px] font-bold text-slate-700 uppercase tracking-wider">Action</Th>
              </Tr>
            </Thead>
            <Tbody className="bg-white divide-y divide-slate-100">
              {filteredCampaigns.length === 0 ? (
                <Tr>
                  <Td colSpan={7} className="px-6 py-20 text-center">
                    <P className="text-lg font-semibold text-slate-700 mb-1">No Data Found</P>
                    <P className="text-sm text-slate-500">No campaigns match your search</P>
                  </Td>
                </Tr>
              ) : (
                filteredCampaigns.map((campaign) => (
                  <Tr key={campaign.sl} className="hover:bg-slate-50 transition-colors">
                    <Td className="px-6 py-4 whitespace-nowrap">
                      <Span className="text-sm font-medium text-slate-700">{campaign.sl}</Span>
                    </Td>
                    <Td className="px-6 py-4">
                      <Span className="text-sm font-medium text-blue-600">{campaign.title}</Span>
                    </Td>
                    <Td className="px-6 py-4 whitespace-nowrap">
                      <Span className="text-sm text-slate-700">
                        {campaign.dateStart} - {campaign.dateEnd}
                      </Span>
                    </Td>
                    <Td className="px-6 py-4 whitespace-nowrap">
                      <Span className="text-sm text-slate-700">
                        {campaign.timeStart} - {campaign.timeEnd}
                      </Span>
                    </Td>
                    <Td className="px-6 py-4 whitespace-nowrap">
                      <Span className="text-sm font-medium text-slate-900">$ {campaign.price.toFixed(2)}</Span>
                    </Td>
                    <Td className="px-6 py-4 whitespace-nowrap">
                      <Button
                        onClick={() => handleToggleStatus(campaign.sl)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${campaign.status ? 'bg-blue-600' : 'bg-slate-300'}`}
                      >
                        <Span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${campaign.status ? 'translate-x-6' : 'translate-x-1'}`}
                        />
                      </Button>
                    </Td>
                    <Td className="px-6 py-4 whitespace-nowrap text-center">
                      <Div className="flex items-center justify-center gap-2">
                        <Button className="p-1.5 rounded text-blue-600 hover:bg-blue-50 transition-colors">
                          <UiIcon as={Edit} className="w-4 h-4" />
                        </Button>
                        <Button onClick={() => handleDelete(campaign.sl)} className="p-1.5 rounded text-red-600 hover:bg-red-50 transition-colors">
                          <UiIcon as={Trash2} className="w-4 h-4" />
                        </Button>
                      </Div>
                    </Td>
                  </Tr>
                ))
              )}
            </Tbody>
          </Table>
        </Div>
      </Div>
    </ScrollDiv>
  );
}
