import { NanoCosmosEngine, PRESET_QUERIES } from '../src/engine/index.ts';

const engine = new NanoCosmosEngine();

console.log("=== Testing NanoCosmos Engine ===\n");

for (const preset of PRESET_QUERIES) {
  console.log(`--- Running: ${preset.name} ---`);
  const result = engine.query(preset.sql);
  
  if (result.error) {
    console.error("ERROR:", result.error);
  } else {
    console.log(`Status: SUCCESS`);
    console.log(`Request Charge: ${result.metrics.requestCharge} RUs`);
    console.log(`Single Partition: ${result.metrics.partitionMetrics.isSinglePartition}`);
    console.log(`Output Count: ${result.documents.length} docs`);
    console.log(`Explanation: ${result.metrics.explanation}\n`);
  }
}
