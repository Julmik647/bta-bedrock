import { world, system, EquipmentSlot } from '@minecraft/server';

console.warn("[keirazelle] armor system init");

const CONFIG = Object.freeze({
    debug: false,
    reduction_per_point: 0.04,
    max_reduction: 0.80
});

const ARMOR_TABLE = Object.freeze({
    'minecraft:leather_helmet': 1, 'minecraft:leather_chestplate': 3,
    'minecraft:leather_leggings': 2, 'minecraft:leather_boots': 1,
    'minecraft:golden_helmet': 2, 'minecraft:golden_chestplate': 5,
    'minecraft:golden_leggings': 3, 'minecraft:golden_boots': 1,
    'minecraft:chainmail_helmet': 2, 'minecraft:chainmail_chestplate': 5,
    'minecraft:chainmail_leggings': 4, 'minecraft:chainmail_boots': 1,
    'minecraft:iron_helmet': 2, 'minecraft:iron_chestplate': 6,
    'minecraft:iron_leggings': 5, 'minecraft:iron_boots': 2,
    'minecraft:diamond_helmet': 3, 'minecraft:diamond_chestplate': 8,
    'minecraft:diamond_leggings': 6, 'minecraft:diamond_boots': 3,
});

const BYPASS_SOURCES = Object.freeze(new Set([
    'fall', 'fire', 'fireTick', 'lava', 'drowning', 'suffocation', 
    'void', 'starvation', 'magic', 'wither', 'starve', 'flyIntoWall'
]));

const SLOTS = Object.freeze([
    EquipmentSlot.Head, 
    EquipmentSlot.Chest, 
    EquipmentSlot.Legs, 
    EquipmentSlot.Feet
]);

function getEffectiveArmorPoints(player) {
    const equip = player.getComponent('minecraft:equippable');
    if (!equip) return 0;

    let points = 0;

    // tight loop, barely needs runJob unless we scale to 100 players
    for (const slot of SLOTS) {
        const item = equip.getEquipment(slot);
        if (!item) continue;
        
        const base = ARMOR_TABLE[item.typeId];
        if (!base) continue;

        // check durability penalty
        const dur = item.getComponent('minecraft:durability');
        if (dur && dur.maxDurability > 0) {
            // linear degradation: simple multiplier
            const ratio = (dur.maxDurability - dur.damage) / dur.maxDurability;
            points += (base * ratio);
        } else {
            points += base;
        }
    }
    return points;
}

world.afterEvents.entityHurt.subscribe((ev) => {
    // fast exit
    const { hurtEntity: player, damage, damageSource } = ev;
    if (player.typeId !== 'minecraft:player') return;
    if (BYPASS_SOURCES.has(damageSource.cause)) return;

    // calc routine
    const points = getEffectiveArmorPoints(player);
    if (points <= 0.1) return; // float tolerance

    // logic: heal back the damage that armor 'blocked'
    // scuffed but efficient for bedrock api limits
    const reduction = Math.min(points * CONFIG.reduction_per_point, CONFIG.max_reduction);
    const blockedDamage = damage * reduction;

    if (blockedDamage > 0) {
        const health = player.getComponent('minecraft:health');
        if (!health || health.currentValue <= 0) return; // dead men tell no tales

        // apply heal
        const newHp = Math.min(health.currentValue + blockedDamage, health.effectiveMax);
        health.setCurrentValue(newHp);

        if (CONFIG.debug) {
            console.warn(`[armor] took ${damage}, blocked ${blockedDamage}, hp ${health.currentValue} -> ${newHp}`);
        }
    }
});