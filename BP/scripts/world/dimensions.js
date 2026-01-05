import { world } from "@minecraft/server";

console.warn("[keirazelle] Dimension Lock Loaded");

try {
    if (world.beforeEvents?.playerDimensionChange) {
        world.beforeEvents.playerDimensionChange.subscribe((event) => {
            if (event.toDimension?.id === "minecraft:the_end") {
                event.cancel = true;
                if (event.player?.isValid()) {
                    event.player.sendMessage("§cThe End does not exist in Beta 1.7.3.");
                }
            }
        });
    }
} catch (e) {}
