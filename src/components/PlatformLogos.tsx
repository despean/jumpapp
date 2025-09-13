import React from 'react';

interface LogoProps {
  className?: string;
}

export const GoogleMeetLogo: React.FC<LogoProps> = ({ className = "h-6 w-6" }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 87.51 72">
    <path fill="#00832d" d="M49.5 36l8.53 9.75 11.47 7.33 2-17.02-2-16.64-11.69 6.44z"/>
    <path fill="#0066da" d="M0 51.5V66c0 3.315 2.685 6 6 6h14.5l3-10.96-3-9.54-9.95-3z"/>
    <path fill="#e94235" d="M20.5 0L0 20.5l10.55 3 9.95-3 2.95-9.41z"/>
    <path fill="#2684fc" d="M20.5 20.5H0v31h20.5z"/>
    <path fill="#00ac47" d="M82.6 8.68L69.5 19.42v33.66l13.16 10.79c1.97 1.54 4.85.135 4.85-2.37V11c0-2.535-2.945-3.925-4.91-2.32zM49.5 36v15.5h-29V72h43c3.315 0 6-2.685 6-6V53.08z"/>
    <path fill="#ffba00" d="M63.5 0h-43v20.5h29V36l20-16.57V6c0-3.315-2.685-6-6-6z"/>
  </svg>
);

export const ZoomLogo: React.FC<LogoProps> = ({ className = "h-6 w-6" }) => (
  <svg className={className} fill="#4279d1" viewBox="0 0 32 32" version="1.1" xmlns="http://www.w3.org/2000/svg">
    <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
    <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g>
    <g id="SVGRepo_iconCarrier">
      <title>zoom</title>
      <path d="M19.283 17.4c-0.367 0.374-0.879 0.606-1.444 0.606-1.117 0-2.023-0.906-2.023-2.023s0.906-2.023 2.023-2.023c0.929 0 1.712 0.626 1.949 1.479l0.003 0.014c0.045 0.159 0.071 0.341 0.071 0.53 0 0.552-0.221 1.052-0.579 1.417l0-0zM15.471 13.586c-0.648 0.615-1.052 1.483-1.052 2.446 0 1.861 1.509 3.37 3.37 3.37s3.37-1.509 3.37-3.37c0-1.54-1.033-2.838-2.444-3.241l-0.024-0.006c-0.27-0.078-0.581-0.123-0.902-0.123-0.899 0-1.716 0.352-2.32 0.925l0.002-0.001zM28.296 12.601c-0.802 0.001-1.522 0.352-2.016 0.909l-0.002 0.003c-0.496-0.562-1.219-0.915-2.023-0.915-0.563 0-1.086 0.173-1.519 0.468l0.009-0.006c-0.316-0.278-0.73-0.451-1.184-0.462l-0.002-0v6.742l0.337-0.016c0.544-0.014 0.981-0.451 0.995-0.993l0-0.001 0.016-0.337v-2.361l0.017-0.337c0-0.001 0-0.002 0-0.003 0-0.245 0.061-0.477 0.169-0.679l-0.004 0.008c0.238-0.405 0.671-0.672 1.166-0.672s0.928 0.267 1.162 0.664l0.003 0.006c0.103 0.196 0.164 0.428 0.165 0.675v0l0.017 0.339v2.361l0.016 0.336c0.022 0.54 0.454 0.972 0.991 0.995l0.002 0 0.337 0.016v-3.708l0.015-0.337c0-0.001 0-0.002 0-0.003 0-0.247 0.062-0.48 0.171-0.683l-0.004 0.008c0.238-0.403 0.67-0.669 1.165-0.669 0.496 0 0.929 0.268 1.164 0.666l0.003 0.006c0.102 0.195 0.162 0.427 0.162 0.673 0 0.001 0 0.001 0 0.002v-0l0.019 0.337v2.361l0.016 0.336c0.020 0.541 0.454 0.975 0.993 0.995l0.002 0 0.337 0.016v-4.045c-0.001-1.488-1.208-2.694-2.697-2.694-0.001 0-0.002 0-0.003 0h0zM12.206 17.4c-0.37 0.393-0.894 0.638-1.475 0.638-1.117 0-2.023-0.906-2.023-2.023s0.906-2.023 2.023-2.023c0.924 0 1.703 0.619 1.945 1.465l0.004 0.014c0.047 0.163 0.075 0.351 0.075 0.544 0 0.536-0.209 1.024-0.549 1.386l0.001-0.001zM10.78 12.6h-0.005c-1.86 0.001-3.367 1.509-3.367 3.368s1.508 3.368 3.368 3.368 3.368-1.508 3.368-3.368c0-1.86-1.507-3.367-3.366-3.368h-0zM6.734 18.008l-0.337-0.015h-3.035l4.044-4.045-0.016-0.337c-0.013-0.544-0.451-0.982-0.994-0.995l-0.001-0-0.337-0.016h-5.052l0.018 0.337c0.026 0.538 0.455 0.967 0.99 0.995l0.002 0 0.337 0.016h3.037l-4.049 4.045 0.017 0.336c0.019 0.541 0.453 0.975 0.992 0.995l0.002 0 0.337 0.016h5.056l-0.018-0.337c-0.024-0.539-0.455-0.969-0.991-0.993l-0.002-0z"></path>
    </g>
  </svg>
);

export const MicrosoftTeamsLogo: React.FC<LogoProps> = ({ className = "h-6 w-6" }) => (
  <svg className={className} viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" fill="none">
    <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
    <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g>
    <g id="SVGRepo_iconCarrier">
      <path fill="#5059C9" d="M10.765 6.875h3.616c.342 0 .619.276.619.617v3.288a2.272 2.272 0 01-2.274 2.27h-.01a2.272 2.272 0 01-2.274-2.27V7.199c0-.179.145-.323.323-.323zM13.21 6.225c.808 0 1.464-.655 1.464-1.462 0-.808-.656-1.463-1.465-1.463s-1.465.655-1.465 1.463c0 .807.656 1.462 1.465 1.462z"></path>
      <path fill="#7B83EB" d="M8.651 6.225a2.114 2.114 0 002.117-2.112A2.114 2.114 0 008.65 2a2.114 2.114 0 00-2.116 2.112c0 1.167.947 2.113 2.116 2.113zM11.473 6.875h-5.97a.611.611 0 00-.596.625v3.75A3.669 3.669 0 008.488 15a3.669 3.669 0 003.582-3.75V7.5a.611.611 0 00-.597-.625z"></path>
      <path fill="#000000" d="M8.814 6.875v5.255a.598.598 0 01-.596.595H5.193a3.951 3.951 0 01-.287-1.476V7.5a.61.61 0 01.597-.624h3.31z" opacity=".1"></path>
      <path fill="#000000" d="M8.488 6.875v5.58a.6.6 0 01-.596.595H5.347a3.22 3.22 0 01-.267-.65 3.951 3.951 0 01-.172-1.15V7.498a.61.61 0 01.596-.624h2.985z" opacity=".2"></path>
      <path fill="#000000" d="M8.488 6.875v4.93a.6.6 0 01-.596.595H5.08a3.951 3.951 0 01-.172-1.15V7.498a.61.61 0 01.596-.624h2.985z" opacity=".2"></path>
      <path fill="#000000" d="M8.163 6.875v4.93a.6.6 0 01-.596.595H5.079a3.951 3.951 0 01-.172-1.15V7.498a.61.61 0 01.596-.624h2.66z" opacity=".2"></path>
      <path fill="#000000" d="M8.814 5.195v1.024c-.055.003-.107.006-.163.006-.055 0-.107-.003-.163-.006A2.115 2.115 0 016.593 4.6h1.625a.598.598 0 01.596.594z" opacity=".1"></path>
      <path fill="#000000" d="M8.488 5.52v.699a2.115 2.115 0 01-1.79-1.293h1.195a.598.598 0 01.595.594z" opacity=".2"></path>
      <path fill="#000000" d="M8.488 5.52v.699a2.115 2.115 0 01-1.79-1.293h1.195a.598.598 0 01.595.594z" opacity=".2"></path>
      <path fill="#000000" d="M8.163 5.52v.647a2.115 2.115 0 01-1.465-1.242h.87a.598.598 0 01.595.595z" opacity=".2"></path>
      <path fill="url(#microsoft-teams-color-16__paint0_linear_2372_494)" d="M1.597 4.925h5.969c.33 0 .597.267.597.596v5.958a.596.596 0 01-.597.596h-5.97A.596.596 0 011 11.479V5.521c0-.33.267-.596.597-.596z"></path>
      <path fill="#ffffff" d="M6.152 7.193H4.959v3.243h-.76V7.193H3.01v-.63h3.141v.63z"></path>
      <defs>
        <linearGradient id="microsoft-teams-color-16__paint0_linear_2372_494" x1="2.244" x2="6.906" y1="4.46" y2="12.548" gradientUnits="userSpaceOnUse">
          <stop stopColor="#5A62C3"></stop>
          <stop offset=".5" stopColor="#4D55BD"></stop>
          <stop offset="1" stopColor="#3940AB"></stop>
        </linearGradient>
      </defs>
    </g>
  </svg>
);

export const WebexLogo: React.FC<LogoProps> = ({ className = "h-6 w-6" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="12" fill="#00BCF2"/>
    <path
      d="M7 9h10c.6 0 1 .4 1 1v4c0 .6-.4 1-1 1H7c-.6 0-1-.4-1-1v-4c0-.6.4-1 1-1z"
      fill="white"
    />
    <circle cx="9" cy="11.5" r="0.8" fill="#00BCF2"/>
    <circle cx="12" cy="11.5" r="0.8" fill="#00BCF2"/>
    <circle cx="15" cy="11.5" r="0.8" fill="#00BCF2"/>
    <path d="M8 13.5h8v1h-8v-1z" fill="#00BCF2"/>
  </svg>
);

export const GenericMeetingLogo: React.FC<LogoProps> = ({ className = "h-6 w-6" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="12" fill="#6B7280"/>
    <path
      d="M6 9h12c.6 0 1 .4 1 1v4c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-4c0-.6.4-1 1-1z"
      fill="white"
    />
    <path
      d="M16.5 10.5l2.5 1.5-2.5 1.5v-3z"
      fill="white"
    />
    <circle cx="8.5" cy="11.5" r="0.5" fill="#6B7280"/>
    <circle cx="10.5" cy="11.5" r="0.5" fill="#6B7280"/>
    <circle cx="12.5" cy="11.5" r="0.5" fill="#6B7280"/>
    <path d="M7.5 13h5v0.5h-5V13z" fill="#6B7280"/>
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
