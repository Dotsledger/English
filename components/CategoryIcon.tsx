/** A small, simple line glyph per rabbit-hole category (24×24, currentColor
 * stroke). Not illustrations/mascots — one recognisable shape each. */

function glyph(category: string) {
  switch (category) {
    case "Cars & Mobility":
      return (
        <>
          <path d="M4 13l1.5-4.5A2 2 0 0 1 7.4 7h9.2a2 2 0 0 1 1.9 1.5L20 13v4H4z" />
          <circle cx="7.5" cy="17" r="1.4" />
          <circle cx="16.5" cy="17" r="1.4" />
        </>
      );
    case "Home & Real Estate":
      return (
        <>
          <path d="M4 11l8-6 8 6" />
          <path d="M6 10v9h12v-9" />
        </>
      );
    case "Tech & AI":
      return (
        <>
          <rect x="7" y="7" width="10" height="10" rx="1.5" />
          <path d="M10 4v3M14 4v3M10 17v3M14 17v3M4 10h3M4 14h3M17 10h3M17 14h3" />
        </>
      );
    case "Design & UX":
      return (
        <>
          <rect x="4" y="4" width="16" height="16" rx="2" />
          <path d="M4 9h16M9 9v11" />
        </>
      );
    case "Science & Weird Facts":
      return (
        <>
          <path d="M10 4h4M11 4v5l-4.5 8A1.5 1.5 0 0 0 8 19h8a1.5 1.5 0 0 0 1.4-2L13 9V4" />
          <path d="M8.5 15h7" />
        </>
      );
    case "Travel":
      return <path d="M3 11l18-6-6 18-3.5-7L3 11z" />;
    case "Money & Hidden Costs":
      return (
        <>
          <circle cx="12" cy="12" r="8" />
          <path d="M12 7v10M9.5 9.5a2.5 2 0 0 1 5 0c0 2.5-5 1.5-5 4a2.5 2 0 0 0 5 0" />
        </>
      );
    case "Work & Productivity":
      return (
        <>
          <rect x="3" y="7" width="18" height="12" rx="2" />
          <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18" />
        </>
      );
    case "Health & Wellness":
      return <path d="M3 12h4l2-5 3 10 2-7 2 2h5" />;
    case "Social Media & Internet Culture":
      return <path d="M20 5H4v12h4v3l4-3h8z" />;
    case "Relationships & Dating":
      return <path d="M12 20s-7-4.5-7-9a4 4 0 0 1 7-2.5A4 4 0 0 1 19 11c0 4.5-7 9-7 9z" />;
    case "Personal Finance & Crypto":
      return (
        <>
          <circle cx="12" cy="12" r="8" />
          <path d="M9.5 8h4a2 2 0 0 1 0 4h-4m0 0h4.5a2 2 0 0 1 0 4H9.5m0-8V6.5m0 11V16m3-9.5V6m0 12v-1.5" />
        </>
      );
    case "Politics & Society":
      return (
        <>
          <path d="M4 9l8-5 8 5" />
          <path d="M6 9v8M10 9v8M14 9v8M18 9v8M4 20h16" />
        </>
      );
    case "Sports":
      return (
        <>
          <path d="M7 4h10v4a5 5 0 0 1-10 0V4z" />
          <path d="M7 6H4v2a3 3 0 0 0 3 3M17 6h3v2a3 3 0 0 1-3 3M9 16h6M8 20h8M10 16v4M14 16v4" />
        </>
      );
    case "Environment & Climate":
      return (
        <>
          <path d="M5 19c0-8 6-13 14-13 0 8-6 13-14 13z" />
          <path d="M9 15c3-3 6-4 8-5" />
        </>
      );
    case "Food & Nutrition":
      return (
        <>
          <path d="M8 3v8a2 2 0 0 1-4 0V3M6 3v18" />
          <path d="M17 3c-2 0-3 2-3 5s1 4 3 4v6" />
        </>
      );
    case "Entertainment":
      return (
        <>
          <rect x="3" y="6" width="18" height="12" rx="2" />
          <path d="M10 9.5l5 2.5-5 2.5z" />
        </>
      );
    case "Gaming":
      return (
        <>
          <rect x="3" y="8" width="18" height="9" rx="4.5" />
          <path d="M7.5 11v3M6 12.5h3" />
          <circle cx="16" cy="12" r="0.9" />
          <circle cx="18" cy="14" r="0.9" />
        </>
      );
    case "Fashion & Beauty":
      return (
        <>
          <path d="M9 4l3 2 3-2 3 3-3 2v9H9v-9L6 7z" />
        </>
      );
    case "History & True Crime":
      return (
        <>
          <circle cx="10.5" cy="10.5" r="5.5" />
          <path d="M15 15l5 5" />
        </>
      );
    case "Meetings & Leadership":
      return (
        <>
          <rect x="4" y="4" width="16" height="11" rx="1.5" />
          <path d="M8 11l3-3 2 2 3-4M12 15v4M9 21h6" />
        </>
      );
    default:
      return <circle cx="12" cy="12" r="7" />;
  }
}

export function CategoryIcon({
  category,
  className,
  style,
}: {
  category: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      data-testid="category-icon"
      aria-hidden
    >
      {glyph(category)}
    </svg>
  );
}
