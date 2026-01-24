export type RegistrationGuideline = {
  key: string;
  label: string;
  description: string;
};

export const REGISTRATION_GUIDELINES: RegistrationGuideline[] = [
  {
    key: 'participant_details',
    label: 'Participant Details',
    description: 'For each attendee: full name (Last, First, Middle), age, and relationship.'
  },
  {
    key: 'lineage',
    label: 'Lineage',
    description: 'Parent, grandparent, or great-grandparent line for each attendee.'
  },
  {
    key: 'contact_info',
    label: 'Contact Info',
    description: 'Email, phone, and mailing address for each attendee (or use primary contact info).'
  },
  {
    key: 'attendance_days',
    label: 'Participation Days',
    description: 'Select which reunion days each person will attend.'
  },
  {
    key: 'tshirt',
    label: 'T-shirt Order',
    description: 'Optional: choose category, style, size, and quantity for each shirt (youth sizes S-L, adult sizes S-5X).'
  },
  {
    key: 'donation_note',
    label: 'Donation Note',
    description: 'Optional contribution toward the reunion fund.'
  }
];

export const REGISTRATION_FORM_FIELDS = [
  { key: 'people', label: 'Participants (details)' },
  { key: 'photo_urls', label: 'Photo URLs' },
  { key: 'tshirt_orders', label: 'T-shirt Orders' },
  { key: 'donation_note', label: 'Donation Note' }
];
