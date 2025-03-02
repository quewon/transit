function get_duration_string(duration) {
    return Math.ceil(duration/60) + "m";
}

//resource loading

function load_images(images) {
    for (let name in images) {
        let path = images[name];
        let img = new Image();
        img.src = path;
        images[name] = img;
    }
    return images;
}

//dom

function copy_template(template_id) {
    let div = document.createElement("div");
    div.appendChild(document.getElementById(template_id).content.cloneNode(true));
    return div.firstElementChild;
}

//canvas

function draw_circle(x, y, radius) {
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI*2);
}

function draw_pin(img, x, y) {
    let width = img.naturalWidth;
    let height = img.naturalHeight;
    context.drawImage(img, x - width/2, y - height);
}

//math

function lerp(a, b, t) {
    return (1-t) * a + t * b;
}

function random(min, max) {
    return Math.random() * (max - min) + min;
}

//collision

function point_in_rect(point, rect) {
    if (
        point.x >= rect.x && point.x <= rect.x + rect.width &&
        point.y >= rect.y && point.y <= rect.y + rect.height
    ) {
        return true;
    }
    return false;
}

//v2 

function screen_to_canvas(v2) {
    let offset = v2_add(screen_offset, map_offset);
    return v2_div(v2_sub(v2_mul(v2, window.devicePixelRatio), offset), window.devicePixelRatio);
}

function canvas_to_screen(v2) {
    let offset = v2_add(screen_offset, map_offset);
    return v2_div(v2_add(v2_mul(v2, window.devicePixelRatio), offset), window.devicePixelRatio);
}

function jumpto(v2, offset) {
    if (following && v2 != following) following.unfollow();
    if (v2 != player) ui.locationbutton.classList.remove("hidden");
    desired_map_offset = v2_add(v2_mul(v2, -1 * window.devicePixelRatio), offset || { x:0, y:0 });
}

function v2_copy(v2) {
    return { x: v2.x, y: v2.y }
}

function v2_distance(a, b) {
    let dx = a.x - b.x;
    let dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
}

function v2_lerp(a, b, t) {
    return {
        x: lerp(a.x, b.x, t),
        y: lerp(a.y, b.y, t)
    }
}

function v2_add(a, b) {
    return {
        x: a.x + b.x,
        y: a.y + b.y
    }
}

function v2_sub(a, b) {
    return {
        x: a.x - b.x,
        y: a.y - b.y
    }
}

function v2_div(v2, factor) {
    return {
        x: v2.x / factor,
        y: v2.y / factor
    }
}

function v2_mul(v2, factor) {
    return {
        x: v2.x * factor,
        y: v2.y * factor
    }
}