class Traveler {
    x; y;
    location;
    route;
    segment_paused;
    segment_index;
    point_index;

    constructor(location) {
        this.x = location.x;
        this.y = location.y;
        this.location = location;
    }

    traverse_route(route) {
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
        this.segment_paused = false;
        this.segment_index = 0;
        this.point_index = 0;

        this.onsegmentchange(first_segment);
    }

    update(delta) {
        if (!game_paused) {
            if (following == this) jumpto(this);
            this.update_route(delta);
        }
    }

    update_route(delta) {
        if (this.route && !this.segment_paused) {
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
                        this.location = this.route.end();
                        this.route.remove();
                        this.route = null;
                        this.onarrive();
                    } else {
                        this.segment_paused = false;
                        this.onsegmentchange(this.route.segments[this.segment_index]);
                    }
                }
            }   
        }
    }

    onarrive() { }

    onsegmentchange(segment) { }

    get_location() {
        return this.location || new Location(this.x, this.y);
    }

    follow() {
        if (following) following.unfollow();
        following = this;
        jumpto(this);
    }

    unfollow() {
        following = null;
    }
}

class Player extends Traveler {
    money = 0;
    vehicle;

    constructor(location) {
        super(location);
        document.title = location.name;
    }

    traverse_route(route) {
        this.follow();

        super.traverse_route(route);

        if (selected_location) selected_location.deselect();
        set_current_route();
        ui.playerroute.classList.remove("hidden");
        document.title = "in transit";
    }

    add_money(amount) {
        this.money += amount;
        alert(`${amount} money added to account.<br>new balance: ${this.money}`, "res/icons/money.svg");
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

    onarrive() {
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
        ui.favicon.href = "res/icons/location-pin.svg";
        document.title = this.location.name;

        this.vehicle.x = this.x;
        this.vehicle.y = this.y;
        this.vehicle.route = null;
        this.vehicle = null;
    }

    onsegmentchange(segment) {
        ui.favicon.href = segment.icon;

        if (this.vehicle) {
            this.vehicle.x = this.x;
            this.vehicle.y = this.y;
            this.vehicle.route = null;
            this.vehicle = null;
        }

        if (segment.type == "car") {
            this.segment_paused = true;
            ui.favicon.href = "res/icons/hail.svg";

            let nearest_car;
            let nearest_car_distance = Infinity;
            for (let car of cars) {
                let distance = v2_distance(this, car);
                if (distance < nearest_car_distance) {
                    nearest_car = car;
                    nearest_car_distance = distance;
                }
            }
            nearest_car.hail();
        }
    }

    ride(vehicle) {
        ui.favicon.href = this.route.segments[this.segment_index].icon;
        this.vehicle = vehicle;
        this.segment_paused = false;
    }

    follow() {
        super.follow();
        ui.locationbutton.classList.add("hidden");
    }
}

class Car extends Traveler {
    element;
    particles;
    bubble_timer = 0;
    bubble_interval = 300;
    bubbles = [];
    bubble_lifespan = 900;

    constructor(location) {
        super(location);

        this.element = document.createElement("button");
        this.element.className = "iconbutton traveler-pin hidden";
        let img = document.createElement("img");
        img.src = "res/icons/car-side.svg";
        this.element.appendChild(img);
        ui.map.appendChild(this.element);
        this.element.onclick = this.follow.bind(this);
    }

    traverse_route(route) {
        super.traverse_route(route);
    }

    draw() {
        if (!this.element.classList.contains("hidden")) {
            let position = canvas_to_screen(position_to_canvas(this));
            this.element.style.top = position.y + "px";
            this.element.style.left = position.x + "px";
        }

        if (map_zoom >= .5) {
            context.fillStyle = palette.route;
            for (let bubble of this.bubbles) {
                let b = position_to_canvas(bubble.position);
                draw_circle(b.x, b.y, (bubble.lifespan / this.bubble_lifespan) * 3);
                context.fill();
            }
        }
    }

    update(delta) {
        if (!this.route) {
            let random_location = locations[Math.random() * locations.length | 0];
            let route = new Route([new CarSegment(
                this.get_location(), 
                random_location
            )]);
            this.traverse_route(route);
        }

        super.update(delta);

        if (!this.element.classList.contains("hidden")) {
            this.bubble_timer += delta * map_zoom;
            if (this.bubble_timer >= this.bubble_interval) {
                this.bubble_timer = 0;
                this.bubbles.push({
                    lifespan: this.bubble_lifespan,
                    position: v2_copy(this)
                });
            }
        }

        for (let i=this.bubbles.length-1; i>=0; i--) {
            let bubble = this.bubbles[i];
            bubble.lifespan -= delta;
            if (bubble.lifespan <= 0) {
                this.bubbles.splice(i, 1);
            }
        }
    }

    hail() {
        if (v2_distance(player, this) > 0) {
            this.element.classList.remove("hidden");
            if (following == player) this.follow();
        }

        let segments = [];
        let start = this.get_location();
        let snapstart = snap_to_grid(start);
        if (start.x != snapstart.x || start.y != snapstart.y) {
            let snapped_location = new Location(snapstart.x, snapstart.y);
            segments.push(new CarSegment(start, snapped_location));
            start = snapped_location;
        }
        segments.push(new CarSegment(start, player.get_location()));
        let route = new Route(segments);

        this.traverse_route(route);
        this.onarrive = function() {
            player.ride(this);
            this.element.classList.add("hidden");
            this.onarrive = () => {};
            if (following == this) player.follow();
        }.bind(this);
    }
}

class Bus extends Traveler {
    constructor(location) {
        super(location);
    }
}