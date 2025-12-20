import { world, system } from "@minecraft/server";

console.warn("[Betafied] Sword Mining System Loaded");

// blocks that swords break faster in beta 1.7.3
const SWORD_FAST_BLOCKS = new Set([
    // cobweb - instant with sword
    "minecraft:cobweb",
    "minecraft:web",
    
    // leaves
    "minecraft:leaves",
    "minecraft:leaves2",
    "minecraft:azalea_leaves",
    "minecraft:azalea_leaves_flowered",
    
    // wooden stairs - swords were faster than axes in beta
    "minecraft:oak_stairs",
    "minecraft:wooden_stairs",
    
    // planks
    "minecraft:oak_planks",
    "minecraft:planks",
    
    // pumpkin
    "minecraft:pumpkin",
    "minecraft:lit_pumpkin",
    "minecraft:carved_pumpkin",
    
    // melon
    "minecraft:melon_block",
    
    // wool
    "minecraft:wool"
]);

// swords
const SWORDS = new Set([
    "minecraft:wooden_sword",
    "minecraft:stone_sword", 
    "minecraft:iron_sword",
    "minecraft:golden_sword",
    "minecraft:diamond_sword"
]);

// track who had haste last tick
const lastHaste = new Map();

// only apply haste when actively looking at correct block with sword
system.runInterval(() => {
    for (const player of world.getPlayers()) {
        const playerId = player.id;
        
        const equip = player.getComponent("equippable");
        if (!equip) {
            // remove haste if had it
            if (lastHaste.has(playerId)) {
                try { player.removeEffect("haste"); } catch (e) {}
                lastHaste.delete(playerId);
            }
            continue;
        }
        
        const mainhand = equip.getEquipment("Mainhand");
        const hasSword = mainhand && SWORDS.has(mainhand.typeId);
        
        if (!hasSword) {
            if (lastHaste.has(playerId)) {
                try { player.removeEffect("haste"); } catch (e) {}
                lastHaste.delete(playerId);
            }
            continue;
        }
        
        const blockRay = player.getBlockFromViewDirection({ maxDistance: 5 });
        const lookingAtFast = blockRay?.block && SWORD_FAST_BLOCKS.has(blockRay.block.typeId);
        
        if (lookingAtFast) {
            // apply minimal haste 
            try {
                player.addEffect("haste", 3, { amplifier: 1, showParticles: false });
            } catch (e) {}
            lastHaste.set(playerId, true);
        } else {
            // 
            if (lastHaste.has(playerId)) {
                try { player.removeEffect("haste"); } catch (e) {}
                lastHaste.delete(playerId);
            }
        }
    }
}, 2); // check every 2 ticks for responsiveness
