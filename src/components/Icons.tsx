import type { CSSProperties } from 'react';

export type IconName =
  | 'home'
  | 'chart'
  | 'trophy'
  | 'book'
  | 'gear'
  | 'flame'
  | 'target'
  | 'cards'
  | 'puzzle'
  | 'bolt'
  | 'arrow-left'
  | 'arrow-right'
  | 'check'
  | 'x'
  | 'clock'
  | 'search'
  | 'plus'
  | 'download'
  | 'upload'
  | 'refresh'
  | 'share'
  | 'star'
  | 'lock'
  | 'chevron-right'
  | 'calendar'
  | 'heart'
  | 'shield'
  | 'spark'
  | 'repeat'
  | 'swap'
  | 'user'
  | 'github'
  | 'info'
  | 'trash'
  | 'play'
  | 'crown'
  | 'seed'
  | 'edit'
  | 'sun'
  | 'moon'
  | 'monitor'
  | 'volume'
  | 'vibrate'
  | 'eye'
  | 'grid'
  | 'exit';

const PATHS: Record<IconName, string> = {
  home: 'M3 10.8 12 3l9 7.8V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  // İstatistik: üç çubuk, taban çizgisi yok. Eski hâli 22'ye taşıp
  // ızgarayı bozuyordu; 18 px'te çubuklar birbirine yapışıyordu.
  chart: 'M4.5 20h15M8 20v-5.5M12.5 20v-9M17 20v-13',
  trophy: 'M8 4h8v5a4 4 0 0 1-8 0zM8 6H4v2a3 3 0 0 0 3 3M16 6h4v2a3 3 0 0 1-3 3M12 13v4M9 21h6M10 17h4',
  // Sözlük: açık kitap. Eski çift eğri 18 px'te "W" gibi okunuyordu.
  book: 'M7 3.6h11.4v16.8H7A2 2 0 0 1 5 18.4V5.6a2 2 0 0 1 2-2ZM8.6 3.6v16.8',
  gear: 'M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z',
  flame: 'M12 3c.6 4 5 5.2 5 9.3A5 5 0 0 1 7 12.3c0-2 1-3.4 2.2-4.6.1 2.1 1 3.2 2 3.4.7-2.6.8-5.2.8-8.1z',
  // Yol: nişan. Üç halka yerine iki halka + göz: en içteki halka
  // 18 px'te lekeye dönüşüyordu.
  target: 'M12 20.5a8.5 8.5 0 1 0 0-17 8.5 8.5 0 0 0 0 17ZM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM12 13.2a1.2 1.2 0 1 0 0-2.4 1.2 1.2 0 0 0 0 2.4Z',
  cards: 'M8 3h9a2 2 0 0 1 2 2v12M5 7h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2z',
  puzzle: 'M9 3h6v3.2a2.3 2.3 0 1 0 0 4.6V14H9v-3.2a2.3 2.3 0 1 0 0-4.6zM9 14v7h6v-3.2a2.3 2.3 0 1 1 0-4.6',
  bolt: 'M13 2 4 14h6l-1 8 9-12h-6z',
  'arrow-left': 'M15 18l-6-6 6-6',
  'arrow-right': 'M9 6l6 6-6 6',
  check: 'M4 12.5 9 17.5 20 6.5',
  x: 'M6 6l12 12M18 6 6 18',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5.3l3.2 2',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM16.2 16.2 21 21',
  plus: 'M12 5v14M5 12h14',
  download: 'M12 3v12M7 11l5 5 5-5M4 21h16',
  upload: 'M12 21V9M7 13l5-5 5 5M4 3h16',
  refresh: 'M21 12a9 9 0 1 1-2.6-6.4M21 4v5h-5',
  share: 'M12 16V3M8 7l4-4 4 4M5 13v7h14v-7',
  star: 'M12 3.2l2.6 5.6 6.1.8-4.5 4.2 1.2 6-5.4-3-5.4 3 1.2-6L3.3 9.6l6.1-.8z',
  lock: 'M6 11h12v9H6zM8.5 11V8a3.5 3.5 0 0 1 7 0v3',
  'chevron-right': 'M9 5l7 7-7 7',
  calendar: 'M4 6h16v15H4zM8 3v5M16 3v5M4 11h16',
  heart: 'M12 20s-7-4.4-7-9a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 4.6-7 9-7 9z',
  shield: 'M12 3l8 3v6c0 5-3.4 8-8 9-4.6-1-8-4-8-9V6z',
  spark: 'M12 3l1.9 5.3L19 10l-5.1 1.7L12 17l-1.9-5.3L5 10l5.1-1.7z',
  repeat: 'M17 2l4 4-4 4M3 12V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4M21 12v3a3 3 0 0 1-3 3H3',
  swap: 'M7 4 3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0',
  github:
    'M9 19c-4 1.5-4-2.5-6-3m12 5v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.3 4.3 0 0 0-.1-3.2s-1-.3-3.4 1.3a11.6 11.6 0 0 0-6 0C6.8 2.8 5.8 3.1 5.8 3.1a4.3 4.3 0 0 0-.1 3.2A4.6 4.6 0 0 0 4.4 9.5c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V21',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v5M12 8h.01',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13',
  play: 'M7 4.5 20 12 7 19.5z',
  crown: 'M3 18h18M4 7l4 4 4-7 4 7 4-4-2 11H6z',
  seed: 'M12 21c0-6.5 3.2-10.5 8-12.4C19 16 15.6 19.3 12 21zM12 21c-1-4.4-3.4-7-7-8.5',
  edit: 'M4 20h4L20 8l-4-4L4 16zM14 6l4 4',
  sun: 'M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  moon: 'M20.5 14.5A8.5 8.5 0 1 1 9.5 3.5a7 7 0 0 0 11 11z',
  monitor: 'M3 4h18v12H3zM8 20h8M12 16v4',
  volume: 'M4 9.5v5h3.5L13 19V5L7.5 9.5zM16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12',
  vibrate: 'M8 5h8v14H8zM4 9v6M20 9v6M2 11v2M22 11v2',
  eye: 'M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  // Pratik: dambıl. Dört kare 18 px'te ayırt edilemiyordu; "pratik"
  // fikrini tek ve okunur bir biçim taşıyor.
  grid: 'M6.6 7.4v9.2M3.6 9.4v5.2M17.4 7.4v9.2M20.4 9.4v5.2M6.6 12h10.8',
  exit: 'M15 4h4v16h-4M10 12H3M6 9l-3 3 3 3',
};

interface IconProps {
  name: IconName;
  size?: number;
  strokeWidth?: number;
  className?: string;
  style?: CSSProperties;
}

export function Icon({ name, size = 20, strokeWidth = 2, className, style }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden="true"
      focusable="false"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
