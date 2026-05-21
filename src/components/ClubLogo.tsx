import { getSidebarLogoUrl } from '../lib/pageContent';
import type { PageContent } from '../types';
import { DEFAULT_PAGE_CONTENT } from '../types';

interface ClubLogoProps {
  pageContent?: PageContent;
  className?: string;
  alt?: string;
}

export function ClubLogo({
  pageContent,
  className = 'club-logo',
  alt = 'Klubblogo',
}: ClubLogoProps) {
  const content = pageContent ?? DEFAULT_PAGE_CONTENT;
  const src = getSidebarLogoUrl(content);

  return (
    <span className={`club-logo-wrap ${className}-wrap`}>
      <img src={src} alt={alt} className={className} />
    </span>
  );
}
