import { world, system } from "@minecraft/server";

// random spawn within pre-generated bounds
// keeps spawn away from edges to avoid loading new chunks
const SPAWN_BOUNDS = {
    minX: -1500,
    maxX: 1500,
    minZ: -1500,
    maxZ: 1500,
    safeY: 100 // drop from sky to find ground
};

console.warn("[Betafied] Random Spawn Module Loaded");

// track if world spawn has been set this session
let worldSpawnSet = false;

world.afterEvents.playerSpawn.subscribe((event) => {
    const player = event.player;
    
    // only on initial spawn (not respawn)
    if (!event.initialSpawn) return;
    
    // check if player already spawned before
    if (player.hasTag("spawned")) return;
    
    // first player sets the world spawn
    if (!worldSpawnSet) {
        const randX = Math.floor(Math.random() * (SPAWN_BOUNDS.maxX - SPAWN_BOUNDS.minX)) + SPAWN_BOUNDS.minX;
        const randZ = Math.floor(Math.random() * (SPAWN_BOUNDS.maxZ - SPAWN_BOUNDS.minZ)) + SPAWN_BOUNDS.minZ;
        
        system.run(() => {
            try {
                // tp player high, let them fall to find ground
                player.teleport({ x: randX, y: SPAWN_BOUNDS.safeY, z: randZ });
                
                // set world spawn for this copy
                player.dimension.runCommand(`setworldspawn ${randX} 64 ${randZ}`);
                
                // mark player as spawned
                player.addTag("spawned");
                
                // give resistance to survive fall
                player.addEffect("slow_falling", 400, { amplifier: 0, showParticles: false });
                
                worldSpawnSet = true;
                console.warn(`[Betafied] World spawn set to ${randX}, 64, ${randZ}`);
            } catch (e) {
                console.warn("[Betafied] Random spawn error: " + e);
            }
        });
    } else {
        // subsequent players just get tagged
        player.addTag("spawned");
    }
});
