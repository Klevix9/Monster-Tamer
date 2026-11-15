import * as api from "./api.js"

function eCreate(element, classlist = [], id = "") {
    let el = document.createElement(element)
    for(let cls of classlist) {
        el.classList.add(cls)
    }
    el.id =  id
    return el
}

function appendAllChildren(el, children) {
    for(let child of children) {
        el.appendChild(child)
    }
}

class HistorySummary {
    constructor(run_id = "", encounter_id = "", encounter_name = "", status = "", ended_at = "", reward_monster_id = "") {
        this.run_id = run_id
        this.encounter_id = encounter_id
        this.encounter_name = encounter_name
        this.status = status
        this.ended_at = ended_at
        this.reward_monster_id = reward_monster_id
    }
}

class Monster {
    constructor(id, img) {
        this.id = id
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
        this.element.classList.remove(["section-hidden"])
    }

    hide() {
        this.element.classList.add(["section-hidden"])
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

let TEST_COLLECTION = []
for(let i = 0; i < 100; i++) {
    TEST_COLLECTION.push(new Monster((99999+i).toString(16)))
}

function getCollection() {
    return TEST_COLLECTION
}

let HISTORY_SUMMARIES = []
for(let i = 0; i < 100; i++) {
    HISTORY_SUMMARIES.push(new HistorySummary(
        (99999+(i*6)).toString(16),
        (99999+(i*6+1)).toString(16),
        (99999+(i*6+2)).toString(16),
        (99999+(i*6+3)).toString(16),
        (99999+(i*6+4)).toString(16),
        (99999+(i*6+5)).toString(16)
    ))
}

function getHistorySummaries() {
    return HISTORY_SUMMARIES
}

let screens = {}
screens.login           = new Screen("section#login")
screens.main            = new Screen("section#main")
screens.collection      = new Screen("section#collection")
screens.teams           = new Screen("section#teams")
screens.team_editor     = new Screen("section#team-editor")
screens.encounters      = new Screen("section#encounters")
screens.history         = new Screen("section#history")
screens.monster_details = new Screen("section#monster-details")

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
screens.teams.table.classList.add("no-b")

function add_team_to_table(team) {
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
    screens.teams.table.appendChild(tr);
}

for(let i = 0; i < 50; i++) {
    let team = new Team();
    team.setName(i.toString())
    team.setMonster(0, new Monster((99999+(i*3)).toString(16)))
    team.setMonster(1, new Monster((99999+(i*3+1)).toString(16)))
    team.setMonster(2, new Monster((99999+(i*3+2)).toString(16)))
    team.id = i
    add_team_to_table(team)
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

        let enc_name          = eCreate("td", ["b-r"])
        let status            = eCreate("td", ["b-r"])
        let ended_at          = eCreate("td", ["b-r"])
        let reward_monster_id = eCreate("td", ["b-r"])

        enc_name.innerText          = hist_summ.encounter_name
        status.innerText            = hist_summ.status
        ended_at.innerText          = hist_summ.ended_at
        reward_monster_id.innerText = hist_summ.reward_monster_id

        appendAllChildren(tr, [enc_name, status, ended_at, reward_monster_id])
        
        this.table.appendChild(tr)
    }
    this.element.appendChild(this.table)
}