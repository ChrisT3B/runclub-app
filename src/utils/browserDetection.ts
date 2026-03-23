export const isRestrictedBrowser = (): boolean => {
  const ua = navigator.userAgent || '';
  return (
    ua.includes('FBAN') ||
    ua.includes('FBAV') ||
    ua.includes('FB_IAB') ||
    ua.includes('Instagram') ||
    ua.includes('BytedanceWebview') ||
    ua.includes('musical_ly')
  );
};
