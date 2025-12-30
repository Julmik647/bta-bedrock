import { world, system } from "@minecraft/server";
console.warn("[keirazelle] Instant Bonemeal Loaded");

const BLOCKED_TARGETS = Object.freeze(new Set([
    "minecraft:brown_mushroom",
    "minecraft:red_mushroom"
]));

world.beforeEvents.itemUseOn.subscribe((event) => {
    try {
        const { itemStack, block } = event;

        if (itemStack.typeId === "minecraft:bone_meal") {
            if (BLOCKED_TARGETS.has(block.typeId)) {
                event.cancel = true;
                return;
            }

            // instant wheat growth
            if (block.typeId === "minecraft:wheat") {
                system.run(() => {
                    block.setPermutation(block.permutation.withState("growth", 7));
                    block.dimension.spawnParticle("minecraft:crop_growth_emitter", block.center());
                });
            }
        }
    } catch (e) {
        console.warn(`[instantBonemeal] error: ${e}`);
    }
});
