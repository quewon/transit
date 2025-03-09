const MISSIONS = [
    {
        location: "airport",
        location_image: "res/locations/airport.jpg",
        prompt: "from: boss<br>business in [redacted].<br>catch a flight before XX:XX.<br>don't be late.",
        icon: "res/icons/missions/plane.svg",
        title: "BUSINESS CALLS",
        description: "pay 15 money for a plane ticket at the airport.",
        duration: 5 * 60,
        fulfillable: () => {
            return player.money >= 15
        },
        fulfill: () => {
            player.money -= 15;
            alert("15 money lost. mission success.", "res/icons/star.svg");
        }
    }
]

const CONTACTS = {
    "broke friend": {
        name: "broke friend",
        stats: { talk: 2 },
        favor_condition: "give them a loan",
        job: {
            title: "I REALLY NEED A LOAN, MAN",
            description: "deliver 3 money to broke friend.",
            destination: "CONTACT: broke friend",
            fulfillable: () => {
                return player.money >= 3;
            },
            fulfill: () => {
                player.money -= 3;
                contacts["broke friend"].win_favor();
                contacts["broke friend"].name = "friend";
                alert("3 money lost. your friend's gratitude earned.", "res/icons/money.svg");
            }
        }
    },
    "friend of a friend": {
        name: "friend of a friend",
        stats: { talk: 1 },
        spawnable: () => {
            return !!contacts["broke friend"];
        },
        favor_condition: "earn <b>broke friend</b>'s favor"
    }
}

const context = canvas.getContext("2d");
const ui = {
    "favicon": document.querySelector("link[rel~='icon']"),
    "alert": document.getElementById("alert"),
    "timer": document.getElementById("timer"),
    "map": document.getElementById("map"),
    "locationmenus": document.getElementById("location-menus"),
    "route": document.getElementById("route"),
    "routedata": document.getElementById("route-data"),
    "routeinfo": document.querySelector("#route-data .info"),
    "routesegments": document.querySelector("#route .segments"),
    "segmentdata": document.getElementById("segment-data"),
    "segmentinfo": document.querySelector("#segment-data .info"),
    "locationbutton": document.getElementById("current-location"),
    "gobutton": document.getElementById("go-button"),
    "playerroute": document.getElementById("current-player-route"),
    "joboffer": document.getElementById("job-offer"),
    "viewjob": document.getElementById("view-job"),
    "viewcontact": document.getElementById("view-contact")
};
const _rootstyle = window.getComputedStyle(document.documentElement);
const palette = {
    "background": _rootstyle.getPropertyValue("--background"),
    "map-grid": _rootstyle.getPropertyValue("--map-grid"),
    "text": _rootstyle.getPropertyValue("--text"),
    "location": _rootstyle.getPropertyValue("--location"),
    "player": _rootstyle.getPropertyValue("--player"),
    "route": _rootstyle.getPropertyValue("--route"),
    "route-locked": _rootstyle.getPropertyValue("--route-locked"),
}

var mouse;
var previous_tick;

const TIME_SCALE = 100;
var game_paused = false;
var game_timeouts;
var game_time;

var player;
var following;

var locations;
var selected_location;

var routes = [];
var route_location;
var current_route;

var contacts;

const MAP_RADIUS = 5;
const MAP_INTERVAL = 50;
const MAP_SMOOTH = .013;
const MIN_ZOOM = .3;
const MAX_ZOOM = 4;
var screen_offset;
var pixel_scale;
var map_zoom = 1;
var map_offset = { x:0, y:0 };
var desired_map_offset = { x:0, y:0 };

function init() {
    // event listeners

    window.addEventListener("wheel", e => {
        map_zoom -= e.deltaY/1000 * map_zoom;
        map_zoom = clamp(MIN_ZOOM, map_zoom, MAX_ZOOM);
    })

    window.onresize = resize;
    
    canvas.onmousedown = canvas.ontouchstart = e => {
        if (e.touches) {
            if (e.touches.length == 2) {
                mouse.pinch = v2_distance(
                    { x: e.touches[0].clientX, y: e.touches[0].clientY },
                    { x: e.touches[1].clientX, y: e.touches[1].clientY }
                );
                mouse.down = false;
            } else if (e.touches.length == 1) {
                mouse.screen_x = e.touches[0].clientX;
                mouse.screen_y = e.touches[0].clientY;
                mousemove(e);
                mouse.down = true;
                mouse.just_pressed = true;
            }
            e.preventDefault();
        } else {
            mouse.down = true;
            mouse.just_pressed = true;
        }
    }
    document.onmouseup = document.ontouchend = window.onblur = () => {
        mouse.down = false;
    }
    canvas.onmouseup = canvas.ontouchend = () => {
        if (!mouse.dragging) mouse.just_released = true;
        mouse.dragging = false;
        mouse.pinch = null;
    }
    document.onmousemove = document.ontouchmove = mousemove;

    //

    resize();

    //

    init_level();

    //

    previous_tick = new Date();
    tick();
}

function init_level() {
    const mission = MISSIONS[MISSIONS.length * Math.random() | 0];

    // locations

    locations = [];

    const home = new StaticLocation(0, 0, "home", "res/locations/home.jpg");
    locations.push(home);

    for (let y=-MAP_RADIUS; y<=MAP_RADIUS; y++) {
        for (let x=-MAP_RADIUS; x<=MAP_RADIUS; x++) {
            if (x == 0 && y == 0) continue;
            if (x * x + y * y > MAP_RADIUS * MAP_RADIUS) continue;
            if (Math.random() > .2) continue;

            locations.push(new StaticLocation(
                x*MAP_INTERVAL, 
                y*MAP_INTERVAL
            ));
        }
    }

    // create mission location

    var mission_location = locations[locations.length * Math.random() | 0];
    while (mission_location == home) {
        mission_location = locations[locations.length * Math.random() | 0];
    }
    mission_location.name = mission.location;
    mission_location.menu.querySelector("img").src = mission.location_image;

    // objects

    home.add_object(new Object(
        "package",
        "res/icons/package.svg",
        {
            onclick: () => {
                player.add_money(5);
                set_game_timeout(() => {
                    home.add_object(new MissionPrompt(mission));
                }, 1000 * 15);
            }
        }
    ));

    alert("a <b>package</b> has arrived at home.", "res/icons/package.svg");

    // contacts

    contacts = {};
    var pool = ["broke friend"];

    for (let name of pool) {
        contacts[name] = new Contact(CONTACTS[name]);
        let not_home = locations[Math.random() * locations.length | 0];
        while (not_home == home) {
            not_home = locations[Math.random() * locations.length | 0];
        }
        not_home.add_object(contacts[name]);
    }

    // player

    player = new Player(home);

    game_paused = false;
    game_timeouts = [];
    game_time = null;
    ui.timer.classList.add("hidden");
    ui.timer.textContent = get_time_string(mission.duration * 1000 * TIME_SCALE);
}

function tick() {
    update();
    draw();
    requestAnimationFrame(tick);
}

function update() {
    const now = new Date();
    const delta = now - previous_tick;

    //

    if (!game_paused) {
        if (game_time != null) {
            game_time -= delta * TIME_SCALE;
            ui.timer.textContent = get_time_string(game_time);
            if (game_time < 0) {
                game_time = null;
                ui.timer.textContent = "0:00";
                alert("you failed to get to your destination in time.", "res/icons/flower.svg");
            }
        }

        for (let i=game_timeouts.length-1; i>=0; i--) {
            game_timeouts[i].time -= delta;
            if (game_timeouts[i].time <= 0) {
                game_timeouts[i].func();
                game_timeouts.splice(i, 1);
            }
        }
    }

    map_offset = v2_lerp(map_offset, desired_map_offset, MAP_SMOOTH * delta);

    for (let location of locations) {
        location.update();
    }
    
    player.update(delta);

    if (current_route && current_route.focused_segment && mouse.just_released) {
        current_route.focused_segment.unfocus();
    }

    //

    previous_tick = now;
    mouse.just_pressed = false;
    mouse.just_released = false;
}

function draw_grid() {
    let interval = MAP_INTERVAL;
    let mod = {
        x: map_offset.x % interval,
        y: map_offset.y % interval
    }
    let height = Math.round(window.innerHeight / 2 / map_zoom / interval) * interval;
    let width = Math.round(window.innerWidth / 2 / map_zoom / interval) * interval;
    let dots_radius = Math.min(map_zoom*2, 2);
    context.fillStyle = palette["map-grid"];
    for (let y=-height; y<=height; y+=interval) {
        for (let x=-width; x<=width; x+=interval) {
            draw_circle(
                (x + mod.x) * map_zoom * pixel_scale,
                (y + mod.y) * map_zoom * pixel_scale,
                dots_radius
            );
            context.fill();
        }
    }
}

function draw() {
    document.body.classList.remove("pointing");
    
    context.save();
        context.translate(screen_offset.x, screen_offset.y);
        context.clearRect(-screen_offset.x, -screen_offset.y, canvas.width, canvas.height);
        context.scale(window.devicePixelRatio, window.devicePixelRatio);

        // map
        draw_grid();

        for (let location of locations) {
            location.draw();
        }

        if (current_route) current_route.draw();

        player.draw();
    context.restore();
}

//

function resize() {
    if (window.devicePixelRatio >= 2) {
        pixel_scale = window.devicePixelRatio * 1.7;
    } else {
        pixel_scale = window.devicePixelRatio;
    }
    canvas.width = window.innerWidth * window.devicePixelRatio;
    canvas.height = window.innerHeight * window.devicePixelRatio;
    canvas.style.width = window.innerWidth + "px";
    canvas.style.height = window.innerHeight + "px";
    screen_offset = { x: canvas.width/2, y: canvas.height/2 };
    mouse = {
        x: Infinity, y: Infinity,
        screen_x: Infinity, screen_y: Infinity,
        down: false,
        just_pressed: false,
        just_released: false
    };
}

function mousemove(e) {
    let screen = {};
    if (e.touches) {
        screen.x = e.touches[0].clientX;
        screen.y = e.touches[0].clientY;
    } else {
        screen.x = e.pageX;
        screen.y = e.pageY;
    }

    let p = canvas_to_position(screen_to_canvas(screen));

    if (mouse.down) {
        let delta = {
            x: screen.x - mouse.screen_x,
            y: screen.y - mouse.screen_y
        }
        if (delta.x * delta.x + delta.y * delta.y > 2) {
            mouse.dragging = true;
            if (following) following.unfollow();
            ui.locationbutton.classList.remove("hidden");
        }
        desired_map_offset = v2_add(desired_map_offset, v2_mul(delta, window.devicePixelRatio / pixel_scale / map_zoom));
    }

    if (e.touches && mouse.pinch && e.touches.length == 2) {
        let pinch = v2_distance(
            { x: e.touches[0].clientX, y: e.touches[0].clientY },
            { x: e.touches[1].clientX, y: e.touches[1].clientY }
        );
        let delta = pinch - mouse.pinch;
        map_zoom += (delta/700) * window.devicePixelRatio * map_zoom;
        map_zoom = clamp(MIN_ZOOM, map_zoom, MAX_ZOOM);
        mouse.pinch = pinch;
    }
    
    mouse.x = p.x;
    mouse.y = p.y;
    mouse.screen_x = screen.x;
    mouse.screen_y = screen.y;
}