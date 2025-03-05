class Object {
    type = "item";
    name;
    icon;
    location;
    remove_onclick = true;
    
    button;
    icon_element;

    constructor(name, icon, events) {
        events = events || {};
        icon = icon || "res/icons/package.svg";

        this.name = name;
        this.icon = icon;
        if (events.onclick) this.onclick = events.onclick;
        if (events.onadd) this.onadd = events.onadd;

        let button = document.createElement("button");
        button.className = "iconbutton";
        let img = document.createElement("img");
        img.src = icon;
        button.appendChild(img);
        button.onclick = function() {
            if (this.location == player.location) {
                this.onclick();
                if (this.remove_onclick) this.location.remove_object(this);
            } else {
                alert(`you have to be here to interact with this ${this.type}.`, this.icon);
            }
        }.bind(this);
        this.button = button;

        this.icon_element = button.cloneNode(true);
    }

    onclick() { }
    onadd(location) { }
}

class Contact extends Object {
    constructor(contact) {
        super(contact.name, contact.icon || "res/icons/person.svg");

        this.type = "contact";
        this.remove_onclick = false;
        
        if (contact.job) {
            this.job = new Job(contact.job);
            this.job.contact = this;
        }
    }

    onclick() {
        alert(`<b>${this.name}</b> says hello.`, this.icon);
    }

    onadd(location) {
        location.add_object(this.job);
    }
}

class Job extends Object {
    contact;
    accepted;
    destination;
    element;

    constructor(p) {
        p = p || {};

        super(p.type || "job", p.icon || "res/icons/job-offer.svg");

        this.destination = p.destination;
        this.element = document.createElement("p");
        this.element.setAttribute("name", "job");
        this.element.innerHTML = `<b>${p.title}</b>:<br><span>${p.description}</span>`;
        this.fulfillable = p.fulfillable;
        this.fulfill = p.fulfill;
        this.accepted = p.accepted || false;

        this.button.onclick = this.onclick.bind(this);
    }

    fulfillable() { return true; }
    fulfill() { }

    onclick() {
        if (!this.accepted) {
            let accept_button = ui.joboffer.querySelector("[name='accept']");
            let reject_button = ui.joboffer.querySelector("[name='reject']");
            
            accept_button.onclick = this.accept.bind(this);
            reject_button.onclick = this.reject.bind(this);

            ui.joboffer.querySelector("[name='contact-icon']").src = this.contact.icon;
            ui.joboffer.querySelector("[name='contact-name']").textContent = this.contact.name;
            ui.joboffer.querySelector("[name='job']").replaceWith(this.element);
            ui.joboffer.showModal();
        } else {
            let fulfill_button = ui.viewjob.querySelector("[name='fulfill']");
            
            if (this.location == player.location && this.fulfillable()) {
                fulfill_button.removeAttribute("disabled");
                fulfill_button.onclick = function() {
                    this.fulfill();
                    this.location.remove_object(this);
                    this.close();
                }.bind(this);
            } else {
                fulfill_button.setAttribute("disabled", true);
            }

            ui.viewjob.querySelector("[name='contact-icon']").src = this.contact.icon;
            ui.viewjob.querySelector("[name='contact-name']").textContent = this.contact.name;
            ui.viewjob.querySelector("[name='job']").replaceWith(this.element);
            ui.viewjob.showModal();
        }
    }

    accept() {
        this.icon = "res/icons/job.svg";
        this.button.querySelector("img").src = this.icon;
        this.icon_element.querySelector("img").src = this.icon;
        this.accepted = true;
        this.close();

        if (this.destination) {
            if (this.destination.includes("CONTACT: ")) {
                let contact_name = this.destination.split("CONTACT: ")[1];
                contacts[contact_name].location.add_object(this);
            }
        }
    }

    reject() {
        this.location.remove_object(this);
        this.close();
    }

    close() {
        ui.joboffer.close();
        ui.viewjob.close();
    }
}

class MissionPrompt extends Object {
    mission;

    constructor(mission) {
        super("letter", "res/icons/mail.svg");
        this.mission = mission;
    }

    onclick() {
        alert(this.mission.prompt, "res/icons/mail-open.svg");

        for (let location of locations) {
            if (location.name == this.mission.location) {
                let mission = new Mission(this.mission);
                mission.contact = new Contact({
                    name: "the boss",
                    icon: "res/icons/star.svg"
                })
                location.add_object(mission);
                location.select();
                break;
            }
        }
    }

    onadd(location) {
        alert(`a <b>letter</b> has arrived at ${location.name}.`, "res/icons/mail.svg");
    }
}

class Mission extends Job {
    constructor(mission) {
        mission.type = "mission";
        mission.icon = "res/icons/star.svg";
        mission.accepted = true;
        super(mission);
    }
}