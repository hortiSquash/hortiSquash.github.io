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

const default_modbuff = {
    "name": "unnamed mod",

    "coaction_drift": false,
    "condition_overload": false,

    "madurai_phoenix_talons": 0,
    "madurai_phoenix_spirit": 0,

    "attack_speed": 0,
    "attack_speed_multiplicative": 0,
    "wind_up": 0,
    "initial_combo": 0,
    "combo_efficiency": 0,
    "combo_duration": 0,
    "combo_duration_multiplicative": 1,
    "critical_damage": 0,
    "critical_chance": 0,
    "critical_chance_heavy": 0,
    "critical_chance_per_combo": 0,
    "critical_chance_multiplicative": 0,
    "critical_chance_flat": 0,
    "status": 0,
    "status_per_combo": 0,
    "status_multiplicative": 0,
    "status_damage": 0,
    "damage": 0,
    "damage_heavy": 0,
    "damage_multiplicative": 0,
    "damage_multiplicative_grineer": 0,
    "damage_multiplicative_corpus": 0,
    "damage_multiplicative_corrupted": 0,
    "damage_multiplicative_infested": 0,
    "damage_multiplicative_sentient": 0,
    "armor_reduction": 0,

    "damage_types": default_value(default_damage_types, {}),
}

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
    heat: "heat DoT", electricity: "electricity DoT",
    toxin: "toxin DoT", gas: "gas DoT"
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

let iterations;
let time_max;
let tickrate;
let quantization = true;
let conditionals = true;
let mods_buffs_cpp;

function changeStats() {
    if(weapon == null){
        alert("Select a weapon");
        throw "missing weapon";
    }
    if(stance[document.getElementById("combo_type").value] == null){
        alert("Select a stance and combo");
        throw "missing stance/combo";
    }

    //TODO support multiple enemies
    let enemy;
    if(enemies.length != 0) {
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
        convertStance(),
        enemy,
        mods_buffs_cpp,
        iterations, time_max, tickrate, quantization, conditionals
    ));
    //const data = CppToColumnar(Module.stats(weapon, attack, enemy, iterations, time_max, tickrate, quantization, conditionals));

    for (const key in data) {
        data[key] = data[key].map(datum => Number(datum));// || undefined);
    }

    const time = data.time;
    delete data.time;

    const chart = document.getElementById('plot');

    // creates an object for each column of the CSV
    const plotlyData = Object.entries(data).map(([name, data]) => ({
        y: data,
        x: time,
        type: 'histogram', //line //scatter //histogram
        //mode: 'lines',
        //mode: 'lines+markers',
        mode: 'markers',
        histfunc: 'sum', //count
        xbins: { size: 1.0 },
        //fill: 'none', //tonexty //tozerox
        //stackgroup: 'one',
        hovertemplate: '%{x:.3f}s - %{y:.3s}',
        // transforms: [{ //FIXME bug when filtering, plotly SUCKKKKS
        //     type: 'filter',
        //     target: 'y',
        //     operation: '>',
        //     value: 0
        // }],
        name: labels[name] ?? name, //if not found, use the header
        marker: { color: colors[name] },
        /*
        error_y: {
            type: 'data',
            array: data_error[name],
            visible: true
        },
        */
    }));

    const hist = {
        type: 'histogram',
    }

    const scatter = {
        type: 'scatter',
    }

    const updatemenus = [{
        buttons: [
            {
                args: [hist],
                label: 'histogram',
                method: 'update'
            },
            {
                args: [scatter],
                label: 'scatter',
                method: 'update'
            },
        ],
        direction: 'bottom',
        pad: { l: 10, t: 10, b: 10, r: 10 },
        showactive: true,
        type: 'buttons',
        x: 1.0,
        xanchor: 'left',
        y: 0.5,
        yanchor: 'top'
    }]

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
        updatemenus: updatemenus,
    };

    Plotly.newPlot(chart, plotlyData, layout, {
        // displaylogo: false,
        displayModeBar: true,
        showEditInChartStudio: true,
        plotlyServerURL: "https://chart-studio.plotly.com",
    });
}

function formatPercent(num, maxDigits = 2) {
    return new Intl.NumberFormat("default", {
        style: 'percent',
        minimumFractionDigits: 0,
        maximumFractionDigits: maxDigits,
    }).format(num);
}

function formatPercentPoint(num, maxDigits) {
    return formatAdditivePercent(num, maxDigits).replace("%", "%ₚₜ");
}

function formatSecond(num, maxDigits = 3) {
    return new Intl.NumberFormat("default", {
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
    return new Intl.NumberFormat("default", {
        style: "unit",
        unit: "meter",
        unitDisplay: "narrow",
        minimumFractionDigits: 0,
        maximumFractionDigits: maxDigits,
    }).format(num).replace("m", "×");
}

//fr-FR for ISO number format with SPACE as thousands separator and , as decimals
function formatDecimals(num, maxDigits = 2) {
    return new Intl.NumberFormat("default", {
        minimumFractionDigits: 1,
        maximumFractionDigits: maxDigits,
    }).format(num);
}

function formatLargeNumbers(num, maxDigits = 3) {
    return new Intl.NumberFormat("default", {
        // compactDisplay: "short",
        notation: "compact",
        minimumFractionDigits: 0,
        maximumFractionDigits: maxDigits,
    }).format(num);
}

function formatAdditive(num, maxDigits = 2) {
    return new Intl.NumberFormat("default", {
        style: "decimal",
        signDisplay: 'always',
        minimumFractionDigits: 1,
        maximumFractionDigits: maxDigits,
    }).format(num);
}

function formatAdditivePercent(num, maxDigits = 2) {
    return new Intl.NumberFormat("default", {
        style: 'percent',
        signDisplay: 'always',
        minimumFractionDigits: 0,
        maximumFractionDigits: maxDigits,
    }).format(num);
}

function loadWeaponStats() {
    // retrieve all weapon's stats
    const data = window.data_weapons_melee;

    weaponSelected = document.getElementById("weapon_name_input").value;

    // retrieve enemy data
    const weaponTemp = data.find((e) => e.name == weaponSelected);

    // convert from the DB
    weapon = {
        "attack_speed": weaponTemp.fireRate || 0,
        "wind_up": weaponTemp.windUp || 0,
        "critical_chance": weaponTemp.criticalChance || 0,
        "critical_damage": weaponTemp.criticalMultiplier || 0,
        "status": weaponTemp.procChance || 0,
        "initial_combo": weaponTemp.whateveritscalled || 0, // TODO
        "combo_duration": weaponTemp.comboDuration || 0,
        "combo_efficiency": weaponTemp.whateveritscalled || 0, // TODO
        "riven_disposition": weaponTemp.omegaAttenuation || 0,

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
             "void_dmg": weaponTemp.damage.void || 0,
         }
    };

    displayWeaponStats(weapon, 1);

    // TODO save from the loaded weapon, not from the parse bruh
    saveWeapon();
}

function displayWeaponStats(weapon_to_display, column = 2) { // column 1 for base, 2 for modded stats
    document.getElementById("attack_speed").cells[column].innerText = formatDecimals(weapon_to_display.attack_speed, 3);
    document.getElementById("wind_up").cells[column].innerText = formatSecond(weapon_to_display.wind_up);
    document.getElementById("critical_chance").cells[column].innerText = formatPercent(weapon_to_display.critical_chance);
    document.getElementById("critical_damage").cells[column].innerText = formatMultiplier(weapon_to_display.critical_damage);
    document.getElementById("status").cells[column].innerText = formatPercent(weapon_to_display.status);
    document.getElementById("initial_combo").cells[column].innerText = formatAdditive(weapon_to_display.initial_combo);
    document.getElementById("combo_duration").cells[column].innerText = formatSecond(weapon_to_display.combo_duration);
    document.getElementById("combo_efficiency").cells[column].innerText = formatPercent(weapon_to_display.combo_efficiency);

    let crit_table = document.getElementById("crit_tier").cells;
    for(let i = 1; i < crit_table.length; i++) {
        let value = weapon_to_display.critical_chance + weapon.critical_chance * weapon_to_display.critical_chance_per_combo * (i - 1);
        crit_table[i].innerText = formatPercent(value);
    }
    let status_table = document.getElementById("status_tier").cells;
    for(let i = 1; i < status_table.length; i++) {
        let value = weapon_to_display.status + weapon.status * weapon_to_display.status_per_combo * (i - 1);
        status_table[i].innerText = formatPercent(value);
    }

    document.getElementById("riven_disposition_input").value = formatDecimals(weapon_to_display.riven_disposition, 3);
    document.getElementById("riven_disposition_meter").value = weapon_to_display.riven_disposition;

    for (const [key, value] of Object.entries(weapon_to_display.damage_types)) {
        let cell = document.getElementById(key)?.cells[column];
        if(cell){
            cell.innerText = formatDecimals(value, 1);
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
const weapon_type_list = document.getElementById("weapon_subclass");
Object.keys(melee_weapon_types).forEach(function (e) {
    const option = document.createElement('option');
    option.text = e;
    weapon_type_list.appendChild(option);
});

function updateModding() {
    if(!weapon) return;
    mods_buffs_cpp = Module.passVectorModBuffs(mods.map((mod) => {
        let mod_new = {"name": mod.name}
        for (let stat_line of mod.stats) {
            const parsed_value = Number(stat_line.value.replace("%", "E-2"));
            if (stat_line.stat in default_damage_types) {
                mod_new["damage_types"] ??= default_value(default_damage_types, {})
                mod_new["damage_types"][stat_line.stat] = parsed_value;
            } else {
                mod_new[stat_line.stat] = parsed_value;
            }
        }
        return default_value(default_modbuff, mod_new);
    }));

    // TODO calculate and display updated modded stats
    // FIXME not only the first enemy
    displayWeaponStats(calculateModding(weapon, mods_buffs_cpp, enemies), 2);
}

function saveWeapon() {
    // TODO this thing
    // there is an issue between saving from weapon (except editable stats) and saving from edited fields (formated values)

    document.getElementById("riven_disposition_meter").value = document.getElementById("riven_disposition_input").value;

    weapon = {
        "attack_speed": document.getElementById("attack_speed").cells[1].innerText,
        "wind_up": document.getElementById("wind_up").cells[1].innerText,
        "critical_chance": document.getElementById("critical_chance").cells[1].innerText,
        "critical_damage": document.getElementById("critical_damage").cells[1].innerText,
        "status": document.getElementById("status").cells[1].innerText,
        "initial_combo": document.getElementById("initial_combo").cells[1].innerText,
        "combo_duration": document.getElementById("combo_duration").cells[1].innerText,
        "combo_efficiency": document.getElementById("combo_efficiency").cells[1].innerText,
        "riven_disposition": document.getElementById("riven_disposition_input").value,
        "max_combo": 12,

        "damage_types": default_value(default_damage_types, {
            "impact": document.getElementById("impact").cells[1].innerText,
            "puncture": document.getElementById("puncture").cells[1].innerText,
            "slash": document.getElementById("slash").cells[1].innerText,

            "cold": document.getElementById("cold").cells[1].innerText,
            "electricity": document.getElementById("electricity").cells[1].innerText,
            "heat": document.getElementById("heat").cells[1].innerText,
            "toxin": document.getElementById("toxin").cells[1].innerText,

            "blast": document.getElementById("blast").cells[1].innerText,
            "corrosive": document.getElementById("corrosive").cells[1].innerText,
            "gas": document.getElementById("gas").cells[1].innerText,
            "magnetic": document.getElementById("magnetic").cells[1].innerText,
            "radiation": document.getElementById("radiation").cells[1].innerText,
            "viral": document.getElementById("viral").cells[1].innerText,
            "void_dmg": document.getElementById("void_dmg").cells[1].innerText,
        })
    };

    // remove the % and shit
    for (const [key, value] of Object.entries(weapon)) {
        if (key != "damage_types") {
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

    weaponModded.initial_combo = finalStats.initial_combo;
    weaponModded.combo_duration = finalStats.combo_duration;
    weaponModded.combo_efficiency = finalStats.combo_efficiency;
    weaponModded.critical_chance_per_combo = finalStats.critical_chance_per_combo;
    weaponModded.status_per_combo = finalStats.status_per_combo;

    weaponModded.damage_types = finalStats.displayed_damage_types;

    return weaponModded;
}

function contentEditable(table) {
    for (const row of document.getElementById(table).rows) {
        const c = row.cells[1];
        if (c == null) {
            continue;
        }

        c.setAttribute("contenteditable", "true");

        c.addEventListener('input',
            function () { // no idea why you need that empty function but ok
                saveWeapon()
            }
        );
    }
}

function statColoring(table) {
    const b = document.getElementById(table).rows;
    for (let i = 0; i < b.length; i++) {
        const c = b[i].cells;
        if (c.length < 3) {
            continue;
        }

        const oldVal = parseFloat(c[1].innerText.replace(",", ""));
        const newVal = parseFloat(c[2].innerText.replace(",", ""));
        const isBuff = oldVal < newVal;
        const isNerf = oldVal > newVal;
        c[2].classList.toggle("mod_buff", isBuff);
        c[2].classList.toggle("mod_nerf", isNerf);
    }
}

contentEditable("stats_damage");
contentEditable("stats");

function hideEmptyRows(table) {
    displayRows("stats_damage", false);
    displayRows("stats", false);
}

function displayAllRows(table) {
    displayRows("stats_damage", true);
    displayRows("stats", true);
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

        if (display || parseFloat(cells[1].innerText) || parseFloat(cells[2].innerText)) {
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