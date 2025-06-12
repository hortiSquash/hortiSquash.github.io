let stance = {};

function editStance() {
    document.getElementById('hits_wrapper').innerHTML = "";

    const combo_type = document.getElementById("combo_type").value;

    let hits = stance?.[combo_type]?.hits;
    if (hits) {
        for (let hit of hits) {
            addHit();
            const hit_html = document.getElementById('hits_wrapper').lastElementChild; //the last one that got added, in other words this one

            const time = hit_html.querySelector(".containerTime");
            time.querySelector("input").value = formatDecimalsMinMax(hit.time, 1, 4);

            const damage = hit_html.querySelector(".containerDamage");
            damage.querySelector("input").value = hit.damage;

            if(hit.forced_procs){
                const forcedProcs = hit_html.querySelector(".containerForcedProc");
                for (let e of Object.entries(hit.forced_procs)) {
                    const forcedProc = document.getElementById("templateForcedProc").content.cloneNode(true);
                    forcedProc.querySelector("select").value = e[0];
                    forcedProc.querySelector("input").value = e[1];
                    forcedProcs.appendChild(forcedProc);
                }
            }
            if(hit.bonus_damage) {
                const bonusDamages = hit_html.querySelector(".containerBonusDamage");
                for (let e of Object.entries(hit.bonus_damage)) {
                    const bonusDamage = document.getElementById("templateBonusDamage").content.cloneNode(true);
                    bonusDamage.querySelector("select").value = e[0];
                    bonusDamage.querySelector("input").value = e[1] * 100; //%
                    bonusDamages.appendChild(bonusDamage);
                }
            }
        }
    } else {
        console.log("the attack type hasnt been found in the stance");
    }
    document.getElementById("stance_edit_dialog").showModal();
}

function addHit() {
    const hits_wrapper = document.getElementById('hits_wrapper');
    const hitDetailsGrid = document.getElementById("templateHit").content.cloneNode(true);
    hits_wrapper.appendChild(hitDetailsGrid);
    //TODO return?
}

function removeHit() {
    document.getElementById('hits_wrapper').lastElementChild?.remove(); // ?. https://javascript.info/optional-chaining
}

function incrementCounter(array, key, value) {
    array[key] = (array[key] ?? 0) + value; // add if exists, otherwise initialize it
}

function saveStance() {
    const hits_rows = document.getElementById('hits_wrapper').rows;
    let hits = [];
    for (const hit of hits_rows) {
        const time = Number(hit.cells[0].querySelector("input").value);
        const damage = Number(hit.cells[1].querySelector("input").value);
        const forced_procs_rows = hit.cells[2].querySelector("table").rows;
        const bonus_damage_rows = hit.cells[3].querySelector("table").rows;

        const forced_procs = {};
        const bonus_damage = {};

        for (let i = 0; i < forced_procs_rows.length - 1; i++) {
            const r = forced_procs_rows[i].cells;
            incrementCounter(forced_procs, r[1].querySelector("select").value, Number(r[0].querySelector("input").value));
        }
        for (let i = 0; i < bonus_damage_rows.length - 1; i++) {
            const r = bonus_damage_rows[i].cells;
            incrementCounter(bonus_damage, r[1].querySelector("select").value, Number(r[0].querySelector("input").value) / 100); //%
        }

        hits.push({
            time: time,
            damage: damage,
            forced_procs: forced_procs,
            bonus_damage: bonus_damage,
        })
    }

    const combo_type = document.getElementById("combo_type").value;
    stance[combo_type] ??= {};
    stance[combo_type]["hits"] = hits;
}

function convertStance(is_melee){
    let combo_type = document.getElementById("combo_type").value;
    let hits;
    if(is_melee){
        hits = structuredClone(stance[combo_type].hits);
    } else {
        hits = [{
            "damage": 100,
            "time": 1,
        }];
    }
    for (let e of hits){
        e.damage /= 100;
        e.combo ??= 1;

        e.forced_procs = default_value(default_damage_types, e.forced_procs);
        e.bonus_damage = default_value(default_damage_types, e.bonus_damage);
    }

    //TODO idk i havent tested it
    return {
        "name": combo_type,
        "hits": Module.passVectorHits(hits)
    }
}

document.getElementById("hits_wrapper").addEventListener('click', function (event) {
    if (event.target.name === 'buttonAddForcedProc') {
        const forcedProc = document.getElementById("templateForcedProc").content.cloneNode(true);
        event.target.closest('table').appendChild(forcedProc);
    }
    else if (event.target.name === 'buttonAddBonusDamage') {
        const bonusDamage = document.getElementById("templateBonusDamage").content.cloneNode(true);
        event.target.closest('table').appendChild(bonusDamage);
    }
});

document.getElementById("hits_wrapper").addEventListener('change', function (event) {
    if (event.target.value === 0) {
        if (event.target.name === 'inputForcedProc') {
            event.target.closest('tr').remove();
        }
        else if (event.target.name === 'inputBonusDamage') {
            event.target.closest('tr').remove();
        }
    }
});

function updateStanceAttackName(){
    const weapon_type = document.getElementById("weapon_subclass").value;
    const name = document.getElementById("stance_name").value;
    const combo_type = document.getElementById("combo_type").value;
    stance = data_stances?.[weapon_type]?.[name];

    if(!stance){ //custom stance
        stance = {};
        data_stances[weapon_type][name] = stance;
    }

    const attack = stance?.[combo_type];
    document.getElementById("combo_name").innerText = attack?.name ?? "combo does not exist";
}
document.querySelectorAll("#stance_name, #combo_type").forEach(function (target) {
    target.addEventListener('change', function () {
        updateStanceAttackName();
})})

document.getElementById("combo_type").addEventListener('change', function (e) {
    stance.current_combo = e.target.value;
    updateModding();
})

function updateStancesOptions(){
    //hide from stances_list those that arent of the right weapon subclass
    //(cant use sword stances on a staff)
    const type = document.getElementById("weapon_subclass").value;
    const stances_list = document.getElementById('stance_name');
    stances_list.innerHTML = "";
    for(let stances of [...Object.values(data_stances[type] ?? []), { "name": `Custom ${type} stance` }]){
        const option = document.createElement('option');
        option.value = stances["name"];
        option.innerText = stances["name"];
        stances_list.appendChild(option);
    }
}

document.getElementById("weapon_subclass").addEventListener('change', function () {
    updateStancesOptions();
});
/*
//FIXME issues with reading the value from the mod when going back to edit mode
document.getElementById("stats-tbody").addEventListener('change', function (event) {
    if (event.target.nodeName !== "SELECT") return;
    if (event.target.value !== "critical_chance_heavy") return;
    let input = event.target.parentElement.firstElementChild;
    input.type = "checkbox";
})
*/