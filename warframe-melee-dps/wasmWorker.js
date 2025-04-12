/*
importScripts("./Warframe_Melee_DPS.js");

onmessage = function(event) {
    const { func, arg } = event.data;
    console.log(2);

    if (func === 'passVectorBuffLines') {
        const result = Module.passVectorBuffLines(arg);

        const msg = {};
        msg.id = event.data.id;
        msg.data = result;
        postMessage(msg);
    }
};
 */