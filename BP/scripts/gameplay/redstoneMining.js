// redstone ore slow mining for beta 1.7.3 parity
// in beta redstone was painful to mine lol
import { world, system } from "@minecraft/server";
console.warn("[keirazelle] Redstone Mining System Loaded");

const SLOW_BLOCKS = new Set([
    "minecraft:redstone_ore",
    "minecraft:lit_redstone_ore"
]);

const PICKAXES = new Set([
    "minecraft:wooden_pickaxe",
    "minecraft:stone_pickaxe",
    "minecraft:iron_pickaxe",
    "minecraft:golden_pickaxe",
    "minecraft:diamond_pickaxe"
]);

const CONFIG = Object.freeze({
    TICK_INTERVAL: 3, // faster check for responsiveness
    FATIGUE_DURATION: 10, // buffer to prevent flicker
    FATIGUE_AMPLIFIER: 1, // fatigue II
    MAX_DISTANCE: 5
});

// track who has effect (set is cleaner than map)
const hasFatigue = new Set();

system.runInterval(() => {
    for (const player of world.getPlayers()) {
        if (!player.isValid()) continue;

        try {
            const playerId = player.id;
            
            // check tool
            const equip = player.getComponent("equippable");
            const mainhand = equip?.getEquipment("Mainhand");
            const hasPick = mainhand && PICKAXES.has(mainhand.typeId);

            if (!hasPick) {
                clearFatigue(player);
                continue;
            }

            // raycast
            const blockRay = player.getBlockFromViewDirection({ maxDistance: CONFIG.MAX_DISTANCE });
            
            if (blockRay?.block && SLOW_BLOCKS.has(blockRay.block.typeId)) {
                // apply/refresh effect
                player.addEffect("mining_fatigue", CONFIG.FATIGUE_DURATION, {
                    amplifier: CONFIG.FATIGUE_AMPLIFIER,
                    showParticles: false
                });
                hasFatigue.add(playerId);
            } else {
                clearFatigue(player);
            }
        } catch (e) {}
    }
}, CONFIG.TICK_INTERVAL);

function clearFatigue(player) {
    if (hasFatigue.has(player.id)) {
        try { player.removeEffect("mining_fatigue"); } catch (e) {}
        hasFatigue.delete(player.id);
    }
}

// cleanup
world.afterEvents.playerLeave.subscribe((ev) => {
    hasFatigue.delete(ev.playerId);
});
