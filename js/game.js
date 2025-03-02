const context = canvas.getContext("2d");
const ui = {
    "map": document.getElementById("map"),
    "route": document.getElementById("route"),
    "routedata": document.getElementById("route-data"),
    "routeinfo": document.querySelector("#route-data .info"),
    "routesegments": document.querySelector("#route .segments"),
    "segmentdata": document.getElementById("segment-data"),
    "segmentinfo": document.querySelector("#segment-data .info"),
    "locationbutton": document.getElementById("current-location"),
    "gobutton": document.getElementById("go-button"),
    "playerroute": document.getElementById("current-player-route")
}
const icons = load_images({
    "location-pin": "res/icons/route-location-pin.svg",
    "location-pin-black": "res/icons/location-pin.svg"
})

var mouse = {
    x: Infinity, y: Infinity,
    screen_x: Infinity, screen_y: Infinity,
    down: false,
    just_pressed: false,
    just_released: false
};
var previous_tick;

var guys = [];
var player;
var following;

var locations = [];
var selected_location;

var routes = [];
var route_location;
var current_route;

const MAP_RADIUS = 5;
const MAP_INTERVAL = 50;
const MAP_SMOOTH = .2;
var screen_offset;
var map_offset = { x:0, y:0 };
var desired_map_offset = { x:0, y:0 };

function init() {
    // event listeners

    window.onresize = resize;
    
    canvas.onmousedown = canvas.ontouchstart = e => {
        mouse.down = true;
        mouse.just_pressed = true;
        if (e.touches) {
            mouse.screen_x = e.touches[0].clientX;
            mouse.screen_y = e.touches[0].clientY;
            mousemove(e);
            e.preventDefault();
        }
    }
    document.onmouseup = document.ontouchend = window.onblur = () => {
        mouse.down = false;
    }
    canvas.onmouseup = canvas.ontouchend = () => {
        if (!mouse.dragging) mouse.just_released = true;
        mouse.dragging = false;
    }
    document.onmousemove = document.ontouchmove = mousemove;

    //

    resize();

    //

    for (let y=-MAP_RADIUS; y<=MAP_RADIUS; y++) {
        for (let x=-MAP_RADIUS; x<=MAP_RADIUS; x++) {
            if (x * x + y * y > MAP_RADIUS * MAP_RADIUS) continue;
            if (Math.random() > .2) continue;

            locations.push(new StaticLocation(
                x*MAP_INTERVAL + Math.random() * random(-10, 10), 
                y*MAP_INTERVAL + Math.random() * random(-10, 10)
            ));
        }
    }

    player = new Guy();
    guys.push(player);
    player.follow();

    //

    previous_tick = new Date();
    tick();
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

    map_offset = v2_lerp(map_offset, desired_map_offset, MAP_SMOOTH);

    for (let location of locations) {
        location.update();
    }

    for (let guy of guys) {
        guy.update(delta);
    }

    if (current_route && current_route.focused_segment && mouse.just_released) {
        current_route.focused_segment.unfocus();
    }

    //

    previous_tick = now;
    mouse.just_pressed = false;
    mouse.just_released = false;
}

function draw() {
    document.body.classList.remove("pointing");
    
    context.save();
        let offset = v2_add(screen_offset, map_offset);
        context.translate(offset.x, offset.y);
        context.clearRect(-offset.x, -offset.y, canvas.width, canvas.height);
        context.scale(window.devicePixelRatio, window.devicePixelRatio);

        // map
        for (let y=0; y<=canvas.height; y+=MAP_INTERVAL) {
            for (let x=0; x<=canvas.width; x+=MAP_INTERVAL) {
                context.fillStyle = "rgba(0, 0, 0, .05)";
                draw_circle(x - offset.x, y - offset.y, 2);
                context.fill();
            }
        }

        for (let location of locations) {
            location.draw();
        }

        player.draw();

        if (current_route) {
            current_route.draw();
        }
    context.restore();
}

//

function resize() {
    canvas.width = window.innerWidth * window.devicePixelRatio;
    canvas.height = window.innerHeight * window.devicePixelRatio;
    canvas.style.width = window.innerWidth + "px";
    canvas.style.height = window.innerHeight + "px";
    screen_offset = { x: canvas.width/2, y: canvas.height/2 };

    context.font = "16px monospace";
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

    let pos = screen_to_canvas(screen);

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
        desired_map_offset = v2_add(desired_map_offset, delta);
    }
    
    mouse.x = pos.x;
    mouse.y = pos.y;
    mouse.screen_x = screen.x;
    mouse.screen_y = screen.y;
}