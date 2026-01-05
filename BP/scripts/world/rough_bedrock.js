/* import { world, system, BlockPermutation, GameMode } from "@minecraft/server";

console.warn("[keirazelle] Rough Bedrock Module Loaded");

const BEDROCK = BlockPermutation.resolve("minecraft:bedrock");
const VISITED_CHUNKS = new Set();
const CHUNKS_PER_TICK = 1; // limit like chunk_scrubber

system.runInterval(() => {
    let processed = 0;

    for (const player of world.getPlayers()) {
        if (processed >= CHUNKS_PER_TICK) break;
        
        // only process when player is near bedrock layer
        if (player.location.y > 20) continue;

        const dim = player.dimension;
        const { x: px, z: pz } = player.location;
        
        const cx = Math.floor(px / 16);
        const cz = Math.floor(pz / 16);

        // scan 3x3 area
        for (let dx = -1; dx <= 1; dx++) {
            if (processed >= CHUNKS_PER_TICK) break;

            for (let dz = -1; dz <= 1; dz++) {
                if (processed >= CHUNKS_PER_TICK) break;

                const chunkX = cx + dx;
                const chunkZ = cz + dz;
                const key = `${chunkX},${chunkZ}`;

                // session cache
                if (VISITED_CHUNKS.has(key)) continue;

                const startX = chunkX * 16;
                const startZ = chunkZ * 16;

                try {
                    // quick check if already processed
                    const checkBlock = dim.getBlock({ x: startX + 8, y: 0, z: startZ + 8 });
                    if (checkBlock?.typeId === "minecraft:bedrock") {
                        VISITED_CHUNKS.add(key);
                        continue;
                    }
                    
                    // use commands for speed - 5 commands total instead of 256+ block ops
                    dim.runCommand(`fill ${startX} 0 ${startZ} ${startX+15} 0 ${startZ+15} bedrock`);
                    dim.runCommand(`fill ${startX} 1 ${startZ} ${startX+15} 1 ${startZ+15} bedrock 0 replace stone ["stone_type":"stone"]`);
                    dim.runCommand(`fill ${startX} 2 ${startZ} ${startX+15} 2 ${startZ+15} bedrock 0 replace stone ["stone_type":"stone"]`);
                    dim.runCommand(`fill ${startX} 3 ${startZ} ${startX+15} 3 ${startZ+15} bedrock 0 replace stone ["stone_type":"stone"]`);
                    dim.runCommand(`fill ${startX} 4 ${startZ} ${startX+15} 4 ${startZ+15} bedrock 0 replace stone ["stone_type":"stone"]`);

                    VISITED_CHUNKS.add(key);
                    processed++;

                } catch (e) {}
            }
        }
    }
}, 5); // every 5 ticks - less TPS usage

// survival protection
world.beforeEvents.playerBreakBlock.subscribe((event) => {
    if (event.block.typeId === "minecraft:bedrock") {
        const isCreative = event.player.matches({ gameMode: GameMode.creative });
        if (!isCreative) event.cancel = true;
    }
});

// anti-void placement
world.beforeEvents.itemUseOn.subscribe((event) => {
    const { block } = event;
    if (block.y < 0) event.cancel = true;
});
*/ // commented out for now