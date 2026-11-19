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
    for(const cls of classlist) {
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
    const monster = await proxy.getMonster(monster_id)
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
    for(const child of children) {
        el.appendChild(child)
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
    const collection = await proxy.getCollection()

    this.table.remove()

    this.table = eCreate("table", [], "coll-tab")
    for(const monster of collection){
        addCollRow(this.table, monster)
    }
    this.element.appendChild(this.table)
}

async function addCollRow(table, monster) {
    let tr = document.createElement("tr")
    let td = document.createElement("td") 
    td.appendChild(await monsterDisplay(monster.monster_id))
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
    const monster = await proxy.getMonster(this.monster_id)

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

    for(const stat of Object.keys(monster.stats)) {
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
    const teams = await proxy.getTeams()

    this.table.remove()

    this.table = eCreate("table", ["no-b"], "team-table")
    for(const team of teams) {
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
    for(const { owned_id } of team.members) {
        this.selected.push(owned_id)
    }
}

screens.team_editor.onShow = async function() {
    const coll = await proxy.getCollection()
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
        const { monster_id, owned_id } = coll[i]
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
    const name = this.team_name_ipt.value
    const obj = {name, members: this.selected}
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
    const hist = await proxy.getHistory()

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
    const teams      = await proxy.getTeams()
    const encounters = await proxy.getEncounters()

    this.table.remove()
    this.selector.remove()

    this.selector = eCreate("select")
    for(const { team_id, name } of teams) {
        let opt = eCreate("option")
        opt.innerText = name
        opt.value     = team_id
        this.selector.appendChild(opt)
    }

    this.table = eCreate("table", ["no-b"], "encounters-table")
    for(const { encounter_id, name, description, difficulty, wild_monster_id, reward_monster_id, max_team_size } of encounters) {
        let tr = eCreate("tr")

        let [
            name_e,
            description_e,
            difficulty_e,
            wild_monster_id_e, 
            reward_monster_id_e,
            max_team_size_e
        ] = eCreateM("td", 6, ["no-b"])

        name_e.innerText          = name
        description_e.innerText   = description
        difficulty_e.innerText    = difficulty.toString(10)
        wild_monster_id_e.appendChild(await monsterDisplay(wild_monster_id))
        reward_monster_id_e.appendChild(await monsterDisplay(reward_monster_id))
        max_team_size_e.innerText = max_team_size.toString(10)

        appendAllChildren(tr, [
            name_e,
            description_e,
            difficulty_e,
            wild_monster_id_e, 
            reward_monster_id_e,
            max_team_size_e
        ])

        tr.addEventListener("click", async ()=>{
                const team_id = this.selector.selectedOptions[0].value
                screens.encounter_resolution.set_team_id(team_id)
                screens.encounter_resolution.set_encounter_id(encounter_id)
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

    const { run_id }    = await proxy.startEncounter(this.encounter_id, {team_id: this.team_id})
    this.text.innerText = "Resolving"
    const { status }        = await proxy.resolveRun(run_id)
    if(status == "success") {
        this.text.innerText = "VICTORY!"
    } else if(status == "failure") {
        this.text.innerText = "DEFEAT!"
    } else if(status == "expired") {
        this.text.innerText = "EXPIRED"
    } else if(status == "abandoned") {
        this.text.innerText = "ABANDONED"
    }
    this.backr_btn.classList.remove(["hidden"])
    this.backr_btn.disabled = false
}

screens.encounter_resolution.backr_btn.addEventListener("click", ()=>{transitions.previousReload()})