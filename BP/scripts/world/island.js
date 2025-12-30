import { world, system } from "@minecraft/server";
console.warn("[keirazelle] Island Gen Loaded");

const CONFIG = Object.freeze({
    CHECK_INTERVAL: 20,
    ISLAND_CENTER: { x: 300, y: 60, z: 300 },
    SPAWN_POINT: { x: 300, y: 65, z: 300 },
    MAX_RADIUS_SQR: 100 * 100,
    MIN_Y: 50,
    RESIST_DURATION: 100,
    RESIST_AMPLIFIER: 20
});

function* islandJob() {
    const players = world.getAllPlayers();
    
    for (const player of players) {
        if (!player.hasTag("voided")) continue;
        
        try {
            const loc = player.location;

            // invincibility
            player.addEffect("resistance", CONFIG.RESIST_DURATION, {
                amplifier: CONFIG.RESIST_AMPLIFIER,
                showParticles: false
            });
            player.addEffect("saturation", CONFIG.RESIST_DURATION, {
                amplifier: CONFIG.RESIST_AMPLIFIER,
                showParticles: false
            });

            // distance check
            const dx = loc.x - CONFIG.ISLAND_CENTER.x;
            const dz = loc.z - CONFIG.ISLAND_CENTER.z;
            const distSqr = dx * dx + dz * dz;
            const belowY = loc.y < CONFIG.MIN_Y;

            // teleport if escaped
            if (distSqr > CONFIG.MAX_RADIUS_SQR || belowY) {
                player.teleport(CONFIG.SPAWN_POINT, { 
                    dimension: world.getDimension("overworld") 
                });
            }
        } catch (e) {
            console.warn(`[island] error: ${e}`);
        }
        
        yield;
    }
}

system.runInterval(() => {
    system.runJob(islandJob());
}, CONFIG.CHECK_INTERVAL);
