class Location {
    name;
    x; y;
    r = 5;
    desired_r = 5;
    anchor_element;

    constructor(x, y, name) {
        this.x = x;
        this.y = y;
        this.name = name || "location";

        let anchor = document.createElement("a");
        let icon = document.createElement("img");
        icon.src = "res/icons/circle.svg";
        anchor.appendChild(icon);
        anchor.innerHTML += this.name;
        this.anchor_element = anchor;
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

        draw_circle(this.x, this.y, this.r);

        let is_start_location = current_route && current_route.start() == this;

        if (route_location == this || is_start_location) {
            context.fillStyle = "white";
            context.fill();
            if (current_route && !current_route.is_tentative && is_start_location) {
                context.strokeStyle = "red";
            } else {
                context.strokeStyle = "blue";
            }
            context.stroke();
        } else {
            if (player.route && player.route.contains(this)) {
                context.fillStyle = "black";
            } else if (current_route && current_route.contains(this)) {
                context.fillStyle = "blue";
            } else {
                context.fillStyle = "#00FF00";
            }
            context.fill();
        }
    }
}

class StaticLocation extends Location {
    selected = false;
    click_ready = false;
    available_actions = ["walk"];

    constructor(x, y, name) {
        super(x, y, name);

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
        
        menu.querySelector(".route").onclick = this.route_from_here.bind(this);

        ui.map.appendChild(menu);
        this.menu = menu;

        // create nametag

        let nametag = document.createElement("div");
        nametag.className = "nametag";
        nametag.textContent = this.name;
        ui.map.appendChild(nametag);
        this.nametag = nametag;
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

    draw() {
        if (this.mouseover()) document.body.classList.add("pointing");

        let screen_position = canvas_to_screen(this);

        if (this.selected) {
            this.menu.style.left = screen_position.x + "px";
            this.menu.style.top = screen_position.y + "px";
        } else {
            this.nametag.style.left = screen_position.x + "px";
            this.nametag.style.top = screen_position.y + "px";
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
        return v2_distance(mouse, this) <= this.r;
    }

    select() {
        if (current_route && current_route.focused_segment) {
            current_route.focused_segment.unfocus();
        }
        if (route_location == this) {
            if (current_route) {
                current_route.remove_last_segment();
                if (current_route.segments.length == 0 && !current_route.is_tentative) {
                    set_current_route();
                }
            }
        }
        if (selected_location) selected_location.deselect();
        this.selected = true;
        selected_location = this;

        this.show_window();
        this.nametag.classList.add("hidden");
        jumpto(this, { x:0, y:140 });
    }

    deselect() {
        this.selected = false;
        selected_location = null;
        this.menu.classList.add("hidden");
        this.nametag.classList.remove("hidden");
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
    }

    hide_window() {
        this.menu.classList.add("hidden");
    }
}