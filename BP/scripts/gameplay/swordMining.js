// beta sword speed on soft blocks
import { world, system } from "@minecraft/server";
console.warn("[keirazelle] Sword Mining System Loaded");

// swords were 1.5x on soft stuff, 15x on webs
const SWORD_FAST_BLOCKS = new Set([
    // webs (15x speed in beta)
    "minecraft:web",
    "minecraft:cobweb",
    
    // leaves
    "minecraft:oak_leaves", "minecraft:spruce_leaves", "minecraft:birch_leaves",
    "minecraft:leaves", "minecraft:leaves2",
    
    // planks
    "minecraft:oak_planks", "minecraft:spruce_planks", "minecraft:birch_planks",
    "minecraft:planks",
    
    // stairs
    "minecraft:oak_stairs", "minecraft:wooden_stairs",
    
    // pumpkins
    "minecraft:pumpkin", "minecraft:carved_pumpkin", "minecraft:lit_pumpkin",
    
    // wool
    "minecraft:wool", 
    "minecraft:white_wool", "minecraft:orange_wool", "minecraft:magenta_wool", "minecraft:light_blue_wool",
    "minecraft:yellow_wool", "minecraft:lime_wool", "minecraft:pink_wool", "minecraft:gray_wool",
    "minecraft:light_gray_wool", "minecraft:cyan_wool", "minecraft:purple_wool", "minecraft:blue_wool",
    "minecraft:brown_wool", "minecraft:green_wool", "minecraft:red_wool", "minecraft:black_wool"
]);

const SWORDS = new Set([
    "minecraft:wooden_sword",
    "minecraft:stone_sword",
    "minecraft:iron_sword",
    "minecraft:golden_sword",
    "minecraft:diamond_sword"
]);

const CONFIG = Object.freeze({
    TICK_INTERVAL: 3,
    HASTE_DURATION: 10, // buffer
    HASTE_AMPLIFIER: 2, // haste III
    MAX_DISTANCE: 5
});

const hasHaste = new Set();

system.runInterval(() => {
    for (const player of world.getPlayers()) {
        if (!player.isValid()) continue;

        try {
            // check sword
            const equip = player.getComponent("equippable");
            const mainhand = equip?.getEquipment("Mainhand");
            const hasSword = mainhand && SWORDS.has(mainhand.typeId);

            if (!hasSword) {
                clearHaste(player);
                continue;
            }

            // raycast
            const blockRay = player.getBlockFromViewDirection({ maxDistance: CONFIG.MAX_DISTANCE });
            
            if (blockRay?.block && SWORD_FAST_BLOCKS.has(blockRay.block.typeId)) {
                player.addEffect("haste", CONFIG.HASTE_DURATION, {
                    amplifier: CONFIG.HASTE_AMPLIFIER,
                    showParticles: false
                });
                hasHaste.add(player.id);
            } else {
                clearHaste(player);
            }
        } catch (e) {}
    }
}, CONFIG.TICK_INTERVAL);

function clearHaste(player) {
    if (hasHaste.has(player.id)) {
        try { player.removeEffect("haste"); } catch (e) {}
        hasHaste.delete(player.id);
    }
}

// cleanup
world.afterEvents.playerLeave.subscribe((ev) => {
    hasHaste.delete(ev.playerId);
});
