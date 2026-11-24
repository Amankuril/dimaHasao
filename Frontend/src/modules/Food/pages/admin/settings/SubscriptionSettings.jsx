import { useState } from "react";

export default function SubscriptionSettings() {
  const [freeTrialOn, setFreeTrialOn] = useState(true);
  const [freeTrialPeriod, setFreeTrialPeriod] = useState("7");
  const [freeTrialUnit, setFreeTrialUnit] = useState("Day");

  const [warningDays, setWarningDays] = useState("5");
  const [warningMessage, setWarningMessage] = useState(
    "Your subscription ending soon. Please renew to continue access."
  );

  const [returnUsage, setReturnUsage] = useState("80");

  return (
    <div className="p-4 lg:p-6 bg-neutral-50 min-h-screen">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-xl lg:text-2xl font-medium text-neutral-900 flex items-center gap-2">
          <span role="img" aria-label="subscription settings">
            ⚙️
          </span>
          <span>Subscription settings</span>
        </h1>
      </div>

      <div className="space-y-4">
        {/* Offer Free Trial */}
        <div className="bg-white rounded-lg shadow-sm border border-neutral-200">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 px-5 py-4 border-b border-neutral-100">
            <div>
              <h2 className="text-sm font-medium text-neutral-900">
                Offer free trial
              </h2>
              <p className="text-xs text-neutral-500 mt-1 max-w-xl">
                You can offer vendors a free trial to experience the system
                overall
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="text-neutral-700">Status:</span>
              <ToggleSwitch
                enabled={freeTrialOn}
                onToggle={() => setFreeTrialOn((p) => !p)}
              />
            </div>
          </div>

          <div className="px-5 py-4 flex flex-col md:flex-row gap-4 items-center">
            <div className="flex-1 w-full md:w-auto">
              <label className="block text-xs font-medium text-neutral-700 mb-1.5">
                Free trial period
              </label>
              <input
                type="number"
                min={0}
                value={freeTrialPeriod}
                onChange={(e) => setFreeTrialPeriod(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#0a4d2b]/30 focus:border-neutral-400"
              />
            </div>

            <div className="w-full md:w-48">
              <label className="block text-xs font-medium text-neutral-700 mb-1.5">
                &nbsp;
              </label>
              <div className="relative">
                <select
                  value={freeTrialUnit}
                  onChange={(e) => setFreeTrialUnit(e.target.value)}
                  className="w-full pl-3 pr-8 py-2 text-xs border border-neutral-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#0a4d2b]/30 focus:border-neutral-400 appearance-none"
                >
                  <option>Day</option>
                  <option>Month</option>
                </select>
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-neutral-400 pointer-events-none">
                  ▾
                </span>
              </div>
            </div>

            <div className="w-full md:w-auto md:self-end flex justify-end">
              <button
                type="button"
                className="px-4 py-2 text-xs font-medium rounded-lg bg-neutral-900 text-white hover:bg-neutral-800 transition-colors"
              >
                Submit
              </button>
            </div>
          </div>
        </div>

        {/* Show Deadline Warning */}
        <div className="bg-white rounded-lg shadow-sm border border-neutral-200">
          <div className="px-5 py-4 border-b border-neutral-100">
            <h2 className="text-sm font-medium text-neutral-900">
              Show deadline warning
            </h2>
            <p className="text-xs text-neutral-500 mt-1 max-w-xl">
              Select the number of days before the warning will be shown with a
              countdown to the end of all packages
            </p>
          </div>

          <div className="px-5 py-4 flex flex-col lg:flex-row gap-4">
            <div className="w-full lg:w-1/3">
              <label className="block text-xs font-medium text-neutral-700 mb-1.5">
                Select days
              </label>
              <input
                type="number"
                min={0}
                value={warningDays}
                onChange={(e) => setWarningDays(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#0a4d2b]/30 focus:border-neutral-400"
              />
            </div>

            <div className="w-full lg:flex-1">
              <label className="block text-xs font-medium text-neutral-700 mb-1.5">
                Type message
              </label>
              <input
                type="text"
                value={warningMessage}
                onChange={(e) => setWarningMessage(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#0a4d2b]/30 focus:border-neutral-400"
              />
            </div>

            <div className="w-full lg:w-auto lg:self-end flex justify-end">
              <button
                type="button"
                className="px-4 py-2 text-xs font-medium rounded-lg bg-neutral-900 text-white hover:bg-neutral-800 transition-colors"
              >
                Submit
              </button>
            </div>
          </div>
        </div>

        {/* Return Money Restriction */}
        <div className="bg-white rounded-lg shadow-sm border border-neutral-200 mb-4">
          <div className="px-5 py-4 border-b border-neutral-100">
            <h2 className="text-sm font-medium text-neutral-900">
              Return money restriction
            </h2>
            <p className="text-xs text-neutral-500 mt-1 max-w-xl">
              Setup the amount after which if any restaurant change / migrate
              the subscription plan you won&apos;t return any money back
            </p>
          </div>

          <div className="px-5 py-4 flex flex-col lg:flex-row gap-4 items-center">
            <div className="flex-1 w-full">
              <label className="block text-xs font-medium text-neutral-700 mb-1.5">
                Select subscription usage time (%)
              </label>
              <input
                type="number"
                min={0}
                max={100}
                value={returnUsage}
                onChange={(e) => setReturnUsage(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#0a4d2b]/30 focus:border-neutral-400"
              />
            </div>

            <div className="w-full lg:w-auto lg:self-end flex justify-end">
              <button
                type="button"
                className="px-4 py-2 text-xs font-medium rounded-lg bg-neutral-900 text-white hover:bg-neutral-800 transition-colors"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ToggleSwitch({ enabled, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`inline-flex items-center w-11 h-6 rounded-full border transition-colors ${
        enabled
          ? "bg-neutral-900 border-[#0a4d2b] justify-end"
          : "bg-neutral-200 border-neutral-300 justify-start"
      }`}
    >
      <span className="h-5 w-5 rounded-full bg-white shadow-sm" />
    </button>
  );
}
