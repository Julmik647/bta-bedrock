// beta fence using afterEvents since custom_components deprecated in 1.21.90+
import { world, system, BlockPermutation } from "@minecraft/server";

console.warn("[keirazelle] Beta Fence System Loaded");

const CONFIG = Object.freeze({
    FENCE_ID: "bh:fence",
    STATE_ID: "bh:connections"
});

const DIR = Object.freeze({ N: 1, E: 2, S: 4, W: 8 });

// on place, update connections
world.afterEvents.playerPlaceBlock.subscribe((ev) => {
    const block = ev.block;
    if (block.typeId !== CONFIG.FENCE_ID) return;

    system.run(() => {
        if (!block.isValid()) return;
        updateFenceBlock(block);

        // update neighbors
        const neighbors = [block.north(), block.east(), block.south(), block.west()];
        for (const nb of neighbors) {
            if (nb?.typeId === CONFIG.FENCE_ID) updateFenceBlock(nb);
        }
    });
});

// on break, update neighbors
world.afterEvents.playerBreakBlock.subscribe((ev) => {
    if (ev.brokenBlockPermutation.type.id !== CONFIG.FENCE_ID) return;

    const dim = ev.dimension;
    const { x, y, z } = ev.block.location;

    const offsets = [
        { x, y, z: z - 1 },
        { x, y, z: z + 1 },
        { x: x + 1, y, z },
        { x: x - 1, y, z }
    ];

    for (const pos of offsets) {
        try {
            const nb = dim.getBlock(pos);
            if (nb?.typeId === CONFIG.FENCE_ID) updateFenceBlock(nb);
        } catch {}
    }
});

// recalc mask for a fence
function updateFenceBlock(block) {
    if (!block?.isValid()) return;

    const id = block.typeId;
    const n = block.north();
    const e = block.east();
    const s = block.south();
    const w = block.west();

    let mask = 0;
    if (n?.typeId === id) mask |= DIR.N;
    if (e?.typeId === id) mask |= DIR.E;
    if (s?.typeId === id) mask |= DIR.S;
    if (w?.typeId === id) mask |= DIR.W;

    block.setPermutation(BlockPermutation.resolve(id, {
        ...block.permutation.getAllStates(),
        [CONFIG.STATE_ID]: mask
    }));
}
