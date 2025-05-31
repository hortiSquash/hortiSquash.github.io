/*
const worker = new Worker('./wasmWorker.js');

let next_id = 0;
const promises = {};

function call_worker(message) {
    return new Promise((resolve, reject) => {
        const id = next_id++;
        promises[id] = {resolve, reject};
        message.id = id;
        worker.postMessage(message);
    });
}

worker.onmessage = function(event) {
    const {id, data} = event.data;
    promises[id].resolve(data);
}

async function bite(arg){
    let result = await call_worker({func: "passVectorBuffLines", arg: arg});
    console.log(result);
}
*/

function default_value(defaults, new_values){
    return {...defaults, ...new_values};
}

const default_damage_types = {
    "impact": 0,
    "puncture": 0,
    "slash": 0,

    "cold": 0,
    "electricity": 0,
    "heat": 0,
    "toxin": 0,

    "blast": 0,
    "corrosive": 0,
    "gas": 0,
    "magnetic": 0,
    "radiation": 0,
    "viral": 0,
    "void_dmg": 0,
    "lifted": 0,
    "knockdown": 0,
    "microwave": 0,
}

const default_buff_line = {
    "buff": "",
    "operation": "",
    "value": 0,
    "damage_type": "DT_ANY",
    "symbol_filter": "",

    "condition_name": "",
    "max_stacks": 1,
    "upgrade_duration": 99999,
    "can_reproc": true,
    "stack_mode": false,
}

const default_modbuff = {
    "name": "unnamed mod",

    "buffs": [], //FIXME idk
}

const damage_order = [
    "void_dmg",
    "viral",
    "radiation",
    "magnetic",
    "gas",
    "corrosive",
    "blast",
    "toxin",
    "heat",
    "electricity",
    "cold",
    "slash",
    "puncture",
    "impact",
];

let enemies = [];
let current_enemy_row = 0;

function addEnemy() {
    enemies.push({});

    const enemy_container = document.getElementById('enemy_container');
    const rowIndex = enemy_container.children.length;

    const enemyDetails = document.getElementById("templateEnemyRow").content.cloneNode(true);
    enemy_container.appendChild(enemyDetails);

    //force open the dialog to edit instantly (avoid bugs with empty enemy)
    editEnemy(rowIndex);
}

//TODO remove the ?.
document.getElementById("enemy_container")?.addEventListener('click', function(event) {
    if (event.target.className != 'pen-button') return;

    const row = event.target.closest('tr');
    const index = [...row.parentElement.children].indexOf(row);

    editEnemy(index);
});

function editEnemy(rowIndex) {
    current_enemy_row = rowIndex;
    const enemy = enemies[current_enemy_row];

    if (Object.keys(enemy).length !== 0) {
        // load saved fields in the dialog if enemy isnt empty
        document.getElementById("enemy_name_input").value = enemy.name;
        document.getElementById("health").value = enemy.health;
        document.getElementById("armor").value = enemy.armor;
        document.getElementById("shield").value = enemy.shield;
        document.getElementById("level_base").value = enemy.level_base;
        document.getElementById("level_current").value = enemy.level_current;
        document.getElementById("faction").value = enemy.faction;
    }
    else {
        // reset all fields in the dialog if placeholder (reset from previous edited enemy)
        document.getElementById("editEnemy").reset()
    }

    document.getElementById("enemy_edit_dialog").showModal();
}

function loadEnemyStats() {
    const data_enemies = window.data_enemies;

    const enemySelect = document.getElementById('enemy_name_input').value; // name
    document.getElementById('enemy_container').rows[current_enemy_row].cells[1].innerText = enemySelect;

    const enemy = data_enemies.find((e) => e.Name === enemySelect);
    if(enemy){
        // read from the JSON
        document.getElementById("health").value = enemy.Health;
        document.getElementById("armor").value = enemy.Armor;
        document.getElementById("shield").value = enemy.Shield;
        document.getElementById("level_base").value = enemy.BaseLevel;
        document.getElementById("level_current").value = enemy.BaseLevel; //TODO spawn level
        document.getElementById("faction").value = enemy.Faction;
    }
    scaleEnemy();
}

function saveEnemy() {
    enemies[current_enemy_row] = {
        "name": document.getElementById("enemy_name_input").value,
        "health": Number(document.getElementById("health").value),
        "armor": Number(document.getElementById("armor").value),
        "shield": Number(document.getElementById("shield").value),
        "level_base": Number(document.getElementById("level_base").value),
        "level_current": Number(document.getElementById("level_current").value),
        "faction": document.getElementById("faction").value,
    };
}

function deleteEnemy() {
    enemies.splice(current_enemy_row, 1);
    document.getElementById("enemy_container").deleteRow(current_enemy_row);
    document.getElementById("enemy_edit_dialog").close();
}

function convertEnemyToWASM(enemy) {
    // TODO stats from enemy level
    // enemy_modified = enemy;

    // switch (enemy_modified.health_resistance) {
    // case 'Tenno Flesh':
    //     console.log('Oranges are $0.59 a pound.');
    //     break;
    // case 'Mangoes':
    // case 'Papayas':
    //     console.log('Mangoes and papayas are $2.79 a pound.');
    //     // Expected output: "Mangoes and papayas are $2.79 a pound."
    //     break;
    // default:
    //     console.log(`Sorry, we are out of ${expr}.`);
    // }


    return enemy_modified;
}

function updateAverageTTK() {
    let sum_TTK_mean = 0;
    let sum_TTK_std = 0;
    const enemies = document.getElementById('enemy_container').rows;

    for (let enemy in enemies) {
        sum_TTK_mean += Number(parseFloat(enemy.cells[2].innerText));
        sum_TTK_std += Number(parseFloat(enemy.cells[3].innerText));
    }

    document.getElementById("TTK_average_mean").innerText = sum_TTK_mean / enemies.length;
    document.getElementById("TTK_average_std").innerText = sum_TTK_std / enemies.length;
}



/**
 * GRAPH
 */

const labels = {
    slash: "slash DoT",
    heat: "heat DoT",
    electricity: "electricity DoT",
    toxin: "toxin DoT",
    gas: "gas DoT"
};

function CppToColumnar(dataraw) {
    //convert to JS array
    const data = new Array(dataraw.size()).fill(0).map((_, id) => dataraw.get(id))

    //transpose into a dictionnary with arrays on each key
    const header_cols = ["time", "damage", "slash", "heat", "electricity", "toxin", "gas"];
    const ret = {};
    for (let i = header_cols.length - 1; 0 <= i; i--) {
        ret[header_cols[i]] = data.map(row => row[i]);
    }
    return ret;
}

function filterData(obj, timeArray) {
    return Object.entries(obj).map(([key, values]) => {
        const filtered = values
            .map((value, index) => ({ time: timeArray[index], data: value }))
            .filter(entry => entry.data !== 0);
        return {
            name: key,
            time: filtered.map(entry => entry.time),
            data: filtered.map(entry => entry.data),
        };
    });
}

let iterations;
let time_max;
let tickrate;
let quantization = true;
let conditionals = true;
let mods_buffs_cpp;
let filtered_data;
let total_each_damage;

function changeStats() {
    if(weapon == null){
        alert("Select a weapon");
        throw "missing weapon";
    }
    const is_melee = document.getElementById("weapon_type").value === "melee";

    if(is_melee && (stance == null || stance[document.getElementById("combo_type").value] == null)){
        alert("Select a stance and combo");
        throw "missing stance/combo";
    }

    document.getElementById('simulate_button').classList.remove('pulse');

    status_proportion_graph();

    //TODO support multiple enemies
    let enemy;
    if(enemies.length !== 0) {
        enemy = enemies[0];
        //TODO convert the enemies to scale their stats with their level
        // since there is no level calculation in the C++
    }else{
        //alert("Select an enemy to fight against");
        //throw "missing enemies";
        enemy = {
            "name": "",
            "health": 2147483647, //2 billion //TODO signed INT max, maybe change the C++ to be unsigned or even 64b ints
            "armor": 0,
            "shield": 0,
            "faction": "Neutral",
        };
    }

    iterations = Number(document.getElementById("iterations").value);
    time_max = Number(document.getElementById("max_time").value);
    tickrate = Number(document.getElementById("tickrate").value);

    //TODO waiting animation (in a worker so it doesnt get frozen)
    // another issue is that Module.stats() is not waited for its answer
    // so if i put code after it it gets executed before anyway

    //document.body.style.cursor = "wait";

    // TODO why only first enemy?
    const data = CppToColumnar(Module.stats(
        weapon,
        convertStance(is_melee),
        enemy,
        mods_buffs_cpp,
        iterations, time_max, tickrate, quantization, conditionals
    ));

    for (const key in data) {
        data[key] = data[key].map(datum => Number(datum));// || undefined);
    }

    const time = data.time;
    delete data.time;
    filtered_data = filterData(data, time);

    //for the mod +% it might be useful?
    total_each_damage = Object.fromEntries(
        Object.entries(data).map(([key, arr]) => [key, arr.reduce((a, b) => a + b, 0)])
        .filter(([_, v]) => v > 0)
    );

    document.querySelector('input[name="plotType"]:checked')?.click();
}

const chart = document.getElementById('plot');
function plotData() {
    // creates an object for each column of the CSV
    const plotlyData = filtered_data.map(data2 => ({
        y: data2.data,
        x: data2.time,
        type: 'histogram',
        //mode: 'lines',
        //mode: 'lines+markers',
        mode: 'markers',
        histfunc: 'sum', //count
        xbins: { size: 1.0 },
        //fill: 'none', //tonexty //tozerox
        //stackgroup: 'one',
        hovertemplate: '%{x:.3f}s - %{y:.3s}',
        name: labels[data2.name] ?? data2.name, //if not found, use the header
        marker: { color: colors[data2.name] },
        /*
        error_y: {
            type: 'data',
            array: data_error[name],
            visible: true
        },
        */
    })).filter(trace => trace.x.length > 0);

    const layout = {
        xaxis: {
            //type: 'log',
            autorange: true,
            //range: [0, 9.5],
            autorangeoptions:{
                minallowed: -1,
                // maxallowed: 50,
            }
        },
        yaxis: {
            // range: [0, 10],
            // type: 'log',
            autorange: true,
            autorangeoptions:{
                minallowed: -1,
            }
        },
        barmode: "stack",
        margin: {
            b: 20,
            l: 50,
            r: 0,
            t: 15,
        },
        modebar: {
            // orientation: "v",
        },
        legend: {
            x: 1.0,
            y: 0.95,
        },
        paper_bgcolor: "rgba(0, 0, 0, 0)",
        /* plot_bgcolor: "rgba(0, 0, 0, 0)", */
        font: {
            "family": "Arial",
            /* "color": "var(--color-text)", */
        },
        showlegend: true
    };

    Plotly.react(chart, plotlyData, layout, {
        // displaylogo: false,
        displayModeBar: true,
        showEditInChartStudio: true,
        plotlyServerURL: "https://chart-studio.plotly.com",
    });
}

function showHistogram() {
    plotData();
    Plotly.restyle(chart, {
        type: 'histogram',
    });
}
function showScatter() {
    plotData();
    Plotly.restyle(chart, {
        type: 'scatter',
    });
}
function showPie() {
    const data = [{
        type: 'pie',
        values: Object.values(total_each_damage),
        labels: Object.keys(total_each_damage).map((name) => labels[name] ?? name),
        hovertemplate: '%{label} - %{value:.3s}',
        marker: { colors: Object.keys(total_each_damage).map((name) => colors[name]) },
        name: "",
    }];
    const layout = {
        margin: {
            b: 20,
            l: 50,
            r: 0,
            t: 15,
        },
        modebar: {
            // orientation: "v",
        },
        legend: {
            x: 1.0,
            y: 0.95,
        },
        paper_bgcolor: "rgba(0, 0, 0, 0)",
        /* plot_bgcolor: "rgba(0, 0, 0, 0)", */
        font: {
            "family": "Arial",
            /* "color": "var(--color-text)", */
        },
    };
    Plotly.react(chart, data, layout, {
        // displaylogo: false,
        displayModeBar: true,
            showEditInChartStudio: true,
            plotlyServerURL: "https://chart-studio.plotly.com",
    });
}

function formatPercent(num, maxDigits = 2) {
    return new Intl.NumberFormat("en-US", {
        style: 'percent',
        minimumFractionDigits: 0,
        maximumFractionDigits: maxDigits,
    }).format(num);
}

function formatPercentPoint(num, maxDigits) {
    return formatAdditivePercent(num, maxDigits).replace("%", "%ₚₜ");
}

function formatSecond(num, maxDigits = 3) {
    return new Intl.NumberFormat("en-US", {
        style: "unit",
        unit: "second",
        unitDisplay: "narrow",
        minimumFractionDigits: 0,
        maximumFractionDigits: maxDigits,
    }).format(num);
}

function formatPerSecond(num, maxDigits = 3) {
    return formatSecond(num, maxDigits).replace("s", "/s");
}

function formatMultiplier(num, maxDigits = 2) {
    return new Intl.NumberFormat("en-US", {
        style: "unit",
        unit: "meter",
        unitDisplay: "narrow",
        minimumFractionDigits: 0,
        maximumFractionDigits: maxDigits,
    }).format(num).replace("m", "×");
}

//fr-FR for ISO number format with SPACE as thousands separator and , as decimals
function formatDecimalsMinMax(num, minDigits, maxDigits) {
    return new Intl.NumberFormat("en-US", {
        minimumFractionDigits: minDigits,
        maximumFractionDigits: maxDigits,
    }).format(num);
}

function formatDecimals(num, maxDigits = 2) {
    return formatDecimalsMinMax(num, 1, maxDigits);
}

function formatLargeNumbers(num, maxDigits = 3) {
    return new Intl.NumberFormat("en-US", {
        // compactDisplay: "short",
        notation: "compact",
        minimumFractionDigits: 0,
        maximumFractionDigits: maxDigits,
    }).format(num);
}

function formatAdditive(num, maxDigits = 2) {
    return new Intl.NumberFormat("en-US", {
        style: "decimal",
        signDisplay: 'always',
        minimumFractionDigits: 1,
        maximumFractionDigits: maxDigits,
    }).format(num);
}

function formatAdditivePercent(num, maxDigits = 2) {
    return new Intl.NumberFormat("en-US", {
        style: 'percent',
        signDisplay: 'always',
        minimumFractionDigits: 0,
        maximumFractionDigits: maxDigits,
    }).format(num);
}

function loadWeaponStats() {
    // retrieve all weapon's stats
    const data = window.data_weapons_melee;

    const weaponSelected = document.getElementById("weapon_name_input").value;
    if(!weaponSelected) return;

    // retrieve enemy data
    const weaponTemp = Object.values(data).find((e) => e.name === weaponSelected);

    //TODO
    // Update saveWeapon() as well if you wanna edit the fields here

    // convert from the DB
    weapon = {
        "attack_speed": weaponTemp.fireRate || 1,
        "wind_up": weaponTemp.windUp || 1,
        "critical_chance": weaponTemp.criticalChance || 0,
        "critical_damage": weaponTemp.criticalMultiplier || 1,
        "status": weaponTemp.procChance || 0,
        "initial_combo": weaponTemp.whateveritscalled || 0, //TODO
        "combo_duration": weaponTemp.comboDuration || 5,
        "combo_efficiency": weaponTemp.whateveritscalled || 0, //TODO
        "riven_disposition": weaponTemp.omegaAttenuation || 0,
        "multishot": weaponTemp.multishot || 1,
        "magazine_capacity": weaponTemp.magazineSize || 1,
        "reload": weaponTemp.reloadTime || 0,
        "max_level": weaponTemp.maxLevelCap || 30,

        //"damage_types": weaponTemp.damage, // because keep names
         "damage_types": {
             "impact": weaponTemp.damage.impact || 0,
             "puncture": weaponTemp.damage.puncture || 0,
             "slash": weaponTemp.damage.slash || 0,

             "cold": weaponTemp.damage.cold || 0,
             "electricity": weaponTemp.damage.electricity || 0,
             "heat": weaponTemp.damage.heat || 0,
             "toxin": weaponTemp.damage.toxin || 0,

             "blast": weaponTemp.damage.blast || 0,
             "corrosive": weaponTemp.damage.corrosive || 0,
             "gas": weaponTemp.damage.gas || 0,
             "magnetic": weaponTemp.damage.magnetic || 0,
             "radiation": weaponTemp.damage.radiation || 0,
             "viral": weaponTemp.damage.viral || 0,
             "void_dmg": weaponTemp.damage.void_dmg || 0,
         }
    };

    displayWeaponStats(weapon, 1);

    // TODO save from the loaded weapon, not from the parse bruh
    saveWeapon();
}

function displayWeaponStats(weapon_to_display, column = 2) { // column 1 for base, 2 for modded stats
    document.getElementById("attack_speed").cells[column].querySelector("input").value = formatDecimals(weapon_to_display.attack_speed, 3);
    document.getElementById("wind_up").cells[column].querySelector("input").value = formatDecimalsMinMax(weapon_to_display.wind_up, 0, 3);
    document.getElementById("critical_chance").cells[column].querySelector("input").value = formatDecimalsMinMax(weapon_to_display.critical_chance * 100, 0, 2);
    document.getElementById("critical_damage").cells[column].querySelector("input").value = formatDecimalsMinMax(weapon_to_display.critical_damage, 0, 2);
    document.getElementById("status").cells[column].querySelector("input").value = formatDecimalsMinMax(weapon_to_display.status * 100, 0, 2);
    document.getElementById("initial_combo").cells[column].querySelector("input").value = formatAdditive(weapon_to_display.initial_combo);
    document.getElementById("combo_duration").cells[column].querySelector("input").value = formatDecimalsMinMax(weapon_to_display.combo_duration, 0, 3);
    document.getElementById("combo_efficiency").cells[column].querySelector("input").value = formatDecimalsMinMax(weapon_to_display.combo_efficiency * 100, 0, 2);
    document.getElementById("multishot").cells[column].querySelector("input").value = formatDecimalsMinMax(weapon_to_display.multishot, 1, 2);
    document.getElementById("magazine_capacity").cells[column].querySelector("input").value = formatDecimalsMinMax(weapon_to_display.magazine_capacity, 0, 2);
    document.getElementById("reload").cells[column].querySelector("input").value = formatDecimalsMinMax(weapon_to_display.reload, 0, 2);

    let crit_table = document.getElementById("crit_tier").cells;

    crit_table[1].innerText = formatPercent(weapon_to_display.critical_chance);
    for(let i = 2; i < crit_table.length; i++) {
        let value = weapon_to_display.critical_chance + weapon.critical_chance * weapon_to_display.critical_chance_per_combo * (i - 1);
        crit_table[i].innerText = formatPercent(value);

        crit_table[i].classList.toggle("mod_buff", (weapon_to_display.critical_chance_per_combo > 0));
        crit_table[i].classList.toggle("mod_nerf", (weapon_to_display.critical_chance_per_combo < 0));
    }

    let status_table = document.getElementById("status_tier").cells;
    status_table[1].innerText = formatPercent(weapon_to_display.status);
    for(let i = 2; i < status_table.length; i++) {
        let value = weapon_to_display.status + weapon.status * weapon_to_display.status_per_combo * (i - 1);
        status_table[i].innerText = formatPercent(value);

        status_table[i].classList.toggle("mod_buff", (weapon_to_display.status_per_combo > 0));
        status_table[i].classList.toggle("mod_nerf", (weapon_to_display.status_per_combo < 0));
    }

    document.getElementById("riven_disposition_input").value = formatDecimals(weapon_to_display.riven_disposition, 3);
    document.getElementById("riven_disposition_meter").value = weapon_to_display.riven_disposition;

    for (const [key, value] of Object.entries(weapon_to_display.damage_types)) {
        let cell = document.getElementById(key)?.cells[column];
        if(cell){
            cell.querySelector("input").value = formatDecimals(value, 2);
        }
    }

    statColoring("stats_damage");
    statColoring("stats");
}

let weapon;

const melee_weapon_types = {
    "Blade and Whip":      4,
    "Claws":               5,
    "Dagger":              5,
    "Dual Daggers":        5,
    "Dual Swords":         5,
    "Fist":                5,
    "Glaive":              2,
    "Gunblade":            2,
    "Hammer":              6,
    "Heavy Blade":         6,
    "Machete":             6,
    "Nikana":              6,
    "Nunchaku":            5,
    "Polearm":             6,
    "Rapier":              4.5,
    "Scythe":              6,
    "Sparring":            3,
    "Staff":               5,
    "Sword":               5,
    "Sword and Shield":    5,
    "Tonfa":               5,
    "Two-Handed Nikana":   6,
    "Warfan":              5,
    "Whip":                4.5
}
const primary_weapon_types = {
    "Assault Rifle":    1,
    "Bow":              1,
    "Shotgun":          1,
    "Sniper":           1,
}
const secondary_weapon_types = {
    "Pistol":   1,
    "Thrown":   1,
    "Tome":     1,
}

const weapon_type_list = document.getElementById("weapon_subclass");
Object.keys(melee_weapon_types).forEach(function (e) {
    const option = document.createElement('option');
    option.text = e;
    weapon_type_list.appendChild(option);
});

function updateModding() {
    if(!weapon) return;

    const max_capacity = (weapon.max_level ?? 30) * (document.getElementById("potato").checked ? 2 : 1);
    document.getElementById("mod_capacity_max").innerText = max_capacity;
    const meter = document.getElementById("mod_capacity_meter");
    meter.max = max_capacity;
    meter.low = max_capacity / 2;
    meter.high = max_capacity - 1;

    const isHeavy = document.getElementById("combo_type").value === "heavy";

    mods_buffs_cpp = mods.map((mod) => {
        let mod_new = structuredClone(mod);
        const current_level = mod_new.current_level ?? mod_new.max_level;
        for (let i=0; i < mod_new.buffs.length; i++) {
            const buff = mod_new.buffs[i];
            buff.value = Number(buff.value) * (current_level + 1);
            if(!buff.condition){
                buff.condition = buff.conditional_upgrades?.at(0) ?? "";
            }

            //TODO fix this shit
            if(!isHeavy && buff.valid_modifiers?.includes("PM_HEAVY_MELEE")){
                buff.value = 0;
            }

            mod_new.buffs[i] = default_value(default_buff_line, buff);
        }
        mod_new = default_value(default_modbuff, mod_new);

        mod_new.buffs = Module.passVectorBuffLines(mod_new.buffs);
        return mod_new;
    });

    mods_buffs_cpp = Module.passVectorModBuffs(mods_buffs_cpp);

    // TODO calculate and display updated modded stats
    // FIXME not only the first enemy
    displayWeaponStats(calculateModding(weapon, mods_buffs_cpp, enemies), 2);
    document.getElementById('simulate_button').classList.add('pulse');
}

function saveWeapon() {
    // TODO this thing
    // there is an issue between saving from weapon (except editable stats) and saving from edited fields (formated values)

    document.getElementById("riven_disposition_meter").value = document.getElementById("riven_disposition_input").value;

    weapon = default_value(weapon, {
        "attack_speed": document.getElementById("attack_speed").cells[1].querySelector("input").value,
        "wind_up": document.getElementById("wind_up").cells[1].querySelector("input").value,

        "critical_chance": document.getElementById("critical_chance").cells[1].querySelector("input").value / 100,
        "critical_damage": document.getElementById("critical_damage").cells[1].querySelector("input").value,

        "status": document.getElementById("status").cells[1].querySelector("input").value / 100,

        "initial_combo": document.getElementById("initial_combo").cells[1].querySelector("input").value,
        "combo_duration": document.getElementById("combo_duration").cells[1].querySelector("input").value,
        "combo_efficiency": document.getElementById("combo_efficiency").cells[1].querySelector("input").value / 100,

        "multishot": document.getElementById("multishot").cells[1].querySelector("input").value,
        "magazine_capacity": document.getElementById("magazine_capacity").cells[1].querySelector("input").value,
        "reload": document.getElementById("reload").cells[1].querySelector("input").value,

        "riven_disposition": document.getElementById("riven_disposition_input").value,
        "max_combo": 12,
    });
    weapon.damage_types = default_value(default_damage_types, Object.fromEntries(damage_order.map(e =>
        [e, (document.getElementById(e)?.cells[1].querySelector("input").value) || 0]
    )));

    // remove the % and shit
    for (const [key, value] of Object.entries(weapon)) {
        if (key !== "damage_types") {
            weapon[key] = parseFloat(String(value).replace("%", "E-2")) || 0;
        }
        else {
            for (const [key2, value2] of Object.entries(value)) {
                weapon[key][key2] = parseFloat(value2);
            }
        }
    }

    //FIXME it gets broken by the parseFloat from the remove% because its text so it gets converted to 0
    weapon.weapon_name = document.getElementById("weapon_name_input").value;
    weapon.weapon_type = document.getElementById("weapon_subclass").value;

    // Force weapon from the DB instead of parsed from fields
    // loadWeaponStats()

    updateModding();
}

let weaponModded;
let finalStats;


function calculateModding(weapon, mod_buffs_cpp = [], enemies) {
    //TODO check if the selected stance is a heavy attack
    const isHeavy = document.getElementById("combo_type").value === "heavy";

    const enemy_faction = enemies[0]?.faction ?? "";

    quantization = document.getElementById("quantization").checked;
    conditionals = document.getElementById("conditionals").checked;

    finalStats = Module.final_stats(weapon, mods_buffs_cpp, isHeavy, enemy_faction, quantization, conditionals);

    weaponModded = structuredClone(weapon);
    weaponModded.attack_speed = finalStats.attack_speed;
    weaponModded.wind_up = finalStats.wind_up;
    weaponModded.critical_chance = finalStats.critical_chance;
    weaponModded.critical_damage = finalStats.critical_damage;
    weaponModded.status = finalStats.status;
    weaponModded.multishot = finalStats.multishot;
    weaponModded.magazine_capacity = finalStats.magazine_capacity;
    weaponModded.reload = finalStats.reload;

    weaponModded.initial_combo = finalStats.initial_combo;
    weaponModded.combo_duration = finalStats.combo_duration;
    weaponModded.combo_efficiency = finalStats.combo_efficiency;
    weaponModded.critical_chance_per_combo = finalStats.critical_chance_per_combo;
    weaponModded.status_per_combo = finalStats.status_per_combo;

    weaponModded.damage_types = finalStats.displayed_damage_types;

    return weaponModded;
}

function statColoring(table) {
    const b = document.getElementById(table).rows;
    for (let i = 0; i < b.length; i++) {
        const c = b[i].cells;
        if (c.length < 3) continue;
        const oldVal = parseFloat(c[1].querySelector("input")?.value.replace(",", ""));
        const newVal = parseFloat(c[2].querySelector("input")?.value.replace(",", ""));
        const isBuff = oldVal < newVal;
        const isNerf = oldVal > newVal;
        c[2].classList.toggle("mod_buff", isBuff);
        c[2].classList.toggle("mod_nerf", isNerf);
    }
}

document.getElementById("stats_wrapper").addEventListener('input', function () {
    saveWeapon()
});

{
    const unicode = {
        //ammo thingy is ea01
        "Madurai": "\u{ea02}",
        "Vazarin": "\u{ea03}",
        "Zenurik": "\u{ea04}",
        "Penjaga": "\u{ea05}",
        "Naramon": "\u{ea06}",
        "Umbra": "\u{ea07}",
        "Unairu": "\u{ea08}",

        "corrosive": "\u{ea0b}",
        "gas": "\u{ea10}",
        "impact": "\u{ea11}",
        "puncture": "\u{ea14}",
        "slash": "\u{ea18}",
        "viral": "\u{ea19}",
        //corrosive is ea0b
        //elec is ???
        //gas is ea10
        //impact is ea11
        //puncture is ea14
        //tau is ea17
        //slash is ea18
        //viral is ea19
    }

    const kek = document.getElementById("stats_damage")
    for (let e of damage_order){
        const damage_template = document.getElementById("damage_template").content.cloneNode(true);
        damage_template.querySelector("tr").id = e;
        if (e === "void_dmg") e = "void";
        damage_template.querySelector("td img").src = "https://browse.wf/Lotus/Interface/Icons/StatSymbols/"+ e.charAt(0).toUpperCase() + e.slice(1) +"Symbol.png";
        damage_template.querySelector("td .damage-name").innerText = e;
        kek.insertBefore(damage_template, kek.firstElementChild);
    }
}

function hideEmptyRows() {
    displayRows("stats_damage", false);
    //displayRows("stats", false);
}

function displayAllRows() {
    displayRows("stats_damage", true);
    //displayRows("stats", true);
}

function displayRows(table, display) {
    // FIXME
    // issue is some important lines disappear (if combo disappear, then "duration" doesnt mean anything)
    // the size and position of everything is fucked up
    // graph disappears if impact disappears, etc

    const rows = document.getElementById(table).rows;
    for (let i = 0; i < rows.length - 1; i++) {
        const row = rows[i];
        const cells = row.cells;
        if (cells.length < 3) {
            continue;
        }

        if (display || parseFloat(cells[1].querySelector("input").value) || parseFloat(cells[2].querySelector("input").value)) {
            row.classList.add("row_show");
            row.classList.remove("row_hide");
        }
        else {
            row.classList.add("row_hide");
            row.classList.remove("row_show");
        }
    }
}

const colors_wiki = {
    "void_dmg": "rgb(8, 94, 80)",
    "viral": "rgb(183, 22, 88)",
    "radiation": "rgb(128, 96, 0)",
    "magnetic": "rgb(71, 71, 209)",
    "gas": "rgb(0, 102, 51)",
    "corrosive": "rgb(77, 102, 0)",
    "blast": "rgb(179, 42, 0)",
    "toxin": "rgb(0, 102, 17)",
    "heat": "rgb(153, 77, 0)",
    "electricity": "rgb(97, 15, 179)",
    "cold": "rgb(23, 101, 140)",
    "slash": "rgb(122, 82, 84)",
    "puncture": "rgb(92, 82, 71)",
    "impact": "rgb(61, 94, 94)",
}

const colors_in_game = { //same colors except better gas and magnetic
    "void_dmg": "rgb(8, 94, 80)",
    "viral": "rgb(247, 185, 214)",
    "radiation": "rgb(231, 219, 0)",
    "magnetic": "rgb(208, 208, 208)",
    "gas": "rgb(113, 230, 193)",
    "corrosive": "rgb(137, 144, 13)",
    "blast": "rgb(189, 141, 139)",
    "toxin": "rgb(76, 131, 55)",
    "heat": "rgb(255, 159, 1)",
    "electricity": "rgb(132, 110, 157)",
    "cold": "rgb(90, 143, 238)",
    "slash": "rgb(240, 74, 76)",
    "puncture": "rgb(227, 227, 105)",
    "impact": "rgb(75, 155, 166)",
}

const colors = { //handmade
    "void_dmg": "rgb(8, 94, 80)",
    "viral": "rgb(247, 185, 214)",
    "radiation": "rgb(231, 219, 0)",
    "magnetic": "rgb(208, 208, 208)",
    "gas": "rgb(113, 230, 193)",
    "corrosive": "rgb(137, 144, 13)",
    "blast": "rgb(189, 141, 139)",
    "toxin": "rgb(76, 131, 55)",
    "heat": "rgb(211,106,25)",
    "electricity": "rgb(132, 110, 157)",
    "cold": "rgb(90, 143, 238)",
    "slash": "rgb(115,12,12)",
    "puncture": "rgb(227, 227, 105)",
    "impact": "rgb(75, 155, 166)",
    "damage": "rgb(140,86,75)",
}

function niceNumber(range) {
    const exponent = Math.floor(Math.log10(range));
    const fraction = range / Math.pow(10, exponent);

    let niceFraction;
    if (fraction <= 1.74) {
        niceFraction = 1;
    } else if (fraction <= 3.74) {
        niceFraction = 2.5;
    } else if (fraction <= 7.4) {
        niceFraction = 5;
    } else {
        niceFraction = 10;
    }
    return niceFraction * Math.pow(10, exponent);
}

function calculateTickCount(containerWidth) {
    const minTickSpacing = 50; // minimum space between ticks in pixels
    return Math.floor(containerWidth / minTickSpacing);
}

function getNiceTickValues(max, tickCount) {
    const niceTicks = [];
    const step = niceNumber(max / tickCount);
    const start = 0; // Math.floor(0 / step) * step;
    const end = Math.round(max / step) * step;

    for (let i = start; i <= end; i += step) {
        niceTicks.push(i);
    }
    return niceTicks;
}

function status_proportion_graph() {
    //TODO C++ call for the proc proportion
    //const temp = Module.final_stats(weapon, isHeavy, enemy_faction, quantization, conditionals);
    const x = damage_order.map(k => finalStats.displayed_damage_types[k]).reverse();
    const max = Math.max(...x);

    const orderedcolors = Object.keys(weapon.damage_types).map(k => colors[k]);

    const rows = document.getElementById("stats_damage").rows;
    for (let i = 0; i < rows.length; i++) {
        const div = rows[i].querySelector(".graph_bar");
        if (div != null) {
            div.style.width = 100 * x[i] / max + "%";
            div.style["background-color"] = orderedcolors[i];
            div.querySelector(".tooltiptext").innerText = formatDecimals(x[i], 3);
        }
    }

    // TICKS
    const axis = document.getElementById('axis');
    const containerWidth = axis.parentElement.offsetWidth;
    const tickCount = calculateTickCount(containerWidth);
    const niceTicks = getNiceTickValues(max, tickCount);

    axis.innerHTML = ''; // reset
    niceTicks.forEach(tickValue => {
        const tick = document.createElement('div');
        tick.className = 'tick';
        const tickLeft = (tickValue / max * containerWidth); // align tick perfectly
        tick.style.left = tickLeft + 'px';
        tick.setAttribute('data-value', formatLargeNumbers(tickValue));
        axis.appendChild(tick);
    });
};

// TODO on table resize instead
//window.addEventListener('resize', status_proportion_graph);

document.getElementById("help_svg").addEventListener("click", function(event) {
    event.target.style.display = "none";
})
document.getElementById("help_button").addEventListener("click", function() {
    document.getElementById("help_svg").style.display = "";
})

async function loadJsonGzip(path) {
    try {
        const ds = new DecompressionStream("gzip");
        const response = await fetch(path);
        const decompressedStream = response.body.pipeThrough(ds);
        const text = await new Response(decompressedStream).text();
        return JSON.parse(text);
    } catch (error) {
        console.error("Error loading JSON:", error);
    }
}

async function loadJson(path) {
    try {
        const response = await fetch(path);
        return await response.json();
    } catch (error) {
        console.error("Error loading JSON:", error);
    }
}

let theme = localStorage.getItem("theme") ?? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "1" : "0");
document.body.setAttribute("theme", theme);

document.getElementById("theme_button").addEventListener("click", () => {
    theme = (theme + 1) % 3;
    document.body.setAttribute("theme", theme);
    localStorage.setItem("theme", theme);
});

document.getElementById("weapon_type").addEventListener("change", (e) => {
    const boolean = e.target.value === "melee"

    document.getElementById("wind_up").classList.toggle("d-none", !boolean);
    document.getElementById("initial_combo").classList.toggle("d-none", !boolean);
    document.getElementById("combo_efficiency").classList.toggle("d-none", !boolean);
    document.getElementById("combo_duration").classList.toggle("d-none", !boolean);

    document.getElementById("multishot").classList.toggle("d-none", boolean);
    document.getElementById("magazine_capacity").classList.toggle("d-none", boolean);
    document.getElementById("reload").classList.toggle("d-none", boolean);

    const weapon_type_list = document.getElementById("weapon_subclass");
    let list;
    if(e.target.value === "melee"){
        list = melee_weapon_types;
    }else if(e.target.value === "primary"){
        list = primary_weapon_types;
    }else if(e.target.value === "secondary"){
        list = secondary_weapon_types;
    }

    while (weapon_type_list.options.length > 1) weapon_type_list.remove(1);
    Object.keys(list).forEach(function (e) {
        const option = document.createElement('option');
        option.text = e;
        weapon_type_list.appendChild(option);
    });
})

document.getElementById("editEnemy").addEventListener("change", () => scaleEnemy());

function Tfunc(x, mult) {
    return Math.max(0, Math.min(1, x/mult - 7));
}

const enemy_faction_health_multipliers = {
    "Grineer": [
        0.015,
        2.12,
        24 * Math.sqrt(5) / 5,
        0.72
    ],
    "Corpus": [
        0.015,
        2.12,
        30 * Math.sqrt(5) / 5,
        0.55
    ],
    "Infested": [
        0.0225,
        2.12,
        36 * Math.sqrt(5) / 5,
        0.72
    ],
    "Neutral": [
        0.015,
        2.1,
        24 * Math.sqrt(5) / 5,
        0.685
    ]
};

const enemy_faction_shield_multipliers = {
    "Grineer": [
        0.02,
        1.75,
        1.6,
        0.75
    ],
    "Corpus": [
        0.02,
        1.76,
        2,
        0.76
    ],
    "Neutral": [ //=Corrupted
        0.02,
        1.75,
        2,
        0.75
    ]
};

function Sfunc(x) {
    return 3 * Math.pow(x, 2) - 2 * Math.pow(x,3);
}

function scaleEnemy(){
    const level_current = document.getElementById("level_current").value;
    const level_base = document.getElementById("level_base").value;
    const enemy_scaling_multiplier = document.getElementById("enemy_scaling_multiplier").value;

    const level_difference = level_current - level_base;

    const S = Sfunc(Tfunc(level_difference, 10));

    let faction = document.getElementById("faction").value;
    if(faction === "Kuva Grineer" || faction === "Grineer"){ faction = "Grineer"; }
    else if(faction === "Corpus Amalgam" || faction === "Corpus"){ faction = "Corpus"; }
    else if(faction === "Infested Deimos" || faction === "Infested"){ faction = "Infested"; }
    else{ faction = "Neutral" }

    const health_mul_array = enemy_faction_health_multipliers[faction]
    const health_f1 = 1 + health_mul_array[0] * Math.pow(level_difference, health_mul_array[1]);
    const health_f2 = 1 + health_mul_array[2] * Math.pow(level_difference, health_mul_array[3]);
    const health_mult = health_f1 * (1 - S) + health_f2 * S;
    const health = document.getElementById("health").value;
    const health_final = health * health_mult * enemy_scaling_multiplier;
    document.getElementById("health_current").innerText = formatDecimalsMinMax(health_final, 0, 1);

    const shield_mul_array = enemy_faction_shield_multipliers[faction] ?? enemy_faction_shield_multipliers["Neutral"];
    const shield_f1 = 1 + shield_mul_array[0] * Math.pow(level_difference, shield_mul_array[1]);
    const shield_f2 = 1 + shield_mul_array[2] * Math.pow(level_difference, shield_mul_array[3]);
    const shield_mult = shield_f1 * (1 - S) + shield_f2 * S;
    const shield = document.getElementById("shield").value;
    const shield_final = shield * shield_mult * enemy_scaling_multiplier;
    document.getElementById("shield_current").innerText = formatDecimalsMinMax(shield_final, 0, 1);

    const armor_f1 = 1 + 0.005 * Math.pow(level_difference, 1.75);
    const armor_f2 = 1 + 0.4 * Math.pow(level_difference, 0.75);
    const armor_mult = armor_f1 * (1 - S) + armor_f2 * S;
    const armor = document.getElementById("armor").value;
    const armor_final = Math.min(2700, armor * armor_mult); //cap at 2700 //doesnt scale with SP
    document.getElementById("armor_current").innerText = formatDecimalsMinMax(armor_final, 0, 1);

    //TODO need testing and output
    const Soverguard = Sfunc(Tfunc(level_difference, 5));
    const overguard_f1 = 1 + 0.0015 * Math.pow(level_difference, 4);
    const overguard_f2 = 1 + 260 * Math.pow(level_difference, 0.9);
    const overguard_mult = overguard_f1 * (1 - Soverguard) + overguard_f2 * Soverguard;
    //scale with SP ?
}