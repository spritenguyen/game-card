import React from 'react';
import { getIcon, isIconName, type IconName } from './iconRegistry';
import { resolveLegacyIconName } from './legacyIconName';

export interface IconProps {
  /** Canonical registry name for new callers, checked by TypeScript. */
  icon?: IconName;
  /** Legacy Font Awesome names, optionally containing presentation classes. */
  name?: string;
  className?: string;
}

export const Icon: React.FC<IconProps> = ({ icon, name, className }) => {
  const rawName = icon || name || (className && className.split(' ').find(c => c.startsWith('fa-'))) || "";
  if (!rawName) return null;

  // If the user accidentally passed classes into the name prop (e.g. "fa-crown text-gold mr-2")
  // we extract the classes and will append them to the final output className.
  const parts = rawName.split(' ');
  const actualName = parts.find(p => p.startsWith('fa-')) || parts[0];
  const trailingClasses = icon ? '' : parts.filter(p => !p.startsWith('fa-')).join(' ');

  const iconName = resolveLegacyIconName(actualName);
  const registeredName = icon || (isIconName(iconName) ? iconName : isIconName(actualName) ? actualName : undefined);
  if (!registeredName) console.warn(`Icon not found: ${iconName} or ${actualName}`);
  const Comp = getIcon(registeredName || 'CircleHelp');
  let s = 16;
  if (className?.includes('text-lg')) s = 18;
  if (className?.includes('text-xl')) s = 24;
  if (className?.includes('text-2xl')) s = 28;
  if (className?.includes('text-3xl')) s = 32;
  if (className?.includes('text-4xl')) s = 40;
  if (className?.includes('text-5xl')) s = 48;
  if (className?.includes('text-6xl')) s = 56;
  if (className?.includes('text-7xl')) s = 64;
  if (className?.includes('text-8xl')) s = 80;
  if (className?.includes('text-[8px]')) s = 10;
  if (className?.includes('text-[9px]')) s = 11;
  if (className?.includes('text-[10px]')) s = 12;

  let outClassName = className || "";
  if (trailingClasses) {
    outClassName = outClassName ? `${outClassName} ${trailingClasses}` : trailingClasses;
  }
  
  if (outClassName.includes('fa-spin')) {
    outClassName = outClassName.replace('fa-spin', 'animate-spin');
  }

  // Quick fix: Since trailingClasses could contain text- sizing, we should check it too.
  if (trailingClasses.includes('text-lg')) s = 18;
  if (trailingClasses.includes('text-xl')) s = 24;
  if (trailingClasses.includes('text-2xl')) s = 28;
  if (trailingClasses.includes('text-3xl')) s = 32;
  if (trailingClasses.includes('text-4xl')) s = 40;
  if (trailingClasses.includes('text-5xl')) s = 48;
  if (trailingClasses.includes('text-6xl')) s = 56;
  if (trailingClasses.includes('text-7xl')) s = 64;
  if (trailingClasses.includes('text-8xl')) s = 80;
  if (trailingClasses.includes('text-[8px]')) s = 10;
  if (trailingClasses.includes('text-[9px]')) s = 11;
  if (trailingClasses.includes('text-[10px]')) s = 12;

  return <Comp className={outClassName.trim()} size={s} />;
};
