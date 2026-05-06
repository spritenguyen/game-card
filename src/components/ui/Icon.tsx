import React from 'react';
import * as LucideIcons from 'lucide-react';

export const Icon = ({ name, className }: { name?: string, className?: string }) => {
  const actualName = name || (className && className.split(' ').find(c => c.startsWith('fa-'))) || "";
  if (!actualName) return null;

  let iconName = actualName.split(' ')[0].replace('fa-solid ', '').replace('fa-brands ', '').replace('fa-regular ', '').replace('fa-', '').replace(/-/g, '');
  
  if (actualName.includes('fa-mars')) iconName = 'User';
  else if (actualName.includes('fa-venus')) iconName = 'User';
  else if (actualName.includes('fa-box')) iconName = 'Box';
  else if (actualName.includes('fa-boxes-stacked')) iconName = 'Boxes';
  else if (actualName.includes('fa-map-location-dot') || actualName.includes('fa-map-location')) iconName = 'MapPinned';
  else if (actualName.includes('fa-camera-viewfinder') || actualName.includes('fa-camera-retro') || actualName.includes('fa-camera')) iconName = 'Camera';
  else if (actualName.includes('fa-shield-cat')) iconName = 'ShieldAlert';
  else if (actualName.includes('fa-galactic-senate')) iconName = 'Landmark';
  else if (actualName.includes('fa-street-view')) iconName = 'User';
  else if (actualName.includes('fa-exchange-alt') || actualName.includes('fa-arrows-rotate')) iconName = 'RefreshCw';
  else if (actualName.includes('fa-flask-vial') || actualName.includes('fa-flask')) iconName = 'FlaskConical';
  else if (actualName.includes('fa-shoe-prints')) iconName = 'Footprints';
  else if (actualName.includes('fa-universal-access') || actualName.includes('fa-universal')) iconName = 'Accessibility';
  else if (actualName.includes('fa-fingerprint')) iconName = 'Fingerprint';
  else if (actualName.includes('fa-earth-americas') || actualName.includes('fa-globe')) iconName = 'Globe';
  else if (actualName.includes('fa-galaxy')) iconName = 'Stars';
  else if (actualName.includes('fa-khanda')) iconName = 'Swords';
  else if (actualName.includes('fa-bolt')) iconName = 'Zap';
  else if (actualName.includes('fa-id-card')) iconName = 'CircleUser';
  else if (actualName.includes('fa-heart')) iconName = 'Heart';
  else if (actualName.includes('fa-hand-fist')) iconName = 'Frown';
  else if (actualName.includes('fa-wand-magic')) iconName = 'Wand2';
  else if (actualName.includes('fa-shield-virus')) iconName = 'ShieldAlert';
  else if (actualName.includes('fa-shield')) iconName = 'Shield';
  else if (actualName.includes('fa-snowflake')) iconName = 'Snowflake';
  else if (actualName.includes('fa-arrow-right-to-bracket')) iconName = 'Crosshair';
  else if (actualName.includes('fa-sparkles')) iconName = 'Sparkles';
  else if (actualName.includes('fa-fire')) iconName = 'Flame';
  else if (actualName.includes('fa-user')) iconName = 'User';
  else if (actualName.includes('fa-star')) iconName = 'Star';
  else if (actualName.includes('fa-arrow')) iconName = 'ArrowUp';
  else if (actualName.includes('fa-xmark')) iconName = 'X';
  else if (actualName.includes('fa-plus')) iconName = 'Plus';
  else if (actualName.includes('fa-minus')) iconName = 'Minus';
  else if (actualName.includes('fa-box')) iconName = 'Box';
  else if (actualName.includes('fa-gem')) iconName = 'Gem';
  else if (actualName.includes('fa-coins')) iconName = 'Coins';
  else if (actualName.includes('fa-dna')) iconName = 'Dna';
  else if (actualName.includes('fa-skull')) iconName = 'Skull';
  else if (actualName.includes('fa-link')) iconName = 'Link';
  else if (actualName.includes('fa-crown')) iconName = 'Crown';
  else if (actualName.includes('fa-hammer')) iconName = 'Hammer';
  else if (actualName.includes('fa-chart-pie')) iconName = 'PieChart';
  else if (actualName.includes('fa-meteor')) iconName = 'Asteroid';
  else if (actualName.includes('fa-flask')) iconName = 'FlaskConical';
  else if (actualName.includes('fa-biohazard')) iconName = 'Biohazard';
  else if (actualName.includes('fa-server')) iconName = 'Server';
  else if (actualName.includes('fa-atom')) iconName = 'Atom';
  else if (actualName.includes('fa-circle-notch') || actualName.includes('fa-spinner')) iconName = 'Loader2';
  else if (actualName.includes('fa-circle-question')) iconName = 'CircleHelp';
  else if (actualName.includes('fa-circle-exclamation')) iconName = 'CircleAlert';
  else if (actualName.includes('fa-circle-info')) iconName = 'Info';
  else if (actualName.includes('fa-microchip')) iconName = 'Cpu';
  else if (actualName.includes('fa-chart-line')) iconName = 'LineChart';
  else if (actualName.includes('fa-lock')) iconName = 'Lock';
  else if (actualName.includes('fa-vault')) iconName = 'Lock'; 
  else if (actualName.includes('fa-bolt-lightning')) iconName = 'Zap';
  else if (actualName.includes('fa-caret-down')) iconName = 'ChevronDown';
  else if (actualName.includes('fa-list-check')) iconName = 'ListChecks';
  else if (actualName.includes('fa-map-location')) iconName = 'Map';
  else if (actualName.includes('fa-download')) iconName = 'Download';
  else if (actualName.includes('fa-users')) iconName = 'Users';
  else if (actualName.includes('fa-clock-rotate-left')) iconName = 'History';
  else if (actualName.includes('fa-clock')) iconName = 'Clock';
  else if (actualName.includes('fa-gift')) iconName = 'Gift';
  else if (actualName.includes('fa-cube')) iconName = 'Cuboid';
  else if (actualName.includes('fa-location-arrow')) iconName = 'Navigation';
  else if (actualName.includes('fa-satellite-dish')) iconName = 'SatelliteDish';
  else if (actualName.includes('fa-satellite')) iconName = 'Satellite';
  else if (actualName.includes('fa-crosshairs')) iconName = 'Crosshair';
  else if (actualName.includes('fa-terminal')) iconName = 'Terminal';
  else if (actualName.includes('fa-ticket')) iconName = 'Ticket';
  else if (actualName.includes('fa-store')) iconName = 'Store';
  else if (actualName.includes('fa-cart-shopping')) iconName = 'ShoppingCart';
  else if (actualName.includes('fa-code-merge')) iconName = 'GitMerge';
  else if (actualName.includes('fa-compact-disc')) iconName = 'Disc';
  else if (actualName.includes('fa-microscope')) iconName = 'Microscope';
  else if (actualName.includes('fa-ghost')) iconName = 'Ghost';
  else if (actualName.includes('fa-radar')) iconName = 'Radar';
  else if (actualName.includes('fa-sun')) iconName = 'Sun';
  else if (actualName.includes('fa-moon')) iconName = 'Moon';
  else if (actualName.includes('fa-right-long')) iconName = 'ArrowRight';
  else if (actualName.includes('fa-arrows-left-right')) iconName = 'ArrowLeftRight';
  else if (actualName.includes('fa-fort-awesome')) iconName = 'Castle';
  else if (actualName.includes('fa-burst')) iconName = 'Zap'; 
  else if (actualName.includes('fa-droplet')) iconName = 'Droplet';
  else if (actualName.includes('fa-leaf')) iconName = 'Leaf';
  else if (actualName.includes('fa-wind')) iconName = 'Wind';
  else if (actualName.includes('fa-square-minus')) iconName = 'SquareMinus';
  else if (actualName.includes('fa-wave-square')) iconName = 'Activity';
  else if (actualName.includes('fa-kit-medical')) iconName = 'BriefcaseMedical';
  else if (actualName.includes('fa-forward-fast')) iconName = 'FastForward';
  else if (actualName.includes('fa-shield-halved')) iconName = 'ShieldAlert';
  else if (actualName.includes('fa-ban')) iconName = 'Ban';
  else if (actualName.includes('fa-cloud-bolt')) iconName = 'CloudLightning';
  else if (actualName.includes('fa-check')) iconName = 'Check';
  else if (actualName.includes('fa-language')) iconName = 'Languages';
  else if (actualName.includes('fa-recycle')) iconName = 'Recycle';
  else if (actualName.includes('fa-universal')) iconName = 'Accessibility';
  else if (actualName.includes('fa-ruler')) iconName = 'Ruler';
  else if (actualName.includes('fa-tape')) iconName = 'Scissors';
  else if (actualName.includes('fa-gauge')) iconName = 'Gauge';
  else if (actualName.includes('fa-layer-group')) iconName = 'Layers';
  else if (actualName.includes('fa-triangle-exclamation')) iconName = 'TriangleAlert';
  else if (actualName.includes('fa-book-open') || actualName.includes('fa-chalkboard')) iconName = 'BookOpen';
  else if (actualName.includes('fa-person-running') || actualName.includes('fa-running')) iconName = 'Activity'; // or figure something else out
  else if (actualName.includes('fa-chess-knight')) iconName = 'Swords';
  else if (actualName.includes('fa-sliders')) iconName = 'Sliders';
  else if (actualName.includes('fa-infinity')) iconName = 'Infinity';
  else if (actualName.includes('fa-scale-balanced')) iconName = 'Scale';

  // Capitalize properly
  iconName = iconName.charAt(0).toUpperCase() + iconName.slice(1);

  if (['Vault', 'Castle', 'Asteroid', 'Zap', 'ShieldHalf', 'Blank'].includes(iconName)) {
      if (iconName === 'Vault') iconName = 'Lock';
      if (iconName === 'Castle') iconName = 'Tent';
      if (iconName === 'Asteroid') iconName = 'Flame';
  }

  let Comp = (LucideIcons as any)[iconName] || (LucideIcons as any)[actualName];
  if (!Comp) {
    console.warn(`Icon not found: ${iconName} or ${actualName}`);
    Comp = (LucideIcons as any).CircleHelp || (LucideIcons as any).HelpCircle;
  }
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
  if (outClassName.includes('fa-spin')) {
    outClassName = outClassName.replace('fa-spin', 'animate-spin');
  }

  return <Comp className={outClassName} size={s} />;
};
