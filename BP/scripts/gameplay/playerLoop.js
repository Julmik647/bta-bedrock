// player loop for beta parity
import { world, system, EquipmentSlot } from "@minecraft/server";
console.warn("[keirazelle] player loop loaded");

// run every 2 ticks for instant response
system.runInterval(() => {
    const players = world.getPlayers();

    for (const player of players) {
        // safety check
        if (!player.isValid()) continue;

        try {
            // xp removal
            if (player.level > 0 || player.xpEarnedAtCurrentLevel > 0) {
                player.resetLevel();
            }

            // no offhand in beta
            const equippable = player.getComponent("minecraft:equippable");
            if (!equippable) continue;

            const offhandItem = equippable.getEquipment(EquipmentSlot.Offhand);

            if (offhandItem) {
                // clear slot immediately
                equippable.setEquipment(EquipmentSlot.Offhand, undefined);

                const inv = player.getComponent("inventory")?.container;
                if (inv) {
                    const leftover = inv.addItem(offhandItem);
                    if (leftover) {
                        player.dimension.spawnItem(leftover, player.location);
                    }
                } else {
                    // no inv? just drop
                    player.dimension.spawnItem(offhandItem, player.location);
                }
            }
        } catch (e) {}
    }
}, 2);
