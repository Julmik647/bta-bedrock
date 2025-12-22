import { world, system, EquipmentSlot } from '@minecraft/server';

console.warn("[Betafied] Beta Armor System Loaded");

const CONFIG = {
  // UI Settings
  UI_TITLE_STAY: 40,
  
  // Logic Settings
  BETA_DURABILITY_PENALTY: true, // If true, damaged armor protects less (1.7.3 behavior)
  DEBUG: true // Check your Content Log to see if it detects the boots!
};

// BETA 1.7.3 ARMOR VALUES (Strict 1:1)
// Leather: 1, 3, 2, 1 (Total 7)
// Gold:    2, 5, 3, 1 (Total 11)
// Chain:   2, 5, 4, 1 (Total 12)
// Iron:    2, 6, 5, 2 (Total 15)
// Diamond: 3, 8, 6, 3 (Total 20)
const BETA_STATS = {
  // Leather
  'minecraft:leather_helmet': 1,
  'minecraft:leather_chestplate': 3,
  'minecraft:leather_leggings': 2,
  'minecraft:leather_boots': 1,
  
  // Gold
  'minecraft:golden_helmet': 2,
  'minecraft:golden_chestplate': 5,
  'minecraft:golden_leggings': 3,
  'minecraft:golden_boots': 1,

  // Chain
  'minecraft:chainmail_helmet': 2,
  'minecraft:chainmail_chestplate': 5,
  'minecraft:chainmail_leggings': 4,
  'minecraft:chainmail_boots': 1,

  // Iron
  'minecraft:iron_helmet': 2,
  'minecraft:iron_chestplate': 6,
  'minecraft:iron_leggings': 5,
  'minecraft:iron_boots': 2,

  // Diamond
  'minecraft:diamond_helmet': 3,
  'minecraft:diamond_chestplate': 8,
  'minecraft:diamond_leggings': 6,
  'minecraft:diamond_boots': 3
};

// Damage causes that ignore armor in Beta
const IGNORE_ARMOR_SOURCES = new Set([
  'fall', 'fire', 'lava', 'drowning', 'suffocation', 'void', 'starvation', 'magic', 'wither'
]);

class BetaArmorSystem {
    constructor() {
        // Hybrid Optimization:
        // 1. Slow poll (3s) for equipment changes (putting on armor)
        // 2. Instant update on damage (in onHurt)
        system.runInterval(this.updateUI.bind(this), 60);
        
        // Handle Damage Logic
        world.afterEvents.entityHurt.subscribe((ev) => {
            this.onHurt(ev);
            // Instant UI update when hit
            if (ev.hurtEntity.typeId === 'minecraft:player') {
                this.updateUI(ev.hurtEntity);
            }
        });
    }

    /**
     * Calculates Beta Protection Points (0-20)
     * Accounts for durability loss if enabled.
     */
    calculatePoints(player) {
        const equippable = player.getComponent('minecraft:equippable');
        if (!equippable) return 0;

        let totalPoints = 0;
        const slots = [EquipmentSlot.Head, EquipmentSlot.Chest, EquipmentSlot.Legs, EquipmentSlot.Feet];

        for (const slot of slots) {
            const item = equippable.getEquipment(slot);
            if (!item) continue;
            
            // debug: log what armor is found
            if (CONFIG.DEBUG) {
                console.log(`[ARMOR] Slot ${slot}: ${item.typeId}`);
            }
            
            if (!BETA_STATS[item.typeId]) continue;

            const basePoints = BETA_STATS[item.typeId];
            let factor = 1.0;

            // Beta Mechanic: Damaged armor protects less
            if (CONFIG.BETA_DURABILITY_PENALTY) {
                const durability = item.getComponent('minecraft:durability');
                if (durability && durability.maxDurability > 0) {
                    // Formula: (Max - Damage) / Max
                    factor = (durability.maxDurability - durability.damage) / durability.maxDurability;
                }
            }

            totalPoints += (basePoints * factor);
        }

        return totalPoints;
    }

    updateUI(specificPlayer = null) {
        const players = specificPlayer ? [specificPlayer] : world.getPlayers();
        for (const player of players) {
            try {
                const rawPoints = this.calculatePoints(player);
                
                // Get previous state
                const lastPoints = player.lastArmorPoints ?? -1;
                const lastUpdateTime = player.lastArmorUpdate ?? 0;
                const currentTime = system.currentTick;
        
                // Only update if points changed OR it's been > 100 ticks (5 seconds) to keep title alive
                if (rawPoints !== lastPoints || (currentTime - lastUpdateTime) > 100) {
                    
                    let displayPoints = Math.round(rawPoints);

                    // VISUAL FIX: If you are wearing armor but have < 0.5 points (due to damage),
                    // forcing it to 1 ensures you see at least "half a shirt" instead of empty.
                    if (rawPoints > 0 && displayPoints === 0) displayPoints = 1;

                    // Format: _a02, _a10, _a20
                    const spriteId = displayPoints.toString().padStart(2, '0');
                    const hudText = `_a${spriteId}`;

                    // Render to Title (HUD reads from #hud_title_text_string)
                    player.onScreenDisplay.setTitle(hudText, {
                        fadeInDuration: 0,
                        fadeOutDuration: 0,
                        stayDuration: 200 // 10 seconds
                    });
                    
                    // Update state
                    player.lastArmorPoints = rawPoints;
                    player.lastArmorUpdate = currentTime;

                    if (CONFIG.DEBUG && rawPoints !== lastPoints) {
                        console.warn(`[ARMOR] Updated ${player.name} to ${hudText}`);
                    }
                }

            } catch (e) {
                console.error(`[ARMOR] Error: ${e}`);
            }
        }
    }

    onHurt(event) {
        const { hurtEntity, damage, damageSource } = event;
        if (hurtEntity.typeId !== 'minecraft:player') return;
        
        // 1. Check exclusions (Fall damage, Fire, etc.)
        if (IGNORE_ARMOR_SOURCES.has(damageSource.cause)) return;

        // 2. Get Armor Values
        const betaPoints = Math.floor(this.calculatePoints(hurtEntity));
        
        // 3. The 1:1 Beta Formula
        // Damage = Damage * ( (25 - ArmorPoints) / 25 )
        // Example: 20 points -> 5/25 = 20% damage taken (80% reduction)
        const betaFactor = (25 - betaPoints) / 25;
        const targetDamage = damage * betaFactor;

        // 4. Calculate Penalty
        // Modern armor reduction is complex, but roughly 4% per point.
        // We approximate what the game *likely* dealt vs what Beta *would* deal.
        // Since we can't "heal" damage already taken, we only ADD damage if Beta is weaker.
        // (Most of the time, Beta armor is actually WEAKER than modern armor because of durability loss).
        
        // Simple Logic: 
        // If Beta Points are low (broken armor), you take extra damage.
        
        if (betaPoints < 5) { 
            // If armor is weak/broken, add a tiny bit of "Chip Damage" to simulate the weakness
            // hurtEntity.applyDamage(1, { cause: "override" });
        }
    }
}

const betaArmor = new BetaArmorSystem();
export default betaArmor;