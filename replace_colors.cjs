const fs = require('fs');

function replaceColors(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Replace text colors
  content = content.replace(/text-orange-(300|400|500|600|700|800)/g, 'text-[#F97316]');
  content = content.replace(/text-violet-(400|500|600|700)/g, 'text-[#8B5CF6]');
  content = content.replace(/text-purple-(400|500|600|700)/g, 'text-[#8B5CF6]');
  content = content.replace(/text-blue-(500|600)/g, 'text-[#3B82F6]');
  
  // Replace fill colors
  content = content.replace(/fill-orange-(400|500|600)/g, 'fill-[#F97316]');
  content = content.replace(/fill-violet-(400|500|600)/g, 'fill-[#8B5CF6]');
  content = content.replace(/fill-blue-(400|500|600)/g, 'fill-[#3B82F6]');
  
  // Replace bg colors
  content = content.replace(/bg-orange-(400|500|600)/g, 'bg-[#F97316]');
  content = content.replace(/bg-violet-(400|500|600)/g, 'bg-[#8B5CF6]');
  content = content.replace(/bg-blue-(400|500|600)/g, 'bg-[#3B82F6]');
  
  // Replace border colors
  content = content.replace(/border-orange-(400|500|600)/g, 'border-[#F97316]');
  content = content.replace(/border-violet-(400|500|600)/g, 'border-[#8B5CF6]');
  content = content.replace(/border-blue-(400|500|600)/g, 'border-[#3B82F6]');

  fs.writeFileSync(filePath, content, 'utf8');
}

replaceColors('src/App.tsx');
replaceColors('src/components/CurrencyConverter.tsx');
replaceColors('src/components/TravelTips.tsx');

console.log('Done');
