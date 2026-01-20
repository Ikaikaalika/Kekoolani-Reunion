export type RegistrationGuideline = {
  key: string;
  label: string;
  description: string;
};

export const REGISTRATION_GUIDELINES: RegistrationGuideline[] = [
  {
    key: 'participant_name',
    label: 'Participant Name',
    description: 'Primary registrant name in Last, First, Middle format.'
  },
  {
    key: 'lineage',
    label: 'Lineage',
    description: 'Parent, grandparent, or great-grandparent line (Nawai, Katherine, Amy, etc.).'
  },
  {
    key: 'contact_info',
    label: 'Contact Info',
    description: 'Phone, mailing address, and email for the primary registrant.'
  },
  {
    key: 'attendance_days',
    label: 'Participation Days',
    description: 'Select which reunion days each person will attend.'
  },
  {
    key: 'tshirt',
    label: 'T-shirt Order',
    description: 'Sizes and quantities for the primary registrant and each participant.'
  },
  {
    key: 'participants',
    label: 'All Participants',
    description: 'List each participant with age and relationship to the family line.'
  },
  {
    key: 'donation_note',
    label: 'Donation Note',
    description: 'Optional contribution toward the reunion fund.'
  }
];

export const REGISTRATION_FORM_FIELDS = [
  { key: 'lineage', label: 'Lineage (parent/grandparent line)' },
  { key: 'lineage_other', label: 'Lineage (other)' },
  { key: 'contact_phone', label: 'Contact Phone' },
  { key: 'contact_address', label: 'Contact Address' },
  { key: 'attendance_days', label: 'Days of Participation' },
  { key: 'tshirt_size', label: 'T-shirt Size' },
  { key: 'tshirt_quantity', label: 'T-shirt Quantity' },
  { key: 'additional_participants', label: 'Additional Participants (names, ages, relationships)' },
  { key: 'participant_days', label: 'Participant Days' },
  { key: 'participant_shirts', label: 'Participant T-shirt Sizes & Quantities' },
  { key: 'donation_note', label: 'Donation Note' }
];
