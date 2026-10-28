// In-app copies of the v2 legal and support pages (web: /privacy, /terms, /community-rules, /support).
// Keep these in step with the website versions. Inline markup understood by LegalScreen:
//   **bold**          bold text
//   [[placeholder]]   a value the owner still has to fill in (shown highlighted)
//   {{support}}       the support email from config (falls back to support@kushrewards.online)

export const COMPANY = "Convenient Living Solutions";
export const LEGAL_UPDATED = "16 October 2026";
export const COPYRIGHT = `© 2026 ${COMPANY}. KushRewards SA is operated by ${COMPANY}.`;

/** Values the owner fills in under Admin → Settings → Legal details (served by GET /config as `legal`).
 *  Each replaces its [[placeholder]] in the text below; until set, the placeholder shows highlighted. */
export const LEGAL_FIELDS = [
  { key: "company_registration", label: "Company registration number", placeholder: "Company registration number" },
  { key: "physical_address", label: "Physical address", placeholder: "Physical address" },
  { key: "info_officer_name", label: "Information Officer name", placeholder: "Information Officer name" },
  { key: "info_officer_email", label: "Information Officer email", placeholder: "Information Officer email" },
  { key: "hosting_provider", label: "Hosting provider", placeholder: "hosting provider" },
  { key: "backup_retention", label: "Backup retention period (e.g. 30 days)", placeholder: "backup retention period, e.g. 30 days" },
] as const;

export type LegalValues = Partial<Record<(typeof LEGAL_FIELDS)[number]["key"], string>>;

/** Replaces [[placeholders]] that have a saved value; unknown or empty ones are left for highlighting. */
export function fillLegal(text: string, values: LegalValues | null | undefined): string {
  if (!values) return text;
  return LEGAL_FIELDS.reduce((t, f) => (values[f.key] ? t.split(`[[${f.placeholder}]]`).join(values[f.key]!) : t), text);
}

export type LegalBlock =
  | { type: "h2"; text: string }
  | { type: "h3"; text: string }
  | { type: "p"; text: string }
  | { type: "bullets"; items: string[] }
  | { type: "numbered"; items: string[] }
  | { type: "kv"; rows: [string, string][] };

export type LegalDocKey = "privacy" | "terms" | "community-rules" | "support";

export interface LegalDoc {
  title: string;
  intro?: string;
  showUpdated: boolean;
  blocks: LegalBlock[];
}

export const LEGAL_DOCS: Record<LegalDocKey, LegalDoc> = {
  privacy: {
    title: "Privacy Policy",
    showUpdated: true,
    intro:
      "KushRewards SA is an information guide to cannabis clubs and venues for adults 18+ in South Africa. This policy explains what personal information we collect, why, and the choices you have under the Protection of Personal Information Act (POPIA).",
    blocks: [
      { type: "h2", text: "Who is responsible for your information" },
      { type: "p", text: `KushRewards SA is operated by ${COMPANY}, the responsible party for your personal information.` },
      {
        type: "kv",
        rows: [
          ["Company", COMPANY],
          ["Registration no.", "[[Company registration number]]"],
          ["Physical address", "[[Physical address]]"],
          ["Information Officer", "[[Information Officer name]], [[Information Officer email]]"],
          ["Support", "{{support}}"],
        ],
      },
      { type: "h2", text: "What we collect" },
      {
        type: "bullets",
        items: [
          "**Account details:** your name and email address, and your Google or Apple account ID if you sign in with them. If you sign in with email, your password is stored only as a secure hash.",
          "**Reviews:** star ratings, tags and comments you post. Reviews show your first name only.",
          "**Venue suggestions:** the venue details you send us, and whether you said you own or manage it.",
          "**Reports:** wrong-info reports about venues, and reviews you report or people you block.",
          "**Contact taps:** when you tap Call, WhatsApp or Directions on a venue page, we record which venue and which button, so we can show venues how many people contacted them. We never see your calls or messages.",
          "**Venue logos** uploaded by our admins (these are not about you).",
          "**Your agreement** to the Terms of Use and Community Rules, with the date.",
        ],
      },
      { type: "h2", text: "What we don't collect" },
      {
        type: "bullets",
        items: [
          "**Location:** if you tap \"Near me\", your location stays on your phone and is only used there to sort venues by distance. It is never sent to us.",
          "**Your date of birth:** the age check only remembers on your device whether you passed.",
          "No advertising, no ad tracking, and we never sell or rent your personal information.",
          "We never share your details with venues.",
        ],
      },
      { type: "h2", text: "Why we use it" },
      {
        type: "bullets",
        items: [
          "To run your account and let you sign in.",
          "To show your reviews and keep ratings honest (one review per person per venue).",
          "To check suggested venues and fix wrong information.",
          "To moderate content against our Community Rules and keep the community safe.",
          "To show venues anonymous totals of contact taps.",
          "To reply when you contact support.",
        ],
      },
      { type: "h2", text: "Who processes it for us" },
      { type: "p", text: "We use trusted service providers who process information only on our instructions:" },
      {
        type: "bullets",
        items: [
          "**Hosting, database and file storage:** [[hosting provider]], which hosts the app's backend and its data.",
          "**Sign-in:** Google or Apple, if you choose to sign in with them. They share your name, email and account ID with us.",
        ],
      },
      { type: "p", text: "Some providers may store information outside South Africa. Where they do, we rely on them to protect it to a standard at least as strong as POPIA requires." },
      { type: "h2", text: "How long we keep it" },
      {
        type: "bullets",
        items: [
          "We keep your account information for as long as you have an account.",
          "When you delete your account, we delete your account, reviews, venue suggestions, reports and blocks straight away. Contact taps stay only as anonymous counts that are no longer linked to you.",
          "Backup copies are removed within [[backup retention period, e.g. 30 days]].",
        ],
      },
      { type: "h2", text: "Deleting your account and data" },
      { type: "p", text: "You can delete your account at any time: in the app go to **Profile → About & legal → Delete my account**, or visit kushrewards.online/delete-account. You can also email {{support}}." },
      { type: "h2", text: "Your rights under POPIA" },
      { type: "p", text: "You have the right to:" },
      {
        type: "bullets",
        items: [
          "ask what personal information we hold about you and get a copy;",
          "ask us to correct or delete it;",
          "object to how we use it;",
          "complain to the Information Regulator.",
        ],
      },
      { type: "p", text: "To use these rights, email {{support}}. If you're not happy with our answer, you can lodge a complaint with the Information Regulator (South Africa) at inforegulator.org.za." },
      { type: "h2", text: "Children" },
      { type: "p", text: "KushRewards SA is for adults 18 and over only. We don't knowingly collect information from anyone under 18. If you think someone under 18 has an account, tell us and we'll delete it." },
      { type: "h2", text: "Security" },
      { type: "p", text: "We use encrypted connections (HTTPS), store passwords only as hashes and limit who can access personal information." },
      { type: "h2", text: "Changes" },
      { type: "p", text: "If we change this policy we'll update the date at the top, and tell you in the app if the change is significant." },
    ],
  },

  terms: {
    title: "Terms of Use",
    showUpdated: true,
    intro: `These terms apply when you use KushRewards SA, operated by ${COMPANY}. By using the app you agree to them.`,
    blocks: [
      { type: "h2", text: "1. Adults only" },
      { type: "p", text: "KushRewards SA is only for people aged 18 and over. By using it you confirm that you are at least 18." },
      { type: "h2", text: "2. An information service only" },
      { type: "p", text: "KushRewards SA is an information guide and community for cannabis clubs and venues in South Africa. We do not sell cannabis or any other product, and we do not take orders, handle payments or arrange deliveries. We don't act for any venue, and any contact you have with a venue is between you and that venue." },
      { type: "h2", text: "3. Follow South African law" },
      { type: "p", text: "Cannabis is legal in South Africa only for private use by adults; trading in it is not. You are responsible for following the law where you are. Never drive or operate machinery under the influence." },
      { type: "h2", text: "4. Your account" },
      { type: "p", text: "You need an account to write reviews, suggest venues or report wrong information. Keep your sign-in details safe and give accurate information. You can delete your account at any time in Profile." },
      { type: "h2", text: "5. What you post" },
      { type: "p", text: "Everything you post must follow our Community Rules. In short, you may not post:" },
      {
        type: "bullets",
        items: [
          "offers to buy, sell or swap cannabis or anything else, prices or menus;",
          "harassment, hate speech, threats or other people's personal information;",
          "sexual content, spam or advertising;",
          "anything involving anyone under 18;",
          "fake reviews, or reviews of venues you haven't visited.",
        ],
      },
      { type: "p", text: `You keep ownership of what you post, but you give ${COMPANY} a free, non-exclusive licence to show it in KushRewards SA (reviews are shown with your first name only).` },
      { type: "h2", text: "6. Moderation and termination" },
      { type: "p", text: "We filter posts automatically and review reported content, usually within 24 hours. We may remove any content that breaks these terms, and suspend or close accounts that break them, especially repeat offenders. You can report a review or block its author from the review itself." },
      { type: "h2", text: "7. Venue information" },
      { type: "p", text: "Venue details such as hours, location and contact numbers come from the venues, our users and our own checks. They may be out of date. Please confirm details with the venue, and tell us if something is wrong." },
      { type: "h2", text: "8. Disclaimers" },
      { type: "p", text: `The app is provided "as is". To the extent the law allows, ${COMPANY} is not liable for any loss arising from your use of the app, from information posted by others, or from your dealings with any venue. Nothing in these terms limits rights you have under the Consumer Protection Act or other South African law that cannot be excluded.` },
      { type: "h2", text: "9. Changes and contact" },
      { type: "p", text: "We may update these terms; the date at the top shows the latest version. These terms are governed by the laws of South Africa. Questions? Email {{support}}." },
    ],
  },

  "community-rules": {
    title: "Community Rules",
    showUpdated: true,
    intro: "KushRewards SA works because people share honest, respectful information about venues. Everyone who posts agrees to these rules.",
    blocks: [
      { type: "h3", text: "1. Be honest" },
      { type: "p", text: "Only review venues you've actually visited, and describe your own experience." },
      { type: "bullets", items: ["OK: \"Quiet lounge, staff explained the club rules clearly.\"", "Not OK: reviewing a venue you've never been to, or posting for a friend."] },
      { type: "h3", text: "2. No buying or selling" },
      { type: "p", text: "No offering, buying or selling of cannabis or anything else, and no prices or menus." },
      { type: "bullets", items: ["Not OK: \"R80 a gram, WhatsApp me\" or \"cheapest in Roodepoort\".", "Not OK: phone numbers, links or @handles in reviews."] },
      { type: "h3", text: "3. Respect people" },
      { type: "p", text: "No harassment, hate speech, threats or personal information about others." },
      { type: "bullets", items: ["Not OK: insults, slurs, or naming and shaming staff.", "OK: \"Staff were unfriendly and we waited 40 minutes.\""] },
      { type: "h3", text: "4. Keep it clean" },
      { type: "p", text: "No sexual content, spam or advertising." },
      { type: "bullets", items: ["Not OK: promoting another business or posting the same review again and again."] },
      { type: "h3", text: "5. Adults only" },
      { type: "p", text: "Nothing involving anyone under 18." },
      { type: "bullets", items: ["KushRewards SA is for adults 18+. Accounts of anyone under 18 are deleted."] },
      { type: "h2", text: "How to report" },
      {
        type: "bullets",
        items: [
          "**A review:** tap **Report** under it. Each person can report a review once.",
          "**Someone you don't want to see:** tap **Block** under their review. You won't see their reviews any more, and they aren't told.",
          "**Wrong venue information:** tap **Report wrong info about this venue** at the bottom of the venue page.",
          "**Anything else:** email {{support}}.",
        ],
      },
      { type: "h2", text: "What happens next" },
      { type: "p", text: "We review reports within 24 hours. Posts that break these rules are removed, and repeat offenders are banned. Posts with prices, contact details, links or offers to buy or sell are also blocked automatically." },
    ],
  },

  support: {
    title: "Support",
    showUpdated: false,
    intro: "Questions, problems or feedback? Email {{support}}. We usually reply within 2 working days.",
    blocks: [
      { type: "h2", text: "Frequently asked questions" },
      { type: "h3", text: "Does KushRewards SA sell cannabis?" },
      { type: "p", text: "No. KushRewards SA is an information guide for adults 18+. We don't sell anything, take orders, handle payments or arrange deliveries." },
      { type: "h3", text: "A venue's details are wrong. How do I fix them?" },
      { type: "p", text: "Open the venue and tap \"Report wrong info about this venue\" at the bottom. We check reports and update the listing." },
      { type: "h3", text: "How do I suggest a venue that's missing?" },
      { type: "p", text: "Use the Suggest tab. We check every venue before it goes on the map, usually within 72 hours." },
      { type: "h3", text: "How do I report or block someone?" },
      { type: "p", text: "Tap Report or Block under their review. See the Community Rules for how reports are handled." },
      { type: "h3", text: "Why was my review rejected?" },
      { type: "p", text: "Reviews can't include prices, phone numbers, links, offers to buy or sell, or offensive language. Remove those and try again." },
      { type: "h3", text: "How do I delete my account?" },
      { type: "p", text: "Go to Profile → About & legal → Delete my account. It removes your account, reviews, venue suggestions and reports permanently." },
    ],
  },
};
