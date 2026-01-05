// world border system, 2500x2500, optimized for multiplayer
import { world, system } from "@minecraft/server";

console.warn("[keirazelle] World Border Loaded");

const CONFIG = Object.freeze({
    BORDER: 2500,           // hard border
    WARNING_ZONE: 2000,     // warning at this distance
    CHECK_INTERVAL: 10,     // ticks between checks
    PUSHBACK_DISTANCE: 5    // how far to push back
});

// track warned players to avoid spam
const warnedPlayers = new Map();

// generator for player processing
function* checkPlayersGenerator() {
    const players = world.getAllPlayers();
    for (const player of players) {
        yield;
        if (!player?.isValid()) continue;

        const loc = player.location;
        const absX = Math.abs(loc.x);
        const absZ = Math.abs(loc.z);
        const maxDist = Math.max(absX, absZ);

        // outside border, tp back
        if (maxDist >= CONFIG.BORDER) {
            handleBorderCross(player, loc);
            continue;
        }

        // in warning zone
        if (maxDist >= CONFIG.WARNING_ZONE) {
            handleWarning(player, maxDist);
        } else {
            // clear warning state when back in safe zone
            warnedPlayers.delete(player.id);
        }
    }
}

// tp player back to spawn or pushback
function handleBorderCross(player, loc) {
    try {
        const spawn = player.getSpawnPoint();
        
        if (spawn && spawn.dimension.id === player.dimension.id) {
            // tp to spawn if available
            player.teleport({ x: spawn.x, y: spawn.y, z: spawn.z });
            player.sendMessage("§c[Betafied] you crossed the world border, returned to spawn");
        } else {
            // pushback towards center
            const pushX = loc.x > 0 
                ? CONFIG.BORDER - CONFIG.PUSHBACK_DISTANCE 
                : -(CONFIG.BORDER - CONFIG.PUSHBACK_DISTANCE);
            const pushZ = loc.z > 0 
                ? CONFIG.BORDER - CONFIG.PUSHBACK_DISTANCE 
                : -(CONFIG.BORDER - CONFIG.PUSHBACK_DISTANCE);
            
            // only push back on the axis that crossed
            const newX = Math.abs(loc.x) >= CONFIG.BORDER ? pushX : loc.x;
            const newZ = Math.abs(loc.z) >= CONFIG.BORDER ? pushZ : loc.z;
            
            player.teleport({ x: newX, y: loc.y, z: newZ });
            player.sendMessage("§c[Betafied] you crossed the world border");
        }
    } catch {}
}

// warn player approaching border
function handleWarning(player, dist) {
    const now = Date.now();
    const lastWarn = warnedPlayers.get(player.id) || 0;
    
    // warn every 10 seconds max
    if (now - lastWarn > 10000) {
        const distToBorder = Math.floor(CONFIG.BORDER - dist);
        player.sendMessage(`§e[Betafied] warning: ${distToBorder} blocks from world border`);
        warnedPlayers.set(player.id, now);
    }
}

// main loop
system.runInterval(() => {
    system.runJob(checkPlayersGenerator());
}, CONFIG.CHECK_INTERVAL);
