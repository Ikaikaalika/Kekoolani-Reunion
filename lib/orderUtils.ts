export type PersonRecord = Record<string, unknown>;

export type OrderParticipant = {
  index: number;
  name: string;
  email: string;
  attending: boolean;
  refunded: boolean;
  showName: boolean;
  showPhoto: boolean;
  hasPhoto: boolean;
};

type AgeBoundedTicket = {
  age_min?: number | null;
  age_max?: number | null;
  price_cents?: number | null;
};

type OrderItemWithTicket = {
  quantity: number;
  ticket_types?: { price_cents?: number | null; age_min?: number | null; age_max?: number | null } | null;
};

export function getPeopleFromAnswers(answers: unknown): PersonRecord[] {
  if (!answers || typeof answers !== 'object') return [];
  const record = answers as Record<string, unknown>;
  const people = record.people;
  return Array.isArray(people) ? (people.filter((item) => item && typeof item === 'object') as PersonRecord[]) : [];
}

export function getPhotoUrlsFromAnswers(answers: unknown): Array<string | null> {
  if (!answers || typeof answers !== 'object') return [];
  const record = answers as Record<string, unknown>;
  const photoUrls = record.photo_urls;
  return Array.isArray(photoUrls)
    ? (photoUrls.map((item) => (typeof item === 'string' ? item : null)) as Array<string | null>)
    : [];
}

export function getParticipantName(person: PersonRecord): string {
  const fullName = typeof person.full_name === 'string' ? person.full_name : '';
  if (fullName.trim()) return fullName.trim();
  const name = typeof person.name === 'string' ? person.name : '';
  return name.trim();
}

export function getParticipantEmail(person: PersonRecord): string {
  const email = typeof person.email === 'string' ? person.email : '';
  return email.trim();
}

export function isParticipantAttending(person: PersonRecord): boolean {
  return person.attending !== false;
}

export function isParticipantRefunded(person: PersonRecord): boolean {
  return person.refunded === true;
}

export function normalizeOrderParticipants(answers: unknown): OrderParticipant[] {
  const people = getPeopleFromAnswers(answers);
  const photoUrls = getPhotoUrlsFromAnswers(answers);
  return people.map((person, index) => ({
    index,
    name: getParticipantName(person) || `Participant ${index + 1}`,
    email: getParticipantEmail(person),
    attending: isParticipantAttending(person),
    refunded: isParticipantRefunded(person),
    showName: typeof person.show_name === 'boolean' ? person.show_name : true,
    showPhoto: typeof person.show_photo === 'boolean' ? person.show_photo : Boolean(photoUrls[index]),
    hasPhoto: Boolean(photoUrls[index])
  }));
}

export function buildTicketPriceSlots(items: OrderItemWithTicket[]): number[] {
  const slots: number[] = [];
  items.forEach((item) => {
    const ticket = item.ticket_types ?? null;
    const isAdmission = typeof ticket?.age_min === 'number' || typeof ticket?.age_max === 'number';
    if (!isAdmission) return;
    const quantity = Number.isFinite(item.quantity) ? Math.max(0, item.quantity) : 0;
    const price = typeof ticket?.price_cents === 'number' ? ticket.price_cents : 0;
    for (let i = 0; i < quantity; i += 1) {
      slots.push(price);
    }
  });
  return slots;
}

export function calculateRefundedCents(orderTotalCents: number, people: PersonRecord[], ticketPrices: number[]): number {
  if (orderTotalCents <= 0) return 0;
  const fallbackBase =
    ticketPrices.length > 0
      ? Math.round(orderTotalCents / ticketPrices.length)
      : people.length > 0
      ? Math.round(orderTotalCents / people.length)
      : 0;

  const refunded = people.reduce((sum, person, index) => {
    if (!isParticipantRefunded(person)) return sum;
    const price = ticketPrices[index] ?? fallbackBase;
    return sum + price;
  }, 0);

  return Math.min(orderTotalCents, Math.max(0, refunded));
}

export function calculateNetTotalCents(orderTotalCents: number, people: PersonRecord[], ticketPrices: number[]): number {
  const refunded = calculateRefundedCents(orderTotalCents, people, ticketPrices);
  return Math.max(0, orderTotalCents - refunded);
}

export function getParticipantAge(person: PersonRecord): number | null {
  const raw = person.age;
  const parsed = typeof raw === 'number' ? raw : typeof raw === 'string' ? Number(raw) : NaN;
  if (Number.isNaN(parsed)) return null;
  return parsed;
}

export function matchesAgeRange(ticket: AgeBoundedTicket, age: number): boolean {
  const min = typeof ticket.age_min === 'number' ? ticket.age_min : null;
  const max = typeof ticket.age_max === 'number' ? ticket.age_max : null;
  if (min !== null && age < min) return false;
  if (max !== null && age > max) return false;
  return true;
}

export function selectTicketForAge<T extends AgeBoundedTicket>(tickets: T[], age: number): T | null {
  let selected: T | null = null;
  let selectedPrice = Number.POSITIVE_INFINITY;
  let selectedSpan = Number.POSITIVE_INFINITY;

  for (const ticket of tickets) {
    if (!matchesAgeRange(ticket, age)) continue;
    const price = typeof ticket.price_cents === 'number' ? ticket.price_cents : 0;
    const min = typeof ticket.age_min === 'number' ? ticket.age_min : Number.NEGATIVE_INFINITY;
    const max = typeof ticket.age_max === 'number' ? ticket.age_max : Number.POSITIVE_INFINITY;
    const span = max - min;

    if (!selected || price < selectedPrice || (price === selectedPrice && span < selectedSpan)) {
      selected = ticket;
      selectedPrice = price;
      selectedSpan = span;
    }
  }

  return selected;
}

export function countParticipantsInAgeRange(
  people: PersonRecord[],
  ageMin?: number | null,
  ageMax?: number | null
): number {
  return people.reduce((count, person) => {
    const age = getParticipantAge(person);
    if (age === null) return count;
    if (typeof ageMin === 'number' && age < ageMin) return count;
    if (typeof ageMax === 'number' && age > ageMax) return count;
    return count + 1;
  }, 0);
}
