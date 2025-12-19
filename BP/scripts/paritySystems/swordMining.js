import { world, system } from "@minecraft/server";

console.warn("[Betafied] Sword Mining System Loaded");

const SWORD_FAST_BLOCKS = new Set([
    // instant break
    "minecraft:cobweb",
    "minecraft:web",
    
    // faster break 
    "minecraft:leaves",
    "minecraft:leaves2",
    
    // wooden 
    "minecraft:oak_stairs",
    "minecraft:oak_planks",
    
    // faster break 
    "minecraft:pumpkin",
    "minecraft:lit_pumpkin",
    
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

// apply haste
world.beforeEvents.playerBreakBlock.subscribe((event) => {
    const player = event.player;
    const block = event.block;
    
    if (!SWORD_FAST_BLOCKS.has(block.typeId)) return;
    
    const equip = player.getComponent("equippable");
    if (!equip) return;
    
    const mainhand = equip.getEquipment("Mainhand");
    if (!mainhand || !SWORDS.has(mainhand.typeId)) return;
    
    system.run(() => {
        try {
            player.addEffect("haste", 5, { amplifier: 2, showParticles: false });
        } catch (e) {}
    });
});

// keep haste while looking at sword-fast blocks with sword equipped
system.runInterval(() => {
    for (const player of world.getPlayers()) {
        const equip = player.getComponent("equippable");
        if (!equip) continue;
        
        const mainhand = equip.getEquipment("Mainhand");
        if (!mainhand || !SWORDS.has(mainhand.typeId)) continue;
        
        const blockRay = player.getBlockFromViewDirection({ maxDistance: 5 });
        if (!blockRay?.block) continue;
        
        if (SWORD_FAST_BLOCKS.has(blockRay.block.typeId)) {
            try {
                player.addEffect("haste", 10, { amplifier: 2, showParticles: false });
            } catch (e) {}
        }
    }
}, 5);
