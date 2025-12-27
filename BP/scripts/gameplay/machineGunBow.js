import { world } from "@minecraft/server";

console.warn("[keirazelle] bow loaded");

world.afterEvents.itemCompleteUse.subscribe(({ source: player, itemStack: item }) => {
    
    // check id
    if (item?.typeId !== "bh:bow") return;

    // creative check
    const isCreative = player.getGameMode() === "creative";
    
    // surv ammo check
    if (!isCreative) {
        const inv = player.getComponent("inventory")?.container;
        if (!inv) return;

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

    // calc
    const dir = player.getViewDirection();
    const head = player.getHeadLocation();

    // 1.5 offset
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

        // play bow sound manually 
        player.playSound("random.bow", { 
            volume: 0.5, 
            pitch: 1.1 + Math.random() * 0.4 
        });
    } catch {}
});
