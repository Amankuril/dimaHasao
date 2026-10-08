/* Ported from Frontend/src/modules/Food/pages/admin/campaigns/FoodCampaign.jsx (tools/port.js first pass). */
import { useState, useMemo } from 'react';
import { Search, Download, Plus, Edit, Trash2, Megaphone, Settings } from 'lucide-react-native';
import { emptyFoodCampaigns } from '../../../utils/adminFallbackData';
import {
  AdminPage,
  PageHeader,
  Card,
  Toolbar,
  DataTable,
  THead,
  TBody,
  Row,
  Cell,
  StatusBadge,
  EmptyState,
  BTN_PRIMARY,
  BTN_SECONDARY,
  BTN_TEXT_PRIMARY,
  BTN_TEXT_SECONDARY,
} from '../../../../admin/ui';
import { Button, Div, Input, Span, Icon as UiIcon } from '../../../../components/web';
import { window } from '../../../../lib/webShim';

const COLS = [56, 170, 150, 130, 110, 120, 104];
const LABELS = ['SI', 'Title', 'Date', 'Time', 'Price', 'Status', 'Action'];

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
    <AdminPage maxWidth={1200}>
      <PageHeader
        icon={Megaphone}
        title="Food Campaign"
        subtitle={`${filteredCampaigns.length} ${filteredCampaigns.length === 1 ? 'campaign' : 'campaigns'} in this list`}
        breadcrumb={[{ label: 'Food' }, { label: 'Promotions' }, { label: 'Food campaign' }]}
        actions={
          <>
            <Button className={BTN_PRIMARY}>
              <UiIcon as={Plus} size={16} className="text-white" />
              <Span className={BTN_TEXT_PRIMARY}>Add New Campaign</Span>
            </Button>
            <Button className={BTN_SECONDARY}>
              <UiIcon as={Download} size={16} className="text-slate-600" />
              <Span className={BTN_TEXT_SECONDARY}>Export</Span>
            </Button>
            <Button className={`${BTN_SECONDARY} w-11 px-0`} accessibilityLabel="Table settings">
              <UiIcon as={Settings} size={18} className="text-slate-600" />
            </Button>
          </>
        }
      />

      <Card className="mb-4">
        <Toolbar className="mb-0">
          <Div className="flex-row items-center gap-2 h-11 px-3 rounded-lg border border-slate-300 bg-white flex-1 min-w-[200px]">
            <UiIcon as={Search} size={16} className="text-slate-400" />
            <Input
              type="text"
              placeholder="Ex : title"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 text-sm text-slate-900"
            />
          </Div>
        </Toolbar>
      </Card>

      {filteredCampaigns.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="No campaigns found"
          message={searchQuery ? 'No campaigns match your search. Try a different title.' : 'Food campaigns will show up here once they are created.'}
        />
      ) : (
        <DataTable cols={COLS}>
          <THead cols={COLS} labels={LABELS} />
          <TBody>
            {filteredCampaigns.map((campaign, i, all) => (
              <Row key={campaign.sl} last={i === all.length - 1}>
                <Cell width={COLS[0]}>{String(campaign.sl)}</Cell>
                <Cell width={COLS[1]}>
                  <Span className="text-sm font-semibold text-slate-900">{campaign.title}</Span>
                </Cell>
                <Cell width={COLS[2]}>{`${campaign.dateStart} - ${campaign.dateEnd}`}</Cell>
                <Cell width={COLS[3]}>{`${campaign.timeStart} - ${campaign.timeEnd}`}</Cell>
                <Cell width={COLS[4]}>
                  <Span className="text-sm font-semibold text-slate-900">{`$ ${campaign.price.toFixed(2)}`}</Span>
                </Cell>
                <Cell width={COLS[5]}>
                  <Button
                    onClick={() => handleToggleStatus(campaign.sl)}
                    className="h-11 justify-center"
                    accessibilityLabel={`Toggle status for ${campaign.title}`}
                  >
                    <StatusBadge status={campaign.status ? 'active' : 'inactive'} />
                  </Button>
                </Cell>
                <Cell width={COLS[6]}>
                  <Div className="flex-row items-center gap-1">
                    <Button className="w-11 h-11 rounded-lg items-center justify-center" accessibilityLabel={`Edit ${campaign.title}`}>
                      <UiIcon as={Edit} size={16} className="text-blue-600" />
                    </Button>
                    <Button
                      onClick={() => handleDelete(campaign.sl)}
                      className="w-11 h-11 rounded-lg items-center justify-center"
                      accessibilityLabel={`Delete ${campaign.title}`}
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
