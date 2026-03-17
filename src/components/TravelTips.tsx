import React, { useState } from 'react';
import { Info, ChevronDown, ChevronUp, FileText, Plane, Compass } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface TravelTipsProps {
  t: any;
  langConfig: any;
}

export function TravelTips({ t, langConfig }: TravelTipsProps) {
  const [isOpen, setIsOpen] = useState(false);

  const tips = [
    {
      title: t.tip1Title || 'Passport & Visa',
      desc: t.tip1Desc || 'Ensure your passport is valid for at least 6 months. Check visa requirements for your destination well in advance.',
      icon: FileText
    },
    {
      title: t.tip2Title || 'Flight & Accommodation',
      desc: t.tip2Desc || 'Book flights and hotels early. Keep digital and physical copies of your booking confirmations.',
      icon: Plane
    },
    {
      title: t.tip3Title || 'Currency & Payments',
      desc: t.tip3Desc || 'Inform your bank about your travel dates. Carry some local currency for immediate expenses upon arrival.',
      icon: Compass
    }
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-orange-100 dark:border-gray-700 shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 bg-orange-50/50 dark:bg-gray-800 hover:bg-orange-50 dark:hover:bg-gray-700 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="bg-orange-100 dark:bg-gray-700 p-2 rounded-lg">
            <Info className="w-5 h-5 text-[#F97316]" />
          </div>
          <span className="font-bold text-[#111827] dark:text-white">{t.travelTips || 'First-Time Traveler Tips'}</span>
        </div>
        <div className="bg-white dark:bg-gray-700 p-1.5 rounded-full shadow-sm border border-orange-100 dark:border-gray-600">
          {isOpen ? <ChevronUp className="w-4 h-4 text-[#F97316]" /> : <ChevronDown className="w-4 h-4 text-[#F97316]" />}
        </div>
      </button>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 space-y-4 bg-white dark:bg-gray-800 border-t border-orange-50 dark:border-gray-700">
              {tips.map((tip, idx) => (
                <div key={idx} className="flex gap-4 items-start group">
                  <div className="bg-orange-50 dark:bg-gray-700 p-2.5 rounded-xl shrink-0 group-hover:bg-orange-100 dark:group-hover:bg-gray-600 transition-colors border border-orange-100/50 dark:border-gray-600">
                    <tip.icon className="w-5 h-5 text-[#F97316]" />
                  </div>
                  <div className="pt-1">
                    <h4 className="font-bold text-[15px] text-[#111827] dark:text-white mb-1">{tip.title}</h4>
                    <p className="text-sm text-[#111827]/60 dark:text-gray-300 leading-relaxed">{tip.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
