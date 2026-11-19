import * as api from "./proxy.js"

class RequestInFlightError extends Error {
    constructor() {
        this.name = "RequestInFlightError"
    }
}

function requestProxy(api) {
    let busy = false;

    return new Proxy(api, {
        get(target, property) {
            const original = target[property]
            
            if(typeof(original) != "function") {
                return original
            }

            return async (...args) => {
                if(busy) {
                    throw new RequestInFlightError()
                }

                busy = true;

                try {
                    await original.apply(target, args)
                } finally {
                    busy = false;
                }
            }
        }
    })
}

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

function imgTag(src) {
    let img = eCreate("img")
    img.src = src
    return img
}

async function monsterDisplay(monster_id, bordered = false) {
    let monster = await proxy.getMonster(monster_id)
    let div = document.createElement("div", bordered ? ["bordered"] : []);
    div.style.display = "flex";
    div.style.flexDirection = "column";
    div.style.alignItems = "center";
    div.appendChild(imgTag(monster.image_url));
    let txt = eCreate("span")
    txt.innerText = monster.name
    div.appendChild(txt);
    return div
}

function monsterDisplayNoReq(monster) {
    let div = document.createElement("div", ["bordered"]);
    div.style.display = "flex";
    div.style.flexDirection = "column";
    div.style.alignItems = "center";
    div.appendChild(imgTag(monster.image_url));
    let txt = eCreate("span")
    txt.innerText = monster.name
    div.appendChild(txt);
    return div
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

class MonsterSpecies {
    constructor(
        id,
        name,
        image_url,
        element,
        rarity
    ) {
        this.id                = id;
        this.name              = name
        this.image_url         = image_url
        this.element           = element
        this.rarity            = rarity
        id_to_species[this.id] = this
    }
}

class Monster {
    owned_id;
    monster_id;

    static fromJson(obj) {
        let mons = new Monster()
        mons.owned_id   = obj.owned_id
        mons.monster_id = obj.monster_id 
        return mons
    }

    toJson() {
        return JSON.stringify(this)
    }

    isNull() {
        return false;
    }
}

class OwnedMonster extends Monster {
    source;
    obtained_at;

    static fromJson(obj) {
        let omons = new OwnedMonster()
        omons.owned_id    = obj.owned_id
        omons.monster_id  = obj.monster_id
        omons.source      = obj.source
        omons.obtained_at = obj.obtained_at
        return omons
    }

    toJson() {
        return JSON.stringify(this)
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
    id
    name
    members
    created_at
    updated_at

    setMonster(i, monster) {
        if(i < 0 || i > 2) {
            return;
        }
        this.members[i] = monster
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

class Screen {
    constructor(selector) {
        this.element = document.querySelector(selector)
        this.set("error_label", ".err-label")
        this.hide()
    }

    set(name, selector) {
        this[name] = this.element.querySelector(selector)
    }

    async onShow() {}

    async show() {
        await this.onShow()
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
    #navigation_locked = false;
    #history = [];
    #current_screen;

    constructor(starting_screen) {
        this.#current_screen = starting_screen;
    }

    async changeTo(screen) {
        if(this.#navigation_locked) {
            return;
        }
        this.#navigation_locked = true;
        try {
            await screen.show()
            this.#current_screen.hide()
            this.#history.push(this.#current_screen)
            this.#current_screen = screen
        } catch(error) {

        } finally {
            this.#navigation_locked = false;
        }
    }

    previous() {
        if(this.#history.length == 0 || this.#navigation_locked) {
            return;
        }
        this.#current_screen.hide()
        this.#current_screen = this.#history.pop()
        this.#current_screen.resume()
    }

    async previousReload() {
        if(this.#history.length == 0 || this.#navigation_locked) {
            return;
        }
        try {
            await this.#history[this.#history.length-1].show()
            this.#current_screen.hide()
            this.#current_screen = this.#history.pop()
        } catch(error) {

        }
    }

    clearHistory() {
        this.#history = []
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

let proxy = requestProxy(api)

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

await screens.login.show();
  
let transitions = new ScreenTransitions(screens.login)
document.querySelectorAll("button.back-btn").forEach((v)=>{v.addEventListener("click", ()=>{transitions.previous()})})

function standardErrorHandling(screen, err) {
    if(typeof(err) == RequestInFlightError) {
        return;
    }
    if(typeof(err) == api.ApiError) {
        if(err.status === api.HTTP_UNAUTHORIZED) {
            screen.error_label.innerText = ""
            transitions.changeTo(screens.login)
            transitions.clearHistory()
            return;
        }
    }
    screen.error_label.innerText = err.message
}

/**************/
/*LOGIN SCREEN*/
/**************/
screens.login.set("pwd_ipt", "input#pwd-ipt")
screens.login.set("usrname_ipt", "input#usrname-ipt")
screens.login.set("error_text", "div#error_text")
screens.login.set("login_btn", "button#login-btn")
screens.login.set("register_btn", "button#register-btn")

async function login_callback() {
    try {
        await proxy.login(screens.login.usrname_ipt.value, screens.login.pwd_ipt.value)
        await transitions.changeTo(screens.main)
    } catch(err) {
        if(typeof(err) == RequestInFlightError) {
            return;
        }
        screens.login.error_label.innerText = err.message
    }
}

async function register_callback() {
    try{
        //Ignore value for now
        await proxy.register(screens.login.usrname_ipt.value, screens.login.pwd_ipt.value)
    } catch {
        if(typeof(err) == RequestInFlightError) {
            return;
        }
        screens.login.error_label.innerText = err.message
    }
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
screens.main.set("bestiary", "button#bestiary-btn")

async function coll_btn_callback() {
    try{
        await transitions.changeTo(screens.collection)
    } catch(err) {
        standardErrorHandling(screens.main, err)
    }
}

async function team_btn_callback() {
    try {
        await transitions.changeTo(screens.teams)
    } catch(err) {
        standardErrorHandling(screens.main, err)
    }
}

async function enc_btn_callback() {
    try {
        await transitions.changeTo(screens.encounters)
    } catch(err) {
        standardErrorHandling(screens.main, err)
    }
}

async function hist_btn_callback() {
    try {
        await transitions.changeTo(screens.history)
    } catch(err) {
        standardErrorHandling(screens.main, err)
    }
}

async function logout_btn_callback() {
    try {
        await proxy.logout()
    } catch(err) {
        standardErrorHandling(screens.main, err)
    } finally {
        await transitions.changeTo(screens.login)
    }
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
screens.collection.onShow = async function() {
    let collection = JSON.parse(await proxy.getCollection())

    this.table.remove()

    this.table = eCreate("table", [], "coll-tab")
    for(let monster of collection){
        addCollRow(this.table, monster)
    }
    this.element.appendChild(this.table)
}

async function addCollRow(table, monster) {
    let tr = document.createElement("tr")
    let td = document.createElement("td")
    let mdisp = await monsterDisplay(monster.monster_id)
    td.appendChild(mdisp)
    tr.appendChild(td)
    tr.addEventListener("click", collRowClickFnGen(monster.monster_id))
    table.appendChild(tr)
}

function collRowClickFnGen(monster_id) {
    return async()=>{
        screens.monster_details.set_monster_id(monster_id)
        try {
            await transitions.changeTo(screens.monster_details)
        } catch(err) {
            standardErrorHandling(screens.collection, err)
        }
    }
}

/*********************/
/*MONSTER INFO SCREEN*/
/*********************/
MONSTER_OWNED_DETAILS   = 0;
MONSTER_GENERIC_DETAILS = 1;
screens.monster_details.set("img_container","div.img-container")
screens.monster_details.set("name_container","div.name-container")
screens.monster_details.set("stats_container","div.stats-container")
screens.monster_details.set_monster_id = function(monster_id){
    this.monster_id = monster_id
}
screens.monster_details.onShow = async function() {
    let monster = JSON.parse(await proxy.getMonster(this.monster_id))

    this.img_container.remove()
    this.name_container.remove()
    this.stats_container.remove()

    this.img_container   = eCreate("div", ["img-container"])
    this.name_container  = eCreate("div", ["name-container"])
    this.stats_container = eCreate("div", ["stats-container"])

    let img = imgTag(monster.image_url)
    let tab = eCreate("table")
    this.img_container.appendChild(img)
    this.name_container.innerText = monster.name

    for(let stat of Object.keys(monster.stats)) {
        let tr         = eCreate("tr")
        let [td1, td2] = eCreateM("td", 2)
        td1.innerText  = stat
        td2.innerText  = monster.stats[stat]
        appendAllChildren(tr, [td1, td2])
        tab.appendChild(tr)
    }
    this.stats_container.appendChild(tab)

    appendAllChildren(this.element, [this.img_container, this.name_container, this.stats_container])
}

/**************/
/*TEAMS SCREEN*/
/**************/
screens.teams.set("new_team_btn", "button#new-team-btn")
screens.teams.set("table", "table#team-table")
screens.teams.onShow = async function() {
    let teams;
    teams = await proxy.getTeams()

    this.table.remove()

    this.table = eCreate("table", ["no-b"], "team-table")
    for(let team of teams) {
        console.log(team)
        add_team_to_table(this.table, team)
    }
    this.element.appendChild(this.table)
}

async function add_team_to_table(table, team) {
    let tr = document.createElement("tr")
    for(const { monster_id } of team.members) {
        let td = document.createElement("td");
        td.classList.add("no-b")
        let div = await monsterDisplay(monster_id)
        td.appendChild(div);
        tr.appendChild(td);
    }
    tr.addEventListener("click", team_editor_callback(team))
    table.appendChild(tr);
}

function team_editor_callback(team) {
    return async() => {
        screens.team_editor.set_team(team)
        try {
            await transitions.changeTo(screens.team_editor)
        } catch(err) {
            standardErrorHandling(screens.teams, err)
        }
    }
}

screens.teams.new_team_btn.addEventListener("click", ()=>{team_editor_callback({team_id: null, team_name: "", members: []})()})

/*************/
/*TEAM EDITOR*/
/*************/
screens.team_editor.set_team = function(team){
    this.team_id = team.team_id;
    this.team_name = team.name;
    this.selected = [];
    for(let m of team.members) {
        this.selected.push(m.owned_id)
    }
}

screens.team_editor.onShow = async function() {
    let coll = await proxy.getCollection()
    this.team_name_ipt.value = this.team_name

    this.table.remove()

    this.table = eCreate("table", ["no-b"], "team-selector-table")
    let tr = null
    for(let i = 0; i < coll.length; i++) {
        if(i%7 == 0) {
            if(tr != null) {
                this.table.appendChild(tr)
            }
            tr = eCreate("tr", ["no-b"])
        }
        let td = eCreate("td", ["no-b"])
        let {monster_id, owned_id} = coll[i]
        let div = await monsterDisplay(monster_id, true)
        td.appendChild(div)
        if(this.members.indexOf(owned_id) != -1) {
            div.classList.add(["selected"])
        }
        td.addEventListener("click", ()=>{
            let idx = this.selected.indexOf(owned_id)
            if(idx != -1) {
                this.selected = this.selected.filter((_,i)=>{return i!=idx})
                div.classList.toggle("selected")
            } else if(this.selected.length < 3){
                div.classList.toggle("selected")
                this.selected.push(owned_id)
            }
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

async function save_btn_callback() {
    let name = this.team_name_ipt.value
    let obj = {name, members: this.selected}
    try {
        if(this.team_id == null) {
            await proxy.createTeam(obj)
        } else {
            await proxy.editTeam(this.team_id, obj)
        }
        await transitions.previousReload()
    } catch(err) {
        standardErrorHandling(this, err)
    }
}

screens.team_editor.save_btn.addEventListener("click", save_btn_callback.bind(screens.team_editor))
/*********/
/*HISTORY*/
/*********/
screens.history.set("table", "table#history-table")
screens.history.onShow = async function(){
    let hist = await proxy.getHistory()

    this.table.remove()

    this.table = eCreate("table", ["no-b"], "history-table")
    for(const {encounter_name, status, ended_at, reward_monster_id} of hist) {
        let tr = eCreate("tr")

        let enc_name       = eCreate("td", ["b-r"])
        let st             = eCreate("td", ["b-r"])
        let e_at           = eCreate("td", ["b-r"])
        let rmonster       = eCreate("td", ["b-r"])

        enc_name.innerText = encounter_name
        st.innerText       = status
        e_at.innerText     = ended_at

        rmonster.appendChild(await monsterDisplay(reward_monster_id))

        appendAllChildren(tr, [enc_name, st, e_at, rmonster])
        
        this.table.appendChild(tr)
    }
    this.element.appendChild(this.table)
}


/************/
/*ENCOUNTERS*/
/************/
screens.encounters.set("table", "table#encounters-table")
screens.encounters.set("selector", "select#encounter-team-selector")
screens.encounters.onShow = async function() {
    let teams = await proxy.getTeams()
    let encounters = await proxy.getEncounters()

    this.table.remove()
    this.selector.remove()

    this.selector = eCreate("select")
    for(let team of teams) {
        let opt = eCreate("option")
        opt.innerText = team.name
        opt.value     = team.id
        this.selector.appendChild(opt)
    }

    this.table = eCreate("table", ["no-b"], "encounters-table")
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

        tr.addEventListener("click", async ()=>{
                let team_id = this.selector.selectedOptions[0].value
                let enc_id  = encounter.encounter_id
                screens.encounter_resolution.set_team_id(team_id)
                screens.encounter_resolution.set_encounter_id(enc_id)
                await transitions.changeTo(screens.encounter_resolution)
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
screens.encounter_resolution.onShow = async function() {
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