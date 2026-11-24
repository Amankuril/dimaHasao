import { useState } from "react";

export default function SetupTaxes() {
  const [statusOn, setStatusOn] = useState(true);
  const [productPriceMode, setProductPriceMode] = useState("exclude");
  const [taxType, setTaxType] = useState("order-wise");
  const [taxRate, setTaxRate] = useState("custom-10");
  const [packagingTaxOn, setPackagingTaxOn] = useState(true);

  return (
    <div className="p-4 lg:p-6 bg-neutral-50 min-h-screen">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="text-xl lg:text-2xl font-medium text-neutral-900">
          Setup tax calculation
        </h1>
      </div>

      <div className="space-y-4">
        {/* Allow Tax calculation card */}
        <div className="bg-white rounded-lg shadow-sm border border-neutral-200">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 px-4 py-3 border-b border-neutral-100">
            <div>
              <h2 className="text-sm font-medium text-neutral-900">
                Allow Tax Calculation For Restaurant ?
              </h2>
              <p className="text-xs text-neutral-500 mt-1">
                To active tax calculation Turn On The Status
              </p>
            </div>
            <ToggleSwitch enabled={statusOn} onToggle={() => setStatusOn((p) => !p)} />
          </div>

          {/* Tax based on product price */}
          <div className="px-4 py-4 border-b border-neutral-100">
            <h3 className="text-sm font-medium text-neutral-900 mb-3">
              Tax calculation based on Product Price
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-neutral-700">
              <label className="flex gap-3 rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 cursor-pointer">
                <input
                  type="radio"
                  name="price-mode"
                  checked={productPriceMode === "include"}
                  onChange={() => setProductPriceMode("include")}
                  className="mt-1 w-3.5 h-3.5 text-[#0a4d2b]"
                />
                <div>
                  <p className="font-medium text-neutral-900 mb-0.5">
                    Calculate tax include product price
                  </p>
                  <p className="text-xs leading-relaxed">
                    By selecting this option no need to setup VAT from here. If
                    enabled the customer will see the total food price
                    including VAT.
                  </p>
                </div>
              </label>

              <label className="flex gap-3 rounded-lg border border-[#0a4d2b] bg-neutral-50 px-4 py-3 cursor-pointer">
                <input
                  type="radio"
                  name="price-mode"
                  checked={productPriceMode === "exclude"}
                  onChange={() => setProductPriceMode("exclude")}
                  className="mt-1 w-3.5 h-3.5 text-[#0a4d2b]"
                />
                <div>
                  <p className="font-medium text-neutral-900 mb-0.5">
                    Calculate tax exclude product price
                  </p>
                  <p className="text-xs leading-relaxed">
                    By selecting this option you will need to setup individual
                    vat rate for different types of income source
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Basic setup */}
          <div className="px-4 py-4 border-b border-neutral-100">
            <h3 className="text-sm font-medium text-neutral-900 mb-3">
              Basic setup
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-medium text-neutral-700 mb-1.5">
                  Select tax type
                </label>
                <select
                  value={taxType}
                  onChange={(e) => setTaxType(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#0a4d2b]/30 focus:border-neutral-400"
                >
                  <option value="order-wise">Order wise</option>
                  <option value="item-wise">Item wise</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-neutral-700 mb-1.5">
                  Select tax rate
                </label>
                <div className="relative">
                  <select
                    value={taxRate}
                    onChange={(e) => setTaxRate(e.target.value)}
                    className="w-full pl-3 pr-8 py-2 border border-neutral-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#0a4d2b]/30 focus:border-neutral-400"
                  >
                    <option value="custom-10">Custom Tax (10%)</option>
                    <option value="gst-15">GST (15%)</option>
                    <option value="income-5">Income Tax (5%)</option>
                  </select>
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-neutral-400 pointer-events-none">
                    ▾
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Additional setup */}
          <div className="px-4 py-4">
            <h3 className="text-sm font-medium text-neutral-900 mb-3">
              Additional setup
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-medium text-neutral-700 mb-1.5">
                  Tax on packaging charge
                </label>
                <ToggleSwitch
                  enabled={packagingTaxOn}
                  onToggle={() => setPackagingTaxOn((p) => !p)}
                />
              </div>

              <div>
                <label className="block font-medium text-neutral-700 mb-1.5">
                  &nbsp;
                </label>
                <div className="relative">
                  <select
                    value="gst-15"
                    readOnly
                    className="w-full pl-3 pr-8 py-2 border border-neutral-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#0a4d2b]/30 focus:border-neutral-400"
                  >
                    <option>GST (15%)</option>
                  </select>
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-neutral-400 pointer-events-none">
                    ▾
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer buttons */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3">
          <button
            type="button"
            className="px-4 py-2 text-xs font-medium rounded-lg border border-neutral-300 text-neutral-700 hover:bg-neutral-100 transition-colors"
          >
            Reset
          </button>
          <button
            type="button"
            className="px-4 py-2 text-xs font-medium rounded-lg bg-neutral-900 text-white hover:bg-neutral-800 transition-colors"
          >
            Save information
          </button>
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
