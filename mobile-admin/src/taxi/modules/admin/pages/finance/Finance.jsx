/* Ported from Frontend/src/modules/Taxi/modules/admin/pages/finance/Finance.jsx (tools/port.js first pass). */
import React from 'react';
import { TrendingUp, Download, Clock, BarChart4, Wallet, ShieldCheck } from 'lucide-react-native';
import { adminService } from '../../services/adminService';
import { Button, Div, H1, H3, P, ScrollDiv, Span, Table, Tbody, Td, Th, Thead, Tr, Icon as UiIcon } from '../../../../../components/web';
const Finance = () => {
  const [settlements, setSettlements] = React.useState([]);
  const [, setIsLoading] = React.useState(true);
  React.useEffect(() => {
    const fetchFinance = async () => {
      try {
        const response = await adminService.getWithdrawals();
        const results = response?.data?.results || [];
        const mapped = results.map((w) => ({
          id: w.transactionId || `#WTH${Math.floor(Math.random() * 1000)}`,
          driver: w.driver_id?.name || 'Unknown Driver',
          amount: `₹${w.amount || 0}`,
          method: w.payment_method || 'Bank Transfer',
          status: w.status ? w.status.charAt(0).toUpperCase() + w.status.slice(1) : 'Pending',
          date: w.createdAt ? new Date(w.createdAt).toLocaleDateString() : 'N/A',
        }));
        setSettlements(mapped);
      } catch (error) {
        console.error('Failed to load withdrawals', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchFinance();
  }, []);
  return (
    <ScrollDiv className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <Div className="flex items-center justify-between">
        <Div>
          <H1 className="text-2xl font-bold tracking-tight text-gray-900">Financial Management</H1>
          <P className="text-gray-400 font-bold text-[11px] mt-1 uppercase tracking-widest leading-none">Net Revenue, Commissions & Payouts</P>
        </Div>
        <Div className="flex items-center gap-3">
          <Button className="bg-gray-50 border border-gray-200 text-gray-600 px-4 py-2 rounded-lg text-[13px] font-bold hover:bg-gray-100 flex items-center gap-2">
            <UiIcon as={Download} size={16} /> Tax Reports
          </Button>
          <Button className="bg-black text-white px-4 py-2 rounded-lg text-[13px] font-bold hover:opacity-80 flex items-center gap-2">
            <UiIcon as={Wallet} size={16} /> Process Payouts
          </Button>
        </Div>
      </Div>

      {/* Financial Overview Cards */}
      <Div className="grid grid-cols-4 gap-6">
        <Div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <P className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Net Revenue</P>
          <P className="text-3xl font-black text-gray-900 mt-2 tracking-tight">₹12.4L</P>
          <Div className="flex items-center gap-1 text-green-500 text-[11px] font-bold mt-2">
            <UiIcon as={TrendingUp} size={14} /> +12.4% <Span className="text-gray-300">vs last month</Span>
          </Div>
        </Div>
        <Div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <P className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Platform Commission</P>
          <P className="text-3xl font-black text-gray-900 mt-2 tracking-tight">₹2.8L</P>
          <Div className="flex items-center gap-1 text-green-500 text-[11px] font-bold mt-2">
            <UiIcon as={TrendingUp} size={14} /> +5.2% <Span className="text-gray-300">avg 15%</Span>
          </Div>
        </Div>
        <Div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <P className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Driver Earnings</P>
          <P className="text-3xl font-black text-gray-900 mt-2 tracking-tight">₹9.6L</P>
          <Div className="flex items-center gap-1 text-blue-500 text-[11px] font-bold mt-2 font-black">
            84.2% <Span className="text-gray-300 font-bold ml-1">of GTV</Span>
          </Div>
        </Div>
        <Div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <P className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Pending Payouts</P>
          <P className="text-3xl font-black text-primary mt-2 tracking-tight">₹42.5k</P>
          <Div className="flex items-center gap-1 text-orange-500 text-[11px] font-bold mt-2">
            <UiIcon as={Clock} size={14} /> 12 Requests <Span className="text-gray-300 ml-1">unprocessed</Span>
          </Div>
        </Div>
      </Div>

      <Div className="grid grid-cols-3 gap-8">
        {/* Monthly Trend Chart Placeholder */}
        <Div className="col-span-2 bg-white rounded-2xl border border-gray-100 p-8 shadow-sm">
          <Div className="flex items-center justify-between mb-8">
            <H3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <UiIcon as={BarChart4} size={20} className="text-primary" /> Revenue Trending
            </H3>
            <Div className="flex gap-2">
              <Button className="bg-gray-50 text-[11px] font-bold px-3 py-1 rounded-lg">30 Days</Button>
              <Button className="text-[11px] font-bold px-3 py-1 rounded-lg">90 Days</Button>
            </Div>
          </Div>
          {/* Visual Placeholder for a Chart */}
          <Div className="h-64 w-full flex items-end gap-3 px-4">
            {[40, 60, 45, 90, 65, 80, 50, 70, 85, 40, 55, 95].map((h, i) => (
              <Div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                <Div
                  className={`w-full rounded-t-lg transition-all cursor-pointer ${i === 11 ? 'bg-primary' : 'bg-gray-100 hover:bg-gray-200'}`}
                  style={{
                    height: `${h}%`,
                  }}
                ></Div>
                <Span className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">
                  {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][i]}
                </Span>
              </Div>
            ))}
          </Div>
        </Div>

        {/* Payout Channels Breakdown */}
        <Div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm flex flex-col justify-between">
          <Div>
            <H3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
              <UiIcon as={ShieldCheck} size={20} className="text-green-500" /> Settlement Quality
            </H3>
            <Div className="space-y-6">
              {[
                {
                  label: 'UPI Instant',
                  value: 82,
                  color: 'bg-primary',
                },
                {
                  label: 'Bank Transfer',
                  value: 15,
                  color: 'bg-blue-500',
                },
                {
                  label: 'Cash Remittance',
                  value: 3,
                  color: 'bg-orange-500',
                },
              ].map((chan, i) => (
                <Div key={i} className="space-y-2">
                  <Div className="flex justify-between text-[11px] font-bold">
                    <Span className="text-gray-500">{chan.label}</Span>
                    <Span className="text-gray-900">{chan.value}%</Span>
                  </Div>
                  <Div className="h-1.5 w-full bg-gray-50 rounded-full overflow-hidden">
                    <Div
                      className={`${chan.color} h-full rounded-full`}
                      style={{
                        width: `${chan.value}%`,
                      }}
                    ></Div>
                  </Div>
                </Div>
              ))}
            </Div>
          </Div>
          <Div className="mt-8 p-4 bg-gray-50 rounded-xl border border-gray-100 border-dashed">
            <P className="text-[10px] font-bold text-gray-500 uppercase leading-relaxed">
              System Health: All financial gateways are operational. Next batch settlement in 4h 22m.
            </P>
          </Div>
        </Div>
      </Div>

      {/* Recent Settlements Table */}
      <Div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <Div className="p-6 border-b border-gray-50 flex items-center justify-between">
          <H3 className="text-lg font-bold text-gray-900">Recent Settlements</H3>
          <Button className="text-[11px] font-black text-primary uppercase tracking-widest hover:underline">Full Statement</Button>
        </Div>
        <Table cols={[150, 180, 110, 120, 140]} className="w-full text-left">
          <Thead>
            <Tr className="bg-gray-50/50 text-[10px] font-black text-gray-400 uppercase border-b border-gray-50">
              <Th className="px-6 py-4">Transaction ID</Th>
              <Th className="px-6 py-4">Driver</Th>
              <Th className="px-6 py-4">Amount</Th>
              <Th className="px-6 py-4 text-center">Status</Th>
              <Th className="px-6 py-4 text-right">Processed On</Th>
            </Tr>
          </Thead>
          <Tbody className="divide-y divide-gray-50">
            {settlements.map((st, i) => (
              <Tr key={i} className="hover:bg-gray-50/50 transition-all cursor-pointer">
                <Td className="px-6 py-4 text-[12px] font-bold text-gray-900">{st.id}</Td>
                <Td className="px-6 py-4">
                  <Div className="flex items-center gap-2">
                    <Div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-[9px] font-black text-gray-500 uppercase">
                      {st.driver[0]}
                    </Div>
                    <Span className="text-[12px] font-bold text-gray-700">{st.driver}</Span>
                  </Div>
                </Td>
                <Td className="px-6 py-4 text-[13px] font-black text-gray-900">{st.amount}</Td>
                <Td className="px-6 py-4">
                  <Div className="flex justify-center">
                    <Span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${st.status === 'Completed' ? 'bg-green-50 text-green-600 border-green-100' : st.status === 'Pending' ? 'bg-orange-50 text-orange-600 border-orange-100' : 'bg-red-50 text-red-600 border-red-100'}`}
                    >
                      {st.status}
                    </Span>
                  </Div>
                </Td>
                <Td className="px-6 py-4 text-right text-[11px] font-bold text-gray-400">{st.date}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Div>
    </ScrollDiv>
  );
};
export default Finance;
