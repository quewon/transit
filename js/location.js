class Location {
    x; y;
    r = 5;
    desired_r = 5;

    anchor_element;
    icons_element;

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

    add_object(object) {
        if (!this.icons_element) {
            let icons = document.createElement("div");
            icons.className = "location-icons iconbutton";
            ui.map.appendChild(icons);
            this.icons_element = icons;
            this.icons_element.onclick = this.select.bind(this);
        }
        this.icons_element.appendChild(object.icon_element);
        object.location = this;
        object.onadd(this);
    }

    remove_object(object) {
        object.location = null;
        object.icon_element.remove();
        if (!this.icons_element.firstElementChild) {
            this.icons_element.remove();
            this.icons_element = null;
        }
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

        if (current_route && current_route.is_tentative && route_location == this && !current_route.contains(this)) {
            context.fillStyle = palette.route;
        } else if (player.location == this) {
            context.fillStyle = palette.player;
        } else if (current_route && current_route.contains(this) || route_location == this) {
            context.fillStyle = palette.route;
        } else if (player.route && player.route.contains(this)) {
            context.fillStyle = palette["route-locked"];
        } else {
            context.fillStyle = palette.location;
        }

        if (!this.is_static) {
            context.strokeStyle = context.fillStyle;
            context.fillStyle = palette.background;
            context.fill();
            context.stroke();
        } else {
            context.fill();
        }

        if (this.icons_element) {
            let screen_position = canvas_to_screen(position_to_canvas(this));
            this.icons_element.style.top = screen_position.y + "px";
            this.icons_element.style.left = screen_position.x + "px";
        }
    }
}

class StaticLocation extends Location {
    name;
    is_static = true;
    selected = false;
    click_ready = false;
    available_actions = ["walk"];
    touch_padding = MAP_INTERVAL/4;

    menu;
    objects_menu;
    clear_route_button;
    route_button;

    constructor(x, y, name, image) {
        super(x, y);

        this.name = name || "a location";

        // modify anchor

        this.anchor_element.querySelector("img").src = "res/icons/location-pin.svg";

        // create menu

        let menu = copy_template("location-menu");
        if (image) menu.querySelector("figure img").src = image;

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

        ui.locationmenus.appendChild(menu);
        this.menu = menu;

        this.clear_route_button = menu.querySelector(".clear-route");
        this.route_button = menu.querySelector(".route");

        this.clear_route_button.onclick = this.clear_route.bind(this);
        this.route_button.onclick = this.route_from_here.bind(this);

        this.objects_menu = menu.querySelector(".objects");
    }

    add_object(object) {
        if (!this.icons_element) {
            let icons = document.createElement("div");
            icons.className = "location-icons iconbutton";
            ui.map.appendChild(icons);
            this.icons_element = icons;
            this.icons_element.onclick = this.select.bind(this);
        }
        this.icons_element.appendChild(object.icon_element);
        object.location = this;
        this.objects_menu.appendChild(object.button);
        object.onadd(this);
    }

    remove_object(object) {
        super.remove_object(object);
        object.button.remove();
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

        if (!current_route || current_route.is_locked) {
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

        this.show_window();
        let height = this.menu.getBoundingClientRect().height;
        jumpto(v2_add(this, { x:0, y:-height/2/map_zoom }));

        this.selected = true;
        selected_location = this;
    }

    deselect() {
        this.selected = false;
        selected_location = null;
        this.hide_window();
    }

    show_window() {
        // update window
        if (player.location == this && (!current_route || !current_route.is_tentative)) {
            for (let action in this.buttons) {
                this.buttons[action].classList.add("hidden");
            }
        } else {
            for (let action in this.buttons) {
                if (this.available_actions.includes(action)) {
                    this.buttons[action].classList.remove("hidden");
                } else {
                    this.buttons[action].classList.add("hidden");
                }
            }
        }

        if (current_route && current_route.is_tentative && current_route.start() == this) {
            this.clear_route_button.classList.remove("hidden");
            this.route_button.classList.add("hidden");
        } else {
            this.clear_route_button.classList.add("hidden");
            if (player.location == this) {
                this.route_button.classList.add("hidden");
            } else {
                this.route_button.classList.remove("hidden");
            }
        }

        if (this.icons_element) this.icons_element.classList.add("hidden");

        this.menu.classList.remove("hidden");
    }

    hide_window() {
        this.menu.classList.add("hidden");
        if (this.icons_element) this.icons_element.classList.remove("hidden");
    }
}