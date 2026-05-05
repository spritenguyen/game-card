import * as fs from 'fs';

let content = fs.readFileSync('src/components/FullCard.tsx', 'utf8');

if (!content.includes('import * as LucideIcons')) {
     content = content.replace("import React, { useState } from 'react';", "import React, { useState, createElement } from 'react';\nimport * as LucideIcons from 'lucide-react';\n");
}

if (!content.includes('const Icon =')) {
     content = content.replace('export const FullCard', `
const Icon = ({ name, className }: { name: string, className?: string }) => {
  let iconName = name.replace('fa-solid ', '').replace('fa-', '').replace(/-/g, '');
  if (name.includes('fa-mars')) iconName = 'User';
  else if (name.includes('fa-venus')) iconName = 'User';
  else if (name.includes('fa-camera')) iconName = 'Camera';
  else if (name.includes('fa-fingerprint')) iconName = 'Fingerprint';
  else if (name.includes('fa-earth-americas')) iconName = 'Globe';
  else if (name.includes('fa-galaxy')) iconName = 'Stars';
  else if (name.includes('fa-khanda')) iconName = 'Swords';
  else if (name.includes('fa-bolt')) iconName = 'Zap';
  else if (name.includes('fa-id-card')) iconName = 'UserCircle';
  else if (name.includes('fa-heart')) iconName = 'Heart';
  else if (name.includes('fa-hand-fist')) iconName = 'Frown';
  else if (name.includes('fa-wand-magic')) iconName = 'Wand2';
  else if (name.includes('fa-shield')) iconName = 'Shield';
  else if (name.includes('fa-sparkles')) iconName = 'Sparkles';
  else if (name.includes('fa-fire')) iconName = 'Flame';
  else if (name.includes('fa-ruler')) iconName = 'Ruler';
  else if (name.includes('fa-tape')) iconName = 'Scissors'; 
  else if (name.includes('fa-universal')) iconName = 'Accessibility';
  else if (name.includes('fa-dna')) iconName = 'Dna';
  else if (name.includes('fa-check')) iconName = 'Check';
  else if (name.includes('fa-language')) iconName = 'Languages';
  else if (name.includes('fa-recycle')) iconName = 'Recycle';
  else if (name.includes('fa-user')) iconName = 'User';
  else if (name.includes('fa-plus')) iconName = 'Plus';
  else {
     // Check if it's already a valid name from constants.ts like 'Cpu', 'Flame'
     const words = name.split(' ');
     if (words.length === 1 && (LucideIcons as any)[words[0]]) {
         iconName = words[0];
     } else if (words.length > 1 && (LucideIcons as any)[words[1]]) {
         iconName = words[1];
     }
  }
  
  const Comp = (LucideIcons as any)[iconName] || (LucideIcons as any)[name] || LucideIcons.HelpCircle;
  return createElement(Comp, { className: className, size: 16 });
};

export const FullCard`);
}

content = content.replace(/<i className="([^"]+)"><\/i>/g, '<Icon name="$1" className="$1" />');

fs.writeFileSync('src/components/FullCard.tsx', content);

// Also apply to MiniCard.tsx
let content2 = fs.readFileSync('src/components/MiniCard.tsx', 'utf8');

if (!content2.includes('import * as LucideIcons')) {
     content2 = content2.replace("import React from 'react';", "import React, { createElement } from 'react';\nimport * as LucideIcons from 'lucide-react';\n");
}

if (!content2.includes('const Icon =')) {
     content2 = content2.replace('export const MiniCard', `
const Icon = ({ name, className }: { name: string, className?: string }) => {
  let iconName = name.replace('fa-solid ', '').replace('fa-', '').replace(/-/g, '');
  if (name.includes('fa-mars')) iconName = 'User';
  else if (name.includes('fa-venus')) iconName = 'User';
  else if (name.includes('fa-camera')) iconName = 'Camera';
  else if (name.includes('fa-fingerprint')) iconName = 'Fingerprint';
  else if (name.includes('fa-earth-americas')) iconName = 'Globe';
  else if (name.includes('fa-galaxy')) iconName = 'Stars';
  else if (name.includes('fa-khanda')) iconName = 'Swords';
  else if (name.includes('fa-bolt')) iconName = 'Zap';
  else if (name.includes('fa-id-card')) iconName = 'UserCircle';
  else if (name.includes('fa-heart')) iconName = 'Heart';
  else if (name.includes('fa-hand-fist')) iconName = 'Frown';
  else if (name.includes('fa-wand-magic')) iconName = 'Wand2';
  else if (name.includes('fa-shield')) iconName = 'Shield';
  else if (name.includes('fa-sparkles')) iconName = 'Sparkles';
  else if (name.includes('fa-fire')) iconName = 'Flame';
  else if (name.includes('fa-user')) iconName = 'User';
  else if (name.includes('fa-star')) iconName = 'Star';
  else if (name.includes('fa-arrow')) iconName = 'ArrowUp';
  else {
     const words = name.split(' ');
     if (words.length === 1 && (LucideIcons as any)[words[0]]) {
         iconName = words[0];
     } else if (words.length > 1 && (LucideIcons as any)[words[1]]) {
         iconName = words[1]; // for 'fa-solid Cpu' -> Cpu could be mapped
     }
  }
  const Comp = (LucideIcons as any)[iconName] || (LucideIcons as any)[name] || LucideIcons.HelpCircle;
  return createElement(Comp, { className: className, size: 16 });
};

export const MiniCard`);
}

content2 = content2.replace(/<i className="([^"]+)"><\/i>/g, '<Icon name="$1" className="$1" />');
fs.writeFileSync('src/components/MiniCard.tsx', content2);

console.log("Rewrite done");
