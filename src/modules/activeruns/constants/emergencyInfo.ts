// Emergency information panel content (WP-FirstAidInfo-v1).
// Bundled in code so it displays with no signal. Edit wording here only.

export interface DrcabcdeItem {
  letter: string;
  title: string;
  text: string;
}

export const DRCABCDE_ITEMS: DrcabcdeItem[] = [
  {
    letter: 'D',
    title: 'Danger',
    text: 'Check for danger to yourself, the casualty and others, such as traffic or hazards. Make the area safe before you approach.'
  },
  {
    letter: 'R',
    title: 'Response',
    text: 'Check whether the casualty responds. Speak to them, ask their name, and gently squeeze their shoulders. If there is no response, shout for help.'
  },
  {
    letter: 'C',
    title: 'Catastrophic bleeding',
    text: 'Look for life-threatening bleeding. Control it with firm direct pressure on the wound.'
  },
  {
    letter: 'A',
    title: 'Airway',
    text: 'Check the airway is open and clear. If the casualty is unresponsive, gently tilt the head back and lift the chin.'
  },
  {
    letter: 'B',
    title: 'Breathing',
    text: 'Look, listen and feel for normal breathing for up to 10 seconds. If they are not breathing normally, call 999 and get a defibrillator.'
  },
  {
    letter: 'C',
    title: 'Circulation',
    text: 'Check for signs of shock: pale, cold or clammy skin, fast pulse, dizziness or confusion.'
  },
  {
    letter: 'D',
    title: 'Disability',
    text: 'Check level of consciousness: are they alert, responding to voice, responding only to pain, or unresponsive? Look for signs of a stroke or low blood sugar.'
  },
  {
    letter: 'E',
    title: 'Exposure and environment',
    text: 'Check for other injuries and protect the casualty from cold, heat and wet. Keep their dignity.'
  }
];

export const DEFIBFINDER_URL = 'https://www.defibfinder.uk/';

export const DEFIBFINDER_LINK_LABEL = 'Find nearest defibrillator (opens DefibFinder)';

export const DEFIBFINDER_NOTE =
  'DefibFinder shows defibrillators registered on The Circuit. It may be incomplete and needs a mobile signal. Always call 999 first. The call handler can direct you to the nearest registered defibrillator.';

export const EMERGENCY_FOOTER =
  'Information only. This is not a substitute for first aid training. In an emergency call 999.';
