import React from 'react';

interface LogoProps {
  className?: string;
}

export const GoogleMeetLogo: React.FC<LogoProps> = ({ className = "h-6 w-6" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <path
      d="M12 0C5.383 0 0 5.383 0 12s5.383 12 12 12 12-5.383 12-12S18.617 0 12 0z"
      fill="#00832d"
    />
    <path
      d="M19.5 12c0-.167-.021-.33-.042-.493L12 7.5v9l7.458-4.007c.027-.163.042-.326.042-.493z"
      fill="#0066da"
    />
    <path
      d="M7.5 9v6l4.5-3-4.5-3z"
      fill="#e94235"
    />
    <path
      d="M12 7.5l7.458 4.007A7.5 7.5 0 0 0 12 4.5v3z"
      fill="#2684fc"
    />
    <path
      d="M4.5 12A7.5 7.5 0 0 0 12 19.5v-3L4.542 12.493c.021.163.042.33.042.493 0 .167-.021.33-.042.493L12 16.5v3A7.5 7.5 0 0 0 4.5 12z"
      fill="#00ac47"
    />
  </svg>
);

export const ZoomLogo: React.FC<LogoProps> = ({ className = "h-6 w-6" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <rect width="24" height="24" rx="4" fill="#2D8CFF"/>
    <path
      d="M6 8h12c1.1 0 2 .9 2 2v4c0 1.1-.9 2-2 2H6c-1.1 0-2-.9-2-2v-4c0-1.1.9-2 2-2z"
      fill="white"
    />
    <path
      d="M16.5 10.5L14 12l2.5 1.5v-3z"
      fill="#2D8CFF"
    />
  </svg>
);

export const MicrosoftTeamsLogo: React.FC<LogoProps> = ({ className = "h-6 w-6" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <path
      d="M20.625 12c0 4.763-3.862 8.625-8.625 8.625S3.375 16.763 3.375 12 7.237 3.375 12 3.375 20.625 7.237 20.625 12z"
      fill="#5059C9"
    />
    <path
      d="M7.5 8.25h9v7.5h-9v-7.5z"
      fill="white"
    />
    <path
      d="M10.5 10.5h3v3h-3v-3z"
      fill="#5059C9"
    />
  </svg>
);

export const WebexLogo: React.FC<LogoProps> = ({ className = "h-6 w-6" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="12" fill="#00BCF2"/>
    <path
      d="M8 8h8v8H8V8z"
      fill="white"
    />
    <path
      d="M10 10h4v4h-4v-4z"
      fill="#00BCF2"
    />
  </svg>
);

export const GenericMeetingLogo: React.FC<LogoProps> = ({ className = "h-6 w-6" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <rect width="24" height="24" rx="4" fill="#6B7280"/>
    <path
      d="M7 9h10v6H7V9z"
      fill="white"
    />
    <path
      d="M15 11l2 1-2 1v-2z"
      fill="#6B7280"
    />
  </svg>
);

interface PlatformLogoProps extends LogoProps {
  platform?: string;
}

export const PlatformLogo: React.FC<PlatformLogoProps> = ({ platform, className = "h-6 w-6" }) => {
  const normalizedPlatform = platform?.toLowerCase() || '';
  
  if (normalizedPlatform.includes('google') || normalizedPlatform.includes('meet')) {
    return <GoogleMeetLogo className={className} />;
  }
  
  if (normalizedPlatform.includes('zoom')) {
    return <ZoomLogo className={className} />;
  }
  
  if (normalizedPlatform.includes('teams') || normalizedPlatform.includes('microsoft')) {
    return <MicrosoftTeamsLogo className={className} />;
  }
  
  if (normalizedPlatform.includes('webex')) {
    return <WebexLogo className={className} />;
  }
  
  return <GenericMeetingLogo className={className} />;
};
