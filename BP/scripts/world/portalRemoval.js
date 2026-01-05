// ruined portal block removal - optimized with runJob
import { world, system } from "@minecraft/server";
console.warn("[keirazelle] Portal Removal System Loaded");

const RUINED_PORTAL_BLOCKS = Object.freeze(new Set([
    "minecraft:crying_obsidian",
    "minecraft:magma"
]));

// staggered generator for performance
function* scanAroundPlayer(player) {
    const dim = player.dimension;
    const px = Math.floor(player.location.x);
    const py = Math.floor(player.location.y);
    const pz = Math.floor(player.location.z);
    
    const RADIUS = 16;
    const Y_RANGE = 16;
    
    // scan in chunks, yielding between each slice
    for (let dx = -RADIUS; dx <= RADIUS; dx += 4) {
        for (let dz = -RADIUS; dz <= RADIUS; dz += 4) {
            for (let dy = -Y_RANGE; dy <= Y_RANGE; dy += 4) {
                try {
                    const block = dim.getBlock({ 
                        x: px + dx, 
                        y: py + dy, 
                        z: pz + dz 
                    });
                    
                    if (block && RUINED_PORTAL_BLOCKS.has(block.typeId)) {
                        block.setType(py + dy < 0 ? "minecraft:stone" : "minecraft:air");
                    }
                } catch (e) {}
            }
            yield; // yield after each column
        }
    }
}

// generator for player scans
function* portalScanJob() {
    for (const player of world.getPlayers()) {
        yield* scanAroundPlayer(player);
    }
}

// run scan as background job every 10 seconds
system.runInterval(() => {
    system.runJob(portalScanJob());
}, 300); 
