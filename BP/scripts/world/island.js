// island trap for voided players - placed in the end
import { world, system } from "@minecraft/server";
console.warn("[keirazelle] island loaded");

const CONFIG = Object.freeze({
    CHECK_INTERVAL: 10,
    DIMENSION: "the_end",
    FINAL_POS: { x: 400, y: 80, z: 400 },
    STRUCTURE_POS: { x: 396, y: 76, z: 396 },
    STRUCTURE_NAME: "mystructure:island",
    MAX_RADIUS_SQR: 10000,
    MIN_Y: 40,
    RESISTANCE_DURATION: 999999,
    RESISTANCE_AMP: 255
});

// check if structure already placed
function isIslandPlaced() {
    return world.getDynamicProperty("betafied:island_placed") === true;
}

// place island structure in the end
function placeIsland() {
    if (isIslandPlaced()) return;
    
    try {
        const end = world.getDimension(CONFIG.DIMENSION);
        end.runCommand(`structure load ${CONFIG.STRUCTURE_NAME} ${CONFIG.STRUCTURE_POS.x} ${CONFIG.STRUCTURE_POS.y} ${CONFIG.STRUCTURE_POS.z}`);
        world.setDynamicProperty("betafied:island_placed", true);
        console.warn("[island] structure placed in the end");
    } catch (e) {
        console.warn(`[island] failed to place structure: ${e}`);
    }
}

system.runInterval(() => {
    for (const player of world.getPlayers()) {
        if (!player.isValid()) continue;
        
        // if tag removed, clear resistance and skip
        if (!player.hasTag("voided")) {
            try {
                player.removeEffect("resistance");
            } catch {}
            continue;
        }
        
        // place island on first voided player
        if (!isIslandPlaced()) {
            placeIsland();
        }
        
        const end = world.getDimension(CONFIG.DIMENSION);
        
        // tp to end if not already there
        if (player.dimension.id !== `minecraft:${CONFIG.DIMENSION}`) {
            player.teleport(CONFIG.FINAL_POS, { dimension: end });
        }
        
        try {
            // keep resistance maxed out forever
            player.addEffect("resistance", CONFIG.RESISTANCE_DURATION, { 
                amplifier: CONFIG.RESISTANCE_AMP, 
                showParticles: false 
            });

            const loc = player.location;
            const dx = loc.x - CONFIG.FINAL_POS.x;
            const dz = loc.z - CONFIG.FINAL_POS.z;
            
            // escaped? yeet back
            if (dx*dx + dz*dz > CONFIG.MAX_RADIUS_SQR || loc.y < CONFIG.MIN_Y) {
                player.teleport(CONFIG.FINAL_POS, { dimension: end });
            }
        } catch {}
    }
}, CONFIG.CHECK_INTERVAL);
