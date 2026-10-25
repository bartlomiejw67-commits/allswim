// Spójny zestaw ikon liniowych ALL SWIM (zastępuje emotki w całym serwisie).
// Jeden styl: viewBox 24, cienka linia (stroke currentColor), zaokrąglone końce.
// Użycie: <Icon name="calendar" size={20} /> — kolor dziedziczony z `color` rodzica.
import React from "react";

export type IconName =
  | "menu" | "close" | "chevronDown" | "chevronLeft" | "chevronRight"
  | "check" | "arrowRight" | "download" | "expand" | "play"
  | "mail" | "phone" | "mapPin" | "instagram" | "facebook"
  | "megaphone" | "hourglass" | "calendar" | "clock" | "tag"
  | "users" | "lifebuoy" | "sun" | "droplet" | "waves" | "user"
  | "sparkle" | "star" | "info" | "heart" | "shield" | "whistle"
  | "inbox" | "gear" | "layers" | "image" | "fileText" | "externalLink" | "logOut"
  | "plus" | "undo" | "cake" | "message" | "trash" | "send" | "alert" | "pencil" | "wallet";

// Ikony wypełniane (fill) — reszta jest konturowa (stroke).
const FILLED = new Set<IconName>(["play", "star", "sparkle", "heart", "facebook"]);

function paths(name: IconName): React.ReactNode {
  switch (name) {
    case "menu":
      return <><path d="M4 7h16" /><path d="M4 12h16" /><path d="M4 17h16" /></>;
    case "close":
      return <><path d="M6 6l12 12" /><path d="M18 6L6 18" /></>;
    case "chevronDown":
      return <path d="M6 9.5l6 6 6-6" />;
    case "chevronLeft":
      return <path d="M15 5l-7 7 7 7" />;
    case "chevronRight":
      return <path d="M9 5l7 7-7 7" />;
    case "check":
      return <path d="M5 12.5l4.5 4.5L19 7" />;
    case "arrowRight":
      return <><path d="M4 12h15" /><path d="M13 6l6 6-6 6" /></>;
    case "download":
      return <><path d="M12 4v10" /><path d="M8 11l4 4 4-4" /><path d="M5 19.5h14" /></>;
    case "expand":
      return <><path d="M9 4H5.5a1.5 1.5 0 0 0-1.5 1.5V9" /><path d="M15 4h3.5A1.5 1.5 0 0 1 20 5.5V9" /><path d="M20 15v3.5a1.5 1.5 0 0 1-1.5 1.5H15" /><path d="M4 15v3.5A1.5 1.5 0 0 0 5.5 20H9" /></>;
    case "play":
      return <path d="M9 7l9 5-9 5z" />;
    case "mail":
      return <><rect x="3" y="5" width="18" height="14" rx="2.6" /><path d="M3.8 7.2l8.2 5.6 8.2-5.6" /></>;
    case "phone":
      return <path d="M15.6 21a16.5 16.5 0 0 1-12.6-12.6 2 2 0 0 1 2-2.4l2.1-.2a1.3 1.3 0 0 1 1.4.9l.9 2.4a1.3 1.3 0 0 1-.4 1.5l-1.1.9a12 12 0 0 0 4.6 4.6l.9-1.1a1.3 1.3 0 0 1 1.5-.4l2.4.9a1.3 1.3 0 0 1 .9 1.4l-.2 2.1a2 2 0 0 1-2.1 1.8z" />;
    case "mapPin":
      return <><path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z" /><circle cx="12" cy="10" r="2.6" /></>;
    case "instagram":
      return <><rect x="3.5" y="3.5" width="17" height="17" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="16.9" cy="7.1" r="1" fill="currentColor" stroke="none" /></>;
    case "facebook":
      return <path d="M13.5 21v-7h2.3l.4-2.85h-2.7V9.3c0-.82.23-1.38 1.4-1.38h1.5V5.37c-.26-.03-1.15-.11-2.18-.11-2.16 0-3.64 1.32-3.64 3.74v2.15H8.3V14h2.32v7z" />;
    case "megaphone":
      return <><path d="M4 10v4a1.5 1.5 0 0 0 1.5 1.5H7l1.2 4a1 1 0 0 0 1 .7h.6a1 1 0 0 0 1-1.1L11 15.5h1l7 3.2V5.3L12 8.5H5.5A1.5 1.5 0 0 0 4 10z" /><path d="M19 9.5a2.8 2.8 0 0 1 0 5" /></>;
    case "hourglass":
      return <><path d="M7 4h10" /><path d="M7 20h10" /><path d="M7.5 4c0 4 3 4.5 4.5 6 1.5-1.5 4.5-2 4.5-6" /><path d="M7.5 20c0-4 3-4.5 4.5-6 1.5 1.5 4.5 2 4.5 6" /></>;
    case "calendar":
      return <><rect x="3.5" y="5" width="17" height="15.5" rx="2.6" /><path d="M3.5 9.5h17" /><path d="M8 3v3.5" /><path d="M16 3v3.5" /></>;
    case "clock":
      return <><circle cx="12" cy="12" r="8" /><path d="M12 7.8v4.4l3 1.8" /></>;
    case "tag":
      return <><path d="M4 12.2l7.6-7.6a2 2 0 0 1 1.4-.6H19a1.5 1.5 0 0 1 1.5 1.5v6a2 2 0 0 1-.6 1.4l-7.6 7.6a1.6 1.6 0 0 1-2.2 0L4 14.4a1.6 1.6 0 0 1 0-2.2z" /><circle cx="15.5" cy="8.5" r="1.2" fill="currentColor" stroke="none" /></>;
    case "users":
      return <><circle cx="9" cy="8" r="3.2" /><path d="M3.5 19a5.5 5.5 0 0 1 11 0" /><path d="M16.5 6.4a2.6 2.6 0 0 1 0 5" /><path d="M16.5 14c2.4.3 4 2.2 4 4.8" /></>;
    case "lifebuoy":
      return <><circle cx="12" cy="12" r="8.2" /><circle cx="12" cy="12" r="3.3" /><path d="M12 3.8v4.9" /><path d="M12 15.3v4.9" /><path d="M3.8 12h4.9" /><path d="M15.3 12h4.9" /></>;
    case "sun":
      return <><circle cx="12" cy="12" r="4" /><path d="M12 2.5v2.4" /><path d="M12 19.1v2.4" /><path d="M4.4 4.4l1.7 1.7" /><path d="M17.9 17.9l1.7 1.7" /><path d="M2.5 12h2.4" /><path d="M19.1 12h2.4" /><path d="M4.4 19.6l1.7-1.7" /><path d="M17.9 6.1l1.7-1.7" /></>;
    case "droplet":
      return <path d="M12 3.5s6 6.4 6 10.4a6 6 0 0 1-12 0c0-4 6-10.4 6-10.4z" />;
    case "waves":
      return <><path d="M2.5 8.5c2-2 4-2 6 0s4 2 6 0 4-2 6 0" /><path d="M2.5 13c2-2 4-2 6 0s4 2 6 0 4-2 6 0" /><path d="M2.5 17.5c2-2 4-2 6 0s4 2 6 0 4-2 6 0" /></>;
    case "user":
      return <><circle cx="12" cy="8.2" r="3.7" /><path d="M5 20a7 7 0 0 1 14 0" /></>;
    case "sparkle":
      return <path d="M12 3l1.7 5.1 5.3 1.6-5.3 1.6L12 16.4l-1.7-5.1L5 9.7l5.3-1.6z" />;
    case "star":
      return <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 17.9 6.8 19.6l1-5.8-4.3-4.1 5.9-.9z" />;
    case "info":
      return <><circle cx="12" cy="12" r="8.2" /><path d="M12 11v5" /><path d="M12 7.6h.01" /></>;
    case "heart":
      return <path d="M12 20s-6.6-4.2-9-8.1C1.4 9 2.6 5.9 5.6 5.3c1.9-.4 3.7.6 6.4 2.9 2.7-2.3 4.5-3.3 6.4-2.9 3 .6 4.2 3.7 2.6 6.6C18.6 15.8 12 20 12 20z" />;
    case "shield":
      return <><path d="M12 3.2l7 2.6v5.1c0 4.4-3 7.4-7 8.9-4-1.5-7-4.5-7-8.9V5.8z" /><path d="M9 11.8l2.1 2.1L15 9.9" /></>;
    case "whistle":
      return <><path d="M14 9H4.8A2.8 2.8 0 0 0 2 11.8v.4A5.8 5.8 0 0 0 13.5 13l.5-1.5h4.3" /><circle cx="9" cy="13" r="1.4" /><path d="M16 6h4" /><path d="M16.5 9.5L20 8" /></>;
    case "inbox":
      return <><path d="M4 13.5l2.4-7.2A2 2 0 0 1 8.3 5h7.4a2 2 0 0 1 1.9 1.3l2.4 7.2" /><path d="M4 13.5V18a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4.5h-4.5l-1.2 2h-4.6l-1.2-2z" /></>;
    case "gear":
      return <><circle cx="12" cy="12" r="3" /><path d="M19.4 14.6a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z" /></>;
    case "layers":
      return <><path d="M12 3.5l8.5 4.5L12 12.5 3.5 8z" /><path d="M3.5 12l8.5 4.5 8.5-4.5" /><path d="M3.5 16l8.5 4.5 8.5-4.5" /></>;
    case "image":
      return <><rect x="3.5" y="4.5" width="17" height="15" rx="2.6" /><circle cx="9" cy="10" r="1.8" /><path d="M20.5 16l-4.6-4.6a1.5 1.5 0 0 0-2.1 0L6 19.5" /></>;
    case "fileText":
      return <><path d="M14 3.5H7.5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V8z" /><path d="M14 3.5V8h4.5" /><path d="M9 13h6" /><path d="M9 16.5h6" /></>;
    case "externalLink":
      return <><path d="M14 4h6v6" /><path d="M20 4l-9 9" /><path d="M18 14v4.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6H10" /></>;
    case "logOut":
      return <><path d="M15 4h3.5A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5H15" /><path d="M10 16.5L5.5 12 10 7.5" /><path d="M5.5 12H15" /></>;
    case "plus":
      return <><path d="M12 5v14" /><path d="M5 12h14" /></>;
    case "undo":
      return <><path d="M9 14L4 9l5-5" /><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" /></>;
    case "cake":
      return <><path d="M4 20h16" /><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M5 15c2.3 1.4 4.6 1.4 7 0s4.7-1.4 7 0" /><path d="M12 7.5V11" /><path d="M12 3.6c.9 1 1.1 1.9.4 2.6-.6.6-1.5.3-1.5-.5 0-.7.6-1.3 1.1-2.1z" /></>;
    case "message":
      return <path d="M20 11.5a7.5 7.5 0 0 1-11.2 6.6L4 19.5l1.4-4.3A7.5 7.5 0 1 1 20 11.5z" />;
    case "trash":
      return <><path d="M4.5 7h15" /><path d="M9.5 7V5a1.5 1.5 0 0 1 1.5-1.5h2A1.5 1.5 0 0 1 14.5 5v2" /><path d="M6.5 7l.8 11.6a2 2 0 0 0 2 1.9h5.4a2 2 0 0 0 2-1.9L17.5 7" /></>;
    case "send":
      return <><path d="M20.5 3.5L10 14" /><path d="M20.5 3.5l-6.6 17-3.9-6.5-6.5-3.9z" /></>;
    case "wallet":
      return <><path d="M5 7.5l10.5-3 1 3" /><rect x="3.5" y="7.5" width="17" height="12" rx="2.5" /><path d="M20.5 11.5h-4a2 2 0 0 0 0 4h4" /></>;
    case "pencil":
      return <><path d="M15.5 4.5l4 4L9 19H5v-4z" /><path d="M13 7l4 4" /></>;
    case "alert":
      return <><path d="M12 4l9 15.5H3z" /><path d="M12 10v4" /><path d="M12 17.2h.01" /></>;
    default:
      return null;
  }
}

export function Icon({
  name,
  size = 20,
  stroke = 1.8,
  color,
  style,
}: {
  name: IconName;
  size?: number;
  stroke?: number;
  color?: string;
  style?: React.CSSProperties;
}) {
  const filled = FILLED.has(name);
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke={filled ? "none" : "currentColor"}
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ display: "block", flex: "none", color, ...style }}
    >
      {paths(name)}
    </svg>
  );
}

export default Icon;
