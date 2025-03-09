function set_current_route(route) {
    if (current_route) {
        if (current_route.focused_segment) {
            current_route.focused_segment.unfocus();
        }
        if (current_route != route) {
            if (current_route.is_locked) {
                current_route.pin.src = "res/icons/location-pin.svg";
            } else {
                current_route.remove();
            }
        }
    }
    if (route) {
        if (route.is_tentative || route.is_locked) {
            ui.gobutton.classList.add("hidden");
        } else {
            ui.gobutton.classList.remove("hidden");
        }
        if (route.is_locked) {
            route.pin.src = "res/icons/route-location-pin.svg";
        }
        ui.route.classList.remove("hidden");
        ui.routedata.classList.remove("hidden");
        ui.routesegments.replaceWith(route.segments_element);
        ui.routesegments = route.segments_element;
        ui.routeinfo.replaceWith(route.info_element);
        ui.routeinfo = route.info_element;
        if (route.guy) route.guy.follow();
        if (route == player.route) {
            ui.playerroute.classList.add("hidden");
        }
    } else {
        ui.route.classList.add("hidden");
        ui.routedata.classList.add("hidden");
        ui.segmentdata.classList.add("hidden");
        route_location = null;
        if (selected_location) selected_location.show_window();
    }

    if (player.route && route != player.route) {
        ui.playerroute.classList.remove("hidden");
    }

    current_route = route;
}

class Route {
    segments = [];
    is_tentative = false;
    is_locked = false;
    focused_segment;
    duration;

    pin;
    segments_element;
    info_element;
    info_anchors;

    constructor(segments) {
        this.segments_element = document.createElement("div");
        this.segments_element.className = "segments";
        this.segments_element.classList.add("empty");

        let info = document.createElement("div");
        info.className = "info";
        let icon = document.createElement("img");
        icon.src = "res/icons/dots-horizontal.svg";
        this.info_anchors = [
            route_location ? route_location.anchor() : document.createElement("a"),
            route_location ? route_location.anchor() : document.createElement("a")
        ];
        info.appendChild(this.info_anchors[0]);
        info.appendChild(icon);
        info.appendChild(this.info_anchors[1]);
        this.duration_element = document.createElement("div");
        this.duration_element.className = "duration-estimate";
        info.appendChild(this.duration_element);
        this.info_element = info;

        this.pin = document.createElement("img");
        this.pin.src = "res/icons/route-location-pin.svg";
        this.pin.className = "pin hidden";
        ui.map.appendChild(this.pin);

        if (segments) {
            for (let segment of segments) {
                this.add_segment(segment);
            }
        }
    }

    lock() {
        this.is_locked = true;
    }

    update_duration() {
        let total = 0;
        for (let segment of this.segments) {
            total += segment.duration;
        }
        this.duration = total;
        this.duration_element.textContent = get_duration_string(this.duration);
    }

    add_segment(segment) {
        if (this.segments.length == 0) {
            let a = segment.start.anchor();
            this.info_anchors[0].replaceWith(a);
            this.info_anchors[0] = a;
            a = segment.end.anchor();
            this.info_anchors[1].replaceWith(a);
            this.info_anchors[1] = a;
        } else {
            let a = segment.end.anchor();
            this.info_anchors[1].replaceWith(a);
            this.info_anchors[1] = a;
        }

        this.segments.push(segment);
        this.segments_element.appendChild(segment.element);
        this.segments_element.classList.remove("empty");
        segment.route = this;

        this.update_duration();

        this.pin.classList.remove("hidden");
    }

    remove_last_segment() {
        let last_segment = this.segments.pop();

        if (current_route && current_route == this) {
            if (!this.is_tentative && this.segments.length == 0) {
                set_current_route();
                return;
            }
        }

        if (last_segment) {
            route_location = last_segment.start;
            this.segments_element.lastElementChild.remove();
            if (this.segments.length == 0) {
                this.segments_element.classList.add("empty");
                this.pin.classList.add("hidden");
            }
        }

        this.update_duration();
    }

    draw() {
        context.strokeStyle = (this.is_locked && current_route != this) ? "black" : "blue";
        for (let segment of this.segments) {
            segment.draw_path(this.is_tentative);
        }

        for (let segment of this.segments) {
            segment.start.draw_on_map();
            segment.end.draw_on_map();
        }

        if (this.segments.length > 0) {
            this.start().draw_on_map();
            if (this.pin) {
                let end_location = canvas_to_screen(position_to_canvas(this.segments[this.segments.length - 1].end));
                this.pin.style.left = end_location.x + "px";
                this.pin.style.top = end_location.y + "px";
            }
        }
    }

    remove() {
        this.pin.remove();
    }

    start() {
        if (this.segments.length > 0) {
            return this.segments[0].start;
        } else if (this.is_tentative) {
            return route_location;
        }
        return null;
    }

    end() {
        return this.segments[this.segments.length - 1].end;
    }

    contains(location) {
        for (let segment of this.segments) {
            if (segment.start == location || segment.end == location) {
                return true;
            }
        }
        return false;
    }

    position_at_time(t) {
        let position_segment;
        let _t = 0;
        for (let segment of this.segments) {
            if (_t + segment.duration > t) {
                t -= _t;
                position_segment = segment;
                break;
            }
            _t += segment.duration;
        }

        if (_t >= this.duration) {
            return v2_copy(this.segments[this.segments.length - 1].end);
        }

        _t = 0;
        let path = position_segment.path;
        for (let i=0; i<path.length-1; i++) {
            let distance = v2_distance(path[i], path[i+1]);
            if (_t + distance > t) {
                return v2_lerp(path[i], path[i+1], t/distance);
            }
        }
    }
}

class RouteSegment {
    speed;
    route;
    start;
    end;
    path;
    center;
    duration;

    element;
    focused = false;

    info_element;
    button;

    constructor(start, end, speed) {
        this.speed = speed || 1;
        this.start = start;
        this.end = end;
        this.center = v2_lerp(end, start, .5);
        this.element = document.createElement("div");
        this.element.classList.add("segment");
        this.calculate();
    }

    calculate() {
        this.path = [];
        this.calculate_duration();
    }

    calculate_duration() {
        let total = 0;
        for (let i=0; i<this.path.length-1; i++) {
            total += v2_distance(this.path[i], this.path[i+1]);
        }
        this.duration = total * 1000 / this.speed;
    }

    init_element(type) {
        this.icon = "res/icons/"+type+".svg";

        let info = document.createElement("div");
        info.className = "info";
        info.appendChild(this.start.anchor());
        let img = document.createElement("img");
        img.src = "res/icons/dots-horizontal.svg";
        info.appendChild(img);
        info.appendChild(this.end.anchor());
        let duration = document.createElement("div");
        duration.className = "duration-estimate";
        duration.textContent = get_duration_string(this.duration);
        info.appendChild(duration);
        this.info_element = info;

        let button = document.createElement("button");
        button.className = "iconbutton";
        img = document.createElement("img");
        img.src = this.icon;
        button.appendChild(img);
        
        this.element.appendChild(button);

        button.onclick = function() {
            if (this.focused) {
                this.unfocus();
            } else {
                this.focus();
            }
        }.bind(this);
        this.button = button;
    }

    focus() {
        if (this.route.focused_segment) {
            this.route.focused_segment.unfocus();
        }
        this.focused = true;
        this.route.focused_segment = this;
        ui.segmentdata.classList.remove("hidden");
        ui.routedata.classList.add("hidden");
        ui.segmentinfo.replaceWith(this.info_element);
        ui.segmentinfo = this.info_element;
        this.button.classList.add("selected");
        jumpto(this.center);
    }

    unfocus() {
        this.focused = false;
        this.button.classList.remove("selected");
        ui.segmentdata.classList.add("hidden");
        ui.routedata.classList.remove("hidden");
    }

    draw_path(is_tentative) {
        if (this.path.length == 0) return;

        if (is_tentative) context.setLineDash([3]);
        if (this.focused) {
            context.lineWidth = 3 * dpi * pixel_scale;
        } else {
            context.lineWidth = dpi * pixel_scale;
        }
        
        context.beginPath();
        let p0 = position_to_canvas(this.path[0]);
        context.moveTo(p0.x, p0.y);
        for (let i=1; i<this.path.length; i++) {
            let p = position_to_canvas(this.path[i]);
            context.lineTo(p.x, p.y);
        }
        context.stroke();

        if (is_tentative) context.setLineDash([]);
    }
}

class WalkSegment extends RouteSegment {
    constructor(start, end) {
        super(start, end, .1);
        this.init_element("walk");
    }

    calculate() {
        this.path = [];
        this.path.push(v2_copy(this.start));
        this.path.push(v2_copy(this.end));
        this.calculate_duration();
    }
}

class CarSegment extends RouteSegment {
    constructor(start, end) {
        super(start, end);
        
        this.path.push(v2_copy(start));
        this.path.push(v2_copy(end));
    }
}

class BusSegment extends RouteSegment {
    constructor(start, end) {
        super(start, end);
        
        this.path.push(v2_copy(start));
        this.path.push(v2_copy(end));
    }
}

class TrainSegment extends Route {
    constructor(start, end) {
        super(start, end);
        
        this.path.push(v2_copy(start));
        this.path.push(v2_copy(end));
    }
}