import * as api from "./api.js"

function eCreate(element, classlist = [], id = "") {
    let el = document.createElement(element)
    for(let cls of classlist) {
        el.classList.add(cls)
    }
    el.id =  id
    return el
}

function eCreateM(element, count, classlist = [], id = "") {
    let ls = []
    for(let i = 0; i < count; i++) {
        ls.push(eCreate(element, classlist, id))
    }
    return ls
}

function appendAllChildren(el, children) {
    for(let child of children) {
        el.appendChild(child)
    }
}

class HistorySummary {
    constructor(run_id = "", encounter_id = "", encounter_name = "", status = "", ended_at = "", reward_monster_id = "") {
        this.run_id            = run_id
        this.encounter_id      = encounter_id
        this.encounter_name    = encounter_name
        this.status            = status
        this.ended_at          = ended_at
        this.reward_monster_id = reward_monster_id
    }
}

class Monster {
    constructor(id, img) {
        this.id  = id
        this.img = img
    }

    displayedAttrs() {
        let spn = document.createElement("span")
        spn.innerText = this.id
        return [spn, placeholderImg(100, 100)]
    }

    isNull() {
        return false;
    }
}

class NullMonster extends Monster {
    constructor() {
        super("", null)
    }

    displayedAttrs() {
        let spn = document.createElement("span");
        spn.innerText("None")
        return [document.createElement("span"), spn]
    }

    isNull() {
        return true;
    }
}

class Team {
    constructor() {
        this.monsters = [new NullMonster(),new NullMonster(),new NullMonster()]
        this.id       = null
        this.name = ""
    }

    setMonster(i, monster) {
        if(i < 0 || i > 2) {
            return;
        }
        this.monsters[i] = monster
        return this
    }

    setId(id) {
        this.id = id
        return this
    }

    setName(name) {
        this.name = name
        return this
    }

    isNew() {
        return this.id == null
    }
}

class Encounter {
    constructor(
        encounter_id,
        name,
        description,
        difficulty,
        wild_monster_id, 
        reward_monster_id,
        max_team_size,
        available
    ) {
        this.encounter_id      = encounter_id
        this.name              = name
        this.description       = description
        this.difficulty        = difficulty
        this.wild_monster_id   = wild_monster_id
        this.reward_monster_id = reward_monster_id
        this.max_team_size     = max_team_size
        this.available         = available
    }
}


/*There needs to be a system to stop the user from spamming buttons (= sending too many requests) and breaking the ui:
    - Click events disabled after a request gets sent (and reenabled when it finishes)
    - Some kind of intermidiate Request class that only handles one requests and rejects all others until it is done
*/
class Screen {
    constructor(selector) {
        this.element = document.querySelector(selector)
        this.hide()
    }

    set(name, selector) {
        this[name] = this.element.querySelector(selector)
    }

    onShow() {}

    show() {
        this.onShow()
        this.resume()
    }

    resume() {
        this.element.classList.remove(["hidden"])
    }

    hide() {
        this.element.classList.add(["hidden"])
    }
}

class ScreenTransitions {
    constructor(starting_screen) {
        this.current_screen = starting_screen;
        this.history = [];
    }

    changeTo(screen) {
        this.current_screen.hide()
        this.history.push(this.current_screen)
        screen.show()
        this.current_screen = screen;
    }

    previous() {
        if(this.history.length == 0) {
            return;
        }
        this.current_screen.hide()
        this.current_screen = this.history.pop()
        this.current_screen.resume()
    }

    previousReload() {
        if(this.history.length == 0) {
            return;
        }
        this.current_screen.hide()
        this.current_screen = this.history.pop()
        this.current_screen.show()
    }

    clearHistory() {
        this.history = []
    }
}

function placeholderImg(w, h) {
    let img = document.createElement("img")
    img.width = w
    img.height = h
    img.src = "./testing/placeholder.png"
    return img
}

// TEST FUNCTIONS

let TEST_COLLECTION = []
for(let i = 0; i < 100; i++) {
    TEST_COLLECTION.push(new Monster((99999+i).toString(16)))
}

function getCollection() {
    return TEST_COLLECTION
}

let TEST_TEAMS = []
for(let i = 0; i < 100; i++) {
    let team = new Team();
    team.setName(i.toString())
    team.setMonster(0, new Monster((99999+(i*3)).toString(16)))
    team.setMonster(1, new Monster((99999+(i*3+1)).toString(16)))
    team.setMonster(2, new Monster((99999+(i*3+2)).toString(16)))
    team.id = i
    TEST_TEAMS.push(team)
}

function getTeams() {
    return TEST_TEAMS
}

let TEST_HISTORY_SUMMARIES = []
for(let i = 0; i < 100; i++) {
    TEST_HISTORY_SUMMARIES.push(new HistorySummary(
        (99999+(i*6)).toString(16),
        (99999+(i*6+1)).toString(16),
        (99999+(i*6+2)).toString(16),
        (99999+(i*6+3)).toString(16),
        (99999+(i*6+4)).toString(16),
        (99999+(i*6+5)).toString(16)
    ))
}

function getHistorySummaries() {
    return TEST_HISTORY_SUMMARIES
}

let TEST_ENCOUNTERS = []
for(let i = 0; i < 100; i++) {
    TEST_ENCOUNTERS.push(
        new Encounter(
            (99999+(i*5)+1).toString(16),
            (99999+(i*5)+2).toString(16),
            (99999+(i*5)+3).toString(16),
            i%3,
            (99999+(i*5)+4).toString(16),
            (99999+(i*5)+5).toString(16),
            i%10,
            true
        )
    )
}

function getEncounters() {
    return TEST_ENCOUNTERS
}

function resolveEncounter() {
    let v = Math.random()
    if(v > 0.5) {
        return true
    }
    return false
}

// END TEST FUNCTIONS

let screens = {}
screens.login                = new Screen("section#login")
screens.main                 = new Screen("section#main")
screens.collection           = new Screen("section#collection")
screens.teams                = new Screen("section#teams")
screens.team_editor          = new Screen("section#team-editor")
screens.encounters           = new Screen("section#encounters")
screens.history              = new Screen("section#history")
screens.monster_details      = new Screen("section#monster-details")
screens.encounter_resolution = new Screen("section#encounter-resolution")

screens.login.show();
  
let transitions = new ScreenTransitions(screens.login)
document.querySelectorAll("button.back-btn").forEach((v)=>{v.addEventListener("click", ()=>{transitions.previous()})})


/**************/
/*LOGIN SCREEN*/
/**************/
screens.login.set("pwd_ipt", "input#pwd-ipt")
screens.login.set("usrname_ipt", "input#usrname-ipt")
screens.login.set("error_text", "div#error_text")
screens.login.set("login_btn", "button#login-btn")
screens.login.set("register_btn", "button#register-btn")

function login_callback() {
    //TODO: ACTUAL API CALLS
    transitions.changeTo(screens.main)
}

function register_callback() {
    //TODO: ACTUAL API CALLS
}

screens.login.login_btn.addEventListener("click", login_callback)
screens.login.register_btn.addEventListener("click", register_callback)

/*************/
/*MAIN SCREEN*/
/*************/
screens.main.set("coll_btn", "button#coll-btn")
screens.main.set("team_btn", "button#team-btn")
screens.main.set("enc_btn", "button#enc-btn")
screens.main.set("hist_btn", "button#hist-btn")
screens.main.set("logout_btn", "button#logout-btn")

function coll_btn_callback() {
    //TODO: ACTUAL API CALLS
    transitions.changeTo(screens.collection)
}

function team_btn_callback() {
    //TODO: ACTUAL API CALLS
    transitions.changeTo(screens.teams)
}

function enc_btn_callback() {
    //TODO: ACTUAL API CALLS
    transitions.changeTo(screens.encounters)
}

function hist_btn_callback() {
    //TODO: ACTUAL API CALLS
    transitions.changeTo(screens.history)
}

function logout_btn_callback() {
    //TODO: ACTUAL API CALLS
}

screens.main.coll_btn.addEventListener("click", coll_btn_callback)
screens.main.team_btn.addEventListener("click", team_btn_callback)
screens.main.enc_btn.addEventListener("click", enc_btn_callback)
screens.main.hist_btn.addEventListener("click", hist_btn_callback)
screens.main.logout_btn.addEventListener("click", logout_btn_callback)


/*******************/
/*COLLECTION SCREEN*/
/*******************/
screens.collection.set("table", "table#coll-tab")
screens.collection.onShow = function() {
    let collection = getCollection()
    this.element.removeChild(this.table)
    this.table = eCreate("table", [], "coll-tab")
    for(let monster of collection){
        addCollRow(this.table, monster)
    }
    this.element.appendChild(this.table)
}

function addCollRow(table, monster) {
    let tr = document.createElement("tr")
    for (let attr of monster.displayedAttrs()) {
        let td = document.createElement("td");
        td.appendChild(attr)
        tr.appendChild(td)
    }
    tr.addEventListener("click", collRowClickFnGen(monster))
    table.appendChild(tr)
}

function collRowClickFnGen(monster) {
    return ()=>{
        screens.monster_details.set_monster(monster)
        transitions.changeTo(screens.monster_details)
    }
}

/*********************/
/*MONSTER INFO SCREEN*/
/*********************/
screens.monster_details.set("img_container","div.img-container")
screens.monster_details.set("name_container","div.name-container")
screens.monster_details.set("stats_container","div.stats-container")
screens.monster_details.set_monster = function(monster){
    while(this.img_container.firstChild) {
        this.img_container.removeChild(this.img_container.lastChild)
    }
    while(this.name_container.firstChild) {
        this.name_container.removeChild(this.name_container.lastChild)
    }
    let a = monster.displayedAttrs()
    this.img_container.appendChild(a[1])
    this.name_container.appendChild(a[0])
}

/**************/
/*TEAMS SCREEN*/
/**************/
screens.teams.set("new_team_btn", "button#new-team-btn")
screens.teams.set("table", "table#team-table")
screens.teams.onShow = function() {
    this.element.removeChild(this.table)
    this.table = eCreate("table", ["no-b"], "team-table")
    let teams = getTeams()
    for(let team of teams) {
        console.log(team)
        add_team_to_table(this.table, team)
    }
    this.element.appendChild(this.table)
}

function add_team_to_table(table, team) {
    let tr = document.createElement("tr")
    for(let monster of team.monsters) {
        let td = document.createElement("td");
        td.classList.add("no-b")
        let div = document.createElement("div");
        div.style.display = "flex";
        div.style.flexDirection = "column";
        div.style.alignItems = "center";
        let a = monster.displayedAttrs()
        div.appendChild(a[1]);
        div.appendChild(a[0]);
        td.appendChild(div);
        tr.appendChild(td);
    }
    tr.addEventListener("click", team_editor_callback(team))
    table.appendChild(tr);
}

function team_editor_callback(team) {
    return () => {
        screens.team_editor.set_team(team)
        transitions.changeTo(screens.team_editor)
    }
}

screens.teams.new_team_btn.addEventListener("click", ()=>{team_editor_callback(new Team())()})

/*************/
/*TEAM EDITOR*/
/*************/
screens.team_editor.set_team = function(team){this.team = team; this.selected = []}
screens.team_editor.onShow = function() {
    this.team_name_ipt.value = this.team.name
    this.element.removeChild(this.table)
    this.table = eCreate("table", ["no-b"], "team-selector-table")
    let coll = getCollection()
    let tr = null
    for(let i = 0; i < coll.length; i++) {
        if(i%7 == 0) {
            if(tr != null) {
                this.table.appendChild(tr)
            }
            tr = eCreate("tr", ["no-b"])
        }
        let td = eCreate("td", ["no-b"])
        let div = eCreate("div", ["bordered"]);
        div.style.display = "flex";
        div.style.flexDirection = "column";
        div.style.alignItems = "center";
        let monster = coll[i]
        let a = monster.displayedAttrs()
        div.appendChild(a[1]);
        div.appendChild(a[0]);
        td.appendChild(div)
        td.addEventListener("click", ()=>{
            let idx = this.selected.indexOf(monster)
            if(idx != -1) {
                this.selected = this.selected.filter((_,i)=>{return i!=idx})
                div.classList.toggle("selected")
            } else if(this.selected.length < 3){
                div.classList.toggle("selected")
                this.selected.push(monster)
            }
            console.log(this.selected)
        })
        tr.appendChild(td)
    }
    this.table.appendChild(tr)
    this.element.appendChild(this.table)
}
screens.team_editor.selected = []
screens.team_editor.set("save_btn", "button#save-team-btn")
screens.team_editor.set("team_name_ipt", "input#team-name-ipt")
screens.team_editor.set("table", "table#team-selector-table")


/*********/
/*HISTORY*/
/*********/
screens.history.set("table", "table#history-table")
screens.history.onShow = function(){
    this.element.removeChild(this.table)
    this.table = eCreate("table", ["no-b"], "history-table")
    let hist = getHistorySummaries()
    for(let hist_summ of hist) {
        let tr = eCreate("tr")

        let enc_name       = eCreate("td", ["b-r"])
        let status         = eCreate("td", ["b-r"])
        let ended_at       = eCreate("td", ["b-r"])
        let reward_monster = eCreate("td", ["b-r"])

        enc_name.innerText = hist_summ.encounter_name
        status.innerText   = hist_summ.status
        ended_at.innerText = hist_summ.ended_at

        reward_monster.appendChild(placeholderImg(100,100))

        appendAllChildren(tr, [enc_name, status, ended_at, reward_monster])
        
        this.table.appendChild(tr)
    }
    this.element.appendChild(this.table)
}


/************/
/*ENCOUNTERS*/
/************/
screens.encounters.set("table", "table#encounters-table")
screens.encounters.set("selector", "select#encounter-team-selector")
screens.encounters.onShow = function() {
    this.element.removeChild(this.table)
    this.element.removeChild(this.selector)

    this.selector = eCreate("select")
    let teams = getTeams()
    for(let team of teams) {
        let opt = eCreate("option")
        opt.innerText = team.name
        opt.value     = team.id
        this.selector.appendChild(opt)
    }

    this.table = eCreate("table", ["no-b"], "encounters-table")
    let encounters = getEncounters()
    for(let encounter of encounters) {
        let tr = eCreate("tr")

        let [
            name,
            description,
            difficulty,
            wild_monster_id, 
            reward_monster_id,
            max_team_size
        ] = eCreateM("td", 6, ["no-b"])

        name.innerText          = encounter.name
        description.innerText   = encounter.description
        difficulty.innerText    = encounter.difficulty.toString(10)
        wild_monster_id.appendChild(placeholderImg(100,100))
        reward_monster_id.appendChild(placeholderImg(100,100))
        max_team_size.innerText = encounter.max_team_size.toString(10)

        appendAllChildren(tr, [
            name,
            description,
            difficulty,
            wild_monster_id, 
            reward_monster_id,
            max_team_size
        ])

        tr.addEventListener("click", ()=>{
                let team_id = this.selector.selectedOptions[0].value
                let enc_id  = encounter.encounter_id
                screens.encounter_resolution.set_team_id(team_id)
                screens.encounter_resolution.set_encounter_id(enc_id)
                transitions.changeTo(screens.encounter_resolution)
            })

        this.table.appendChild(tr)
    }
    this.element.appendChild(this.selector)
    this.element.appendChild(this.table)
}

/**********************/
/*ENCOUNTER RESOLUTION*/
/**********************/
screens.encounter_resolution.set("text", "div#resolution-text")
screens.encounter_resolution.set("backr_btn", "button.back-and-reload")
screens.encounter_resolution.set_team_id      = function(team_id) {this.team_id = team_id}
screens.encounter_resolution.set_encounter_id = function(enc_id) {this.encounter_id = enc_id}
screens.encounter_resolution.onShow = function() {
    this.backr_btn.classList.add(["hidden"])
    this.backr_btn.disabled = true
    this.text.innerText = "Resolving"
    let won = resolveEncounter()
    if(won) {
        this.text.innerText = "VICTORY!"
    } else {
        this.text.innerText = "DEFEAT!"
    }
    this.backr_btn.classList.remove(["hidden"])
    this.backr_btn.disabled = false
}

screens.encounter_resolution.backr_btn.addEventListener("click", ()=>{transitions.previousReload()})