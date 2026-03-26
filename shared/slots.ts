export interface Slot {
  id: string;
  label: string;
  aliases: string[];
}

export const SLOTS: Slot[] = [
  { id: 'slot_05_07', label: '05h-07h', aliases: ['2'] },
  { id: 'slot_07_10', label: '07h-10h', aliases: ['3'] },
  { id: 'slot_10_13', label: '10h-13h', aliases: ['4'] },
  { id: 'slot_13_16', label: '13h-16h', aliases: ['5'] },
  { id: 'slot_16_19', label: '16h-19h', aliases: ['6'] },
  { id: 'slot_19_22', label: '19h-22h', aliases: ['7'] },
  { id: 'slot_22_00', label: '22h-00h', aliases: ['8'] },
  { id: 'slot_00_05', label: '00h-05h', aliases: ['1'] },
];

const slotLookup = new Map<string, Slot>();

for (const slot of SLOTS) {
  slotLookup.set(slot.id, slot);

  for (const alias of slot.aliases) {
    slotLookup.set(alias, slot);
  }
}

export function normalizeSlotId(slotId: string | null | undefined) {
  if (!slotId) return '';
  return slotLookup.get(slotId)?.id ?? slotId;
}

export function getSlotLabel(slotId: string) {
  return slotLookup.get(normalizeSlotId(slotId))?.label ?? slotId;
}

export function getSlotOrder(slotId: string) {
  const normalizedSlotId = normalizeSlotId(slotId);
  const index = SLOTS.findIndex((slot) => slot.id === normalizedSlotId);
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}
