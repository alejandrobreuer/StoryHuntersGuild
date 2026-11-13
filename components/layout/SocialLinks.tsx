import { cn } from "@/lib/utils";

// The guild's social accounts. Drawn inline: lucide dropped brand icons.

export const SOCIALS = [
  {
    label: "Instagram",
    href: "https://www.instagram.com/storyhunters_ar/",
    icon: (
      <>
        <rect width="20" height="20" x="2" y="2" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <path d="M17.5 6.5h.01" />
      </>
    ),
  },
  {
    label: "YouTube",
    href: "https://www.youtube.com/@StoryHunters-ar",
    icon: (
      <>
        <path d="M2.5 17a24 24 0 0 1 0-10 2 2 0 0 1 1.4-1.4 50 50 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24 24 0 0 1 0 10 2 2 0 0 1-1.4 1.4 50 50 0 0 1-16.2 0A2 2 0 0 1 2.5 17" />
        <path d="m10 15 5-3-5-3z" />
      </>
    ),
  },
  {
    label: "TikTok",
    href: "https://www.tiktok.com/@storyhunters.ar",
    icon: <path d="M9 12a4 4 0 1 0 4 4V3a5 5 0 0 0 5 5" />,
  },
  {
    label: "WhatsApp",
    href: "https://chat.whatsapp.com/HrDTfXVaMmB5wuXxrqdJHo",
    icon: (
      <>
        <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
        <path d="M9 8.5c0 3.5 3 6.5 6.5 6.5l.8-1.6-2-1-.9.9a5 5 0 0 1-2.2-2.2l.9-.9-1-2Z" />
      </>
    ),
  },
  {
    label: "Discord",
    href: "https://discord.gg/uaBMbb3X5",
    icon: (
      <>
        <path d="M8.5 17c-1 1.5-2 2.5-3 2.5-2 0-3.5-5-3.5-10 0-1.5 2-3.5 6-4l1 2h6l1-2c4 .5 6 2.5 6 4 0 5-1.5 10-3.5 10-1 0-2-1-3-2.5" />
        <path d="M7 16c3.3 1.3 6.7 1.3 10 0" />
        <circle cx="9" cy="12" r="1" />
        <circle cx="15" cy="12" r="1" />
      </>
    ),
  },
];

/** Instagram / YouTube / TikTok / WhatsApp / Discord icon links. Colors come from the parent
 * (`text-*` on className); each link is a 44px target. */
export function SocialLinks({ className }: { className?: string }) {
  return (
    <ul className={cn("flex items-center gap-1", className)}>
      {SOCIALS.map((s) => (
        <li key={s.label}>
          <a
            href={s.href} target="_blank" rel="noopener noreferrer"
            aria-label={`${s.label} de Story Hunters`} title={s.label}
            className="inline-flex size-11 items-center justify-center rounded-full text-inherit transition-colors"
          >
            <svg
              viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden
            >
              {s.icon}
            </svg>
          </a>
        </li>
      ))}
    </ul>
  );
}
