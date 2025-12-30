// machine gun bow, no charge time like beta 1.7.3
import { world, ItemStack } from "@minecraft/server";

console.warn("[keirazelle] bow loaded");

world.afterEvents.itemCompleteUse.subscribe(({ source: player, itemStack: item }) => {
    
    if (item?.typeId !== "bh:bow") return;

    const isCreative = player.getGameMode() === "creative";
    const inv = player.getComponent("inventory")?.container;
    if (!inv) return;
    
    // surv needs arrows
    if (!isCreative) {
        let hasArrow = false;
        for (let i = 0; i < inv.size; i++) {
            const slotItem = inv.getItem(i);
            if (slotItem?.typeId === "minecraft:arrow") {
                if (slotItem.amount > 1) {
                    slotItem.amount--;
                    inv.setItem(i, slotItem);
                } else {
                    inv.setItem(i, undefined);
                }
                hasArrow = true;
                break;
            }
        }
        if (!hasArrow) return;
    }

    // damage the bow
    if (!isCreative) {
        const slot = player.selectedSlotIndex;
        const heldBow = inv.getItem(slot);
        if (heldBow?.typeId === "bh:bow") {
            const dur = heldBow.getComponent("durability");
            if (dur) {
                dur.damage += 1;
                // break if maxed
                if (dur.damage >= dur.maxDurability) {
                    inv.setItem(slot, undefined);
                    player.playSound("random.break");
                } else {
                    inv.setItem(slot, heldBow);
                }
            }
        }
    }

    // spawn arrow
    const dir = player.getViewDirection();
    const head = player.getHeadLocation();
    const spawn = { 
        x: head.x + dir.x * 1.5, 
        y: head.y + dir.y * 1.5, 
        z: head.z + dir.z * 1.5 
    };

    try {
        const arrow = player.dimension.spawnEntity("minecraft:arrow", spawn);
        const proj = arrow.getComponent("projectile");
        
        if (proj) {
            proj.owner = player;
            proj.shoot(dir, { uncertainty: 1.0, power: 3.0 });
        }

        player.playSound("random.bow", { 
            volume: 0.5, 
            pitch: 1.1 + Math.random() * 0.4 
        });
    } catch (e) {}
});
