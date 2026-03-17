import React, { useState, useEffect } from 'react';
import { RefreshCw, Calculator, ArrowRightLeft } from 'lucide-react';

interface CurrencyConverterProps {
  t: any;
  baseCurrency: string;
  langConfig: any;
}

export function CurrencyConverter({ t, baseCurrency, langConfig }: CurrencyConverterProps) {
  const [amount, setAmount] = useState<number>(1);
  const [targetCurrency, setTargetCurrency] = useState<string>('EUR');
  const [exchangeRate, setExchangeRate] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const currencies = ['USD', 'EUR', 'GBP', 'SAR', 'AED', 'EGP', 'KWD', 'QAR', 'BHD', 'OMR', 'JOD', 'TRY'];

  useEffect(() => {
    const fetchRate = async () => {
      if (baseCurrency === targetCurrency) {
        setExchangeRate(1);
        return;
      }
      setLoading(true);
      try {
        const res = await fetch(`https://open.er-api.com/v6/latest/${baseCurrency}`);
        const data = await res.json();
        if (data && data.rates && data.rates[targetCurrency]) {
          setExchangeRate(data.rates[targetCurrency]);
        }
      } catch (error) {
        console.error('Failed to fetch exchange rate', error);
      } finally {
        setLoading(false);
      }
    };
    fetchRate();
  }, [baseCurrency, targetCurrency]);

  return (
    <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm transition-all duration-200 hover:shadow-md">
      <div className="flex items-center gap-3 mb-5">
        <div className="bg-orange-50 dark:bg-gray-700 p-2 rounded-lg border border-orange-100 dark:border-gray-600">
          <Calculator className="w-5 h-5 text-[#F97316]" />
        </div>
        <h3 className="font-bold text-[#111827] dark:text-white text-lg">{t.currencyConverter || 'Currency Converter'}</h3>
      </div>
      
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-900 p-3 rounded-xl border border-gray-100 dark:border-gray-700">
          <div className="flex flex-col">
            <span className="text-xs font-medium text-gray-500 mb-1">{t.from || 'From'}</span>
            <div className="flex items-center gap-2">
              <span className="font-bold text-[#111827] dark:text-white text-lg">{baseCurrency}</span>
              <span className="text-sm text-gray-500">({t.currencies?.[baseCurrency] || baseCurrency})</span>
            </div>
          </div>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            className={`w-28 p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-base font-medium outline-none focus:border-[#F97316] focus:ring-2 focus:ring-orange-100 transition-all ${langConfig.dir === 'rtl' ? 'text-left' : 'text-right'}`}
            min="0"
            dir="ltr"
          />
        </div>

        <div className="flex justify-center -my-2 relative z-10">
          <div className="bg-white dark:bg-gray-800 p-1.5 rounded-full border border-gray-100 dark:border-gray-700 shadow-sm">
            <ArrowRightLeft className={`w-4 h-4 text-gray-400 ${loading ? 'animate-spin text-[#F97316]' : ''}`} />
          </div>
        </div>

        <div className="flex items-center justify-between bg-orange-50/30 dark:bg-gray-900 p-3 rounded-xl border border-orange-100/50 dark:border-gray-700">
          <div className="flex flex-col flex-1">
            <span className="text-xs font-medium text-gray-500 mb-1">{t.to || 'To'}</span>
            <select
              value={targetCurrency}
              onChange={(e) => setTargetCurrency(e.target.value)}
              className="p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium outline-none focus:border-[#F97316] focus:ring-2 focus:ring-orange-100 transition-all w-full max-w-[200px]"
            >
              {currencies.map(c => (
                <option key={c} value={c}>{c} - {t.currencies?.[c] || c}</option>
              ))}
            </select>
          </div>
          <div className={`flex flex-col justify-center ${langConfig.dir === 'rtl' ? 'items-start' : 'items-end'}`}>
            <span className="text-xs font-medium text-gray-500 mb-1">{t.amount || 'Amount'}</span>
            <span className="font-bold text-[#F97316] text-xl" dir="ltr">
              {exchangeRate !== null ? (amount * exchangeRate).toFixed(2) : '...'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
