export type FestiveType = 'christmas' | 'halloween' | 'none';

export const getFestiveType = (): FestiveType => {
  const today = new Date();
  const month = today.getMonth() + 1; // getMonth() returns 0-11
  const day = today.getDate();

  // Christmas season: December 1st to January 6th (Epiphany)
  if (month === 12) {
    return 'christmas';
  }
  if (month === 1 && day <= 6) {
    return 'christmas';
  }

  // Halloween season: October 1st to November 2nd (Day of the Dead)
  if (month === 10) {
    return 'halloween';
  }
  if (month === 11 && day <= 2) {
    return 'halloween';
  }

  // All other days: no festive effect
  return 'none';
};

// Debug function to test festive types for different dates
export const getFestiveTypeForDate = (date: Date): FestiveType => {
  const month = date.getMonth() + 1;
  const day = date.getDate();

  // Christmas season: December 1st to January 6th (Epiphany)
  if (month === 12) {
    return 'christmas';
  }
  if (month === 1 && day <= 6) {
    return 'christmas';
  }

  // Halloween season: October 1st to November 2nd (Day of the Dead)
  if (month === 10) {
    return 'halloween';
  }
  if (month === 11 && day <= 2) {
    return 'halloween';
  }

  // All other days: no festive effect
  return 'none';
};

export const getFestiveEffectComponent = (festiveType: FestiveType) => {
  switch (festiveType) {
    case 'christmas':
      return 'ChristmasEffect';
    case 'halloween':
      return 'HalloweenEffect';
    case 'none':
    default:
      return null;
  }
}; 