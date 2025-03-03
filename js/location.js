class Location {
    x; y;
    r = 5;
    desired_r = 5;
    anchor_element;

    constructor(x, y) {
        this.x = x;
        this.y = y;

        let anchor = document.createElement("button");
        anchor.className = "iconbutton";
        let icon = document.createElement("img");
        icon.src = "res/icons/circle.svg";
        anchor.appendChild(icon);
        this.anchor_element = anchor;
    }

    anchor() {
        let clone = this.anchor_element.cloneNode(true);
        clone.onclick = function() { jumpto(this) }.bind(this);
        return clone;
    }

    draw_on_map() {
        this.desired_r = 5;
        if (
            this.selected ||
            (this.mouseover && this.mouseover())
        ) {
            this.desired_r = 7;
        }

        let dr = this.desired_r - this.r;
        this.r += dr/3;

        let p = position_to_canvas(this);
        draw_circle(p.x, p.y, this.r);

        if (current_route && current_route.contains(this) || this == route_location) {
            context.fillStyle = "blue";
        } else if (player.route && player.route.contains(this)) {
            context.fillStyle = "black";
        } else {
            context.fillStyle = "#00FF00";
        }

        if (!this.is_static) {
            context.strokeStyle = context.fillStyle;
            context.fillStyle = "white";
            context.fill();
            context.stroke();
        } else {
            context.fill();
        }
    }
}

class StaticLocation extends Location {
    is_static = true;
    selected = false;
    click_ready = false;
    available_actions = ["walk"];
    touch_padding = MAP_INTERVAL/4;

    menu;
    clear_route_button;
    route_button;

    constructor(x, y) {
        super(x, y);

        // modify anchor

        this.anchor_element.querySelector("img").src = "res/icons/location-pin.svg";
        this.anchor_element.onclick = this.select.bind(this);

        // create menu

        let menu = copy_template("location-menu");
        let img = menu.querySelector("img");

        menu.querySelector("figcaption").textContent = this.name;

        this.buttons = {
            "walk": menu.querySelector(".walk"),
            "bus": menu.querySelector(".bus"),
            "train": menu.querySelector(".train"),
            "car": menu.querySelector(".car")
        }
        for (let action in this.buttons) {
            this.buttons[action].onclick = function() {
                this.go_via(action)
            }.bind(this);
        }

        ui.map.appendChild(menu);
        this.menu = menu;

        this.clear_route_button = menu.querySelector(".clear-route");
        this.route_button = menu.querySelector(".route");

        this.clear_route_button.onclick = this.clear_route.bind(this);
        this.route_button.onclick = this.route_from_here.bind(this);
    }

    go_via(action) {
        let segment;
        switch (action) {
            case "walk":
                segment = WalkSegment;
                break;
            case "car":
                segment = CarSegment;
                break;
            case "bus":
                segment = BusSegment;
                break;
            case "train":
                segment = TrainSegment;
                break;
        }

        segment = new segment(route_location || player.get_location(), this);

        if (!current_route) {
            set_current_route(new Route([segment]));
        } else {
            current_route.add_segment(segment);
        }

        route_location = this;
        this.deselect();
    }

    route_from_here() {
        route_location = this;
        let route = new Route();
        route.is_tentative = true;
        set_current_route(route);
        this.deselect();
    }

    clear_route() {
        set_current_route();
        this.deselect();
    }

    draw() {
        if (this.mouseover()) document.body.classList.add("pointing");

        let screen_position = canvas_to_screen(position_to_canvas(this));

        if (this.selected) {
            this.menu.style.left = screen_position.x + "px";
            this.menu.style.top = screen_position.y + "px";
        }

        this.draw_on_map();
    }

    update() {
        if (this.click_ready) {
            if (mouse.just_released) {
                if (this.selected) {
                    this.deselect();
                } else {
                    this.select();
                }
            } else if (!mouse.down || !this.mouseover()) {
                this.click_ready = false;
            }
        } else if (mouse.just_pressed && this.mouseover()) {
            this.click_ready = true;
        }

        if (this.selected && mouse.just_released && !this.mouseover()) {
            this.deselect();
        }
    }

    mouseover() {
        return v2_distance(mouse, this) <= this.r + this.touch_padding;
    }

    select() {
        if (current_route && current_route.focused_segment) {
            current_route.focused_segment.unfocus();
        }
        if (route_location == this) {
            if (current_route) {
                current_route.remove_last_segment();
            }
        }
        if (selected_location) selected_location.deselect();
        this.selected = true;
        selected_location = this;

        this.show_window();
        jumpto(v2_add(this, { x:0, y:-canvas.height/5/pixel_scale/map_zoom }));
    }

    deselect() {
        this.selected = false;
        selected_location = null;
        this.menu.classList.add("hidden");
    }

    show_window() {
        this.menu.classList.remove("hidden");

        // update window
        for (let action in this.buttons) {
            if (this.available_actions.includes(action)) {
                this.buttons[action].classList.remove("hidden");
            } else {
                this.buttons[action].classList.add("hidden");
            }
        }

        if (current_route && current_route.is_tentative && current_route.start() == this) {
            this.clear_route_button.classList.remove("hidden");
            this.route_button.classList.add("hidden");
        } else {
            this.clear_route_button.classList.add("hidden");
            this.route_button.classList.remove("hidden");
        }
    }

    hide_window() {
        this.menu.classList.add("hidden");
    }
}