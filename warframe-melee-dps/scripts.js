var enemies = [];
var current_enemy_row = 0;

function addEnemy() {
    enemies.push({});

    const penButton = document.createElement('button');
    penButton.classList.add('pen-button');
    penButton.textContent = '\u270E'; // Pen symbol unicode

    const enemy_container = document.getElementById('enemy_container');

    const rowIndex = enemy_container.children.length;

    const enemyDetails = document.createElement('tr');

    const enemy = document.createElement('td');
    enemy.id = "enemy_name";

    const mean = document.createElement('td');
    mean.classList.add('TTK_mean');
    mean.textContent = '0';

    const stdDev = document.createElement('td');
    stdDev.classList.add('TTK_std');
    stdDev.textContent = '0';

    enemyDetails.appendChild(penButton);
    enemyDetails.appendChild(enemy);
    enemyDetails.appendChild(mean);
    enemyDetails.appendChild(stdDev);

    enemy_container.appendChild(enemyDetails);

    penButton.addEventListener('click', function() {
        editEnemy(rowIndex);
    });

    //force open the dialog to edit instantly (avoid bugs with empty enemy)
    editEnemy(rowIndex);
}

function editEnemy(rowIndex) {
    current_enemy_row = rowIndex;
    const enemy = enemies[current_enemy_row];

    if(Object.keys(enemy).length !== 0) {
        // load saved fields in the dialog if enemy isnt empty
        document.getElementById("enemy_name_input").value = enemy.name;
        document.getElementById("health").value = enemy.health;
        document.getElementById("health_type").value = enemy.health_type;
        document.getElementById("armor").value = enemy.armor;
        document.getElementById("armor_type").value = enemy.armor_type;
        document.getElementById("shield").value = enemy.shield;
        document.getElementById("shield_type").value = enemy.shield_type;
        document.getElementById("level_base").value = enemy.level_base;
        document.getElementById("level_current").value = enemy.level_current;
        document.getElementById("faction").value = enemy.faction;
    }
    else{
        // reset all fields in the dialog if placeholder (reset from previous edited enemy)
        document.getElementById("editEnemy").reset()
    }

    document.getElementById("enemy_edit_dialog").showModal();
}

function loadEnemyStats() {
    const data_enemies = window.data_enemies;
    
    enemySelect = document.getElementById('enemy_name_input').value;
    document.getElementById('enemy_container').rows[current_enemy_row].cells[0].innerText = enemySelect;

    const enemy = data_enemies.find((e) => e.name == enemySelect);

    // read from the JSON
    document.getElementById("health").value = enemy.health;
    document.getElementById("health_type").value = enemy.resistances[2].type;
    document.getElementById("armor").value = enemy.armor;
    document.getElementById("armor_type").value = enemy.resistances[1].type;
    document.getElementById("shield").value = enemy.shield;
    document.getElementById("shield_type").value = enemy.resistances[0].type;
    // TODO document.getElementById("level_base").value = enemy.???;
    // TODO document.getElementById("level_current").value = enemy.???;
    document.getElementById("faction").value = enemy.type;
}

function saveEnemy() {
    enemies[current_enemy_row] = {
        "name" : document.getElementById("enemy_name").innerText,
        "health" : Number(document.getElementById("health").value),
        "health_type" : document.getElementById("health_type").value,
        "armor" : Number(document.getElementById("armor").value),
        "armor_type" : document.getElementById("armor_type").value,
        "shield" : Number(document.getElementById("shield").value),
        "shield_type" : document.getElementById("shield_type").value,
        "level_base" : Number(document.getElementById("level_base").value),
        "level_current" : Number(document.getElementById("level_current").value),
        "faction" : document.getElementById("faction").value,
    };
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
    sum_TTK_mean = 0;
    sum_TTK_std = 0;
    const enemies = document.getElementById('enemy_container').rows;

    for (var i = 0, enemy; enemy = enemies[i]; i++) {
        sum_TTK_mean += Number(enemy.cells[1].innerText);
        sum_TTK_std += Number(enemy.cells[2].innerText);
    };

    document.getElementById("TTK_average_mean").innerText = sum_TTK_mean / enemies.length;
    document.getElementById("TTK_average_std").innerText = sum_TTK_std / enemies.length;
}

/**
 * GRAPH
 */

const colors = {
    "gas":          "rgb(25, 120, 50)",
    "toxin":        "rgb(130, 200, 90)",
    "electricity":  "rgb(40, 190, 250)",
    "heat":         "rgb(240, 130, 40)",
    "slash":        "rgb(150, 0, 0)",
    "damage":       "rgb(120, 120, 120)",
};

const labels = {
    slash:"slash DoT", 
    heat:"heat DoT", electricity:"electricity DoT",
    toxin: "toxin DoT", gas: "gas DoT"
};

function CppToColumnar(dataraw) {
    //convert to JS array
    const data = new Array(dataraw.size()).fill(0).map((_, id) => dataraw.get(id))

    //transpose into a dictionnary with arrays on each key
    const header_cols = ["time", "damage", "slash", "heat", "electricity", "toxin", "gas"];
    const ret = {};
    for (let i = header_cols.length - 1;0<=i; i--) {
        ret[header_cols[i]] = data.map(row => row[i]);
    }
    return ret;
}

const enemy = {
    name: "Heavy Gunner",
    faction: "grineer",

    shield: 0,
    shield_resistance: "Neutral Shield",
    health: 300,
    health_resistance: "Cloned Flesh",
    armor: 500,
    armor_resistance: "Ferrite Armor",
};

function changeStats() {
    // TODO why only first enemy?
    const data = CppToColumnar(Module.stats(enemies[0]));

    for (const key in data) {
        data[key] = data[key].map(datum => Number(datum));// || undefined);
    }

    const time = data.time;
    delete data.time;
    
    const chart = document.getElementById('plotly');
    const configDefault = {
        x: time,
        type: 'histogram', //line //scatter //histogram
        //mode: 'lines',
        histfunc: 'sum', //count
        xbins: {size: 1.0},
        //fill: 'none', //tonexty //tozerox
        //stackgroup: 'one',
        hovertemplate: '%{x:.3f}s - %{y:.3s}',
        transforms: [{
            type: 'filter',
            target: 'y',
            operation: '>',
            value: 0
        }]
    }
    // creates an object for each column of the CSV
    const plotlyData = Object.entries(data).map(([name, data]) => ({
        y: data,
        name: labels[name] ?? name, //if not found, use the header
        marker: {color: colors[name]},
        //mode: 'lines+markers',
        //mode: 'markers',
        /*
        error_y: {
            type: 'data',
            array: data_error[name],
            visible: true
        },
        */
        ...configDefault,
    }));

    const layout = {
        xaxis: {
            //type: 'log',
            //autorange: true
        },
        yaxis: {
            range: [0, "auto"]
            //type: 'log',
            //autorange: true
        },
        barmode: "stack",
    };
    Plotly.newPlot(chart, plotlyData, layout, {
        displaylogo: false,
        displayModeBar: true,
    });
};