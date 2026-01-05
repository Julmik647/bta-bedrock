// furnace minecart logic
import { world, system } from "@minecraft/server";

console.warn("[keirazelle] Furnace Minecart Logic Loaded");

const activeIntervals = new Map(); 
const furnaceId = "ubd:furnace_minecart";
const cartSet = new Set (["minecraft:minecart", "minecraft:chest_minecart", "minecraft:hopper_minecart", "minecraft:tnt_minecart"]);
let dimensions = null

system.run(() => {
    try {
        dimensions = [
            world.getDimension("overworld"),
            world.getDimension("nether"),
            world.getDimension("the_end")
        ];
    } catch(e) {}
});

const Vector = {
    normalize: (v) => {
        const magnitude = Math.sqrt(v.x ** 2 + v.z ** 2);
        return magnitude === 0 ? { x: 0, y: 0, z: 0 } : {
            x: v.x / magnitude,
            y: 0,
            z: v.z / magnitude
        };
    },
    multiply: (v, scalar) => ({
        x: v.x * scalar,
        y: v.y * scalar,
        z: v.z * scalar
    }),
    magnitude: (v) => Math.sqrt(v.x ** 2 + v.y ** 2 + v.z ** 2)
};

world.beforeEvents.playerInteractWithEntity.subscribe((e) => {
    const { target: entity, itemStack } = e;
    if (!itemStack || itemStack == undefined) return;
    if (itemStack.typeId !== "minecraft:coal") return;
    if (entity.typeId !== furnaceId) return;

    const variant = entity.getComponent("minecraft:variant");

    if (variant && variant.value === 0) {
        system.runTimeout(() => {
            if (entity.isValid()) {
                entity.triggerEvent("fueled");
                furnaceFunction(entity);
            }
        }, 1);
    }
});

function furnaceFunction(entity) {
    entity.setDynamicProperty("fuelTime", 720); // Temp - should add an inventory and make it hold the actual items later
    entity.setDynamicProperty("lastPosition", JSON.stringify(entity.location));
    startMinecartMovement(entity);
}

function startMinecartMovement(entity) {
    const entityId = entity.id;

    if (activeIntervals.has(entityId)) return;

    const intervalId = system.runInterval(() => {
        if (!entity || !entity.isValid()) {
            system.clearRun(intervalId);
            activeIntervals.delete(entityId);           
            return;
        }

        let remainingFuel = entity.getDynamicProperty("fuelTime");
        if (remainingFuel <= 0) {
            system.clearRun(intervalId);
            activeIntervals.delete(entityId);
            try {
                entity.clearVelocity();
                entity.triggerEvent("unfueled");           
            } catch(e) {}
            return;
        }

        entity.setDynamicProperty("fuelTime", remainingFuel - 1);

        const lastPosStr = entity.getDynamicProperty("lastPosition");
        const lastPosition = lastPosStr ? JSON.parse(lastPosStr) : entity.location;
        const currentPosition = entity.location;
        const movement = Vector.normalize({
            x: currentPosition.x - lastPosition.x,
            y: 0,
            z: currentPosition.z - lastPosition.z
        });

        if (currentPosition.x !== lastPosition.x || currentPosition.y !== lastPosition.y || currentPosition.z !== lastPosition.z){
            entity.setDynamicProperty("lastPosition", JSON.stringify(currentPosition));
        }

        try {
            const railBlock = entity.dimension.getBlock(entity.location)
            const onRail = railBlock?.typeId.includes("minecraft:") && railBlock?.typeId.includes("rail")
            if (!onRail) entity.clearVelocity();
            const currentVelocity = entity.getVelocity();
            const currentSpeed = Vector.magnitude(currentVelocity);

            if ((Math.abs(movement.x) > 0.01 || Math.abs(movement.z) > 0.01 || currentSpeed < 0.35) && onRail) {
                const hitCart = applyImpulseToCartAndNearby(entity);
                if (currentSpeed < 0.35 && !hitCart) { 
                    entity.applyImpulse(Vector.multiply(Vector.multiply(movement, -1), 9));
                    
                } else {
                    entity.applyImpulse(Vector.multiply(movement, 9));
                }
            }
        } catch(e) {}

    }, 2);

    activeIntervals.set(entityId, intervalId);
}

function applyImpulseToCartAndNearby(furnaceCart) {
    //Need to adjust this later to specifically look at the blocks in front, probably better to use a raycast
    const nearbyEntities = furnaceCart.dimension.getEntities({
        location: furnaceCart.location,
        maxDistance: 2
    }).filter(entity => cartSet.has(entity.typeId) && entity.typeId !== furnaceCart.typeId);

    let pushedCart = false;

    nearbyEntities.forEach(nearbyCart => {
        const directionToNearbyCart = Vector.normalize({
            x: nearbyCart.location.x - furnaceCart.location.x,
            y: 0,
            z: nearbyCart.location.z - furnaceCart.location.z
        });
           
        const pushVector = Vector.multiply(directionToNearbyCart, 9);
        try {
            nearbyCart.applyImpulse(pushVector);
            pushedCart = true
        } catch (error) {
            // console.warn("Error applying impulse:", error.message);
        }
    }); 
    return pushedCart;
}

// Periodic check to restart minecart movement if necessary if they were unloaded then reloaded from chunk loading
system.runInterval(() => {
    if (!dimensions) return;
    
    dimensions.forEach((dimension) => {
        try {
            const entities = dimension.getEntities({ type: furnaceId });

            entities.forEach((entity) => {
                const remainingFuel = entity.getDynamicProperty("fuelTime");

                if (remainingFuel > 0 && !activeIntervals.has(entity.id)) {
                    startMinecartMovement(entity);
                }
            });
        } catch(e) {}
    });
}, 20);
