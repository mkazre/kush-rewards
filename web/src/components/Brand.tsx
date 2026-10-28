import { Link } from "react-router";

export function LeafMark({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" className="text-primary">
      <path
        fill="currentColor"
        d="M32 6c3.5 9 4.6 17 3.4 26 4.6-6.8 10.3-11.4 18.3-13.7-3.4 8-9.1 13.7-16 17.1 5.7 0 11.4 1.1 16 4.6-6.8 2.3-13.7 2.3-19.4 0l1.1 13.7h-6.8l1.1-13.7c-5.7 2.3-12.6 2.3-19.4 0 4.6-3.4 10.3-4.6 16-4.6-6.8-3.4-12.6-9.1-16-17.1 8 2.3 13.7 6.8 18.3 13.7C27.4 23 28.5 15 32 6z"
      />
    </svg>
  );
}

function SaFlag() {
  return (
    <svg width="20" height="14" viewBox="0 0 30 20" aria-label="South Africa" className="rounded-[2px]">
      <rect width="30" height="10" fill="#E03C31" />
      <rect y="10" width="30" height="10" fill="#001489" />
      <path d="M0 0l13 10L0 20z" fill="#FFB81C" />
      <path d="M0 0h4l13 8h13v4H17L4 20H0l13-10z" fill="#fff" />
      <path d="M0 2.5l10 7.5-10 7.5zM0 0h2l13 9h15v2H15L2 20H0l12-10z" fill="#007749" />
      <path d="M0 3.5l8.6 6.5L0 16.5z" fill="#000" />
    </svg>
  );
}

export function BrandHeader() {
  return (
    <Link to="/" className="flex items-center gap-1.5 font-brand text-2xl leading-none" aria-label="KushRewards SA home">
      <span>Kush</span>
      <LeafMark />
      <span className="text-primary">Rewards</span>
      <span className="ml-1">
        <SaFlag />
      </span>
    </Link>
  );
}
