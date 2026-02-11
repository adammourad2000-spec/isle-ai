// Quick test for knowledge base
import { CAYMAN_KNOWLEDGE_BASE, KNOWLEDGE_BASE_STATS } from './data/cayman-islands-knowledge.ts';

console.log('KNOWLEDGE_BASE_STATS:', KNOWLEDGE_BASE_STATS);
console.log('Total nodes in CAYMAN_KNOWLEDGE_BASE:', CAYMAN_KNOWLEDGE_BASE.length);

// Check how many have valid coordinates
const withCoords = CAYMAN_KNOWLEDGE_BASE.filter(node => {
  const lat = node.location?.coordinates?.lat ?? node.location?.latitude;
  const lng = node.location?.coordinates?.lng ?? node.location?.longitude;
  return typeof lat === 'number' && typeof lng === 'number';
});

console.log('With valid coordinates:', withCoords.length);

// Check how many would pass the FULL filter (isActive + coords)
const filtered = CAYMAN_KNOWLEDGE_BASE.filter(node => {
  if (node.isActive === false) return false;
  const lat = node.location?.coordinates?.lat ?? node.location?.latitude;
  const lng = node.location?.coordinates?.lng ?? node.location?.longitude;
  return typeof lat === 'number' && typeof lng === 'number' && !Number.isNaN(lat) && !Number.isNaN(lng);
});

console.log('After full filter (isActive + coords):', filtered.length);

// First 5 with coords
console.log('\nFirst 5 with coords:');
withCoords.slice(0, 5).forEach((node, i) => {
  const lat = node.location?.coordinates?.lat ?? node.location?.latitude;
  const lng = node.location?.coordinates?.lng ?? node.location?.longitude;
  console.log(`  ${i+1}. ${node.name} | ${lat}, ${lng}`);
});
