// game

function set_game_timeout(func, duration) {
    game_timeouts.push({
        time: duration,
        func: func
    })
}

function alert(text, icon) {
    ui.alert.querySelector("center img").src = icon;
    ui.alert.querySelector("main").innerHTML = text;
    ui.alert.showModal();
}

function get_duration_string(duration) {
    let s = Math.round(duration/1000 / TIME_SCALE);
    let seconds = s%60;
    let minutes = Math.floor(s/60%60);
    let hours = Math.floor(s/60/60);
    if (hours > 0) {
        return hours+"h "+minutes+"m";
    } else if (minutes > 0) {
        return minutes+"m "+seconds+"s";
    } else {
        return seconds+"s";
    }
}

function get_time_string(duration) {
    let s = duration/1000 / TIME_SCALE;
    let seconds = Math.floor(s%60);
    let minutes = Math.floor(s/60%60);
    let hours = Math.floor(s/60/60);
    if (seconds < 10) seconds = "0"+seconds;

    if (hours > 0) {
        if (minutes < 10) minutes = "0"+minutes;
        return hours+":"+minutes+":"+seconds;
    } else {
        return minutes+":"+seconds;
    }
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

function clamp(min, v, max) {
    return Math.min(Math.max(v, min), max);
}

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

function position_to_canvas(v2) {
    return v2_mul(v2_add(v2, map_offset), map_zoom);
}

function canvas_to_position(v2) {
    return v2_sub(v2_div(v2, map_zoom), map_offset);
}

function screen_to_canvas(v2) {
    return v2_div(v2_sub(v2_mul(v2, window.devicePixelRatio), screen_offset), pixel_scale);
}

function canvas_to_screen(v2) {
    return v2_div(v2_add(v2_mul(v2, pixel_scale), screen_offset), window.devicePixelRatio);
}

function jumpto(v2) {
    if (!following || v2 != following) mouse.down = false;
    if (following && v2 != following) following.unfollow();
    if (v2 != player) ui.locationbutton.classList.remove("hidden");
    desired_map_offset = v2_mul(v2, -1);
}

function v2_move_towards(a, b, distance) {
    let max_distance = v2_distance(a, b);
    if (distance >= max_distance) return b;

    let direction = v2_normalize(v2_sub(b, a));
    return v2_add(a, v2_mul(direction, distance));
}

function v2_normalize(v2) {
    if (v2.x == 0 && v2.y == 0) return v2;
    let length = Math.sqrt(v2.x * v2.x + v2.y * v2.y);
    return {
        x: v2.x / length,
        y: v2.y / length
    }
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