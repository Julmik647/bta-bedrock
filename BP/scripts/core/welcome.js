import { world } from "@minecraft/server";
console.warn("[keirazelle] Welcome System Loaded");

const CONFIG = Object.freeze({
    VERSION: "3.1.0",
    DELAY_TICKS: 70
});

// track players who received welcome message this session
const welcomed = new Set();

world.afterEvents.playerSpawn.subscribe((ev) => {
    if (!ev.initialSpawn) return;
    
    const player = ev.player;
    if (welcomed.has(player.id)) return;
    
    welcomed.add(player.id);
    
    // delay slightly to ensure player is fully loaded
    player.sendMessage(`§e§lWelcome to Betafied! §r§7(v${CONFIG.VERSION})`);
});

// cleanup on leave
world.afterEvents.playerLeave.subscribe((event) => {
    welcomed.delete(event.playerId);
});
