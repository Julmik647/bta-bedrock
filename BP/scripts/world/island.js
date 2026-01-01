// island trap for voided players
import { world, system } from "@minecraft/server";
console.warn("[keirazelle] island loaded");

const CONFIG = Object.freeze({
    CHECK_INTERVAL: 10,
    FINAL_POS: { x: 304, y: 80, z: 306 },
    STRUCTURE_POS: { x: 300, y: 60, z: 300 },
    STRUCTURE_NAME: "mystructure:island",
    MAX_RADIUS_SQR: 10000,
    MIN_Y: 40
});

// check if structure already placed this world
function isIslandPlaced() {
    return world.getDynamicProperty("betafied:island_placed") === true;
}

// place island structure once
function placeIsland() {
    if (isIslandPlaced()) return;
    
    try {
        const overworld = world.getDimension("overworld");
        overworld.runCommand(`structure load ${CONFIG.STRUCTURE_NAME} ${CONFIG.STRUCTURE_POS.x} ${CONFIG.STRUCTURE_POS.y} ${CONFIG.STRUCTURE_POS.z}`);
        world.setDynamicProperty("betafied:island_placed", true);
        console.warn("[island] structure placed");
    } catch (e) {
        console.warn(`[island] failed to place structure: ${e}`);
    }
}

system.runInterval(() => {
    for (const player of world.getPlayers()) {
        if (!player.isValid()) continue;
        if (!player.hasTag("voided")) continue;
        if (player.dimension.id !== "minecraft:overworld") continue;
        
        // place island on first voided player
        if (!isIslandPlaced()) {
            placeIsland();
        }
        
        try {
            const loc = player.location;
            const dx = loc.x - CONFIG.FINAL_POS.x;
            const dz = loc.z - CONFIG.FINAL_POS.z;
            
            // escaped? yeet back
            if (dx*dx + dz*dz > CONFIG.MAX_RADIUS_SQR || loc.y < CONFIG.MIN_Y) {
                player.teleport(CONFIG.FINAL_POS, { 
                    dimension: world.getDimension("overworld") 
                });
                player.addEffect("resistance", 100, { amplifier: 20, showParticles: false });
            }
        } catch (e) {}
    }
}, CONFIG.CHECK_INTERVAL);
