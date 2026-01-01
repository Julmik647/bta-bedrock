import { world, system, ItemStack } from "@minecraft/server";

console.warn("[keirazelle] machine gun bow loaded");

const CONFIG = Object.freeze({
    FIRE_COOLDOWN: 3
});

// cooldown tracker
const lastFireTime = new Map();

world.afterEvents.itemUse.subscribe((ev) => {
    const player = ev.source;
    const item = ev.itemStack;
    
    if (item?.typeId !== "bh:bow") return;
    
    const now = system.currentTick;
    const lastFire = lastFireTime.get(player.id) ?? 0;
    
    // cooldown check
    if (now - lastFire < CONFIG.FIRE_COOLDOWN) return;
    lastFireTime.set(player.id, now);
    
    const isCreative = player.getGameMode() === "creative";
    const inv = player.getComponent("inventory")?.container;
    if (!inv) return;
    
    const slot = player.selectedSlotIndex;
    
    // survival needs arrows
    if (!isCreative) {
        let arrowSlot = -1;
        for (let i = 0; i < inv.size; i++) {
            const slotItem = inv.getItem(i);
            if (slotItem?.typeId === "minecraft:arrow") {
                arrowSlot = i;
                break;
            }
        }
        
        if (arrowSlot === -1) return;
        
        // consume arrow
        const arrowItem = inv.getItem(arrowSlot);
        if (arrowItem.amount > 1) {
            inv.setItem(arrowSlot, new ItemStack("minecraft:arrow", arrowItem.amount - 1));
        } else {
            inv.setItem(arrowSlot, undefined);
        }
    }
    
    // spawn arrow projectile
    const dir = player.getViewDirection();
    const head = player.getHeadLocation();
    const spawnPos = {
        x: head.x + dir.x * 1.5,
        y: head.y + dir.y * 1.5,
        z: head.z + dir.z * 1.5
    };
    
    try {
        const arrow = player.dimension.spawnEntity("minecraft:arrow", spawnPos);
        const proj = arrow.getComponent("projectile");
        if (proj) {
            proj.owner = player;
            proj.shoot(dir, { uncertainty: 1.0, power: 3.0 });
        }
        
        player.playSound("random.bow", {
            volume: 0.5,
            pitch: 1.0 + Math.random() * 0.3
        });
    } catch (e) {}
    
    // handle durability
    if (!isCreative) {
        const currentItem = inv.getItem(slot);
        
        if (currentItem && currentItem.typeId === "bh:bow") {
            const durability = currentItem.getComponent("minecraft:durability");
            
            if (durability) {
                durability.damage += 1;

                if (durability.damage >= durability.maxDurability) {
                    inv.setItem(slot, undefined);
                    player.playSound("random.break");
                } else {
                    inv.setItem(slot, currentItem);
                }
            }
        }
    }
});

// cleanup
world.afterEvents.playerLeave.subscribe((ev) => {
    lastFireTime.delete(ev.playerId);
});
