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

var mouse;
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
const MIN_ZOOM = .2;
const MAX_ZOOM = 5;
var screen_offset;
var pixel_scale;
var map_zoom = 1;
var map_offset = { x:0, y:0 };
var desired_map_offset = { x:0, y:0 };

function init() {
    // event listeners

    window.addEventListener("wheel", e => {
        map_zoom += e.deltaY/1000;
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
        context.translate(screen_offset.x, screen_offset.y);
        context.clearRect(-screen_offset.x, -screen_offset.y, canvas.width, canvas.height);
        context.scale(pixel_scale, pixel_scale);

        // map
        let interval = MAP_INTERVAL;
        let mod = {
            x: map_offset.x % interval,
            y: map_offset.y % interval
        }
        context.fillStyle = "rgba(0, 0, 0, .1)";
        for (let y=-window.innerHeight / map_zoom; y<=window.innerHeight / map_zoom; y+=interval) {
            for (let x=-window.innerWidth / map_zoom; x<=window.innerWidth / map_zoom; x+=interval) {
                draw_circle(
                    (Math.round(x / interval) * interval + mod.x) * map_zoom,
                    (Math.round(y / interval) * interval + mod.y) * map_zoom,
                    2
                );
                context.fill();
            }
        }

        for (let location of locations) {
            location.draw();
        }

        if (current_route) {
            current_route.draw();
        }

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
        map_zoom += delta/2000;
        map_zoom = clamp(MIN_ZOOM, map_zoom, MAX_ZOOM);
        mouse.pinch = pinch;
    }
    
    mouse.x = p.x;
    mouse.y = p.y;
    mouse.screen_x = screen.x;
    mouse.screen_y = screen.y;
}