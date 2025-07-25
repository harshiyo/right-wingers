import { QuerySnapshot, DocumentData } from 'firebase/firestore';

export interface InstructionTile {
  id: string;
  label: string;
  color: string;
  isActive: boolean;
  sortOrder: number;
}

export function getPizzaInstructionLabels(
  pizzaInstructionTiles: QuerySnapshot<DocumentData> | undefined,
  instructionIds: string[]
): string[] {
  if (!pizzaInstructionTiles) return instructionIds;
  const tiles = pizzaInstructionTiles.docs
    .map(doc => ({ id: doc.id, ...doc.data() } as InstructionTile))
    .filter(tile => tile.isActive);
  return instructionIds.map(id => {
    const tile = tiles.find(t => t.id === id);
    return tile ? tile.label : id;
  });
}

export function getWingInstructionLabels(
  wingInstructionTiles: QuerySnapshot<DocumentData> | undefined,
  instructionIds: string[]
): string[] {
  if (!wingInstructionTiles) return instructionIds;
  const tiles = wingInstructionTiles.docs
    .map(doc => ({ id: doc.id, ...doc.data() } as InstructionTile))
    .filter(tile => tile.isActive);
  return instructionIds.map(id => {
    const tile = tiles.find(t => t.id === id);
    return tile ? tile.label : id;
  });
} 