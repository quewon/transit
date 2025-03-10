class Player {
    x; y;
    location;
    
    money = 0;

    route;
    segment_index;
    point_index;

    constructor(location) {
        this.x = location.x;
        this.y = location.y;
        this.location = location;
        document.title = location.name;
    }

    add_money(amount) {
        this.money += amount;
        alert(`${amount} money added to account.<br>new balance: ${this.money}`, "res/icons/money.svg");
    }

    traverse_route(route) {
        if (selected_location) selected_location.deselect();
        
        let first_segment = route.segments[0];
        first_segment.start = this.get_location();
        first_segment.info_element.firstElementChild.replaceWith(first_segment.start.anchor());
        first_segment.calculate();
        this.location = null;

        if (this.route) {
            this.route.remove();
        }

        this.route = route;
        this.route.lock();
        this.route.guy = this;
        set_current_route();
        this.follow();
        ui.playerroute.classList.remove("hidden");
        this.segment_index = 0;
        this.point_index = 0;

        ui.favicon.href = first_segment.icon;
        document.title = "in transit";
    }
    
    draw() {
        if (this.route) this.route.draw();

        if (!this.location) {
            context.fillStyle = palette.player;
            let p = position_to_canvas(this);
            draw_circle(p.x, p.y, 4);
            context.fill();
        }
    }

    update(delta) {
        if (!game_paused) {
            if (following == this) jumpto(this);
            this.update_route(delta);
        }
    }

    update_route(delta) {
        if (this.route) {
            let segment = this.route.segments[this.segment_index];
            let point = segment.path[this.point_index];
            let position = v2_move_towards(this, point, delta/1000 * TIME_SCALE * segment.speed);

            this.x = position.x;
            this.y = position.y;

            if (v2_distance(this, point) == 0) {
                this.point_index++;
                if (this.point_index >= segment.path.length) {
                    this.point_index = 0;
                    this.segment_index++;
                    if (this.segment_index >= this.route.segments.length) {
                        // arrived at location
                        this.location = this.route.end();
                        if (selected_location) selected_location.deselect();
                        jumpto(this.location);
                        if (current_route == this.route) {
                            set_current_route();
                        } else if (
                            current_route && 
                            current_route.is_tentative && 
                            current_route.start() == this.location
                        ) {
                            current_route.is_tentative = false;
                            ui.gobutton.classList.remove("hidden");
                        }
                        ui.playerroute.classList.add("hidden");
                        if (selected_location) selected_location.show_window();
                        this.route.remove();
                        this.route = null;
                        ui.favicon.href = "res/icons/location-pin.svg";
                        document.title = this.location.name;
                    } else {
                        ui.favicon.href = this.route.segments[this.segment_index].icon;
                    }
                }
            }   
        }
    }

    get_location() {
        return this.location || new Location(this.x, this.y);
    }

    follow() {
        if (following) following.unfollow();
        following = this;
        jumpto(this);
        ui.locationbutton.classList.add("hidden");
    }

    unfollow() {
        following = null;
    }
}