import { resolveAssetUrl } from '../lib/pageContent';

interface SponsorLogoProps {
  src: string;
  alt: string;
  variant?: 'frame' | 'strip' | 'sidebar';
  className?: string;
  title?: string;
}

export function SponsorLogo({
  src,
  alt,
  variant = 'frame',
  className = '',
  title,
}: SponsorLogoProps) {
  const url = src.startsWith('http') ? src : resolveAssetUrl(src);
  if (!url) return null;

  return (
    <img
      src={url}
      alt={alt}
      className={`sponsor-logo-fit sponsor-logo-fit--${variant} ${className}`.trim()}
      title={title}
    />
  );
}
