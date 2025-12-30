// farmland on fences cant be trampled lol
// beta 1.7.3 had this weird quirk where fences blocked trampling

import { world, system } from "@minecraft/server";

const CONFIG = Object.freeze({
    INTERVAL: 4,
    CLEANUP_INTERVAL: 600,
    MAX_ENTRIES: 100
});

const FENCES = Object.freeze(new Set([
    "minecraft:oak_fence",
    "minecraft:spruce_fence",
    "minecraft:birch_fence",
    "minecraft:oak_fence"
]));

// tracks farmland that has fences below, key format: "dimId,x,y,z"
const protectedBlocks = new Map();

// generator so we dont lag
function* farmlandCheck() {
    const players = world.getAllPlayers();
    
    for (const player of players) {
        if (!player.isValid()) continue;
        
        const dim = player.dimension;
        const px = Math.floor(player.location.x);
        const py = Math.floor(player.location.y);
        const pz = Math.floor(player.location.z);
        
        // only check where player is standing, minimal footprint
        const positions = [
            { x: px, y: py, z: pz },
            { x: px, y: py - 1, z: pz }
        ];
        
        for (const pos of positions) {
            const key = `${dim.id},${pos.x},${pos.y},${pos.z}`;
            
            try {
                const block = dim.getBlock(pos);
                if (!block) continue;
                
                const below = dim.getBlock({ x: pos.x, y: pos.y - 1, z: pos.z });
                const hasFenceBelow = below && FENCES.has(below.typeId);
                
                if (block.typeId === "minecraft:farmland" && hasFenceBelow) {
                    // mark as protected
                    protectedBlocks.set(key, true);
                } else if (block.typeId === "minecraft:dirt" && protectedBlocks.has(key)) {
                    // got trampled but was protected, revert it
                    if (hasFenceBelow) {
                        block.setType("minecraft:farmland");
                    }
                    protectedBlocks.delete(key);
                }
            } catch (e) {
                // block not loaded or something, skip
            }
        }
        
        yield; // yield after each player
    }
}

// main loop
system.runInterval(() => {
    system.runJob(farmlandCheck());
}, CONFIG.INTERVAL);

// memory cleanup so map doesnt grow forever
system.runInterval(() => {
    if (protectedBlocks.size > CONFIG.MAX_ENTRIES) {
        protectedBlocks.clear();
    }
}, CONFIG.CLEANUP_INTERVAL);

console.warn("[keirazelle] farmland protection loaded");
