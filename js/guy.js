class Guy {
    x; y;
    name;
    location;
    route;
    route_time;

    constructor(x, y, name) {
        this.x = x || 0;
        this.y = y || 0;
        this.name = name || "guy";
    }

    traverse_route(route) {
        route.segments[0].start = this.get_location();
        route.segments[0].calculate_path();
        this.route = route;
        this.route.is_locked = true;
        this.route.guy = this;
        if (this == player) {
            set_current_route();
            this.follow();
            ui.playerroute.classList.remove("hidden");
        }
        this.route_time = 0;
    }
    
    draw() {
        if (this == player && this.route) {
            this.route.draw("black");
        }

        context.fillStyle = "red";
        draw_circle(this.x, this.y, 4);
        context.fill();
    }

    update(delta) {
        if (following == this) {
            jumpto(this);
        }

        if (this.route) {
            // calculate position on route
            this.route_time += delta/100;
            let position = this.route.position_at_time(this.route_time);
            this.x = position.x;
            this.y = position.y;

            if (v2_distance(this, this.route.end()) == 0) {
                this.route = null;
            }
        }
    }

    get_location() {
        return this.location || new Location(this.x, this.y, "current");
    }

    follow() {
        if (following) following.unfollow();
        following = this;
        jumpto(this);
        if (this == player) {
            ui.locationbutton.classList.add("hidden");
        }
    }

    unfollow() {
        following = null;
    }
}