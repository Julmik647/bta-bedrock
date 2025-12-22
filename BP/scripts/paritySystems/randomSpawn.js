import { world, system } from "@minecraft/server";

// random spawn within pre-generated bounds
const SPAWN_BOUNDS = {
    minX: -1000,
    maxX: 1000,
    minZ: -1000,
    maxZ: 1000
};

console.warn("[Betafied] Random Spawn Module Loaded");

let worldSpawnSet = false;

// surface blocks
const SURFACE_BLOCKS = new Set([
    "minecraft:grass_block", "minecraft:grass",
    "minecraft:dirt", "minecraft:sand", 
    "minecraft:gravel", "minecraft:stone",
    "minecraft:snow", "minecraft:snow_layer",
    "minecraft:sandstone", "minecraft:clay"
]);

// check if location is water/ocean
function isWaterLocation(dimension, x, z) {
    for (let y = 62; y < 70; y++) {
        try {
            const block = dimension.getBlock({ x, y, z });
            if (block && block.typeId === "minecraft:water") return true;
        } catch (e) {}
    }
    return false;
}

// find highest safe ground
function findSafeGround(dimension, x, z) {
    // search from high to low for solid ground
    for (let y = 120; y > 40; y--) {
        try {
            const block = dimension.getBlock({ x, y, z });
            const above1 = dimension.getBlock({ x, y: y + 1, z });
            const above2 = dimension.getBlock({ x, y: y + 2, z });
            
            if (!block || !above1 || !above2) continue;
            
            const type = block.typeId;
            
            // skip water/lava/air
            if (type === "minecraft:water" || type === "minecraft:lava" || type === "minecraft:air") continue;
            
            // must have 2 air above (not water!)
            if (above1.typeId !== "minecraft:air" || above2.typeId !== "minecraft:air") continue;
            
            // found valid spot
            return y + 1;
        } catch (e) {
            continue;
        }
    }
    return -1; // no valid ground found
}

// get random coords
function getRandomCoords() {
    return {
        x: Math.floor(Math.random() * (SPAWN_BOUNDS.maxX - SPAWN_BOUNDS.minX)) + SPAWN_BOUNDS.minX,
        z: Math.floor(Math.random() * (SPAWN_BOUNDS.maxZ - SPAWN_BOUNDS.minZ)) + SPAWN_BOUNDS.minZ
    };
}

world.afterEvents.playerSpawn.subscribe((event) => {
    const player = event.player;
    
    if (!event.initialSpawn) return;
    if (player.hasTag("spawned")) return;
    
    if (!worldSpawnSet) {
        let coords = getRandomCoords();
        let attempt = 0;
        
        function trySpawn() {
            attempt++;
            
            // tp high to load chunk
            player.teleport({ x: coords.x + 0.5, y: 120, z: coords.z + 0.5 });
            player.addEffect("resistance", 200, { amplifier: 255, showParticles: false }); // 10 sec immunity
            
            // wait for chunk load
            system.runTimeout(() => {
                try {
                    // check if water
                    if (isWaterLocation(player.dimension, coords.x, coords.z)) {
                        if (attempt < 10) {
                            console.warn(`[Betafied] Water at ${coords.x}, ${coords.z} - retry ${attempt}`);
                            coords = getRandomCoords();
                            trySpawn();
                            return;
                        }
                    }
                    
                    const groundY = findSafeGround(player.dimension, coords.x, coords.z);
                    
                    // if no ground found, try again
                    if (groundY === -1 && attempt < 10) {
                        console.warn(`[Betafied] No ground at ${coords.x}, ${coords.z} - retry ${attempt}`);
                        coords = getRandomCoords();
                        trySpawn();
                        return;
                    }
                    
                    const finalY = groundY > 0 ? groundY : 80;
                    player.teleport({ x: coords.x + 0.5, y: finalY, z: coords.z + 0.5 });
                    
                    player.dimension.runCommand(`setworldspawn ${coords.x} ${finalY} ${coords.z}`);
                    player.addTag("spawned");
                    worldSpawnSet = true;
                    
                    console.warn(`[Betafied] Spawn: ${coords.x}, ${finalY}, ${coords.z} (attempt ${attempt})`);
                } catch (e) {
                    console.warn("[Betafied] Spawn error: " + e);
                }
            }, 40); // wait 40 ticks (2 sec) for chunk to load
        }
        
        system.run(() => trySpawn());
    } else {
        player.addTag("spawned");
    }
});
